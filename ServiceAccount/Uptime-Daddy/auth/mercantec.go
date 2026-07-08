package auth

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	defaultMercantecIssuer   = "https://auth.mercantec.tech"
	defaultMercantecAudience = "mercantec-apps"
	jwksCacheTTL             = 10 * time.Minute
)

// MercantecConfigured returnerer true når serveren er sat op som Mercantec
// OAuth-klient. Uden et client_id er login-med-Mercantec deaktiveret.
func MercantecConfigured() bool {
	return MercantecClientID() != ""
}

func MercantecClientID() string {
	return strings.TrimSpace(os.Getenv("MERCANTEC_CLIENT_ID"))
}

// MercantecClientSecret er kun sat for fortrolige (confidential) klienter.
// For public PKCE-klienter er den tom og sendes ikke.
func MercantecClientSecret() string {
	return strings.TrimSpace(os.Getenv("MERCANTEC_CLIENT_SECRET"))
}

func MercantecIssuer() string {
	if v := strings.TrimSpace(os.Getenv("MERCANTEC_ISSUER")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return defaultMercantecIssuer
}

func MercantecAudience() string {
	if v := strings.TrimSpace(os.Getenv("MERCANTEC_AUDIENCE")); v != "" {
		return v
	}
	return defaultMercantecAudience
}

func MercantecTokenEndpoint() string {
	return MercantecIssuer() + "/oauth/token"
}

func mercantecJWKSURI() string {
	return MercantecIssuer() + "/.well-known/jwks.json"
}

// MercantecClaims er de claims vi behøver fra Mercantecs access token for at
// finde/oprette en lokal konto. Signaturen valideres mod JWKS.
type MercantecClaims struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	jwt.RegisteredClaims
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type jwks struct {
	Keys []jwk `json:"keys"`
}

var (
	jwksMu      sync.Mutex
	jwksCache   map[string]*rsa.PublicKey
	jwksFetched time.Time
)

func fetchJWKS() (map[string]*rsa.PublicKey, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(mercantecJWKSURI())
	if err != nil {
		return nil, fmt.Errorf("could not fetch jwks: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("jwks endpoint returned status %d", resp.StatusCode)
	}

	var set jwks
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return nil, fmt.Errorf("could not decode jwks: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey, len(set.Keys))
	for _, k := range set.Keys {
		if k.Kty != "RSA" || k.N == "" || k.E == "" {
			continue
		}
		pub, err := jwkToRSAPublicKey(k)
		if err != nil {
			continue
		}
		keys[k.Kid] = pub
	}

	if len(keys) == 0 {
		return nil, errors.New("jwks contained no usable RSA keys")
	}
	return keys, nil
}

func jwkToRSAPublicKey(k jwk) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, fmt.Errorf("invalid modulus: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, fmt.Errorf("invalid exponent: %w", err)
	}

	e := 0
	for _, b := range eBytes {
		e = e<<8 | int(b)
	}
	if e == 0 {
		return nil, errors.New("invalid zero exponent")
	}

	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: e,
	}, nil
}

// keyForKid returnerer den offentlige nøgle for et givet kid, og genhenter
// JWKS hvis nøglen mangler eller cachen er udløbet (nøglerotation).
func keyForKid(kid string) (*rsa.PublicKey, error) {
	jwksMu.Lock()
	defer jwksMu.Unlock()

	stale := jwksCache == nil || time.Since(jwksFetched) > jwksCacheTTL
	if !stale {
		if key, ok := jwksCache[kid]; ok {
			return key, nil
		}
	}

	keys, err := fetchJWKS()
	if err != nil {
		if jwksCache != nil {
			if key, ok := jwksCache[kid]; ok {
				return key, nil
			}
		}
		return nil, err
	}

	jwksCache = keys
	jwksFetched = time.Now()

	if key, ok := keys[kid]; ok {
		return key, nil
	}
	return nil, fmt.Errorf("no matching jwks key for kid %q", kid)
}

// ValidateMercantecToken verificerer signatur (RS256 via JWKS), issuer,
// audience og udløb på et Mercantec-udstedt access token.
func ValidateMercantecToken(tokenString string) (*MercantecClaims, error) {
	claims := &MercantecClaims{}

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithIssuer(MercantecIssuer()),
		jwt.WithAudience(MercantecAudience()),
		jwt.WithExpirationRequired(),
	)

	token, err := parser.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		kid, _ := token.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("token missing kid header")
		}
		return keyForKid(kid)
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid mercantec token")
	}

	return claims, nil
}

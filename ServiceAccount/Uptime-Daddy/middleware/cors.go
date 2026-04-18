package middleware

import (
	"net/http"
	"os"
	"strings"
)

func allowedOrigins() []string {
	base := []string{"http://localhost:5173", "http://10.133.51.121:5173"}
	raw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		return base
	}
	seen := make(map[string]struct{})
	for _, o := range base {
		seen[o] = struct{}{}
	}
	out := append([]string(nil), base...)
	for _, part := range strings.Split(raw, ",") {
		o := strings.TrimSpace(part)
		if o == "" {
			continue
		}
		if _, ok := seen[o]; ok {
			continue
		}
		seen[o] = struct{}{}
		out = append(out, o)
	}
	return out
}

func originAllowed(origin string) bool {
	for _, o := range allowedOrigins() {
		if origin == o {
			return true
		}
	}
	return false
}

func WithCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if originAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

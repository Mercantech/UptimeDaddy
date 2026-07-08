/** PKCE-hjælpere (RFC 7636) baseret på Web Crypto API. */

function base64UrlEncode(bytes) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Kryptografisk tilfældig, URL-sikker streng. */
function randomUrlSafeString(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256(input) {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

/** Genererer et code_verifier + tilhørende S256 code_challenge. */
async function createPkcePair() {
  const codeVerifier = randomUrlSafeString(32);
  const digest = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(digest);
  return { codeVerifier, codeChallenge };
}

export { createPkcePair, randomUrlSafeString };

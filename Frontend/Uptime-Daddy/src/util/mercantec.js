import { ACCOUNTS_URL } from "./api.jsx";
import { createPkcePair, randomUrlSafeString } from "./pkce.js";

const STATE_KEY = "mercantec_oauth_state";
const VERIFIER_KEY = "mercantec_oauth_verifier";

const ISSUER = (
  import.meta.env.VITE_MERCANTEC_ISSUER ?? "https://auth.mercantec.tech"
).replace(/\/+$/, "");

const CLIENT_ID = (import.meta.env.VITE_MERCANTEC_CLIENT_ID ?? "").trim();

/** Login-med-Mercantec vises kun når der er konfigureret et client_id. */
const MERCANTEC_ENABLED = Boolean(CLIENT_ID);

/**
 * redirect_uri skal matche præcist det, der er whitelistet hos Mercantec.
 * Vi udleder den fra den kørende origin, så den følger miljøet (localhost vs. prod).
 */
function getRedirectUri() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/mercantec/callback`;
}

const MERCANTEC_EXCHANGE_URL = `${ACCOUNTS_URL}/oauth/mercantec`;

/** Starter authorization code + PKCE-flowet ved at redirecte til Mercantec. */
async function startMercantecLogin() {
  if (!MERCANTEC_ENABLED) {
    throw new Error("Mercantec-login er ikke konfigureret.");
  }

  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = randomUrlSafeString(16);

  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  window.location.assign(`${ISSUER}/oauth/authorize?${params.toString()}`);
}

/** Læser og rydder den gemte state/verifier efter et callback. */
function consumeStoredPkce() {
  const state = sessionStorage.getItem(STATE_KEY);
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  return { state, codeVerifier };
}

export {
  MERCANTEC_ENABLED,
  MERCANTEC_EXCHANGE_URL,
  startMercantecLogin,
  consumeStoredPkce,
  getRedirectUri,
};

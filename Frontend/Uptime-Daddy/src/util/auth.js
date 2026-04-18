const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_TOKEN_KEY = ACCESS_TOKEN_KEY;

function getAuthToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function hasAuthToken() {
  return Boolean(getAccessToken());
}

function setAuthTokens({ accessToken, refreshToken }) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function parseJwtPayload(token) {
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getAuthPayload() {
  return parseJwtPayload(getAccessToken());
}

function getAuthHeaders() {
  const token = getAccessToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

export {
  ACCESS_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  getAuthToken,
  getAccessToken,
  getRefreshToken,
  hasAuthToken,
  setAuthTokens,
  clearAuthTokens,
  getAuthPayload,
  parseJwtPayload,
  getAuthHeaders,
};
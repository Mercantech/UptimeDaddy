import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "./auth";

const ACCOUNTS_URL =
  import.meta.env.VITE_ACCOUNTS_URL ?? "http://localhost:6969/accounts";
const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${ACCOUNTS_URL}/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuthTokens();
      return null;
    }

    const data = await response.json().catch(() => ({}));
    const nextAccessToken = data?.accessToken ?? data?.token;
    const nextRefreshToken = data?.refreshToken ?? refreshToken;

    if (!nextAccessToken) {
      clearAuthTokens();
      return null;
    }

    setAuthTokens({ accessToken: nextAccessToken, refreshToken: nextRefreshToken });
    return nextAccessToken;
  } catch {
    clearAuthTokens();
    return null;
  }
}

async function fetchCall({ url, method = "GET", body, withAuth = true }) {
  const requestBody = body == null ? undefined : JSON.stringify(body);

  const sendRequest = async (tokenOverride) => {
    const requestHeaders = {};

    if (requestBody != null) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (withAuth) {
      const token = tokenOverride ?? getAccessToken();
      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }
    }

    return fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
    });
  };

  let response = await sendRequest();

  if (response.status === 401 && withAuth) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      response = await sendRequest(nextAccessToken);
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
}

export { API_URL, ACCOUNTS_URL, fetchCall};
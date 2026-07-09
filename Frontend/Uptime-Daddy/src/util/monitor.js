import { API_URL } from "./api.jsx";

export function monitorFaviconUrl(monitorId) {
  return `${API_URL}/Monitors/${monitorId}/favicon`;
}

export function pathLatest(path) {
  return path?.latestMeasurement ?? path?.measurements?.[0] ?? null;
}

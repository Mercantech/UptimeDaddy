/** HTTP 2xx/3xx behandles som "oppe" (som typisk i uptime-overvågning). */
export function isUpStatusCode(code) {
  if (code == null || code === "") return false;
  const n = Number(code);
  return Number.isFinite(n) && n >= 200 && n < 400;
}

export function uptimeStatusLabel(code) {
  if (code == null) return "Ingen data";
  return isUpStatusCode(code) ? "Oppe" : "Nede";
}

/** Andel af målinger med HTTP 2xx–3xx (alle modtagne målinger for monitoren). */
export function computeUptimePercent(measurements) {
  if (!measurements?.length) return null;
  const up = measurements.filter((m) => isUpStatusCode(m.statusCode)).length;
  return (up / measurements.length) * 100;
}

/** HTTP 2xx behandles som "oppe" (matcher backend MonitorStatusEvaluator). */
export function isUpStatusCode(code) {
  if (code == null || code === "") return false;
  const n = Number(code);
  return Number.isFinite(n) && n >= 200 && n < 300;
}

export function isMeasurementUp(m) {
  if (!m) return false;
  if (!isUpStatusCode(m.statusCode)) return false;
  if (m.keywordMatched === false) return false;
  return true;
}

export function uptimeStatusLabel(code, measurement) {
  if (measurement) return isMeasurementUp(measurement) ? "Oppe" : "Nede";
  if (code == null) return "Ingen data";
  return isUpStatusCode(code) ? "Oppe" : "Nede";
}

export function computeUptimePercent(measurements) {
  if (!measurements?.length) return null;
  const up = measurements.filter((m) => isMeasurementUp(m)).length;
  return (up / measurements.length) * 100;
}

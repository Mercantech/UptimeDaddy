/**
 * Ping-interval fra API er i hele sekunder.
 * @param {number} totalSeconds
 * @returns {string} fx "5 timer", "1 time 12 minutter 3 sekunder"
 */
export function formatIntervalSeconds(totalSeconds) {
  const n = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;

  if (h === 0 && m === 0) {
    return `${n} ${n === 1 ? "sekund" : "sekunder"}`;
  }

  const parts = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "time" : "timer"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "minut" : "minutter"}`);
  if (s > 0) parts.push(`${s} ${s === 1 ? "sekund" : "sekunder"}`);
  return parts.join(" ");
}

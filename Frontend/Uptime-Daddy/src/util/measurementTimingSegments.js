/** Curl-tider er kumulative; splitter til ikke-overlappende faser (ms) — samme model som stablet graf. */
export function measurementToStackSegments(m) {
  if (!m) {
    return { dns: 0, tcp: 0, tls: 0, wait: 0, download: 0 };
  }
  const dns = Number(m.dnsLookupMs) || 0;
  const conn = Number(m.connectMs) || 0;
  const tlsEnd = Number(m.tlsHandshakeMs) || 0;
  const ttfb = Number(m.timeToFirstByteMs) || 0;
  const total = Number(m.totalTimeMs) || 0;

  const tcp = Math.max(0, conn - dns);
  const tls = Math.max(0, tlsEnd - conn);
  const wait = Math.max(0, ttfb - tlsEnd);
  const download = Math.max(0, total - ttfb);

  return { dns, tcp, tls, wait, download };
}

export function formatMsShort(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return null;
  const v = Number(ms);
  const t = v.toFixed(2);
  const trimmed = t.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  return `${trimmed}ms`;
}

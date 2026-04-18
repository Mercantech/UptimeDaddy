import { measurementToStackSegments, formatMsShort } from "../../util/measurementTimingSegments.js";

const DELTA_HINT = {
  connect: "TCP-forbindelse siden DNS (kumulativ Forbind. minus DNS)",
  tls: "TLS-handtryk siden TCP (kumulativ TLS minus Forbind.)",
  ttfb: "Ventetid til første byte siden TLS (kumulativ TTFB minus TLS)",
  total: "Download siden TTFB (kumulativ Total minus TTFB)",
};

/**
 * @param {object} props
 * @param {object | null} props.latest Seneste måling (curl-kumulative felter)
 * @param {"dns"|"connect"|"tls"|"ttfb"|"total"} props.kind
 */
function TimingCell({ latest, kind }) {
  if (!latest) return "-";

  const seg = measurementToStackSegments(latest);

  const cumRaw =
    kind === "dns"
      ? latest.dnsLookupMs
      : kind === "connect"
        ? latest.connectMs
        : kind === "tls"
          ? latest.tlsHandshakeMs
          : kind === "ttfb"
            ? latest.timeToFirstByteMs
            : latest.totalTimeMs;

  if (cumRaw == null || !Number.isFinite(Number(cumRaw))) return "-";

  const cum = formatMsShort(cumRaw);
  if (kind === "dns") {
    return (
      <span title="Kumulativ tid fra start (DNS)">{cum}</span>
    );
  }

  const deltaRaw =
    kind === "connect"
      ? seg.tcp
      : kind === "tls"
        ? seg.tls
        : kind === "ttfb"
          ? seg.wait
          : seg.download;

  const delta = formatMsShort(deltaRaw);
  const hint = DELTA_HINT[kind] ?? "";

  return (
    <div className="timing-cell">
      <div className="timing-cell__cum" title="Kumulativ tid fra start (curl)">
        {cum}
      </div>
      <div className="timing-cell__delta" title={hint}>
        Δ {delta}
      </div>
    </div>
  );
}

export default TimingCell;

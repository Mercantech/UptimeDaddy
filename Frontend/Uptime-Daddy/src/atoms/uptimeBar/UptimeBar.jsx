import { useMemo } from "react";
import { Icon } from "semantic-ui-react";
import { isMeasurementUp, uptimeStatusLabel, computeUptimePercent } from "../../util/uptimeStatus.js";
import "./uptimeBar.css";

const MAX_SEGMENTS = 24;

function formatTooltip(m) {
  if (!m) return "";
  const code = m.statusCode ?? "?";
  const at = m.createdAt
    ? new Date(m.createdAt).toLocaleString("da-DK", {
        dateStyle: "short",
        timeStyle: "medium",
      })
    : "";
  const up = isMeasurementUp(m);
  return `${up ? "Oppe" : "Nede"} · HTTP ${code}${at ? ` · ${at}` : ""}`;
}

function UptimeBar({ measurements = [], rollupSegments = null, rollupPercent = null }) {
  const latest = measurements[0];
  const up = rollupSegments
    ? rollupSegments[rollupSegments.length - 1] !== false
    : isMeasurementUp(latest);
  const label = rollupSegments ? (up ? "Oppe" : "Nede") : uptimeStatusLabel(latest?.statusCode, latest);
  const pct = rollupPercent ?? computeUptimePercent(measurements);
  const pctLabel =
    pct != null
      ? `${pct.toLocaleString("da-DK", { maximumFractionDigits: 4, minimumFractionDigits: 1 })}% oppe`
      : null;

  const segments = useMemo(() => {
    if (rollupSegments) {
      return rollupSegments.slice(-MAX_SEGMENTS);
    }
    const slice = measurements.slice(0, MAX_SEGMENTS);
    return [...slice].reverse();
  }, [measurements, rollupSegments]);

  const padded = useMemo(() => {
    const out = [...segments];
    while (out.length < MAX_SEGMENTS) {
      out.unshift(null);
    }
    return out;
  }, [segments]);

  const hasData = rollupSegments?.some((s) => s != null) || measurements?.length > 0;

  if (!hasData) {
    return (
      <div className="uptime-bar uptime-bar--empty">
        <div className="uptime-bar__meta">
          <span className="uptime-bar__badge uptime-bar__badge--unknown">
            <Icon name="question circle outline" />
            Ingen målinger
          </span>
          <span className="uptime-bar__percent uptime-bar__percent--muted">—</span>
        </div>
        <div className="uptime-bar__strip" aria-hidden>
          {Array.from({ length: MAX_SEGMENTS }).map((_, i) => (
            <div key={i} className="uptime-bar__segment uptime-bar__segment--empty" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="uptime-bar">
      <div className="uptime-bar__meta">
        <span
          className={`uptime-bar__badge ${up ? "uptime-bar__badge--up" : "uptime-bar__badge--down"}`}
          title={`Seneste: HTTP ${latest?.statusCode ?? "-"}`}
        >
          <span className="uptime-bar__pulse" aria-hidden />
          {label}
        </span>
        {pctLabel && (
          <span
            className={`uptime-bar__percent ${up ? "uptime-bar__percent--ok" : "uptime-bar__percent--bad"}`}
            title="Baseret på gemte målinger (HTTP 2xx tæller som oppe)"
          >
            {pctLabel}
          </span>
        )}
      </div>
      <div className="uptime-bar__strip" role="img" aria-label={`Seneste checks: ${label}`}>
        {padded.map((m, i) => {
          if (rollupSegments) {
            if (m == null) {
              return <div key={`e-${i}`} className="uptime-bar__segment uptime-bar__segment--empty" />;
            }
            return (
              <div
                key={`r-${i}`}
                className={`uptime-bar__segment ${m ? "uptime-bar__segment--up" : "uptime-bar__segment--down"}`}
              />
            );
          }
          if (m == null) {
            return <div key={`e-${i}`} className="uptime-bar__segment uptime-bar__segment--empty" />;
          }
          return (
            <div
              key={m.id ?? `${i}-${m.createdAt}`}
              className={`uptime-bar__segment ${
                isMeasurementUp(m) ? "uptime-bar__segment--up" : "uptime-bar__segment--down"
              }`}
              title={formatTooltip(m)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default UptimeBar;

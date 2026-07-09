import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { useParams } from "react-router-dom";
import { Message, Table, Label, Icon } from "semantic-ui-react";
import { API_URL, fetchCall } from "../../util/api.jsx";
import UptimeBar from "../../atoms/uptimeBar/UptimeBar.jsx";
import accents from "../../util/status/stautsAccent.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";
import Loader from "../../atoms/loader/loader.jsx";
import logo from "../../assets/logo.png";
import "../../molecules/table/style.css";
import "./publicBoard.css";
import TimingCell from "../../atoms/timingCell/TimingCell.jsx";
import { monitorFaviconUrl, pathLatest } from "../../util/monitor.js";

const POLL_MS = Number(import.meta.env.VITE_DASHBOARD_POLL_MS) || 30_000;
const SITE_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

function FaviconImage({ src, className }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return null;

  return <img src={src} alt="" className={className} onError={() => setFailed(true)} />;
}

function formatIncident(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("da-DK", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function formatBoardTitle(name) {
  if (!name) return "Status";
  return name.trim().toUpperCase();
}

function PublicBoardShell({ children }) {
  return (
    <div className="public-board">
      <header className="public-board__header">
        <a
          className="public-board__brand"
          href={SITE_ORIGIN || "/"}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="UptimeDaddy"
        >
          <img src={logo} alt="" className="public-board__logo" />
          <span className="public-board__wordmark">
            <span className="public-board__wordmark-uptime">Uptime</span>
            <span className="public-board__wordmark-daddy">Daddy</span>
          </span>
        </a>
        <span className="public-board__badge">
          <span className="public-board__badge-dot" aria-hidden />
          Live status
        </span>
      </header>
      {children}
    </div>
  );
}

function PublicBoardPage() {
  const { boardId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const load = useCallback(async () => {
    if (!boardId) return;
    try {
      const json = await fetchCall({
        url: `${API_URL}/public/boards/${encodeURIComponent(boardId)}`,
        withAuth: false,
      });
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setData(null);
      setError(e?.message ?? "Kunne ikke hente board.");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!boardId || POLL_MS < 5000) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [boardId, load]);

  const displayTitle = useMemo(() => formatBoardTitle(data?.name), [data?.name]);

  useEffect(() => {
    if (!data?.name) return;
    document.title = `${displayTitle} — UptimeDaddy`;
  }, [data?.name, displayTitle]);

  if (!boardId) {
    return (
      <PublicBoardShell>
        <div className="public-board__state">
          <Message negative className="public-board__state-message" header="Manglende link">
            URL&apos;en mangler et board-id.
          </Message>
        </div>
      </PublicBoardShell>
    );
  }

  if (loading && !data) {
    return (
      <PublicBoardShell>
        <div className="public-board__state">
          <Loader isLoading text="Henter status page…" />
        </div>
      </PublicBoardShell>
    );
  }

  if (error || !data) {
    return (
      <PublicBoardShell>
        <div className="public-board__state">
          <Message negative className="public-board__state-message" header="Board findes ikke eller er ikke publiceret">
            {error || "Tjek at linket er korrekt, og at ejeren har slået deling til."}
          </Message>
        </div>
      </PublicBoardShell>
    );
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const incidents = Array.isArray(data.incidents) ? data.incidents : [];
  const operational = data.overallStatus === "operational";
  const monitorsUp = items.filter((row) => row.rollup?.isUp).length;
  const uptimePercent =
    items.length > 0
      ? ((monitorsUp / items.length) * 100).toLocaleString("da-DK", {
          maximumFractionDigits: 1,
          minimumFractionDigits: 0,
        })
      : "—";

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PublicBoardShell>
      <main className="public-board__main">
        <section className="public-board__hero">
          <p className="public-board__board-id">Status page</p>
          <h1 className="public-board__title">{displayTitle}</h1>
          <p className="public-board__subtitle">
            Offentlig overvågning — opdateres automatisk hvert {Math.round(POLL_MS / 1000)}. sekund
            {lastUpdated ? ` · Senest ${lastUpdated.toLocaleTimeString("da-DK", { timeStyle: "short" })}` : ""}
          </p>

          <div
            className={`public-board__status ${operational ? "public-board__status--operational" : "public-board__status--degraded"}`}
          >
            <div className="public-board__status-icon">
              <Icon name={operational ? "check circle" : "exclamation triangle"} size="large" />
            </div>
            <div className="public-board__status-text">
              <span className="public-board__status-label">
                {data.overallLabel || (operational ? "Alle systemer operative" : "Delvis nedbrud")}
              </span>
              <span className="public-board__status-meta">
                {items.length} komponent{items.length === 1 ? "" : "er"} på dette board
              </span>
            </div>
          </div>
        </section>

        <div className="public-board__stats">
          <div className="public-board__stat-card public-board__stat-card--accent">
            <div className="public-board__stat-label">
              Komponenter
              <span className="public-board__stat-icon">
                <Icon name="server" />
              </span>
            </div>
            <div className="public-board__stat-value">{items.length}</div>
          </div>
          <div className={`public-board__stat-card ${operational ? "public-board__stat-card--accent" : "public-board__stat-card--warn"}`}>
            <div className="public-board__stat-label">
              Operative
              <span className="public-board__stat-icon">
                <Icon name={operational ? "check circle" : "warning sign"} />
              </span>
            </div>
            <div className="public-board__stat-value">
              {monitorsUp}/{items.length || 0}
            </div>
          </div>
          <div className="public-board__stat-card">
            <div className="public-board__stat-label">
              Uptime
              <span className="public-board__stat-icon">
                <Icon name="chart line" />
              </span>
            </div>
            <div className="public-board__stat-value">{uptimePercent}{uptimePercent !== "—" ? "%" : ""}</div>
          </div>
        </div>

        <section className="public-board__section">
          <h2 className="public-board__section-header">
            <Icon name="heartbeat" />
            Komponenter
          </h2>
          {items.length === 0 ? (
            <p className="public-board__empty">Ingen komponenter er tilføjet til dette board endnu.</p>
          ) : (
            <div className="public-board__panel">
              <Table celled className="monitor-table">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Komponent</Table.HeaderCell>
                    <Table.HeaderCell>Oversigt</Table.HeaderCell>
                    <Table.HeaderCell>Checks</Table.HeaderCell>
                    <Table.HeaderCell>Interval</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Total</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {items.map((row, idx) => {
                    const rollup = row.rollup ?? {};
                    const paths = row.paths ?? [];
                    const label = row.displayLabel?.trim() || row.baseUrl;
                    const faviconSrc = monitorFaviconUrl(row.monitorId);
                    const monitorKey = row.monitorId ?? idx;
                    const isOpen = expanded.has(monitorKey);
                    const latest = { statusCode: rollup.isUp ? 200 : 503, totalTimeMs: rollup.latestTotalTimeMs };

                    return (
                      <Fragment key={monitorKey}>
                        <Table.Row>
                          <Table.Cell>
                            <div className="url-cell-content">
                              {paths.length > 1 && (
                                <Icon
                                  name={isOpen ? "chevron down" : "chevron right"}
                                  onClick={(e) => toggleExpand(monitorKey, e)}
                                  style={{ cursor: "pointer", marginRight: "0.25rem" }}
                                />
                              )}
                              {faviconSrc ? <FaviconImage src={faviconSrc} className="favicon-icon" /> : null}
                              <span>{label}</span>
                              {row.sslExpiresAt && (
                                <Label size="mini" color="blue" style={{ marginLeft: "0.35rem" }}>
                                  SSL
                                </Label>
                              )}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="uptime-bar-cell">
                            <UptimeBar rollupSegments={rollup.segments} rollupPercent={rollup.uptimePercent} />
                          </Table.Cell>
                          <Table.Cell textAlign="center">{(rollup.totalChecks ?? 0).toLocaleString("da-DK")}</Table.Cell>
                          <Table.Cell>{formatIntervalSeconds(row.intervalTime ?? 0)}</Table.Cell>
                          <Table.Cell>
                            <Label color={accents.statusAccent(latest.statusCode)}>{rollup.isUp ? "Oppe" : "Nede"}</Label>
                          </Table.Cell>
                          <Table.Cell>
                            <TimingCell latest={latest} kind="total" />
                          </Table.Cell>
                        </Table.Row>
                        {isOpen &&
                          paths.map((p) => {
                            const pathLatestData = pathLatest(p);
                            return (
                              <Table.Row key={p.id} className="monitor-table__path-row">
                                <Table.Cell>
                                  <div className="url-cell-content url-cell-content--indent">
                                    <span>{p.displayUrl || p.path}</span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="uptime-bar-cell">
                                  <UptimeBar rollupSegments={p.segments} rollupPercent={p.uptimePercent} />
                                </Table.Cell>
                                <Table.Cell textAlign="center">
                                  {(p.measurementCount ?? p.measurements?.length ?? 0).toLocaleString("da-DK")}
                                </Table.Cell>
                                <Table.Cell>—</Table.Cell>
                                <Table.Cell>
                                  <Label color={accents.statusAccent(pathLatestData?.statusCode)}>
                                    {pathLatestData?.statusCode ?? "-"}
                                  </Label>
                                </Table.Cell>
                                <Table.Cell>
                                  <TimingCell latest={pathLatestData} kind="total" />
                                </Table.Cell>
                              </Table.Row>
                            );
                          })}
                      </Fragment>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          )}
        </section>

        {incidents.length > 0 && (
          <section className="public-board__section">
            <h2 className="public-board__section-header">
              <Icon name="history" />
              Seneste hændelser
            </h2>
            <div className="public-board__panel">
              <Table celled className="monitor-table">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Tidspunkt</Table.HeaderCell>
                    <Table.HeaderCell>Komponent</Table.HeaderCell>
                    <Table.HeaderCell>Hændelse</Table.HeaderCell>
                    <Table.HeaderCell>HTTP</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {incidents.map((inc, i) => (
                    <Table.Row key={i}>
                      <Table.Cell>{formatIncident(inc.occurredAt)}</Table.Cell>
                      <Table.Cell>{inc.websiteUrl}</Table.Cell>
                      <Table.Cell>{inc.isUp ? "Genoprettet" : "Nedbrud"}</Table.Cell>
                      <Table.Cell>{inc.statusCode ?? "—"}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </section>
        )}

        <footer className="public-board__footer">
          <div className="public-board__footer-brand">
            <img src={logo} alt="" className="public-board__footer-logo" />
            <span>Overvågning drevet af UptimeDaddy</span>
          </div>
          <a className="public-board__footer-link" href={SITE_ORIGIN || "/"} target="_blank" rel="noopener noreferrer">
            {typeof window !== "undefined" ? window.location.host : "UptimeDaddy"}
          </a>
        </footer>
      </main>
    </PublicBoardShell>
  );
}

export default PublicBoardPage;

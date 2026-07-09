import { useCallback, useEffect, useState, Fragment } from "react";
import { useParams } from "react-router-dom";
import { Container, Header, Message, Table, Label, Icon, Segment } from "semantic-ui-react";
import { API_URL, fetchCall } from "../../util/api.jsx";
import UptimeBar from "../../atoms/uptimeBar/UptimeBar.jsx";
import accents from "../../util/status/stautsAccent.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";
import "../../molecules/table/style.css";
import { monitorFaviconUrl } from "../../util/monitor.js";

const POLL_MS = Number(import.meta.env.VITE_DASHBOARD_POLL_MS) || 30_000;

function formatIncident(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("da-DK", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function PublicBoardPage() {
  const { boardId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (!boardId) {
    return (
      <Container style={{ marginTop: "6rem" }}>
        <Message negative>Manglende link.</Message>
      </Container>
    );
  }

  if (loading && !data) {
    return (
      <Container style={{ marginTop: "6rem", color: "#8fb8a8" }}>
        Henter status page…
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container style={{ marginTop: "6rem" }}>
        <Message negative header="Board findes ikke eller er ikke publiceret">
          {error || "Tjek at linket er korrekt, og at ejeren har slået deling til."}
        </Message>
      </Container>
    );
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const incidents = Array.isArray(data.incidents) ? data.incidents : [];
  const operational = data.overallStatus === "operational";

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
    <Container style={{ marginTop: "6rem", paddingBottom: "2rem" }}>
      <Header as="h1" style={{ color: "#B0E4CC", marginBottom: "0.35rem", fontWeight: 700 }}>
        {data.name || "Status"}
      </Header>
      <p style={{ color: "#6d9084", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Offentlig status page — opdateres automatisk.
      </p>

      <Segment
        style={{
          backgroundColor: operational ? "#0d2a1f" : "#2a1a0d",
          border: `1px solid ${operational ? "#2f6d59" : "#8a5a2f"}`,
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Icon name={operational ? "check circle" : "exclamation triangle"} color={operational ? "green" : "orange"} />
          <span style={{ color: "#e8fff6", fontSize: "1.1rem", fontWeight: 600 }}>
            {data.overallLabel || (operational ? "Alle systemer operative" : "Delvis nedbrud")}
          </span>
        </div>
      </Segment>

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
                      {faviconSrc ? <img src={faviconSrc} alt="" className="favicon-icon" /> : null}
                      <span>{label}</span>
                      {row.sslExpiresAt && (
                        <Label size="mini" color="blue" style={{ marginLeft: "0.35rem" }}>SSL</Label>
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
                  <Table.Cell><TimingCell latest={latest} kind="total" /></Table.Cell>
                </Table.Row>
                {isOpen &&
                  paths.map((p) => {
                    const m = p.measurements?.[0];
                    return (
                      <Table.Row key={p.id} className="monitor-table__path-row">
                        <Table.Cell>
                          <div className="url-cell-content url-cell-content--indent">
                            <span>{p.displayUrl || p.path}</span>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="uptime-bar-cell">
                          <UptimeBar measurements={p.measurements ?? []} />
                        </Table.Cell>
                        <Table.Cell textAlign="center">{(p.measurements?.length ?? 0).toLocaleString("da-DK")}</Table.Cell>
                        <Table.Cell>—</Table.Cell>
                        <Table.Cell>
                          <Label color={accents.statusAccent(m?.statusCode)}>{m?.statusCode ?? "-"}</Label>
                        </Table.Cell>
                        <Table.Cell><TimingCell latest={m} kind="total" /></Table.Cell>
                      </Table.Row>
                    );
                  })}
              </Fragment>
            );
          })}
        </Table.Body>
      </Table>

      {incidents.length > 0 && (
        <>
          <Header as="h3" style={{ color: "#408A71", marginTop: "2rem" }}>
            Seneste hændelser
          </Header>
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
        </>
      )}
    </Container>
  );
}

export default PublicBoardPage;

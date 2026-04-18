import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Header, Message, Table, Label, Icon } from "semantic-ui-react";
import { API_URL, fetchCall } from "../../util/api.jsx";
import UptimeBar from "../../atoms/uptimeBar/UptimeBar.jsx";
import accents from "../../util/status/stautsAccent.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";
import "../../molecules/table/style.css";
import TimingCell from "../../atoms/timingCell/TimingCell.jsx";

const POLL_MS = Number(import.meta.env.VITE_DASHBOARD_POLL_MS) || 30_000;

function PublicBoardPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const json = await fetchCall({
        url: `${API_URL}/public/boards/${encodeURIComponent(token)}`,
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
  }, [token]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!token || POLL_MS < 5000) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [token, load]);

  if (!token) {
    return (
      <Container style={{ marginTop: "6rem" }}>
        <Message negative>Manglende link.</Message>
      </Container>
    );
  }

  if (loading && !data) {
    return (
      <Container style={{ marginTop: "6rem", color: "#8fb8a8" }}>
        Henter delt dashboard…
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

  return (
    <Container style={{ marginTop: "6rem", paddingBottom: "2rem" }}>
      <Header
        as="h1"
        style={{ color: "#B0E4CC", marginBottom: "0.35rem", fontWeight: 700 }}
      >
        {data.name || "Delt dashboard"}
      </Header>
      <p style={{ color: "#6d9084", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Offentlig visning — opdateres automatisk.
      </p>

      <Table celled className="monitor-table">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>URL</Table.HeaderCell>
            <Table.HeaderCell>Oversigt</Table.HeaderCell>
            <Table.HeaderCell>Antal checks</Table.HeaderCell>
            <Table.HeaderCell>Ping-interval</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell title="Kumulativ tid fra start (curl). DNS er første fase.">DNS</Table.HeaderCell>
            <Table.HeaderCell title="Kumulativ Forbind.; Δ = TCP efter DNS.">Forbind.</Table.HeaderCell>
            <Table.HeaderCell title="Kumulativ TLS; Δ = TLS efter TCP.">TLS</Table.HeaderCell>
            <Table.HeaderCell title="Kumulativ TTFB; Δ = ventetid efter TLS.">TTFB</Table.HeaderCell>
            <Table.HeaderCell title="Kumulativ total; Δ = download efter TTFB.">Total</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((row, idx) => {
            const measurements = row.measurements ?? [];
            const latest = measurements[0];
            const checkCount = measurements.length;
            const label = row.displayLabel?.trim() || row.url;
            const faviconSrc = row.faviconBase64
              ? `data:image/x-icon;base64,${row.faviconBase64}`
              : null;
            return (
              <Table.Row key={`${row.url}-${idx}`}>
                <Table.Cell>
                  <div className="url-cell-content">
                    {faviconSrc ? (
                      <img
                        src={faviconSrc}
                        alt=""
                        className="favicon-icon"
                      />
                    ) : (
                      <span className="favicon-placeholder">
                        <Icon name="file image outline" />
                      </span>
                    )}
                    <span title={row.url}>{label}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="uptime-bar-cell">
                  <UptimeBar measurements={measurements} />
                </Table.Cell>
                <Table.Cell textAlign="center">
                  {checkCount.toLocaleString("da-DK")}
                </Table.Cell>
                <Table.Cell>
                  <span title={`${row.intervalTime ?? 0} sekunder`}>
                    {formatIntervalSeconds(row.intervalTime ?? 0)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Label color={accents.statusAccent(latest?.statusCode)}>
                    {latest?.statusCode ?? "-"}
                  </Label>
                </Table.Cell>
                <Table.Cell><TimingCell latest={latest} kind="dns" /></Table.Cell>
                <Table.Cell><TimingCell latest={latest} kind="connect" /></Table.Cell>
                <Table.Cell><TimingCell latest={latest} kind="tls" /></Table.Cell>
                <Table.Cell><TimingCell latest={latest} kind="ttfb" /></Table.Cell>
                <Table.Cell><TimingCell latest={latest} kind="total" /></Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </Container>
  );
}

export default PublicBoardPage;

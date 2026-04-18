import { useState, useEffect, useMemo }   from "react";
import { Modal, Button, Input, Message }  from "semantic-ui-react";
import Cards                              from "../../atoms/cards/cards";
import statusIcon                         from "../../util/status/statusIcon.jsx";
import accents                            from "../../util/status/stautsAccent.jsx";
import { API_URL, fetchCall }             from "../../util/api.jsx";
import StackedTimingChart                 from "../../atoms/graphs/stackedTimingChart.jsx";
import Loader                             from "../../atoms/loader/loader.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";

/** API returnerer ældste først; UI forventer nyeste først (som /with-measurements). */
function normalizeMeasurementsFromApi(rows) {
  const asc = Array.isArray(rows) ? rows : [];
  const desc = [...asc].reverse();
  return desc.map((m, i) => ({
    ...m,
    id: m.id ?? `tmp-${i}-${m.createdAt ?? i}`,
  }));
}

function MonitorModal({ monitor, onClose, onDataChanged, onMonitorPatched }) {
  const [loading, setLoading] = useState(false);

  const getMonitorInterval = (website) => {
    if (!website) return 60;
    return Number(website.intervalTime ?? 60);
  };

  /** Streng i feltet så brugeren kan slette alt midlertidigt uden at React “snapper” tilbage. */
  const [intervalStr, setIntervalStr] = useState(() =>
    monitor ? String(getMonitorInterval(monitor)) : "60"
  );

  const [chartHoursStr, setChartHoursStr] = useState("");

  useEffect(() => {
    if (monitor) {
      setIntervalStr(String(getMonitorInterval(monitor)));
      setChartHoursStr("");
    }
  }, [monitor]);

  const parsedInterval = useMemo(() => {
    const t = intervalStr.trim();
    if (t === "") return null;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n)) return null;
    return Math.max(1, n);
  }, [intervalStr]);

  const parsedChartHours = useMemo(() => {
    const t = chartHoursStr.trim();
    if (t === "") return null;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(8760, n);
  }, [chartHoursStr]);

  const displayInterval = parsedInterval ?? (monitor ? getMonitorInterval(monitor) : 60);

  const intervalDirty =
    monitor &&
    parsedInterval !== null &&
    parsedInterval !== Number(monitor.intervalTime ?? 60);

  const wantChartRefetch = Boolean(parsedChartHours);

  const canSave = Boolean(
    monitor &&
    ((parsedInterval !== null && intervalDirty) || wantChartRefetch)
  );

  if (!monitor && !loading) return null;

  const latest = monitor.measurements[0];

  const items = [
    { header: latest ? String(latest.statusCode) : "-", description: "HTTP-status", icon: statusIcon(latest?.statusCode), accent: accents.statusAccent(latest?.statusCode) },
    { header: formatIntervalSeconds(displayInterval), description: "Ping-interval (redigér ovenfor)", icon: "refresh", accent: "blue" },
    { header: latest?.dnsLookupMs != null ? `${latest.dnsLookupMs} ms` : "-", description: "DNS-opslag", icon: "search", accent: accents.dnsAccent(latest?.dnsLookupMs) },
    { header: latest?.connectMs != null ? `${latest.connectMs} ms` : "-", description: "Forbindelse", icon: "plug", accent: accents.connectAccent(latest?.connectMs) },
    { header: latest?.tlsHandshakeMs != null ? `${latest.tlsHandshakeMs} ms` : "-", description: "TLS-handtryk", icon: "lock", accent: accents.tlsAccent(latest?.tlsHandshakeMs) },
    { header: latest?.timeToFirstByteMs != null ? `${latest.timeToFirstByteMs} ms` : "-", description: "Tid til første byte", icon: "clock", accent: accents.tfbAccent(latest?.timeToFirstByteMs) },
    { header: latest?.totalTimeMs != null ? `${latest.totalTimeMs} ms` : "-", description: "Samlet responstid", icon: "hourglass half", accent: accents.ttAccent(latest?.totalTimeMs) },
  ];


  const handleDelete = async (website) => {
    setLoading(true);
    let deleteSucceeded = false;

    try {
      await fetchCall({
        url: `${API_URL}/Websites/${website.id}`,
        method: "DELETE",
      });

      deleteSucceeded = true;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setLoading(false);
      onClose();
      if (deleteSucceeded) {
        onDataChanged?.();
      }
    }
  };

  const handleSave = async (website) => {
    if (!canSave) return;

    setLoading(true);

    try {
      let next = { ...website };

      if (parsedInterval !== null && intervalDirty) {
        const res = await fetchCall({
          url: `${API_URL}/Websites/${website.id}/interval`,
          method: "PUT",
          body: { intervalTime: parsedInterval },
        });
        next = {
          ...next,
          id: res.id,
          url: res.url,
          intervalTime: res.intervalTime,
          userId: res.userId,
          faviconBase64: res.faviconBase64,
          measurements: next.measurements,
        };
        setIntervalStr(String(res.intervalTime));
      }

      if (wantChartRefetch) {
        const rows = await fetchCall({
          url: `${API_URL}/Measurements/website/${website.id}?hours=${parsedChartHours}`,
        });
        next = {
          ...next,
          measurements: normalizeMeasurementsFromApi(rows),
        };
      }

      onMonitorPatched?.(next);

      if (!wantChartRefetch) {
        onDataChanged?.();
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      onClose();
    } catch (e) {
      console.error(e);
      window.alert(
        `Kunne ikke gemme / hente data: ${e?.message ?? e}\n\n(Tjek netværk, login og at API kører.)`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {monitor && (
    <Modal open={Boolean(monitor)} onClose={onClose} size="large">
      <Loader isLoading={loading} text="Opdaterer website…" />
      <Modal.Header style={{ backgroundColor: "#091413", color: "#408A71", borderBottom: "1px solid #2f6d59" }}>
        <span>Monitor-detaljer</span>
        {monitor?.url ? (
          <div style={{ color: "#8aa89c", fontSize: "0.9rem", marginTop: "6px", wordBreak: "break-all" }}>{monitor.url}</div>
        ) : null}
      </Modal.Header>

      <Modal.Content style={{ backgroundColor: "#091413" }}>
        <Message info style={{ backgroundColor: "#0B1D19", color: "#B0E4CC", border: "1px solid #2f6d59", boxShadow: "none" }}>
          <Message.Header style={{ color: "#408A71" }}>Gem ændringer</Message.Header>
          <p style={{ margin: "0.5em 0 0", opacity: 0.95 }}>
            Klik <strong>Gem nedenfor</strong> for at sende interval til API (PUT) og/eller hente målinger til grafen (GET). Kun felter du ændrer, udløser kald — tjek fanen Netværk i browseren.
          </p>
        </Message>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "flex-end",
            marginBottom: "1.25rem",
            padding: "14px",
            borderRadius: "8px",
            border: "1px solid #2f6d59",
            backgroundColor: "#0B1D19",
          }}
        >
          <div>
            <div style={{ color: "#B0E4CC", fontSize: "0.85rem", marginBottom: "6px" }}>
              Ping-interval (sekunder) — gemmes på serveren
            </div>
            <Input
              size="small"
              type="number"
              min={1}
              step={1}
              value={intervalStr}
              onChange={(e) => setIntervalStr(e.target.value)}
              label={{ basic: true, content: "Sekunder" }}
              labelPosition="right"
              placeholder="fx 300"
              style={{ width: "220px", backgroundColor: "#091413", border: "1px solid #2f6d59", borderRadius: "6px", color: "#B0E4CC" }}
              input={{ style: { backgroundColor: "#091413", color: "#B0E4CC", borderRadius: "6px", padding: "10px" } }}
            />
            <div style={{ color: "#8aa89c", fontSize: "0.78rem", marginTop: "6px" }}>
              Vises som {formatIntervalSeconds(displayInterval)}
            </div>
          </div>
          <div>
            <div style={{ color: "#B0E4CC", fontSize: "0.85rem", marginBottom: "6px" }}>
              Graf: seneste timer (valgfrit)
            </div>
            <Input
              size="small"
              type="number"
              min={1}
              max={8760}
              step={1}
              value={chartHoursStr}
              onChange={(e) => setChartHoursStr(e.target.value)}
              label={{ basic: true, content: "Timer" }}
              labelPosition="right"
              placeholder="fx 24 — tom = ikke hente"
              style={{ width: "260px", backgroundColor: "#091413", border: "1px solid #2f6d59", borderRadius: "6px", color: "#B0E4CC" }}
              input={{ style: { backgroundColor: "#091413", color: "#B0E4CC", borderRadius: "6px", padding: "10px" } }}
            />
            <div style={{ color: "#8aa89c", fontSize: "0.78rem", marginTop: "6px" }}>
              Udfyld og gem for GET mod <code style={{ color: "#B0E4CC" }}>/Measurements/website/…?hours=</code>
            </div>
          </div>
        </div>

        <Cards items={items} />
        <StackedTimingChart data={monitor} />
      </Modal.Content>

      <Modal.Actions style={{ backgroundColor: "#091413", borderTop: "1px solid #2f6d59" }}>
        <Button onClick={onClose}>
          Luk
        </Button>
        <Button onClick={() => handleDelete(monitor)} negative disabled={loading}>
          Slet Website
        </Button>
        <Button
          onClick={() => handleSave(monitor)}
          primary
          disabled={loading || !canSave}
          style={{ backgroundColor: "#1F8B68", borderColor: "#2f6d59" }}
        >
          Gem
        </Button>
      </Modal.Actions>
    </Modal>
    )}
    </>
  );
}

export default MonitorModal;
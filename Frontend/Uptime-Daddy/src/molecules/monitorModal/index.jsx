import { useState, useEffect, useMemo } from "react";
import { Modal, Button, Input, Checkbox, Icon, Label } from "semantic-ui-react";
import { Link } from "react-router-dom";
import "./monitorModal.css";
import Cards from "../../atoms/cards/cards";
import statusIcon from "../../util/status/statusIcon.jsx";
import accents from "../../util/status/stautsAccent.jsx";
import { API_URL, fetchCall } from "../../util/api.jsx";
import StackedTimingChart from "../../atoms/graphs/stackedTimingChart.jsx";
import Loader from "../../atoms/loader/loader.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";

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
  const isPath = monitor?.mode === "path";
  const parentMonitor = isPath ? monitor.monitor : monitor;
  const pathId = isPath ? monitor.id : null;

  const getMonitorInterval = (m) => {
    if (!m) return 60;
    return Number(m.intervalTime ?? 60);
  };

  const [intervalStr, setIntervalStr] = useState(() =>
    parentMonitor ? String(getMonitorInterval(parentMonitor)) : "60",
  );
  const [chartHoursStr, setChartHoursStr] = useState("");
  const [keywordStr, setKeywordStr] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [channelOverrideStr, setChannelOverrideStr] = useState("");
  const [initialDiscord, setInitialDiscord] = useState({ enabled: false, channel: "" });
  const [notifLoaded, setNotifLoaded] = useState(false);

  useEffect(() => {
    if (parentMonitor) setIntervalStr(String(getMonitorInterval(parentMonitor)));
    if (isPath) setKeywordStr(monitor.keyword ?? "");
    setChartHoursStr("");
  }, [monitor]);

  useEffect(() => {
    if (!isPath || !pathId) {
      setNotifLoaded(false);
      return;
    }
    let cancelled = false;
    setNotifLoaded(false);
    (async () => {
      try {
        const data = await fetchCall({
          url: `${API_URL}/discord/paths/${pathId}/notifications`,
          method: "GET",
        });
        if (cancelled) return;
        const ch = (data.channelIdOverride ?? "").trim();
        const en = Boolean(data.notificationEnabled);
        setNotifEnabled(en);
        setChannelOverrideStr(data.channelIdOverride ?? "");
        setInitialDiscord({ enabled: en, channel: ch });
      } catch {
        if (!cancelled) {
          setNotifEnabled(false);
          setChannelOverrideStr("");
          setInitialDiscord({ enabled: false, channel: "" });
        }
      } finally {
        if (!cancelled) setNotifLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathId, isPath]);

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

  const displayInterval = parsedInterval ?? (parentMonitor ? getMonitorInterval(parentMonitor) : 60);

  const intervalDirty =
    !isPath &&
    parentMonitor &&
    parsedInterval !== null &&
    parsedInterval !== Number(parentMonitor.intervalTime ?? 60);

  const wantChartRefetch = Boolean(parsedChartHours);
  const keywordDirty = isPath && keywordStr.trim() !== (monitor.keyword ?? "").trim();

  const discordDirty =
    isPath &&
    notifLoaded &&
    (notifEnabled !== initialDiscord.enabled ||
      channelOverrideStr.trim() !== initialDiscord.channel);

  const canSave = Boolean(
    monitor &&
      ((parsedInterval !== null && intervalDirty) ||
        wantChartRefetch ||
        discordDirty ||
        keywordDirty),
  );

  if (!monitor && !loading) return null;

  const measurements = isPath ? (monitor.measurements ?? []) : [];
  const latest = measurements[0];

  const items = [
    {
      header: latest ? String(latest.statusCode) : parentMonitor?.rollup?.latestStatusCode ?? "-",
      description: "HTTP-status",
      icon: statusIcon(latest?.statusCode ?? parentMonitor?.rollup?.latestStatusCode),
      accent: accents.statusAccent(latest?.statusCode ?? parentMonitor?.rollup?.latestStatusCode),
    },
    {
      header: formatIntervalSeconds(displayInterval),
      description: "Ping-interval",
      icon: "refresh",
      accent: "blue",
    },
    {
      header: latest?.dnsLookupMs != null ? `${latest.dnsLookupMs} ms` : "-",
      description: "DNS-opslag",
      icon: "search",
      accent: accents.dnsAccent(latest?.dnsLookupMs),
    },
    {
      header: latest?.connectMs != null ? `${latest.connectMs} ms` : "-",
      description: "Forbindelse",
      icon: "plug",
      accent: accents.connectAccent(latest?.connectMs),
    },
    {
      header: latest?.tlsHandshakeMs != null ? `${latest.tlsHandshakeMs} ms` : "-",
      description: "TLS-handtryk",
      icon: "lock",
      accent: accents.tlsAccent(latest?.tlsHandshakeMs),
    },
    {
      header: latest?.timeToFirstByteMs != null ? `${latest.timeToFirstByteMs} ms` : "-",
      description: "Tid til første byte",
      icon: "clock",
      accent: accents.tfbAccent(latest?.timeToFirstByteMs),
    },
    {
      header: latest?.totalTimeMs != null ? `${latest.totalTimeMs} ms` : "-",
      description: "Samlet responstid",
      icon: "hourglass half",
      accent: accents.ttAccent(latest?.totalTimeMs),
    },
  ];

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (isPath) {
        await fetchCall({
          url: `${API_URL}/Monitors/paths/${pathId}`,
          method: "DELETE",
        });
      } else {
        await fetchCall({
          url: `${API_URL}/Monitors/${parentMonitor.id}`,
          method: "DELETE",
        });
      }
      onClose();
      onDataChanged?.();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      let nextMonitor = { ...parentMonitor };

      if (!isPath && parsedInterval !== null && intervalDirty) {
        const res = await fetchCall({
          url: `${API_URL}/Monitors/${parentMonitor.id}/interval`,
          method: "PUT",
          body: { intervalTime: parsedInterval },
        });
        nextMonitor = { ...nextMonitor, ...res, paths: nextMonitor.paths };
        setIntervalStr(String(res.intervalTime));
      }

      if (isPath && keywordDirty) {
        await fetchCall({
          url: `${API_URL}/Monitors/paths/${pathId}`,
          method: "PUT",
          body: { keyword: keywordStr.trim() || null },
        });
      }

      if (discordDirty) {
        await fetchCall({
          url: `${API_URL}/discord/paths/${pathId}/notifications`,
          method: "PUT",
          body: {
            notificationEnabled: notifEnabled,
            channelIdOverride: channelOverrideStr.trim() === "" ? null : channelOverrideStr.trim(),
          },
        });
        setInitialDiscord({ enabled: notifEnabled, channel: channelOverrideStr.trim() });
      }

      if (wantChartRefetch && isPath) {
        const rows = await fetchCall({
          url: `${API_URL}/Measurements/path/${pathId}?hours=${parsedChartHours}`,
        });
        const updatedPath = {
          ...monitor,
          measurements: normalizeMeasurementsFromApi(rows),
        };
        const paths = (nextMonitor.paths ?? []).map((p) => (p.id === pathId ? updatedPath : p));
        nextMonitor = { ...nextMonitor, paths };
        onMonitorPatched?.(nextMonitor);
      } else if (!isPath) {
        onMonitorPatched?.(nextMonitor);
      }

      if (!wantChartRefetch) onDataChanged?.();
      onClose();
    } catch (e) {
      console.error(e);
      window.alert(`Kunne ikke gemme: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  const title = isPath
    ? `${parentMonitor?.baseUrl}${monitor.path}`
    : parentMonitor?.baseUrl;

  const chartMonitor = isPath ? { ...monitor, measurements } : null;

  return (
    <Modal open={Boolean(monitor)} onClose={onClose} size="large">
      <Loader isLoading={loading} text="Opdaterer…" />
      <Modal.Header style={{ backgroundColor: "#091413", color: "#408A71", borderBottom: "1px solid #2f6d59" }}>
        <span>{isPath ? "Sti-detaljer" : "Domæne-oversigt (rollup)"}</span>
        <div style={{ color: "#8aa89c", fontSize: "0.9rem", marginTop: "6px", wordBreak: "break-all" }}>
          {title}
        </div>
        {!isPath && parentMonitor?.sslExpiresAt && (
          <Label color="blue" style={{ marginTop: "8px" }}>
            SSL udløber {new Date(parentMonitor.sslExpiresAt).toLocaleDateString("da-DK")}
          </Label>
        )}
      </Modal.Header>

      <Modal.Content style={{ backgroundColor: "#091413" }}>
        {!isPath && (
          <div style={{ marginBottom: "1rem", padding: "14px", borderRadius: "8px", border: "1px solid #2f6d59", backgroundColor: "#0B1D19" }}>
            <div style={{ color: "#B0E4CC", fontSize: "0.85rem", marginBottom: "6px" }}>Ping-interval (alle stier)</div>
            <Input
              size="small"
              type="number"
              min={1}
              value={intervalStr}
              onChange={(e) => setIntervalStr(e.target.value)}
              label={{ basic: true, content: "Sekunder" }}
              labelPosition="right"
            />
            {(parentMonitor?.paths ?? []).length > 0 && (
              <div style={{ marginTop: "1rem", color: "#8aa89c" }}>
                <strong style={{ color: "#B0E4CC" }}>Stier:</strong>
                <ul style={{ margin: "0.5rem 0 0 1rem" }}>
                  {parentMonitor.paths.map((p) => (
                    <li key={p.id}>{p.displayLabel || p.path}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {isPath && (
          <>
            <div style={{ marginBottom: "1rem", padding: "14px", borderRadius: "8px", border: "1px solid #2f6d59", backgroundColor: "#0B1D19" }}>
              <div style={{ color: "#B0E4CC", fontSize: "0.85rem", marginBottom: "6px" }}>Forventet tekst i svar (keyword)</div>
              <Input
                placeholder='fx "OK" eller "healthy"'
                value={keywordStr}
                onChange={(e) => setKeywordStr(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ color: "#B0E4CC", fontSize: "0.85rem", marginBottom: "6px" }}>Graf: seneste timer</div>
              <Input
                type="number"
                min={1}
                value={chartHoursStr}
                onChange={(e) => setChartHoursStr(e.target.value)}
                placeholder="fx 24"
              />
            </div>
          </>
        )}

        {isPath && (
          <div className="monitor-modal-discord monitor-modal-discord--compact">
            <div className="monitor-modal-discord__inner">
              <h3 className="monitor-modal-discord__title">Discord-alarm (per sti)</h3>
              {!notifLoaded ? (
                <div className="monitor-modal-discord__loading">
                  <Icon name="spinner" loading />
                  <span>Henter alarm-indstillinger…</span>
                </div>
              ) : (
                <>
                  <Checkbox toggle checked={notifEnabled} onChange={(_, d) => setNotifEnabled(Boolean(d.checked))} label="Alarm til Discord" />
                  <Input
                    className="monitor-modal-discord__input"
                    placeholder="Tom = standardkanal fra Settings"
                    value={channelOverrideStr}
                    onChange={(e) => setChannelOverrideStr(e.target.value)}
                    style={{ marginTop: "0.75rem" }}
                  />
                  <Link to="/settings" className="monitor-modal-discord__hint-link" style={{ display: "block", marginTop: "0.5rem" }}>
                    Discord-integration under Settings
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        <Cards items={items} />
        {chartMonitor && <StackedTimingChart data={chartMonitor} />}
      </Modal.Content>

      <Modal.Actions style={{ backgroundColor: "#091413", borderTop: "1px solid #2f6d59" }}>
        <Button onClick={onClose}>Luk</Button>
        <Button onClick={handleDelete} negative disabled={loading}>
          {isPath ? "Slet sti" : "Slet monitor"}
        </Button>
        <Button onClick={handleSave} primary disabled={loading || !canSave}>
          Gem
        </Button>
      </Modal.Actions>
    </Modal>
  );
}

export default MonitorModal;

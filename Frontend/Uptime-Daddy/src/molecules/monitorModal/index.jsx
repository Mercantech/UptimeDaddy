import { useState, useEffect, useMemo } from "react";
import { Modal, Button, Input, Checkbox, Icon } from "semantic-ui-react";
import { Link } from "react-router-dom";
import "./monitorModal.css";
import Cards from "../../atoms/cards/cards";
import statusIcon from "../../util/status/statusIcon.jsx";
import accents from "../../util/status/stautsAccent.jsx";
import { API_URL, fetchCall } from "../../util/api.jsx";
import StackedTimingChart from "../../atoms/graphs/stackedTimingChart.jsx";
import Loader from "../../atoms/loader/loader.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";

/** API returnerer ældste først; UI forventer nyeste først (som /with-measurements). */
function DiscordGlyph({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ display: "block" }}
    >
      <path
        fill="currentColor"
        d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  );
}

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
    monitor ? String(getMonitorInterval(monitor)) : "60",
  );

  const [chartHoursStr, setChartHoursStr] = useState("");

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [channelOverrideStr, setChannelOverrideStr] = useState("");
  const [initialDiscord, setInitialDiscord] = useState({
    enabled: false,
    channel: "",
  });
  const [notifLoaded, setNotifLoaded] = useState(false);

  useEffect(() => {
    if (monitor) {
      setIntervalStr(String(getMonitorInterval(monitor)));
      setChartHoursStr("");
    }
  }, [monitor]);

  useEffect(() => {
    if (!monitor?.id) {
      setNotifLoaded(false);
      return;
    }
    let cancelled = false;
    setNotifLoaded(false);
    (async () => {
      try {
        const data = await fetchCall({
          url: `${API_URL}/discord/websites/${monitor.id}/notifications`,
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
  }, [monitor?.id]);

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

  const discordDirty =
    notifLoaded &&
    monitor &&
    (notifEnabled !== initialDiscord.enabled ||
      channelOverrideStr.trim() !== initialDiscord.channel);

  const canSave = Boolean(
    monitor &&
      ((parsedInterval !== null && intervalDirty) ||
        wantChartRefetch ||
        discordDirty),
  );

  if (!monitor && !loading) return null;

  const measurements = monitor?.measurements ?? [];
  const latest = measurements[0];

  const items = [
    {
      header: latest ? String(latest.statusCode) : "-",
      description: "HTTP-status",
      icon: statusIcon(latest?.statusCode),
      accent: accents.statusAccent(latest?.statusCode),
    },
    {
      header: formatIntervalSeconds(displayInterval),
      description: "Ping-interval (redigér ovenfor)",
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
      let next = { ...website, measurements };

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

      if (discordDirty) {
        await fetchCall({
          url: `${API_URL}/discord/websites/${website.id}/notifications`,
          method: "PUT",
          body: {
            notificationEnabled: notifEnabled,
            channelIdOverride:
              channelOverrideStr.trim() === "" ? null : channelOverrideStr.trim(),
          },
        });
        setInitialDiscord({
          enabled: notifEnabled,
          channel: channelOverrideStr.trim(),
        });
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
        `Kunne ikke gemme / hente data: ${e?.message ?? e}\n\n(Tjek netværk, login og at API kører.)`,
      );
    } finally {
      setLoading(false);
    }
  };

  const chartMonitor = monitor
    ? { ...monitor, measurements }
    : monitor;

  return (
    <>
      {monitor && (
        <Modal open={Boolean(monitor)} onClose={onClose} size="large">
          <Loader isLoading={loading} text="Opdaterer website…" />
          <Modal.Header
            style={{
              backgroundColor: "#091413",
              color: "#408A71",
              borderBottom: "1px solid #2f6d59",
            }}
          >
            <span>Monitor-detaljer</span>
            {monitor?.url ? (
              <div
                style={{
                  color: "#8aa89c",
                  fontSize: "0.9rem",
                  marginTop: "6px",
                  wordBreak: "break-all",
                }}
              >
                {monitor.url}
              </div>
            ) : null}
          </Modal.Header>

          <Modal.Content style={{ backgroundColor: "#091413" }}>
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
                <div
                  style={{ color: "#B0E4CC", fontSize: "0.85rem", marginBottom: "6px" }}
                >
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
                  style={{
                    width: "220px",
                    backgroundColor: "#091413",
                    border: "1px solid #2f6d59",
                    borderRadius: "6px",
                    color: "#B0E4CC",
                  }}
                  input={{
                    style: {
                      backgroundColor: "#091413",
                      color: "#B0E4CC",
                      borderRadius: "6px",
                      padding: "10px",
                    },
                  }}
                />
                <div style={{ color: "#8aa89c", fontSize: "0.78rem", marginTop: "6px" }}>
                  Vises som {formatIntervalSeconds(displayInterval)}
                </div>
              </div>
              <div>
                <div
                  style={{ color: "#B0E4CC", fontSize: "0.85rem", marginBottom: "6px" }}
                >
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
                  style={{
                    width: "260px",
                    backgroundColor: "#091413",
                    border: "1px solid #2f6d59",
                    borderRadius: "6px",
                    color: "#B0E4CC",
                  }}
                  input={{
                    style: {
                      backgroundColor: "#091413",
                      color: "#B0E4CC",
                      borderRadius: "6px",
                      padding: "10px",
                    },
                  }}
                />
                <div style={{ color: "#8aa89c", fontSize: "0.78rem", marginTop: "6px" }}>
                  Udfyld og gem for GET mod{" "}
                  <code style={{ color: "#B0E4CC" }}>/Measurements/website/…?hours=</code>
                </div>
              </div>
            </div>

            <div className="monitor-modal-discord">
              <div className="monitor-modal-discord__accent" aria-hidden />
              <div className="monitor-modal-discord__inner">
                <div className="monitor-modal-discord__header">
                  <div className="monitor-modal-discord__icon-wrap">
                    <DiscordGlyph size={26} />
                  </div>
                  <div className="monitor-modal-discord__title-block">
                    <h3 className="monitor-modal-discord__title">Discord-alarm</h3>
                    <div className="monitor-modal-discord__badges">
                      <span className="monitor-modal-discord__badge">Nedetid</span>
                      <span className="monitor-modal-discord__badge">Genoprettet</span>
                      <span className="monitor-modal-discord__badge monitor-modal-discord__badge--muted">
                        Valgfri kanal
                      </span>
                    </div>
                  </div>
                </div>

                <p className="monitor-modal-discord__hint">
                  Ved statusskift til <strong>ikke oppe</strong> og når servicen er{" "}
                  <strong>oppe igen</strong>, kan Uptime Daddy poste i Discord — hvis alarmen er aktiv
                  og{" "}
                  <Link to="/settings" style={{ color: "#7dffc8" }}>
                    integrationen
                  </Link>{" "}
                  under Settings er udfyldt.
                </p>

                {!notifLoaded ? (
                  <div className="monitor-modal-discord__loading">
                    <Icon name="spinner" loading />
                    <span>Henter alarm-indstillinger…</span>
                  </div>
                ) : (
                  <>
                    <div className="monitor-modal-discord__toggle-row">
                      <div className="monitor-modal-discord__toggle-rail">
                        <Checkbox
                          toggle
                          label=" "
                          checked={notifEnabled}
                          onChange={(_, d) => setNotifEnabled(Boolean(d.checked))}
                          aria-label="Discord-alarm: besked ved fejl og når monitoren er sund igen"
                        />
                      </div>
                      <p
                        className="monitor-modal-discord__toggle-caption"
                        onClick={() => setNotifEnabled((v) => !v)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setNotifEnabled((v) => !v);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        Send besked til Discord ved fejl og når monitoren er sund igen
                      </p>
                    </div>

                    <div>
                      <label className="monitor-modal-discord__field-label" htmlFor="discord-channel-override">
                        Kanal-ID
                      </label>
                      <Input
                        id="discord-channel-override"
                        className="monitor-modal-discord__input"
                        placeholder="Tom = standardkanal fra Settings"
                        value={channelOverrideStr}
                        onChange={(e) => setChannelOverrideStr(e.target.value)}
                        style={{ maxWidth: "100%" }}
                      />
                      <span className="monitor-modal-discord__field-hint">
                        Valgfrit. Lad feltet være tomt for at bruge den kanal, du har sat under Settings →
                        Discord.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Cards items={items} />
            <StackedTimingChart data={chartMonitor} />
          </Modal.Content>

          <Modal.Actions
            style={{ backgroundColor: "#091413", borderTop: "1px solid #2f6d59" }}
          >
            <Button onClick={onClose}>Luk</Button>
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

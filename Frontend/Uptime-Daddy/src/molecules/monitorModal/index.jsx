import { useState, useEffect }            from "react";
import { Modal, Button, Input }           from "semantic-ui-react";
import Cards                              from "../../atoms/cards/cards";
import statusIcon                         from "../../util/status/statusIcon.jsx";
import accents                            from "../../util/status/stautsAccent.jsx";
import { API_URL, fetchCall }             from "../../util/api.jsx";
import StackedTimingChart                 from "../../atoms/graphs/stackedTimingChart.jsx";
import Loader                             from "../../atoms/loader/loader.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";

function MonitorModal({ monitor, onClose, onDataChanged }) {
  const [loading, setLoading] = useState(false);

  const getMonitorInterval = (website) => {
    if (!website) return 60;
    return Number(website.intervalTime ?? 60);
  };

  const [editTime, setEditTime] = useState(() => getMonitorInterval(monitor));

  useEffect(() => {
    if (monitor) {
      setEditTime(getMonitorInterval(monitor));
    }
  }, [monitor]);

  if (!monitor && !loading) return null;

  const latest = monitor.measurements[0];

  const items = [
    { header: latest ? String(latest.statusCode) : "-", description: "HTTP-status", icon: statusIcon(latest?.statusCode), accent: accents.statusAccent(latest?.statusCode) },
    { header: formatIntervalSeconds(editTime), description: "Ping-interval (redigér ovenfor)", icon: "refresh", accent: "blue" },
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

  const handleUpdate = async (website, newTime) => {
    setLoading(true);
    const payload = { intervalTime: String(newTime) };
    let updateSucceeded = false;

    try {
      await fetchCall({
        url: `${API_URL}/Websites/${website.id}/interval`,
        method: "PUT",
        body: payload,
      });

      setEditTime(newTime);
      updateSucceeded = true;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setLoading(false);
      onClose();
      if (updateSucceeded) {
        onDataChanged?.();
      }

    }
  };

  return (
    <>
    {monitor && (
    <Modal open={Boolean(monitor)} onClose={onClose} size="large">
      <Loader isLoading={loading} text="Opdaterer website…" />
      <Modal.Header style={{ backgroundColor: "#091413", color: "#408A71", borderBottom: "1px solid #2f6d59", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Monitor-detaljer</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ color: "#B0E4CC", fontSize: "0.95rem", maxWidth: "320px", textAlign: "right" }}>
            <strong style={{ color: "#408A71" }}>Ping-interval:</strong>{" "}
            {formatIntervalSeconds(editTime)}
            <span style={{ opacity: 0.75, fontSize: "0.85em" }}> ({editTime} sek.)</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Input
              size="small"
              type="number"
              min={1}
              step={1}
              value={Number.isFinite(editTime) ? editTime : ""}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value === "" || !Number.isFinite(v)) return;
                setEditTime(Math.max(1, Math.floor(v)));
              }}
              label={{ basic: true, content: "Sekunder" }}
              labelPosition="right"
              placeholder="fx 300"
              style={{ width: "200px", backgroundColor: "#0B1D19", border: "1px solid #2f6d59", borderRadius: "6px", color: "#B0E4CC" }}
              input={{ style: { backgroundColor: "#0B1D19", color: "#B0E4CC", borderRadius: "6px", padding: "10px" } }}
            />
            <Button onClick={() => handleUpdate(monitor, editTime)} primary disabled={loading} style={{ minHeight: "47px", backgroundColor: "#1F8B68", borderColor: "#2f6d59" }}>
              Gem
            </Button>
          </div>
        </div>
      </Modal.Header>

      <Modal.Content style={{ backgroundColor: "#091413" }}>
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
      </Modal.Actions>
    </Modal>
    )}
    </>
  );
}

export default MonitorModal;
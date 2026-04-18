import { useState, useEffect }            from "react";
import { Modal, Button, Input }           from "semantic-ui-react";
import Cards                              from "../../atoms/cards/cards";
import statusIcon                         from "../../util/status/statusIcon.jsx";
import accents                            from "../../util/status/stautsAccent.jsx";
import { API_URL, fetchCall }             from "../../util/api.jsx";
import BarChartMonitor                    from "../../atoms/graphs/barchart.jsx";
import LineChartMonitor                   from "../../atoms/graphs/linechart.jsx";
import Loader                             from "../../atoms/loader/loader.jsx";

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
    { header: latest ? String(latest.statusCode) : "-",                                   description: "Status Code",         icon: statusIcon(latest?.statusCode), accent: accents.statusAccent(latest?.statusCode) },
    { header: latest?.dnsLookupMs != null ? `${latest.dnsLookupMs}ms` : "-",              description: "DNS Lookup",          icon: "search",                       accent: accents.dnsAccent(latest?.dnsLookupMs) },
    { header: latest?.connectMs != null ? `${latest.connectMs}ms` : "-",                  description: "Connect",             icon: "plug",                         accent: accents.connectAccent(latest?.connectMs) },
    { header: latest?.tlsHandshakeMs != null ? `${latest.tlsHandshakeMs}ms` : "-",        description: "TLS Handshake",       icon: "lock",                         accent: accents.tlsAccent(latest?.tlsHandshakeMs) },
    { header: latest?.timeToFirstByteMs != null ? `${latest.timeToFirstByteMs}ms` : "-",  description: "Time to First Byte",  icon: "clock",                        accent: accents.tfbAccent(latest?.timeToFirstByteMs) },
    { header: latest?.totalTimeMs != null ? `${latest.totalTimeMs}ms` : "-",              description: "Total Time",          icon: "hourglass half",               accent: accents.ttAccent(latest?.totalTimeMs) },
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
      <Loader isLoading={loading} text="Updating website list..." />
      <Modal.Header style={{ backgroundColor: "#091413", color: "#408A71", borderBottom: "1px solid #2f6d59", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Monitor Details</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Input
            size="small"
            type="number"
            value={editTime}
            onChange={(e) => setEditTime(Number(e.target.value))}
            placeholder="Interval (ms)"
            style={{ width: "140px", backgroundColor: "#0B1D19", border: "1px solid #2f6d59", borderRadius: "6px", color: "#B0E4CC" }}
            input={{ style: { backgroundColor: "#0B1D19", color: "#B0E4CC", borderRadius: "6px", padding: "10px" } }}
          />
          <Button onClick={() => handleUpdate(monitor, editTime)} primary disabled={loading} style={{ minHeight: "47px", backgroundColor: "#1F8B68", borderColor: "#2f6d59" }}>
            Save
          </Button>
        </div>
      </Modal.Header>

      <Modal.Content style={{ backgroundColor: "#091413" }}>
        <Cards items={items} />
        <BarChartMonitor data={monitor}/>
        <LineChartMonitor data={monitor}/>
      </Modal.Content>

      <Modal.Actions style={{ backgroundColor: "#091413", borderTop: "1px solid #2f6d59" }}>
        <Button onClick={onClose}>
          Close
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
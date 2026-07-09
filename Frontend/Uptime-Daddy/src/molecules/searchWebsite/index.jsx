import { useState } from "react";
import { Button, Container, Header, Icon, Input, Modal, List } from "semantic-ui-react";
import Cards from "../../atoms/cards/cards";
import Loader from "../../atoms/loader/loader";
import statusIcon from "../../util/status/statusIcon.jsx";
import accents from "../../util/status/stautsAccent.jsx";
import { API_URL, fetchCall } from "../../util/api.jsx";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SearchWebsite({ onWebsiteAdded }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [paths, setPaths] = useState([{ path: "/", keyword: "" }]);
  const [pingData, setPingData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const trimmedBase = baseUrl.trim();

  const previewUrl = (path) => {
    const p = path.startsWith("/") ? path : `/${path}`;
    const host = trimmedBase.replace(/^https?:\/\//, "");
    return `https://${host}${p === "/" ? "" : p}`;
  };

  const handlePreview = async (pathEntry) => {
    if (!trimmedBase) return;
    setIsLoading(true);
    try {
      const result = await fetchCall({
        url: `${API_URL}/Monitors/ping`,
        method: "POST",
        body: {
          url: previewUrl(pathEntry.path),
        },
      });
      setPingData({
        url: previewUrl(pathEntry.path),
        ...result,
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMonitor = async () => {
    if (!trimmedBase) return;
    setIsModalOpen(false);
    setIsLoading(true);
    try {
      await fetchCall({
        url: `${API_URL}/Monitors`,
        method: "POST",
        body: {
          baseUrl: trimmedBase,
          intervalTime: 60,
          paths: paths.map((p) => ({
            path: p.path.trim() || "/",
            keyword: p.keyword?.trim() || null,
            keywordMustContain: true,
          })),
        },
      });
      setBaseUrl("");
      setPaths([{ path: "/", keyword: "" }]);
      onWebsiteAdded?.();
    } catch (error) {
      console.error(error);
      window.alert(error?.message ?? "Kunne ikke oprette monitor.");
    } finally {
      setIsLoading(false);
    }
  };

  const pingCards = pingData
    ? [
        { header: String(pingData.statusCode), description: "Status Code", icon: statusIcon(pingData.statusCode), accent: accents.statusAccent(pingData.statusCode) },
        { header: pingData.dnsLookupMs, description: "DNS Lookup", icon: "search", accent: accents.dnsAccent(pingData.dnsLookupMs) },
        { header: pingData.connectMs, description: "Connect", icon: "plug", accent: accents.connectAccent(pingData.connectMs) },
        { header: pingData.tlsHandshakeMs, description: "TLS Handshake", icon: "lock", accent: accents.tlsAccent(pingData.tlsHandshakeMs) },
        { header: pingData.timeToFirstByteMs, description: "Time to First Byte", icon: "clock", accent: accents.tfbAccent(pingData.timeToFirstByteMs) },
        { header: pingData.totalTimeMs, description: "Total Time", icon: "hourglass half", accent: accents.ttAccent(pingData.totalTimeMs) },
      ]
    : [];

  return (
    <>
      <Container style={{ backgroundColor: "#091413", padding: "1rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <Header as="h2" style={{ color: "#B0E4CC", margin: "0 0 1rem", fontSize: "2rem" }}>
          Tilføj domæne-monitor
        </Header>
        <p style={{ color: "#408A71", marginBottom: "1rem" }}>
          Ét domæne med flere stier (f.eks. /health og /db-health). Stats summeres med worst-of.
        </p>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <Input
            icon="globe"
            iconPosition="left"
            placeholder="example.com"
            value={baseUrl}
            disabled={isLoading}
            onChange={(e) => setBaseUrl(e.target.value)}
            style={{ flex: "1 1 220px" }}
          />
        </div>

        <List divided relaxed style={{ marginBottom: "1rem" }}>
          {paths.map((entry, idx) => (
            <List.Item key={idx}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <Input
                  placeholder="/health"
                  value={entry.path}
                  disabled={isLoading}
                  onChange={(e) => {
                    const next = [...paths];
                    next[idx] = { ...next[idx], path: e.target.value };
                    setPaths(next);
                  }}
                  style={{ width: "140px" }}
                />
                <Input
                  placeholder='Keyword (valgfri, fx "OK")'
                  value={entry.keyword}
                  disabled={isLoading}
                  onChange={(e) => {
                    const next = [...paths];
                    next[idx] = { ...next[idx], keyword: e.target.value };
                    setPaths(next);
                  }}
                  style={{ flex: "1 1 180px" }}
                />
                <Button size="small" onClick={() => handlePreview(entry)} disabled={isLoading || !trimmedBase}>
                  Preview
                </Button>
                {paths.length > 1 && (
                  <Button
                    icon
                    size="small"
                    negative
                    onClick={() => setPaths(paths.filter((_, i) => i !== idx))}
                  >
                    <Icon name="trash" />
                  </Button>
                )}
              </div>
            </List.Item>
          ))}
        </List>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button
            onClick={() => setPaths([...paths, { path: "", keyword: "" }])}
            disabled={isLoading}
          >
            <Icon name="plus" /> Tilføj sti
          </Button>
          <Button primary onClick={addMonitor} disabled={isLoading || !trimmedBase}>
            <Icon name="check" /> Gem monitor
          </Button>
        </div>
      </Container>

      <Loader isLoading={isLoading} text="Henter ping data..." />
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} size="large">
        <Modal.Header style={{ backgroundColor: "#091413", color: "#408A71", borderBottom: "1px solid #2f6d59" }}>
          {pingData?.url}
        </Modal.Header>
        <Modal.Content style={{ backgroundColor: "#091413" }}>
          <Cards items={pingCards} />
        </Modal.Content>
        <Modal.Actions style={{ backgroundColor: "#091413", borderTop: "1px solid #2f6d59" }}>
          <Button onClick={() => setIsModalOpen(false)}>Luk</Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}

export default SearchWebsite;

import { useState } from "react";
import { Button, Header, Icon, Input, Modal, Popup } from "semantic-ui-react";
import Cards from "../../atoms/cards/cards";
import Loader from "../../atoms/loader/loader";
import statusIcon from "../../util/status/statusIcon.jsx";
import accents from "../../util/status/stautsAccent.jsx";
import { API_URL, fetchCall } from "../../util/api.jsx";
import "./searchWebsite.css";

function FieldLabel({ children, hint }) {
  return (
    <Popup
      className="search-website-popup"
      content={hint}
      position="top center"
      hoverable
      trigger={
        <span className="search-website-field__label">
          {children}
          <Icon name="info circle" />
        </span>
      }
    />
  );
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
      <div className="search-website-panel">
        <Popup
          className="search-website-popup"
          content="Opret én monitor per domæne. Tilføj flere stier for at overvåge f.eks. forsiden og et health-endpoint. Domæne-status vises som worst-of på tværs af alle stier."
          position="right center"
          hoverable
          trigger={
            <Header as="h2" className="search-website-panel__title" style={{ cursor: "help", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              Tilføj domæne-monitor
              <Icon name="info circle" style={{ fontSize: "0.55em", color: "#6d9084", margin: 0 }} />
            </Header>
          }
        />

        <p className="search-website-panel__intro">
          Ét domæne med flere stier (f.eks. /health og /db-health). Stats summeres med worst-of.
        </p>

        <div className="search-website-field">
          <FieldLabel hint="Rod-domænet uden sti — f.eks. example.com eller api.firma.dk. https:// tilføjes automatisk ved ping.">
            Domæne
          </FieldLabel>
          <Input
            className="search-website-input"
            icon="globe"
            iconPosition="left"
            placeholder="example.com"
            value={baseUrl}
            disabled={isLoading}
            onChange={(e) => setBaseUrl(e.target.value)}
            fluid
          />
        </div>

        <div className="search-website-paths-header">
          <div className="search-website-paths-header__path">
            <FieldLabel hint="Stien på domænet, f.eks. / eller /health. Kombineres med domænet til den fulde URL der pinges.">
              Sti
            </FieldLabel>
          </div>
          <div className="search-website-paths-header__keyword">
            <FieldLabel hint='Valgfri tekst der skal findes i HTTP-svaret. Bruges til at sikre at siden svarer med forventet indhold — f.eks. "OK" eller "healthy".'>
              Keyword
            </FieldLabel>
          </div>
          <div className="search-website-paths-header__spacer" aria-hidden="true" />
        </div>

        {paths.map((entry, idx) => (
          <div className="search-website-path-row" key={idx}>
            <div className="search-website-path-row__field search-website-path-row__field--path">
              <Input
                className="search-website-input"
                placeholder="/health"
                value={entry.path}
                disabled={isLoading}
                onChange={(e) => {
                  const next = [...paths];
                  next[idx] = { ...next[idx], path: e.target.value };
                  setPaths(next);
                }}
              />
            </div>
            <div className="search-website-path-row__field">
              <Input
                className="search-website-input"
                placeholder='fx "OK"'
                value={entry.keyword}
                disabled={isLoading}
                onChange={(e) => {
                  const next = [...paths];
                  next[idx] = { ...next[idx], keyword: e.target.value };
                  setPaths(next);
                }}
              />
            </div>
            <div className="search-website-path-row__actions">
              <Button size="small" onClick={() => handlePreview(entry)} disabled={isLoading || !trimmedBase}>
                Preview
              </Button>
              {paths.length > 1 ? (
                <Button
                  icon
                  size="small"
                  negative
                  onClick={() => setPaths(paths.filter((_, i) => i !== idx))}
                  aria-label="Fjern sti"
                >
                  <Icon name="trash" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}

        <div className="search-website-actions">
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
      </div>

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

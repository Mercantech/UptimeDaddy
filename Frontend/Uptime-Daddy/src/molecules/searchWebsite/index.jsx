import { useState }                                         from "react";
import { Button, Container, Header, Icon, Input, Modal }    from "semantic-ui-react";
import Cards                                                from "../../atoms/cards/cards";
import Loader                                               from "../../atoms/loader/loader";
import statusIcon                                           from "../../util/status/statusIcon.jsx";
import accents                                              from "../../util/status/stautsAccent.jsx";
import { API_URL, fetchCall }                               from "../../util/api.jsx";

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function SearchWebsite({ onWebsiteAdded }) {
    const [searchValue, setSearchValue] = useState("");
    const [pingData, setPingData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const trimmedValue = searchValue.trim();

    const handleSearch = async () => {

        if (!trimmedValue) return;

        setIsLoading(true);

        const payload = {
            url: trimmedValue,
        };

        try {
            const result = await fetchCall({
                url: `${API_URL}/Websites/ping`,
                method: "POST",
                body: payload,
            });
            await delay(1000);

            setPingData({
                url: trimmedValue,
                ...result,
            });
            setIsModalOpen(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    const addWebsite = async () => {
        if (!trimmedValue) return;
        setIsModalOpen(false);
        
        setIsLoading(true);

        const payload = {
            url: trimmedValue,
        };

        try {
            const result = await fetchCall({
                url: `${API_URL}/Websites`,
                method: "POST",
                body: payload,
            });
            await delay(1000);

            setPingData({
                url: trimmedValue,
                ...result,
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            onWebsiteAdded?.();
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <Header as="h2" style={{ color: "#B0E4CC", margin: 0, fontSize: "2rem" }}>Search Website</Header>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <Input
                        iconPosition="left"
                        className="main-search-input"
                        icon="search"
                        placeholder="Search..."
                        value={searchValue}
                        disabled={isLoading}
                        onChange={(event) => setSearchValue(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !isLoading) {
                                handleSearch();
                            }
                        }}
                    />
                    <Button onClick={handleSearch} disabled={isLoading}>Search</Button>
                </div>
            </div>
            <p style={{ color: "#408A71" }}>Input your website here to add it to your list on montired webistes</p>
        </Container>
        <Loader isLoading={isLoading} text="Fetching ping data..." />
        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} size="large">
            <Modal.Header style={{ backgroundColor: "#091413", color: "#408A71", borderBottom: "1px solid #2f6d59" }}>
                {pingData?.url}               
            </Modal.Header>
            <Modal.Content style={{ backgroundColor: "#091413" }}>
                <Cards items={pingCards} />
            </Modal.Content>
            <Modal.Actions style={{ backgroundColor: "#091413", borderTop: "1px solid #2f6d59" }}>
                <Button onClick={() => setIsModalOpen(false)}>Edit</Button>
                <Button onClick={() => addWebsite()} primary>
                    <Icon name="check" />
                    Add Website
                </Button>
            </Modal.Actions>
        </Modal>
        </>
    );
}

export default SearchWebsite;
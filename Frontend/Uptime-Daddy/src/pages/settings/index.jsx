import { useState, useEffect, useCallback } from "react";
import {
    Button,
    Container,
    Form,
    Header,
    Segment,
    Message,
    Loader,
} from "semantic-ui-react";
import Navbar from "../../molecules/navbar/navbar";
import { getAuthPayload } from "../../util/auth";
import { API_URL, fetchCall } from "../../util/api.jsx";
import "./style.css";

function getfullNameFromPayload(payload) {
    if (!payload) return "-";
    return payload.fullName ?? "";
}

function getEmailFromPayload(payload) {
    if (!payload) return "-";
    return payload.email ?? "";
}

function EmailSettingsPanel() {
    const authPayload = getAuthPayload();
    const accountEmail = getEmailFromPayload(authPayload);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [enabled, setEnabled] = useState(true);
    const [configured, setConfigured] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCall({
                url: `${API_URL}/email/notifications`,
                method: "GET",
            });
            setEnabled(data?.enabled !== false);
            setConfigured(Boolean(data?.configured));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Kunne ikke hente e-mail-indstillinger.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function handleSave(event) {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await fetchCall({
                url: `${API_URL}/email/notifications`,
                method: "PUT",
                body: { enabled },
            });
            setSuccess("E-mail-notifikationer gemt.");
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Kunne ikke gemme.");
        } finally {
            setSaving(false);
        }
    }

    async function handleSendTest() {
        setTesting(true);
        setError(null);
        setSuccess(null);
        try {
            const data = await fetchCall({
                url: `${API_URL}/email/notifications/test`,
                method: "POST",
            });
            setSuccess(data?.message ?? "Testmail sendt. Tjek din indbakke.");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Kunne ikke sende testmail.");
        } finally {
            setTesting(false);
        }
    }

    return (
        <Segment className="settings-panel">
            <Header as="h2" className="settings-title">
                E-mail-notifikationer
            </Header>
            <p className="settings-subtitle">
                Modtag mail på <strong>{accountEmail}</strong> når dine monitors skifter mellem oppe og nede.
            </p>

            {loading ? (
                <Loader active inline="centered" content="Henter indstillinger…" />
            ) : (
                <Form className="settings-form" onSubmit={handleSave}>
                    {error ? (
                        <Message negative onDismiss={() => setError(null)}>
                            {error}
                        </Message>
                    ) : null}
                    {success ? (
                        <Message positive onDismiss={() => setSuccess(null)} content={success} />
                    ) : null}
                    {!configured ? (
                        <Message warning>
                            SMTP er ikke konfigureret på serveren endnu — mails sendes ikke før{" "}
                            <code>EMAIL_SMTP_*</code> er sat i miljøet.
                        </Message>
                    ) : null}

                    <Form.Checkbox
                        label="Send e-mail ved nedbrud og genoprettelse"
                        checked={enabled}
                        onChange={(_, d) => setEnabled(Boolean(d.checked))}
                    />

                    <div className="settings-actions">
                        <Button type="submit" primary loading={saving} disabled={saving || testing}>
                            Gem e-mail-indstillinger
                        </Button>
                        <Button
                            type="button"
                            loading={testing}
                            disabled={testing || saving || !configured}
                            onClick={() => void handleSendTest()}
                        >
                            Send testmail
                        </Button>
                    </div>
                </Form>
            )}
        </Segment>
    );
}

function DiscordSettingsPanel() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [triggering, setTriggering] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [triggerMessage, setTriggerMessage] = useState(null);
    const [guildId, setGuildId] = useState("");
    const [defaultChannelId, setDefaultChannelId] = useState("");
    const [enabled, setEnabled] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCall({
                url: `${API_URL}/discord/integration`,
                method: "GET",
                nullIfNotFound: true,
            });
            if (data) {
                setGuildId(String(data.guildId ?? ""));
                setDefaultChannelId(String(data.defaultChannelId ?? ""));
                setEnabled(data.enabled !== false);
            } else {
                setGuildId("");
                setDefaultChannelId("");
                setEnabled(true);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Kunne ikke hente Discord-integration.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function handleSave(event) {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        setTriggerMessage(null);
        try {
            await fetchCall({
                url: `${API_URL}/discord/integration`,
                method: "PUT",
                body: {
                    guildId: guildId.trim(),
                    defaultChannelId: defaultChannelId.trim(),
                    enabled,
                },
            });
            setSuccess("Discord-integration gemt.");
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Kunne ikke gemme.");
        } finally {
            setSaving(false);
        }
    }

    async function handleTriggerReport() {
        setTriggering(true);
        setError(null);
        setTriggerMessage(null);
        try {
            await fetchCall({
                url: `${API_URL}/discord/reports/trigger`,
                method: "POST",
                body: { reportType: "summary" },
            });
            setTriggerMessage(
                "Rapport-anmodning sendt. Tjek din Discord-standardkanal om et øjeblik."
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Kunne ikke udløse rapport.");
        } finally {
            setTriggering(false);
        }
    }

    return (
        <Segment className="settings-panel">
            <Header as="h2" className="settings-title">
                Discord
            </Header>
            <p className="settings-subtitle">
                Kobler din UptimeDaddy-konto til en server og standardkanal, så{" "}
                <code>/daddy-report</code>, planlagte rapporter og manuelle udtræk ved hvor de skal
                poste. Slå <strong>Developer Mode</strong> til i Discord → højreklik server →{" "}
                Copy Server ID; højreklik kanal → Copy Channel ID.
            </p>

            {loading ? (
                <Loader active inline="centered" content="Henter integration…" />
            ) : (
                <Form className="settings-form" onSubmit={handleSave}>
                    {error ? (
                        <Message negative onDismiss={() => setError(null)}>
                            {error}
                        </Message>
                    ) : null}
                    {success ? (
                        <Message positive onDismiss={() => setSuccess(null)} content={success} />
                    ) : null}
                    {triggerMessage ? (
                        <Message info onDismiss={() => setTriggerMessage(null)} content={triggerMessage} />
                    ) : null}

                    <Form.Input
                        label="Guild ID (server)"
                        placeholder="1234567890123456789"
                        value={guildId}
                        onChange={(event) => setGuildId(event.target.value)}
                        required
                    />
                    <Form.Input
                        label="Standardkanal-ID"
                        placeholder="1234567890123456789"
                        value={defaultChannelId}
                        onChange={(event) => setDefaultChannelId(event.target.value)}
                        required
                    />
                    <Form.Checkbox
                        label="Integration aktiv"
                        checked={enabled}
                        onChange={(_, d) => setEnabled(Boolean(d.checked))}
                    />

                    <div className="settings-actions">
                        <Button type="submit" primary loading={saving} disabled={saving}>
                            Gem Discord-integration
                        </Button>
                        <Button
                            type="button"
                            loading={triggering}
                            disabled={triggering || saving || !guildId.trim() || !defaultChannelId.trim()}
                            onClick={() => void handleTriggerReport()}
                        >
                            Send testrapport nu
                        </Button>
                    </div>
                </Form>
            )}
        </Segment>
    );
}

function Settings() {
    const authPayload = getAuthPayload();
    const [fullName, setFullName] = useState(getfullNameFromPayload(authPayload));
    const [email, setEmail] = useState(getEmailFromPayload(authPayload));

    return (
        <>
            <Navbar />
            <Container className="settings-page-container">
                <Segment className="settings-panel">
                    <Header as="h2" className="settings-title">User Settings</Header>
                    <p className="settings-subtitle">Simple account preferences for your dashboard.</p>

                    <Form className="settings-form">
                        <Form.Input
                            label="Display Name"
                            placeholder="Your display name"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                        />

                        <Form.Input
                            type="email"
                            label="Email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />

                        <div className="settings-actions">
                            <Button>Save</Button>
                        </div>

                    </Form>
                </Segment>

                <DiscordSettingsPanel />
                <EmailSettingsPanel />
            </Container>
        </>
    );
}

export default Settings;

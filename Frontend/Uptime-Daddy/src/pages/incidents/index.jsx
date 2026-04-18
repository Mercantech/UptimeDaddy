import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Container,
    Header,
    Loader,
    Message,
    Segment,
    Table,
    Dropdown,
    Pagination,
} from "semantic-ui-react";
import Navbar from "../../molecules/navbar/navbar";
import { getAuthPayload } from "../../util/auth";
import { API_URL, fetchCall } from "../../util/api.jsx";

const PAGE_SIZE = 25;

function formatDa(iso) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("da-DK", {
            dateStyle: "short",
            timeStyle: "medium",
        });
    } catch {
        return String(iso);
    }
}

export default function IncidentsPage() {
    const authPayload = getAuthPayload();
    const userId = authPayload?.userId;

    const [websites, setWebsites] = useState([]);
    const [filterWebsiteId, setFilterWebsiteId] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [payload, setPayload] = useState(null);

    const loadWebsites = useCallback(async () => {
        if (!userId) return;
        try {
            const list = await fetchCall({
                url: `${API_URL}/Websites/user/${userId}`,
            });
            setWebsites(Array.isArray(list) ? list : []);
        } catch {
            setWebsites([]);
        }
    }, [userId]);

    const loadIncidents = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({
                page: String(page),
                pageSize: String(PAGE_SIZE),
            });
            if (filterWebsiteId != null)
                qs.set("websiteId", String(filterWebsiteId));

            const data = await fetchCall({
                url: `${API_URL}/Incidents?${qs.toString()}`,
            });
            setPayload(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Kunne ikke hente incident-log.");
            setPayload(null);
        } finally {
            setLoading(false);
        }
    }, [userId, page, filterWebsiteId]);

    useEffect(() => {
        loadWebsites();
    }, [loadWebsites]);

    useEffect(() => {
        loadIncidents();
    }, [loadIncidents]);

    const websiteOptions = useMemo(() => {
        const opts = [{ key: "all", value: "", text: "Alle websites" }];
        for (const w of websites) {
            opts.push({
                key: String(w.id),
                value: w.id,
                text: w.url ?? `Website #${w.id}`,
            });
        }
        return opts;
    }, [websites]);

    const items = payload?.items ?? [];
    const totalCount = payload?.totalCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return (
        <>
            <Navbar />
            <Container style={{ marginTop: "7rem", padding: "2rem 0" }}>
                <Header as="h1" style={{ color: "#c5ebe0", marginBottom: "1.25rem" }}>
                    Incident-log
                </Header>
                <p style={{ color: "#9ec4b8", marginBottom: "1.5rem", maxWidth: "42rem" }}>
                    Historik over statusskift (op ↔ ned) for dine websites. Oprettes automatisk når en
                    måling skifter mellem «oppe» og «nede».
                </p>

                <Segment style={{ background: "rgba(14, 36, 32, 0.85)", borderColor: "#2d5c52" }}>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "1rem",
                            alignItems: "center",
                            marginBottom: "1rem",
                        }}
                    >
                        <span style={{ color: "#c5ebe0", marginRight: "0.25rem" }}>Filtrér:</span>
                        <Dropdown
                            selection
                            placeholder="Alle websites"
                            options={websiteOptions}
                            value={filterWebsiteId ?? ""}
                            onChange={(_, { value }) => {
                                setPage(1);
                                setFilterWebsiteId(value === "" ? null : Number(value));
                            }}
                            style={{ minWidth: "16rem" }}
                        />
                    </div>

                    {error ? (
                        <Message negative content={error} />
                    ) : null}

                    {loading ? (
                        <Loader active inline="centered">
                            Henter…
                        </Loader>
                    ) : items.length === 0 ? (
                        <Message info>
                            Ingen hændelser endnu — eller intet filter-match.
                        </Message>
                    ) : (
                        <>
                            <Table celled striped compact unstackable>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.HeaderCell>Tidspunkt</Table.HeaderCell>
                                        <Table.HeaderCell>Website</Table.HeaderCell>
                                        <Table.HeaderCell>Status</Table.HeaderCell>
                                        <Table.HeaderCell>HTTP</Table.HeaderCell>
                                        <Table.HeaderCell>Svartid (ms)</Table.HeaderCell>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {items.map((row) => (
                                        <Table.Row key={row.id}>
                                            <Table.Cell>{formatDa(row.occurredAt)}</Table.Cell>
                                            <Table.Cell
                                                style={{
                                                    maxWidth: "22rem",
                                                    wordBreak: "break-all",
                                                }}
                                            >
                                                {row.websiteUrl}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <strong style={{ color: row.isUp ? "#7dcea0" : "#e5989b" }}>
                                                    {row.isUp ? "Oppe" : "Nede"}
                                                </strong>
                                            </Table.Cell>
                                            <Table.Cell>{row.statusCode}</Table.Cell>
                                            <Table.Cell>
                                                {typeof row.totalTimeMs === "number"
                                                    ? row.totalTimeMs.toLocaleString("da-DK", {
                                                          maximumFractionDigits: 0,
                                                      })
                                                    : "—"}
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table>
                            {totalPages > 1 ? (
                                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                                    <Pagination
                                        totalPages={totalPages}
                                        activePage={page}
                                        onPageChange={(_, d) => setPage(d.activePage)}
                                        firstItem={null}
                                        lastItem={null}
                                        siblingRange={1}
                                    />
                                </div>
                            ) : null}
                        </>
                    )}
                </Segment>
            </Container>
        </>
    );
}

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
import "./style.css";

const PAGE_SIZE = 25;

/** Tekst for visning — rækken beskriver målingens tilstand ved hændelsen (ned = fejl/overgang til nede). */
function incidentKindLabel(isUp) {
    return isUp ? "Genoprettet (oppe igen)" : "Nedbrud registreret";
}

function incidentKindClass(isUp) {
    return isUp ? "incident-kind incident-kind--up" : "incident-kind incident-kind--down";
}

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
    /** «all» | «down» | «up» — nedbrud vs genoprettelse */
    const [kind, setKind] = useState("all");
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
            if (kind && kind !== "all") qs.set("kind", kind);

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
    }, [userId, page, filterWebsiteId, kind]);

    useEffect(() => {
        loadWebsites();
    }, [loadWebsites]);

    useEffect(() => {
        loadIncidents();
    }, [loadIncidents]);

    const kindOptions = useMemo(
        () => [
            { key: "all", value: "all", text: "Alle hændelser" },
            { key: "down", value: "down", text: "Kun nedbrud (fejl)" },
            { key: "up", value: "up", text: "Kun genoprettelse" },
        ],
        []
    );

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
            <Container className="incidents-page-container">
                <Header as="h1" className="incidents-title">
                    Incident-log
                </Header>
                <p className="incidents-lead">
                    Hver række er ét registreret skift (&quot;nede&quot; med HTTP-kode ved fejl, eller
                    &quot;oppe igen&quot;). Vælg <strong>Kun nedbrud (fejl)</strong> for kun fejl med
                    tidsstempel. Historik før incident-log blev aktiveret kan ikke bagudfyldes.
                </p>

                <Segment className="incidents-panel">
                    <div className="incidents-toolbar">
                        <div>
                            <span className="incidents-filter-label">Hændelsestype</span>
                            <Dropdown
                                selection
                                options={kindOptions}
                                value={kind}
                                onChange={(_, { value }) => {
                                    setPage(1);
                                    setKind(String(value));
                                }}
                                style={{ minWidth: "17rem" }}
                            />
                        </div>
                        <div>
                            <span className="incidents-filter-label">Website</span>
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
                            {kind === "down"
                                ? "Ingen nedbrud i loggen — eller ingen der matcher filtrene. Nedbrud før incident-log blev indført vises ikke."
                                : "Ingen hændelser endnu — eller intet filter-match."}
                        </Message>
                    ) : (
                        <>
                            <Table celled striped compact unstackable>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.HeaderCell>Tidspunkt</Table.HeaderCell>
                                        <Table.HeaderCell>Website</Table.HeaderCell>
                                        <Table.HeaderCell>Hændelse</Table.HeaderCell>
                                        <Table.HeaderCell>Målt status</Table.HeaderCell>
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
                                                <span className={incidentKindClass(row.isUp)}>
                                                    {incidentKindLabel(row.isUp)}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <strong
                                                    style={{ color: row.isUp ? "#7dcea0" : "#f5a9b8" }}
                                                >
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

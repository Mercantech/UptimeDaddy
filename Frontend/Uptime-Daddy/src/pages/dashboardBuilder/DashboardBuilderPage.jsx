import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Container,
  Dropdown,
  Form,
  Header,
  Icon,
  Input,
  Message,
  Segment,
} from "semantic-ui-react";
import Navbar from "../../molecules/navbar/navbar.jsx";
import { getAuthPayload } from "../../util/auth";
import { API_URL, fetchCall } from "../../util/api.jsx";

function DashboardBuilderPage() {
  const authPayload = getAuthPayload();
  const userId = authPayload?.userId;

  const [websites, setWebsites] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [orderedItems, setOrderedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copyMsg, setCopyMsg] = useState(null);

  const websiteById = useMemo(() => {
    const m = new Map();
    for (const w of websites) m.set(w.id, w);
    return m;
  }, [websites]);

  const loadBoards = useCallback(async () => {
    const list = await fetchCall({ url: `${API_URL}/dashboard-boards` });
    setBoards(Array.isArray(list) ? list : []);
  }, []);

  const loadWebsites = useCallback(async () => {
    if (!userId) return;
    const data = await fetchCall({
      url: `${API_URL}/Websites/user/${userId}/with-measurements`,
    });
    setWebsites(Array.isArray(data) ? data : []);
  }, [userId]);

  const loadBoardDetail = useCallback(async (id) => {
    const d = await fetchCall({ url: `${API_URL}/dashboard-boards/${id}` });
    setBoardName(d.name ?? "");
    setIsPublished(Boolean(d.isPublished));
    const items = Array.isArray(d.items) ? [...d.items] : [];
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    setOrderedItems(
      items.map((i) => ({
        websiteId: i.websiteId,
        displayLabel: i.displayLabel ?? "",
      }))
    );
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadWebsites(), loadBoards()]);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loadWebsites, loadBoards]);

  useEffect(() => {
    if (!selectedBoardId) {
      setBoardName("");
      setIsPublished(false);
      setOrderedItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadBoardDetail(selectedBoardId);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBoardId, loadBoardDetail]);

  const boardOptions = boards.map((b) => ({
    key: b.id,
    value: b.id,
    text: `${b.name} · #${b.id} · ${b.itemCount ?? 0} sites`,
  }));

  const toggleWebsite = (websiteId, checked) => {
    if (checked) {
      setOrderedItems((prev) => {
        if (prev.some((x) => x.websiteId === websiteId)) return prev;
        return [...prev, { websiteId, displayLabel: "" }];
      });
    } else {
      setOrderedItems((prev) => prev.filter((x) => x.websiteId !== websiteId));
    }
  };

  const move = (index, dir) => {
    setOrderedItems((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const updateLabel = (websiteId, value) => {
    setOrderedItems((prev) =>
      prev.map((row) =>
        row.websiteId === websiteId ? { ...row, displayLabel: value } : row
      )
    );
  };

  const createBoard = async () => {
    const idCandidate = boardName.trim();
    if (!idCandidate) {
      setCopyMsg({
        negative: true,
        text: "Indtast et Dashboard-ID (navn) før du opretter — det skal være unikt for din konto.",
      });
      return;
    }
    setCopyMsg(null);
    try {
      const created = await fetchCall({
        url: `${API_URL}/dashboard-boards`,
        method: "POST",
        body: { name: idCandidate },
      });
      await loadBoards();
      setSelectedBoardId(created.id);
      setCopyMsg({ positive: true, text: `Board "${created.name}" er oprettet.` });
    } catch (e) {
      console.error(e);
      setCopyMsg({
        negative: true,
        text: e?.message ?? "Kunne ikke oprette board.",
      });
    }
  };

  const saveBoard = async () => {
    if (!selectedBoardId) return;
    if (!boardName.trim()) return;
    setSaving(true);
    setCopyMsg(null);
    try {
      await fetchCall({
        url: `${API_URL}/dashboard-boards/${selectedBoardId}`,
        method: "PUT",
        body: {
          name: boardName.trim(),
          isPublished,
          items: orderedItems.map((row, i) => ({
            websiteId: row.websiteId,
            sortOrder: i,
            displayLabel: row.displayLabel?.trim() || null,
          })),
        },
      });
      await loadBoards();
      await loadBoardDetail(selectedBoardId);
      setCopyMsg({ positive: true, text: "Gemt." });
    } catch (e) {
      console.error(e);
      setCopyMsg({ negative: true, text: e?.message ?? "Kunne ikke gemme." });
    } finally {
      setSaving(false);
    }
  };

  const deleteBoard = async () => {
    if (!selectedBoardId) return;
    if (!window.confirm("Slet dette board permanent?")) return;
    await fetchCall({
      url: `${API_URL}/dashboard-boards/${selectedBoardId}`,
      method: "DELETE",
    });
    setSelectedBoardId(null);
    await loadBoards();
  };

  const copyShareLink = async () => {
    const segment = boardName.trim();
    if (!segment) return;
    const url = `${window.location.origin}/b/${encodeURIComponent(segment.toUpperCase())}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMsg({ info: true, text: "Link kopieret til udklipsholder." });
    } catch {
      setCopyMsg({ warning: true, text: url });
    }
  };

  if (!userId) {
    return (
      <>
        <Navbar />
        <Container style={{ marginTop: "7rem" }}>
          <Message negative>Du skal være logget ind.</Message>
        </Container>
      </>
    );
  }

  const publicUrl = boardName.trim()
    ? `${window.location.origin}/b/${encodeURIComponent(boardName.trim().toUpperCase())}`
    : "";

  return (
    <>
      <Navbar />
      <Container style={{ marginTop: "7rem", paddingBottom: "3rem", maxWidth: "960px" }}>
        <Header as="h1" style={{ color: "#B0E4CC", marginBottom: "0.25rem" }}>
          Dashboard-builder
        </Header>
        <p style={{ color: "#8aa89c", marginBottom: "1.5rem" }}>
          Vælg hvilke websites der skal med, rækkefølge og om boardet må åbnes uden login.
        </p>

        {loading ? (
          <p style={{ color: "#8fb8a8" }}>Henter…</p>
        ) : (
          <>
            <Segment
              inverted
              style={{ backgroundColor: "#0f1f1c", border: "1px solid #2f6d59" }}
            >
              <Form inverted>
                <div
                  style={{
                    marginBottom: "1.35rem",
                    padding: "1.1rem 1.15rem",
                    borderRadius: "8px",
                    border: "2px solid #408A71",
                    backgroundColor: "#0B1D19",
                  }}
                >
                  <label
                    style={{
                      color: "#B0E4CC",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Dashboard-ID (unikt navn)
                  </label>
                  <p style={{ color: "#8aa89c", fontSize: "0.88rem", margin: "0 0 0.75rem", lineHeight: 1.45 }}>
                    Dette er dit boards <strong style={{ color: "#B0E4CC" }}>ID</strong> i det offentlige link{" "}
                    <code style={{ color: "#9bcbb8" }}>/b/DIT-ID</code> (gemmes som små bogstaver; link virker med
                    store/små bogstaver).
                    På tværs af alle brugere må kun <strong style={{ color: "#B0E4CC" }}>ét publiceret</strong> board have
                    dette ID.
                  </p>
                  <Input
                    fluid
                    size="large"
                    className="dashboard-builder-id-input"
                    placeholder="fx MAGS, produktion, team-a"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                  />
                  {selectedBoardId ? (
                    <p style={{ color: "#6d9084", fontSize: "0.82rem", margin: "0.65rem 0 0" }}>
                      Internt løbenummer (database): <strong style={{ color: "#9bcbb8" }}>#{selectedBoardId}</strong>
                    </p>
                  ) : null}
                </div>

                <Form.Field>
                  <label style={{ color: "#B0E4CC" }}>Vælg eksisterende board</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                    <Dropdown
                      placeholder="Vælg et board…"
                      selection
                      options={boardOptions}
                      value={selectedBoardId ?? undefined}
                      onChange={(_, { value }) => setSelectedBoardId(value)}
                      style={{ minWidth: "320px", backgroundColor: "#091413", color: "#e8fff6" }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedBoardId(null);
                        setCopyMsg(null);
                      }}
                      style={{ backgroundColor: "#1a3a30", border: "1px solid #2f6d59" }}
                    >
                      <Icon name="plus" /> Nyt board (tomt ID-felt)
                    </Button>
                    {selectedBoardId ? (
                      <Button type="button" negative basic onClick={deleteBoard}>
                        Slet board
                      </Button>
                    ) : null}
                  </div>
                </Form.Field>

                {!selectedBoardId ? (
                  <Button
                    type="button"
                    onClick={createBoard}
                    style={{ backgroundColor: "#1F8B68", marginBottom: "1rem" }}
                  >
                    <Icon name="check" /> Opret board med dette Dashboard-ID
                  </Button>
                ) : null}

                {selectedBoardId ? (
                  <>
                    <Form.Field>
                      <Checkbox
                        toggle
                        label="Publicér (tilgængelig uden login via link)"
                        checked={isPublished}
                        onChange={(_, d) => setIsPublished(d.checked)}
                      />
                    </Form.Field>
                    {isPublished && publicUrl ? (
                      <Form.Field>
                        <label style={{ color: "#B0E4CC" }}>Offentligt link</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                          <code
                            style={{
                              color: "#B0E4CC",
                              fontSize: "0.85rem",
                              wordBreak: "break-all",
                              flex: "1 1 240px",
                            }}
                          >
                            {publicUrl}
                          </code>
                          <Button type="button" size="small" onClick={copyShareLink}>
                            <Icon name="copy" /> Kopiér
                          </Button>
                        </div>
                      </Form.Field>
                    ) : null}

                    <Header as="h3" style={{ color: "#408A71", marginTop: "1.5rem" }}>
                      Websites på boardet
                    </Header>
                    <p style={{ color: "#8aa89c", fontSize: "0.9rem" }}>
                      Afkryds sites og brug pilene for rækkefølge. Valgfrit visningsnavn pr. række.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gap: "12px",
                        marginTop: "12px",
                        maxHeight: "280px",
                        overflowY: "auto",
                        paddingRight: "6px",
                      }}
                    >
                      {websites.map((w) => {
                        const on = orderedItems.some((x) => x.websiteId === w.id);
                        return (
                          <div
                            key={w.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              border: "1px solid #2f6d59",
                              backgroundColor: "#091413",
                            }}
                          >
                            <Checkbox
                              checked={on}
                              onChange={(_, d) => toggleWebsite(w.id, d.checked)}
                            />
                            <span style={{ color: "#e8fff6", flex: 1 }}>{w.url}</span>
                          </div>
                        );
                      })}
                    </div>

                    {orderedItems.length > 0 ? (
                      <div style={{ marginTop: "1.5rem" }}>
                        <Header as="h4" style={{ color: "#B0E4CC" }}>
                          Rækkefølge ({orderedItems.length})
                        </Header>
                        {orderedItems.map((row, idx) => {
                          const w = websiteById.get(row.websiteId);
                          return (
                            <div
                              key={row.websiteId}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr auto",
                                gap: "10px",
                                alignItems: "center",
                                marginBottom: "10px",
                                padding: "10px",
                                border: "1px solid #2f6d59",
                                borderRadius: "6px",
                                backgroundColor: "#0B1D19",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <Button
                                  icon
                                  size="mini"
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => move(idx, -1)}
                                >
                                  <Icon name="chevron up" />
                                </Button>
                                <Button
                                  icon
                                  size="mini"
                                  type="button"
                                  disabled={idx === orderedItems.length - 1}
                                  onClick={() => move(idx, 1)}
                                >
                                  <Icon name="chevron down" />
                                </Button>
                              </div>
                              <div>
                                <div style={{ color: "#8aa89c", fontSize: "0.8rem" }}>{w?.url ?? `#${row.websiteId}`}</div>
                                <Input
                                  size="small"
                                  placeholder="Valgfrit visningsnavn"
                                  value={row.displayLabel}
                                  onChange={(e) => updateLabel(row.websiteId, e.target.value)}
                                  style={{ marginTop: "6px", width: "100%" }}
                                  input={{ style: { backgroundColor: "#091413", color: "#e8fff6" } }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    <Button
                      primary
                      type="button"
                      style={{ marginTop: "1.5rem", backgroundColor: "#1F8B68" }}
                      loading={saving}
                      disabled={saving || !boardName.trim()}
                      onClick={saveBoard}
                    >
                      Gem board
                    </Button>
                  </>
                ) : null}
              </Form>
            </Segment>

            {copyMsg ? (
              <Message
                style={{ marginTop: "1rem" }}
                {...(copyMsg.positive ? { success: true } : {})}
                {...(copyMsg.negative ? { negative: true } : {})}
                {...(copyMsg.info ? { info: true } : {})}
                {...(copyMsg.warning ? { warning: true } : {})}
                onDismiss={() => setCopyMsg(null)}
                content={copyMsg.text}
              />
            ) : null}
          </>
        )}
      </Container>
    </>
  );
}

export default DashboardBuilderPage;

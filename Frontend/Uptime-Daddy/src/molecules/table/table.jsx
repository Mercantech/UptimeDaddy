import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import "./style.css";
import { Table, Label, Icon } from "semantic-ui-react";
import MonitorModal from "../monitorModal/index.jsx";
import { API_URL, fetchCall } from "../../util/api.jsx";
import { getAuthPayload } from "../../util/auth";
import accents from "../../util/status/stautsAccent.jsx";
import Loader from "../../atoms/loader/loader.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";
import UptimeBar from "../../atoms/uptimeBar/UptimeBar.jsx";
import TimingCell from "../../atoms/timingCell/TimingCell.jsx";

function pathLatest(path) {
  return path.measurements?.[0] ?? null;
}

function MonitorDataRow({
  rowKey,
  labelNode,
  faviconSrc,
  indent,
  latest,
  checkCount,
  intervalTime,
  uptimeProps,
  onClick,
}) {
  return (
    <Table.Row key={rowKey} onClick={onClick} style={{ cursor: "pointer" }} className={indent ? "monitor-table__path-row" : ""}>
      <Table.Cell>
        <div className={`url-cell-content ${indent ? "url-cell-content--indent" : ""}`}>
          {faviconSrc && !indent ? (
            <img src={faviconSrc} alt="" className="favicon-icon" />
          ) : indent ? (
            <span className="favicon-placeholder favicon-placeholder--small">
              <Icon name="level down" rotated="clockwise" />
            </span>
          ) : (
            <span className="favicon-placeholder">
              <Icon name="file image outline" />
            </span>
          )}
          {labelNode}
        </div>
      </Table.Cell>
      <Table.Cell className="uptime-bar-cell">
        <UptimeBar
          measurements={uptimeProps.measurements ?? []}
          rollupSegments={uptimeProps.rollupSegments}
          rollupPercent={uptimeProps.rollupPercent}
        />
      </Table.Cell>
      <Table.Cell>
        <span title={`${intervalTime ?? 0} sekunder`}>{formatIntervalSeconds(intervalTime ?? 0)}</span>
      </Table.Cell>
      <Table.Cell textAlign="center">
        <span title={`${checkCount} gemte målinger`}>{checkCount.toLocaleString("da-DK")}</span>
      </Table.Cell>
      <Table.Cell>
        <Label color={accents.statusAccent(latest?.statusCode)}>{latest?.statusCode ?? "-"}</Label>
      </Table.Cell>
      <Table.Cell><TimingCell latest={latest} kind="dns" /></Table.Cell>
      <Table.Cell><TimingCell latest={latest} kind="connect" /></Table.Cell>
      <Table.Cell><TimingCell latest={latest} kind="tls" /></Table.Cell>
      <Table.Cell><TimingCell latest={latest} kind="ttfb" /></Table.Cell>
      <Table.Cell><TimingCell latest={latest} kind="total" /></Table.Cell>
    </Table.Row>
  );
}

function TableComponent({ refreshSignal = 0, onDataChanged }) {
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [monitorData, setMonitorData] = useState([]);
  const authPayload = getAuthPayload();
  const userId = authPayload?.userId;
  const tablePollQuietRef = useRef(false);

  const fetchMonitorData = async () => {
    const quiet = tablePollQuietRef.current;
    if (!quiet) setLoading(true);
    try {
      const data = await fetchCall({
        url: `${API_URL}/Monitors/user/${userId}/with-measurements`,
      });
      setMonitorData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching monitor data:", error);
    } finally {
      if (!quiet) setLoading(false);
      tablePollQuietRef.current = true;
    }
  };

  useEffect(() => {
    tablePollQuietRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchMonitorData();
  }, [userId, refreshSignal]);

  const patchMonitor = useCallback((updated) => {
    setMonitorData((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setSelected((prev) => {
      if (prev?.mode === "monitor" && prev?.id === updated.id) return { ...prev, ...updated, mode: "monitor" };
      if (prev?.mode === "path" && prev?.monitor?.id === updated.id) {
        const path = updated.paths?.find((p) => p.id === prev.id);
        return path ? { ...path, mode: "path", monitor: updated } : prev;
      }
      return prev;
    });
  }, []);

  const toggleExpand = (monitorId, e) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(monitorId)) next.delete(monitorId);
      else next.add(monitorId);
      return next;
    });
  };

  return (
    <>
      <Loader isLoading={loading} text="Henter monitors…" />
      <Table celled selectable className="monitor-table">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Domæne / sti</Table.HeaderCell>
            <Table.HeaderCell>Oversigt</Table.HeaderCell>
            <Table.HeaderCell>Ping-interval</Table.HeaderCell>
            <Table.HeaderCell>Antal checks</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>DNS</Table.HeaderCell>
            <Table.HeaderCell>Forbind.</Table.HeaderCell>
            <Table.HeaderCell>TLS</Table.HeaderCell>
            <Table.HeaderCell>TTFB</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {monitorData.map((m) => {
            const paths = m.paths ?? [];
            const rollup = m.rollup ?? {};
            const slowest = [...paths].sort(
              (a, b) => (pathLatest(b)?.totalTimeMs ?? 0) - (pathLatest(a)?.totalTimeMs ?? 0),
            )[0];
            const rollupLatest = pathLatest(slowest) ?? { statusCode: rollup.latestStatusCode, totalTimeMs: rollup.latestTotalTimeMs };
            const faviconSrc = m.faviconBase64 ? `data:image/x-icon;base64,${m.faviconBase64}` : null;
            const isOpen = expanded.has(m.id);
            const hasMultiplePaths = paths.length > 1;

            return (
              <Fragment key={m.id}>
                <MonitorDataRow
                  rowKey={m.id}
                  labelNode={
                    <span className="monitor-table__domain-label">
                      {hasMultiplePaths && (
                        <Icon
                          name={isOpen ? "chevron down" : "chevron right"}
                          onClick={(e) => toggleExpand(m.id, e)}
                          style={{ marginRight: "0.35rem", cursor: "pointer" }}
                        />
                      )}
                      <span>{m.baseUrl}</span>
                      {m.sslExpiresAt && (
                        <Label
                          size="mini"
                          color="blue"
                          style={{ marginLeft: "0.5rem" }}
                          title={`SSL udløber: ${new Date(m.sslExpiresAt).toLocaleDateString("da-DK")}`}
                        >
                          SSL
                        </Label>
                      )}
                    </span>
                  }
                  faviconSrc={faviconSrc}
                  latest={rollupLatest}
                  checkCount={rollup.totalChecks ?? 0}
                  intervalTime={m.intervalTime}
                  uptimeProps={{
                    rollupSegments: rollup.segments,
                    rollupPercent: rollup.uptimePercent,
                  }}
                  onClick={() => setSelected({ ...m, mode: "monitor" })}
                />
                {isOpen &&
                  paths.map((p) => (
                    <MonitorDataRow
                      key={`${m.id}-${p.id}`}
                      rowKey={`${m.id}-${p.id}`}
                      indent
                      labelNode={<span>{p.displayLabel || p.path}</span>}
                      latest={pathLatest(p)}
                      checkCount={p.measurements?.length ?? 0}
                      intervalTime={m.intervalTime}
                      uptimeProps={{ measurements: p.measurements }}
                      onClick={() => setSelected({ ...p, mode: "path", monitor: m })}
                    />
                  ))}
              </Fragment>
            );
          })}
        </Table.Body>
      </Table>

      <MonitorModal
        monitor={selected}
        onClose={() => setSelected(null)}
        onDataChanged={onDataChanged}
        onMonitorPatched={patchMonitor}
      />
    </>
  );
}

export default TableComponent;

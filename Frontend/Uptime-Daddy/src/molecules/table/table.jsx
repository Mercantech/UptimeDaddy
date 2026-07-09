import { useState, useCallback, Fragment, lazy, Suspense, useEffect } from "react";
import "./style.css";
import { Table, Label, Icon } from "semantic-ui-react";
import accents from "../../util/status/stautsAccent.jsx";
import Loader from "../../atoms/loader/loader.jsx";
import { formatIntervalSeconds } from "../../util/durationFormat.js";
import UptimeBar from "../../atoms/uptimeBar/UptimeBar.jsx";
import TimingCell from "../../atoms/timingCell/TimingCell.jsx";
import { monitorFaviconUrl, pathLatest } from "../../util/monitor.js";

const MonitorModal = lazy(() => import("../monitorModal/index.jsx"));

function FaviconImage({ src, className }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span className="favicon-placeholder">
        <Icon name="file image outline" />
      </span>
    );
  }

  return <img src={src} alt="" className={className} onError={() => setFailed(true)} />;
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
            <FaviconImage src={faviconSrc} className="favicon-icon" />
          ) : indent ? (
            <span className="favicon-placeholder favicon-placeholder--small">
              <Icon name="level down" rotated="clockwise" />
            </span>
          ) : null}
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

function TableComponent({ monitorData = [], loading = false, onDataChanged, onMonitorPatched }) {
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const patchMonitor = useCallback((updated) => {
    onMonitorPatched?.(updated);
    setSelected((prev) => {
      if (prev?.mode === "monitor" && prev?.id === updated.id) return { ...prev, ...updated, mode: "monitor" };
      if (prev?.mode === "path" && prev?.monitor?.id === updated.id) {
        const path = updated.paths?.find((p) => p.id === prev.id);
        return path ? { ...path, mode: "path", monitor: updated } : prev;
      }
      return prev;
    });
  }, [onMonitorPatched]);

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
            const faviconSrc = monitorFaviconUrl(m.id);
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
                      checkCount={p.measurementCount ?? p.measurements?.length ?? 0}
                      intervalTime={m.intervalTime}
                      uptimeProps={{
                        rollupSegments: p.segments,
                        rollupPercent: p.uptimePercent,
                      }}
                      onClick={() => setSelected({ ...p, mode: "path", monitor: m })}
                    />
                  ))}
              </Fragment>
            );
          })}
        </Table.Body>
      </Table>

      <Suspense fallback={null}>
        <MonitorModal
          monitor={selected}
          onClose={() => setSelected(null)}
          onDataChanged={onDataChanged}
          onMonitorPatched={patchMonitor}
        />
      </Suspense>
    </>
  );
}

export default TableComponent;

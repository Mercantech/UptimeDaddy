import { useState, useEffect, useCallback, useRef } 				from "react";
import 										"./style.css";
import { Table, Label, Icon } 				from "semantic-ui-react";
import MonitorModal 						from "../monitorModal/index.jsx";
import { API_URL, fetchCall } 				from "../../util/api.jsx";
import { getAuthPayload } 					from "../../util/auth";
import accents 								from "../../util/status/stautsAccent.jsx";
import Loader 								from "../../atoms/loader/loader.jsx";
import { formatIntervalSeconds } 				from "../../util/durationFormat.js";
import UptimeBar 								from "../../atoms/uptimeBar/UptimeBar.jsx";


function TableComponent({ refreshSignal = 0, onDataChanged }) {
	const [selected, setSelected] = useState(null);
	const [loading, setLoading] = useState(false);
  	const [websiteData, setWebsiteData] = useState([]);
	const authPayload = getAuthPayload();
	const userId = authPayload?.userId;
	const tablePollQuietRef = useRef(false);

	const fetchWebsiteData = async () => {
		const quiet = tablePollQuietRef.current;
		if (!quiet) setLoading(true);

		try {
			const data = await fetchCall({
				url: `${API_URL}/Websites/user/${userId}/with-measurements`,
			});

			setWebsiteData(Array.isArray(data) ? data : []);

		} catch (error) {
			console.error("Error fetching account data:", error);
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
		fetchWebsiteData();
	}, [userId, refreshSignal]);

	const patchMonitor = useCallback((updated) => {
		setWebsiteData((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
		setSelected((prev) => (prev?.id === updated.id ? updated : prev));
	}, []);

	useEffect(() => {
		if (!selected?.id) return;
		const updated = websiteData.find((w) => w.id === selected.id);
		if (updated) setSelected(updated);
	}, [websiteData, selected?.id]);

	return (
		<>
			<Loader isLoading={loading} text="Henter websites…" />
			<Table celled selectable className="monitor-table">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>URL</Table.HeaderCell>
						<Table.HeaderCell>Oversigt</Table.HeaderCell>
						<Table.HeaderCell>Ping-interval</Table.HeaderCell>
						<Table.HeaderCell title="Antal gemte målinger (checks) for dette website">
							Antal checks
						</Table.HeaderCell>
						<Table.HeaderCell>Status</Table.HeaderCell>
						<Table.HeaderCell>DNS</Table.HeaderCell>
						<Table.HeaderCell>Forbind.</Table.HeaderCell>
						<Table.HeaderCell>TLS</Table.HeaderCell>
						<Table.HeaderCell>TTFB</Table.HeaderCell>
						<Table.HeaderCell>Total</Table.HeaderCell>
					</Table.Row>
				</Table.Header>

				<Table.Body>
				{websiteData.map((m) => {
					const measurements = m.measurements ?? [];
					const latest = measurements[0];
					const checkCount = measurements.length;
					const faviconSrc = m.faviconBase64 ? `data:image/x-icon;base64,${m.faviconBase64}` : null;
					return (
					<Table.Row
						key={m.id}
						onClick={() => setSelected(m)}
						style={{ cursor: "pointer" }}
					>
						<Table.Cell>
							<div className="url-cell-content">
								{faviconSrc ? (
									<img
										src={faviconSrc}
										alt={`${m.url} favicon`}
										className="favicon-icon"
									/>
								) : (
									<span className="favicon-placeholder" >
										<Icon name="file image outline" />
									</span>
								)}
								<span>{m.url}</span>
							</div>
						</Table.Cell>
						<Table.Cell className="uptime-bar-cell">
							<UptimeBar measurements={measurements} />
						</Table.Cell>
						<Table.Cell>
							<span title={`${m.intervalTime ?? 0} sekunder`}>
								{formatIntervalSeconds(m.intervalTime ?? 0)}
							</span>
						</Table.Cell>
						<Table.Cell textAlign="center">
							<span title={`${checkCount} gemte målinger i databasen`}>
								{checkCount.toLocaleString("da-DK")}
							</span>
						</Table.Cell>
						<Table.Cell>
						<Label color={accents.statusAccent(latest?.statusCode)}>
							{latest?.statusCode ?? "-"}
						</Label>
						</Table.Cell>
						<Table.Cell>{latest?.dnsLookupMs != null ? `${latest.dnsLookupMs}ms` : "-"}</Table.Cell>
						<Table.Cell>{latest?.connectMs != null ? `${latest.connectMs}ms` : "-"}</Table.Cell>
						<Table.Cell>{latest?.tlsHandshakeMs != null ? `${latest.tlsHandshakeMs}ms` : "-"}</Table.Cell>
						<Table.Cell>{latest?.timeToFirstByteMs != null ? `${latest.timeToFirstByteMs}ms` : "-"}</Table.Cell>
						<Table.Cell>{latest?.totalTimeMs != null ? `${latest.totalTimeMs}ms` : "-"}</Table.Cell>
					</Table.Row>
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
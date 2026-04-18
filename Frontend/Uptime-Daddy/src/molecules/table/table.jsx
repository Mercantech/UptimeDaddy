import { useState, useEffect } 				from "react";
import 										"./style.css";
import { Table, Label, Icon } 				from "semantic-ui-react";
import MonitorModal 						from "../monitorModal/index.jsx";
import { API_URL, fetchCall } 				from "../../util/api.jsx";
import { getAuthPayload } 					from "../../util/auth";
import accents 								from "../../util/status/stautsAccent.jsx";
import Loader 								from "../../atoms/loader/loader.jsx";


function TableComponent({ refreshSignal = 0, onDataChanged }) {
	const [selected, setSelected] = useState(null);
	const [loading, setLoading] = useState(false);
  	const [websiteData, setWebsiteData] = useState([]);
	const authPayload = getAuthPayload();
	const userId = authPayload?.userId; 

	const fetchWebsiteData = async () => {
		setLoading(true);

		try {
			const data = await fetchCall({
				url: `${API_URL}/Websites/user/${userId}/with-measurements`,
			});

			setWebsiteData(Array.isArray(data) ? data : []);

		} catch (error) {
			console.error("Error fetching account data:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!userId) return;
		fetchWebsiteData();
	}, [userId, refreshSignal]);

	return (
		<>
			<Loader isLoading={loading} text="Loading websites..." />
			<Table celled selectable className="monitor-table">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>URL</Table.HeaderCell>
						<Table.HeaderCell>Status Code</Table.HeaderCell>
						<Table.HeaderCell>DNS Lookup</Table.HeaderCell>
						<Table.HeaderCell>Connect</Table.HeaderCell>
						<Table.HeaderCell>TLS Handshake</Table.HeaderCell>
						<Table.HeaderCell>Time to First Byte</Table.HeaderCell>
						<Table.HeaderCell>Total Time</Table.HeaderCell>
					</Table.Row>
				</Table.Header>

				<Table.Body>
				{websiteData.map((m) => {
					const latest = m.measurements[0];
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
			/>
		</>
	);
}

export default TableComponent;
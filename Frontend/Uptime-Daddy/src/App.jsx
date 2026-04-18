import { useState, useEffect, useRef } 				from "react";
import { Container } 						from "semantic-ui-react";
import Navbar 								from "./molecules/navbar/navbar";
import Table 								from "./molecules/table/table";
import Cards 								from "./atoms/cards/cards";
import Register 							from "./pages/register/register";
import SearchWebsite 						from "./molecules/searchWebsite";
import { getAuthPayload } 					from "./util/auth";
import { API_URL, fetchCall } 				from "./util/api.jsx";

/** Hvor ofte dashboard henter friske målinger (ms). Kan sættes via VITE_DASHBOARD_POLL_MS. */
const DASHBOARD_POLL_MS = Number(import.meta.env.VITE_DASHBOARD_POLL_MS) || 30_000;

function App() {
	const [showRegister, setShowRegister] = useState(false);
	const [cards, setCards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshSignal, setRefreshSignal] = useState(0);
	const cardsPollQuietRef = useRef(false);

	function calculateCards(amountOfWebsites, amountOfMeasurements) {
		let totalMeasurements = 0;
		let totalSitesUp = 0;
		if (Array.isArray(amountOfMeasurements)) {
			for (const item of amountOfMeasurements) {
				if (item && Array.isArray(item.measurements)) {
					totalMeasurements += item.measurements.length;
					const latest = item.measurements[0];
					if (latest && (latest.statusCode === 200)) {
						totalSitesUp += 1;
					}
				}
			}
		}

		const uptimePercent = Array.isArray(amountOfMeasurements) && amountOfMeasurements.length > 0
			? Math.round((totalSitesUp / amountOfMeasurements.length) * 100): 0;

		return [
			{header: amountOfWebsites.length, description: "Active Projects", icon: "circle check"},
			{header: totalMeasurements, description: "Total Checks", icon: "chart bar"},
			{header: `${uptimePercent}%`, description: "Uptime %", icon: "chart bar"},
		];
	}

	if (showRegister) {
		return <Register onSwitchToDashboard={() => setShowRegister(false)} />;
	}

		const authPayload = getAuthPayload();
        const userId = authPayload?.userId;

		const handleWebsiteDataChanged = () => {
			cardsPollQuietRef.current = false;
			setRefreshSignal((previous) => previous + 1);
		};

		useEffect(() => {
			cardsPollQuietRef.current = false;
		}, [userId]);

		useEffect(() => {
			if (!userId) return;

			const loadData = async () => {
				const quiet = cardsPollQuietRef.current;
				try {
					if (!quiet) setLoading(true);
					const [amountOfWebsites, amountOfMeasurements] = await Promise.all([
					fetchCall({ url:`${API_URL}/Websites/user/${userId}` }),
					fetchCall({ url:`${API_URL}/Websites/user/${userId}/with-measurements` }),
				]);
					setCards(calculateCards(amountOfWebsites, amountOfMeasurements));
				} catch (err) {
					setError(err);
				} finally {
					if (!quiet) setLoading(false);
					cardsPollQuietRef.current = true;
				}
			};

		loadData();
		}, [userId, refreshSignal]);

		useEffect(() => {
			if (!userId || DASHBOARD_POLL_MS < 5000) return;

			const id = window.setInterval(() => {
				if (document.visibilityState !== "visible") return;
				setRefreshSignal((n) => n + 1);
			}, DASHBOARD_POLL_MS);

			return () => window.clearInterval(id);
		}, [userId]);

	return (
		<>
			<Navbar />
			<Container style={{ marginTop: "7rem", padding: "2rem 0" }}>
				<SearchWebsite onWebsiteAdded={handleWebsiteDataChanged} />
				<Cards items={cards} />
				<Table refreshSignal={refreshSignal} onDataChanged={handleWebsiteDataChanged} />
				{import.meta.env.VITE_BUILD_ID ? (
					<div
						style={{
							textAlign: "center",
							marginTop: "1.5rem",
							fontSize: "0.72rem",
							color: "#5c7a70",
							letterSpacing: "0.04em",
						}}
						title="Hvis denne ikke matcher efter deploy, får browseren/CDN stadig en gammel bundle."
					>
						Frontend-udgave: {import.meta.env.VITE_BUILD_ID}
					</div>
				) : null}
			</Container>
		</>
	);
}

export default App;

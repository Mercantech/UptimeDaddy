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

const FRONTEND_CREDITS = [
	{ name: "Daniel", href: "https://github.com/Danielsteenberg-bot" },
	{ name: "Kevin", href: "https://github.com/KevinNielsen00" },
	{ name: "Kim", href: "https://github.com/krixzy" },
];

function GitHubMark({ className, style }) {
	return (
		<svg
			className={className}
			style={style}
			width="18"
			height="18"
			viewBox="0 0 98 96"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
				d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.089 2.779-15.842-5.89-15.842-5.89-2.127-5.527-5.198-7-5.198-7-4.248-2.915.32-2.855.32-2.855C17.08 65.55 20.937 70.44 20.937 70.44c2.407 4.087 6.317 2.905 7.856 2.223.244-1.726.938-2.905 1.706-3.574-12.413-1.4-25.451-6.24-25.451-27.748 0-6.132 2.18-11.139 5.76-15.058-.576-1.416-2.509-7.09 1.086-14.784 0 0 4.715-1.517 15.45 5.752 4.478-1.248 9.28-1.872 14.047-1.892 4.768.02 9.57.645 14.048 1.892 10.732-7.27 15.444-5.752 15.444-5.752 2.595 7.693.99 13.368.414 14.784 3.577 3.923 5.754 8.927 5.754 15.058 0 21.536-13.052 26.33-25.483 27.756 1.989 1.711 3.756 5.074 3.756 10.22 0 7.38-.07 13.32-.07 15.116 0 1.311.89 2.866 3.313 2.382C83.996 89.447 98 70.988 98 49.217 98 22 76.173 0 48.854 0z"
			/>
		</svg>
	);
}

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
				<footer
					style={{
						textAlign: "center",
						marginTop: "1.75rem",
						paddingBottom: "0.5rem",
					}}
				>
					<div
						style={{
							fontSize: "0.78rem",
							color: "#6d9084",
							letterSpacing: "0.04em",
							marginBottom: "0.65rem",
						}}
					>
						<a
							href="https://youtu.be/Hbqz2iEZN10?t=248"
							target="_blank"
							rel="noopener noreferrer"
							style={{ color: "#6d9084", textDecoration: "underline" }}
						>
							Skud ud til udviklerne
						</a>
	
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							flexWrap: "wrap",
							gap: "1.1rem",
							rowGap: "0.6rem",
						}}
					>
						{FRONTEND_CREDITS.map(({ name, href }) => (
							<span
								key={href}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "0.4rem",
								}}
							>
								<span style={{ color: "#c5ebe0", fontSize: "0.88rem", fontWeight: 600 }}>{name}</span>
								<a
									href={href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={`${name} på GitHub`}
									className="credit-github-link"
								>
									<GitHubMark />
								</a>
							</span>
						))}
					</div>
					{import.meta.env.VITE_BUILD_ID ? (
						<div
							style={{
								marginTop: "0.85rem",
								fontSize: "0.65rem",
								color: "#5c7a70",
								letterSpacing: "0.04em",
							}}
							title="Hvis denne ikke matcher efter deploy, får browseren/CDN stadig en gammel bundle."
						>
						</div>
					) : null}
				</footer>
			</Container>
		</>
	);
}

export default App;

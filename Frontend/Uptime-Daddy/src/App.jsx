import { useState, useEffect, useRef } from "react";
import { Container } from "semantic-ui-react";
import Navbar from "./molecules/navbar/navbar";
import Table from "./molecules/table/table";
import Cards from "./atoms/cards/cards";
import Register from "./pages/register/register";
import SearchWebsite from "./molecules/searchWebsite";
import { getAuthPayload } from "./util/auth";
import { API_URL, fetchCall } from "./util/api.jsx";
import CreditsBanner from "./components/CreditsBanner";

const DASHBOARD_POLL_MS = Number(import.meta.env.VITE_DASHBOARD_POLL_MS) || 30_000;

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const cardsPollQuietRef = useRef(false);

  function calculateCards(monitors) {
    let totalMeasurements = 0;
    let monitorsUp = 0;
    if (Array.isArray(monitors)) {
      for (const m of monitors) {
        totalMeasurements += m.rollup?.totalChecks ?? 0;
        if (m.rollup?.isUp) monitorsUp += 1;
      }
    }

    const uptimePercentStr =
      Array.isArray(monitors) && monitors.length > 0
        ? ((monitorsUp / monitors.length) * 100).toLocaleString("da-DK", {
            maximumFractionDigits: 4,
            minimumFractionDigits: 1,
          })
        : "0";

    return [
      { header: monitors?.length ?? 0, description: "Active Projects", icon: "circle check" },
      { header: totalMeasurements, description: "Total Checks", icon: "chart bar" },
      { header: `${uptimePercentStr}%`, description: "Uptime %", icon: "chart bar" },
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
        const monitors = await fetchCall({
          url: `${API_URL}/Monitors/user/${userId}/with-measurements`,
        });
        setCards(calculateCards(monitors));
      } catch (err) {
        console.error(err);
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
        <CreditsBanner />
      </Container>
    </>
  );
}

export default App;

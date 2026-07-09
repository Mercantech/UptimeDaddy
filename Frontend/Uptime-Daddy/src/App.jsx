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
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const pollQuietRef = useRef(false);

  const authPayload = getAuthPayload();
  const userId = authPayload?.userId;

  function calculateCards(monitorList) {
    let totalMeasurements = 0;
    let monitorsUp = 0;
    if (Array.isArray(monitorList)) {
      for (const m of monitorList) {
        totalMeasurements += m.rollup?.totalChecks ?? 0;
        if (m.rollup?.isUp) monitorsUp += 1;
      }
    }

    const uptimePercentStr =
      Array.isArray(monitorList) && monitorList.length > 0
        ? ((monitorsUp / monitorList.length) * 100).toLocaleString("da-DK", {
            maximumFractionDigits: 4,
            minimumFractionDigits: 1,
          })
        : "0";

    return [
      { header: monitorList?.length ?? 0, description: "Active Projects", icon: "circle check" },
      { header: totalMeasurements, description: "Total Checks", icon: "chart bar" },
      { header: `${uptimePercentStr}%`, description: "Uptime %", icon: "chart bar" },
    ];
  }

  const handleWebsiteDataChanged = () => {
    pollQuietRef.current = false;
    setRefreshSignal((previous) => previous + 1);
  };

  const patchMonitor = (updated) => {
    setMonitors((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  useEffect(() => {
    pollQuietRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      const quiet = pollQuietRef.current;
      try {
        if (!quiet) setLoading(true);
        const data = await fetchCall({
          url: `${API_URL}/Monitors/user/${userId}/with-measurements`,
        });
        setMonitors(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!quiet) setLoading(false);
        pollQuietRef.current = true;
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

  if (showRegister) {
    return <Register onSwitchToDashboard={() => setShowRegister(false)} />;
  }

  return (
    <>
      <Navbar />
      <Container style={{ marginTop: "7rem", padding: "2rem 0" }}>
        <SearchWebsite onWebsiteAdded={handleWebsiteDataChanged} />
        <Cards items={calculateCards(monitors)} />
        <Table
          monitorData={monitors}
          loading={loading}
          onDataChanged={handleWebsiteDataChanged}
          onMonitorPatched={patchMonitor}
        />
        <CreditsBanner />
      </Container>
    </>
  );
}

export default App;

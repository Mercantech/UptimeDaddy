import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { hasAuthToken } from "../util/auth";
import Loader from "../atoms/loader/loader.jsx";

const Login = lazy(() => import("../pages/login/login"));
const Register = lazy(() => import("../pages/register/register"));
const App = lazy(() => import("../App"));
const Settings = lazy(() => import("../pages/settings"));
const PublicBoardPage = lazy(() => import("../pages/publicBoard/PublicBoardPage.jsx"));
const DashboardBuilderPage = lazy(() => import("../pages/dashboardBuilder/DashboardBuilderPage.jsx"));
const IncidentsPage = lazy(() => import("../pages/incidents/index.jsx"));
const DevelopersPage = lazy(() => import("../pages/developers/index.jsx"));
const DeveloperDetailPage = lazy(() => import("../pages/developers/DeveloperDetailPage.jsx"));
const MercantecCallback = lazy(() => import("../pages/auth/MercantecCallback.jsx"));

function ProtectedRoute({ children }) {
  return hasAuthToken() ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  return hasAuthToken() ? <Navigate to="/" replace /> : children;
}

function RouteFallback() {
  return <Loader isLoading text="Indlæser…" />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route path="/auth/mercantec/callback" element={<MercantecCallback />} />
          <Route path="/b/:boardId" element={<PublicBoardPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard-builder"
            element={
              <ProtectedRoute>
                <DashboardBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <IncidentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/developers"
            element={
              <ProtectedRoute>
                <DevelopersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/developers/:slug"
            element={
              <ProtectedRoute>
                <DeveloperDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={hasAuthToken() ? "/" : "/login"} replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

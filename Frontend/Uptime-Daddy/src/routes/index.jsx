import { BrowserRouter, Routes, Route, Navigate }   from "react-router-dom";
import Login                                        from "../pages/login/login";
import Register                                     from "../pages/register/register";
import App                                          from "../App";
import Settings                                     from "../pages/settings";
import PublicBoardPage                              from "../pages/publicBoard/PublicBoardPage.jsx";
import DashboardBuilderPage                         from "../pages/dashboardBuilder/DashboardBuilderPage.jsx";
import { hasAuthToken }                             from "../util/auth";

function ProtectedRoute({ children }) {
  return hasAuthToken() ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  return hasAuthToken() ? <Navigate to="/" replace /> : children;
}

export default function Router() {
  return (
    <BrowserRouter>
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
        <Route path="/b/:token" element={<PublicBoardPage />} />
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
          path="*"
          element={<Navigate to={hasAuthToken() ? "/" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
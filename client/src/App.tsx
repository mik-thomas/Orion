import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import { RoleProvider } from "./context/RoleContext";
import { GovUkLayout } from "./layout/GovUkLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MagistrateProfilePage } from "./pages/MagistrateProfilePage";
import { MagistrateRosterPage } from "./pages/MagistrateRosterPage";
import { MagistratesPage } from "./pages/MagistratesPage";
import { OnLeavePage } from "./pages/OnLeavePage";
import { ReportsPage } from "./pages/ReportsPage";
import { SittingsDrillDownPage } from "./pages/SittingsDrillDownPage";

export default function App() {
  return (
    <RoleProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <GovUkLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="magistrates" element={<MagistratesPage />} />
              <Route path="magistrates/on-leave" element={<OnLeavePage />} />
              <Route path="magistrates/roster" element={<MagistrateRosterPage />} />
              <Route path="magistrates/:id" element={<MagistrateProfilePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/sittings" element={<SittingsDrillDownPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </RoleProvider>
  );
}

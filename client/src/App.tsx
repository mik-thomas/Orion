import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GovUkLayout } from "./layout/GovUkLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { MagistrateProfilePage } from "./pages/MagistrateProfilePage";
import { MagistratesPage } from "./pages/MagistratesPage";
import { OnLeavePage } from "./pages/OnLeavePage";
import { ReportsPage } from "./pages/ReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GovUkLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="magistrates" element={<MagistratesPage />} />
          <Route path="magistrates/on-leave" element={<OnLeavePage />} />
          <Route path="magistrates/:id" element={<MagistrateProfilePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

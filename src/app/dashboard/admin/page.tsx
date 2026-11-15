import { Suspense } from "react";
import { AdminDashboardContent } from "./admin-dashboard-content";

export const metadata = { title: "Painel do Administrador — SGTCC" };
export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" aria-label="Carregando dashboard" />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

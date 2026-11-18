import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { CalendarioCronogramaClient } from "./calendario-cronograma-client";

export const metadata = { title: "Cronograma e Calendário — SGTCC" };
export const dynamic = "force-dynamic";

export default async function CronogramaPage() {
  await requireSessao();

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <CalendarioCronogramaClient />
    </Suspense>
  );
}

import { destinoSeguro } from "@/lib/auth/perfis";
import { LoginForm } from "./login-form";

export const metadata = { title: "Acesse sua conta — SGTCC" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; tab?: string }>;
}) {
  const { next, tab } = await searchParams;
  const destino = destinoSeguro(next) ?? "/dashboard";

  const initialTab =
    tab === "criar-senha" ? "criar-senha" : tab === "esqueci-senha" ? "esqueci-senha" : "login";

  return <LoginForm destino={destino} initialTab={initialTab} />;
}

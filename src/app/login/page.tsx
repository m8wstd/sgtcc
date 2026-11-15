import { destinoSeguro } from "@/lib/auth/perfis";
import { LoginForm } from "./login-form";

export const metadata = { title: "Acesse sua conta — SGTCC" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; tab?: string; erro?: string }>;
}) {
  const { next, tab, erro } = await searchParams;
  const destino = destinoSeguro(next) ?? "/dashboard";

  const initialTab =
    tab === "criar-senha" ? "criar-senha" : tab === "esqueci-senha" ? "esqueci-senha" : "login";

  let erroInicial: string | undefined = undefined;
  if (erro === "perfil_nao_encontrado") {
    erroInicial =
      "Sua conta foi autenticada, mas nenhum perfil institucional ativo foi localizado no sistema. Solicite acesso ao Administrador ou conclua seu cadastro via convite.";
  }

  return <LoginForm destino={destino} initialTab={initialTab} erroInicial={erroInicial} />;
}

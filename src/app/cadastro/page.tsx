import { Suspense } from "react";
import { CadastroConviteForm } from "./cadastro-convite-form";

export const metadata = {
  title: "Ativação de Conta — SGTCC",
};

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CadastroConviteForm />
    </Suspense>
  );
}

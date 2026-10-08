import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  ShieldCheck,
  Calendar,
  Flame,
  CheckCircle2,
  Database,
  Code2,
} from "lucide-react";

export default function Home() {
  const stackItems = [
    { name: "Next.js 16 (App Router)", status: "Ativo", icon: Code2 },
    { name: "React 19 & TypeScript", status: "Ativo", icon: CheckCircle2 },
    { name: "Tailwind CSS v4", status: "Ativo", icon: CheckCircle2 },
    { name: "shadcn/ui Design System", status: "Pronto", icon: CheckCircle2 },
    { name: "Firebase (Auth & Firestore)", status: "Configurado", icon: Database },
  ];

  const roles = [
    { title: "Aluno", desc: "Submissão de capítulos, acompanhamento de prazos e feedbacks.", icon: GraduationCap },
    { title: "Professor Orientador", desc: "Gestão em lote (>20 orientandos), revisão e aprovação final.", icon: Users },
    { title: "Coordenação", desc: "Alocação em lote de orientadores, cronograma e mediação de conflitos.", icon: Calendar },
    { title: "Professor Avaliador", desc: "Visualização centralizada e leitura da monografia final da banca.", icon: ShieldCheck },
  ];

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-between p-6 sm:p-12">
      <div className="max-w-5xl mx-auto w-full space-y-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                <GraduationCap className="h-6 w-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SGTCC</h1>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Sistema de Gestão e Acompanhamento de Trabalhos de Conclusão de Curso
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 font-mono text-xs">
              Branch: dev
            </Badge>
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs">
              Sprint 3: Em Preparação
            </Badge>
          </div>
        </header>

        {/* Status do Ambiente */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" /> Ambiente Tecnológico Inicializado
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stackItems.map((tech) => {
              const Icon = tech.icon;
              return (
                <div
                  key={tech.name}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium">{tech.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {tech.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </section>

        {/* Próximo Passo: RF01 */}
        <section>
          <Card className="border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xs">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Próxima Etapa: RF01 - Cadastro e Autenticação</CardTitle>
                <Badge variant="outline" className="text-xs">
                  19/10/2026
                </Badge>
              </div>
              <CardDescription>
                Implementação do fluxo de Login Institucional com SSO e redirecionamento dinâmico conforme perfil de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <div
                      key={role.title}
                      className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/50 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <Icon className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
                        <h3 className="font-semibold text-sm">{role.title}</h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {role.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="#login-mock"
                  className={buttonVariants({ variant: "default" })}
                >
                  Iniciar Desenvolvimento RF01
                </Link>
                <a
                  href="https://github.com/m8wstd/sgtcc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Repositório GitHub
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-10 text-center text-xs text-neutral-500">
        SGTCC — Sistema de Gestão de TCC &bull; Ambiente configurado com sucesso na branch{" "}
        <code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">dev</code>.
      </footer>
    </main>
  );
}

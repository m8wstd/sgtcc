import { PerfilEnum } from "@/types";
import type { AuthenticatedSession } from "@/lib/auth/session";
import type { RegistroEntrega } from "./contracts";

export function sessaoTeste(perfil = PerfilEnum.ORIENTADOR, uid = "usuario-orientador"): AuthenticatedSession {
  return {
    uid,
    perfil,
    usuario: { id: uid, nome: "Usuário de teste", email: "teste@example.test", perfil },
    token: {} as AuthenticatedSession["token"],
  };
}

export function registroTeste(): RegistroEntrega {
  return {
    entrega: { id: "entrega-teste", status: "PRONTA_PARA_REVISAO", marco_id: "marco-teste", tcc_id: "tcc-teste" },
    tcc: { id: "tcc-teste", titulo: "TCC de teste", statusGeral: "EM_ANDAMENTO", aluno_id: "matricula-teste", orientador_id: "professor-teste" },
    contexto: {
      aluno: { matricula: "matricula-teste", usuario_id: "usuario-aluno" },
      orientador: { id: "professor-teste", usuario_id: "usuario-orientador" },
    },
    revisao: "100:123456789",
    atualizadaEmMillis: 100123.456789,
    versoes: [{
      versao: { id: "versao-teste", numeroVersao: 1, entrega_id: "entrega-teste", arquivoUrl: "gs://bucket-teste/trabalho.pdf", dataUpload: "1970-01-01T00:01:00.000Z" },
      criadaEmMillis: 60000,
      uploadEmMillis: 60000,
    }],
  };
}

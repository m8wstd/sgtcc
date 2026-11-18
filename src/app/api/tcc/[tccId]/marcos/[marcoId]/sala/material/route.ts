import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { assertTccAccess } from "@/lib/auth/authorization";
import { getTccAccessRecord } from "@/lib/auth/firestore-repository";
import { PerfilEnum } from "@/types";

export const runtime = "nodejs";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tccId: string; marcoId: string }> }
) {
  try {
    const { tccId, marcoId } = await params;
    const sessao = await requireSessao();
    if (!sessao) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Não autenticado." }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
    }

    const registro = await getTccAccessRecord(tccId, sessao);
    if (!registro) {
      return NextResponse.json({ error: "NOT_FOUND", message: "TCC não encontrado." }, { status: 404 });
    }
    assertTccAccess(sessao, registro.tcc, registro.context);

    const isOrientador =
      sessao.perfil === PerfilEnum.ORIENTADOR ||
      sessao.perfil === PerfilEnum.COORDENACAO ||
      sessao.perfil === PerfilEnum.ADMIN;

    if (!isOrientador) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Apenas o professor orientador pode adicionar material." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File | null;
    const nomePersonalizado = (formData.get("nome") as string | null)?.trim();

    if (!arquivo) {
      return NextResponse.json({ error: "NO_FILE", message: "Arquivo não enviado." }, { status: 400 });
    }

    const nomeOriginal = arquivo.name;
    const nomeFinal = nomePersonalizado || nomeOriginal;
    const ext = nomeOriginal.split(".").pop()?.toUpperCase() ?? "DOCUMENTO";
    const tamanhoFormatado = formatBytes(arquivo.size);

    let urlFinal = "#";
    try {
      const buffer = Buffer.from(await arquivo.arrayBuffer());
      const caminhoBlob = `materiais/${tccId}/${marcoId}/${Date.now()}-${nomeOriginal.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const blob = await put(caminhoBlob, buffer, {
        access: "public",
        addRandomSuffix: true,
      });
      urlFinal = blob.url;
    } catch (blobErr) {
      console.warn("Aviso ao fazer upload para Vercel Blob (salvando metadados):", blobErr);
    }

    const agoraIso = new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const novoMaterialObj = {
      id: `mat-${Date.now()}`,
      nome: nomeFinal,
      tipo: ext,
      tamanho: tamanhoFormatado,
      url: urlFinal,
      criadoEm: agoraIso,
    };

    const salaDocId = `${tccId}__${marcoId}`;
    const salaRef = adminDb.collection("etapas_sala").doc(salaDocId);
    const salaDoc = await salaRef.get();
    const dadosAtuais = salaDoc.exists ? salaDoc.data() : { materiais: [] };

    const materiaisAtualizados = [novoMaterialObj, ...(dadosAtuais?.materiais ?? [])];
    await salaRef.set({ materiais: materiaisAtualizados }, { merge: true });

    return NextResponse.json({ success: true, material: novoMaterialObj });
  } catch (err) {
    console.error("Erro no upload de material:", err);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Falha ao enviar arquivo de material." }, { status: 500 });
  }
}

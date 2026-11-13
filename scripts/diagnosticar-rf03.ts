/** Diagnóstico somente leitura. Nunca altera o Firestore ou o Blob. */
import { config } from "dotenv";
import { head } from "@vercel/blob";
config({ path: ".env.local" });

async function main() {
  // Configurar .env.local ANTES de carregar o Firebase Admin.
  const { adminDb } = await import("../src/lib/firebase/admin");
  if (!adminDb) throw new Error("Firebase Admin não está configurado. Confira .env.local.");
  const versoes = await adminDb.collection("versoes_arquivo").limit(200).get();
  let validos = 0, ausentes = 0, ficticios = 0;
  for (const doc of versoes.docs) {
    const url = doc.data().arquivoUrl;
    if (typeof url !== "string" || !/^https:\/\/[^/]+\.(private|public)\.blob\.vercel-storage\.com\//i.test(url)) {
      ficticios++;
      console.log(`SEM BLOB: ${doc.id} (registro antigo/demonstração)`);
      continue;
    }
    try {
      const arquivo = await head(url);
      if (!arquivo) throw new Error("head() retornou vazio");
      validos++;
      console.log(`OK: ${doc.id} (${arquivo.size} bytes)`);
    } catch {
      ausentes++;
      console.log(`NÃO ENCONTRADO: ${doc.id} (store errada, token ou arquivo inexistente)`);
    }
  }
  console.log({ verificados: versoes.size, validos, ausentes, ficticios });
  if (versoes.size === 200) console.log("Apenas os 200 primeiros registros foram verificados.");
}
main().catch((e) => { console.error(e); process.exitCode = 1; });

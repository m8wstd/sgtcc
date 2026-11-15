import { createSubmissaoPostHandler } from "@/lib/entregas/submissao-route-handler";

// firebase-admin precisa do runtime Node.js.
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ tccId: string }> },
) {
  return createSubmissaoPostHandler()(request, context);
}

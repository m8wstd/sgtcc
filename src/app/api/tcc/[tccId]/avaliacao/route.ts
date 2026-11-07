import { createAvaliacaoPostHandler } from "@/lib/banca/avaliacao-route-handler";

export async function POST(
  request: Request,
  context: { params: Promise<{ tccId: string }> },
) {
  return createAvaliacaoPostHandler()(request, context);
}

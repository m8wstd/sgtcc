import { createStatusPatchHandler } from "@/lib/entregas/status-route-handler";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ entregaId: string }> }) {
  return createStatusPatchHandler()(request, context);
}

import { createStatusGetHandler, createStatusPatchHandler } from "@/lib/entregas/status-route-handler";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ entregaId: string }> }) {
  return createStatusGetHandler()(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ entregaId: string }> }) {
  return createStatusPatchHandler()(request, context);
}

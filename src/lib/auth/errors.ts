export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "SSO_NOT_CONFIGURED"
  | "INVALID_SSO_PROVIDER"
  | "PROFILE_NOT_FOUND"
  | "CSRF_INVALID"
  | "INVALID_REQUEST"
  | "AUTH_SERVICE_UNAVAILABLE"
  | "DOCUMENT_STORAGE_UNAVAILABLE";

export class AuthHttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 503,
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthHttpError";
  }
}

export class UnauthorizedError extends AuthHttpError {
  constructor(message = "Autenticação necessária.") {
    super(401, "UNAUTHENTICATED", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthHttpError {
  constructor(
    message = "Usuário sem permissão para este recurso.",
    code: AuthErrorCode = "FORBIDDEN",
  ) {
    super(403, code, message);
    this.name = "ForbiddenError";
  }
}

export class ProfileNotFoundError extends ForbiddenError {
  constructor(
    message = "Usuário autenticado sem perfil institucional cadastrado. Solicite acesso à administração.",
  ) {
    super(message, "PROFILE_NOT_FOUND");
    this.name = "ProfileNotFoundError";
  }
}

export class SsoNotConfiguredError extends AuthHttpError {
  constructor() {
    super(503, "SSO_NOT_CONFIGURED", "O SSO institucional ainda não foi configurado.");
    this.name = "SsoNotConfiguredError";
  }
}

export class AuthServiceUnavailableError extends AuthHttpError {
  constructor(message = "O serviço de autenticação não está disponível.") {
    super(503, "AUTH_SERVICE_UNAVAILABLE", message);
    this.name = "AuthServiceUnavailableError";
  }
}

export function toAuthErrorResponse(error: unknown): Response {
  if (error instanceof AuthHttpError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }

  return Response.json(
    { error: "AUTH_SERVICE_UNAVAILABLE", message: "Não foi possível processar a autenticação." },
    { status: 503 },
  );
}

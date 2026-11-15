import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  AuthServiceUnavailableError,
  ForbiddenError,
  ProfileNotFoundError,
  SsoNotConfiguredError,
  UnauthorizedError,
} from "@/lib/auth/errors";
import { getServerSsoConfig, isInstitutionalEmail } from "@/lib/auth/config";
import {
  createFirestoreUsuarioProfileStore,
  resolveAuthenticatedPrincipal,
  type AuthenticatedPrincipal,
  type UsuarioProfileStore,
} from "@/lib/auth/profile";

export const SESSION_COOKIE_NAME = "sgtcc_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export interface SessionAuthGateway {
  verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<DecodedIdToken>;
  verifySessionCookie(
    sessionCookie: string,
    checkRevoked?: boolean,
  ): Promise<DecodedIdToken>;
  createSessionCookie(
    idToken: string,
    options: { expiresIn: number },
  ): Promise<string>;
}

export interface AuthenticatedSession extends AuthenticatedPrincipal {
  token: DecodedIdToken;
}

function getAuthGateway(): SessionAuthGateway {
  if (!adminAuth) {
    throw new AuthServiceUnavailableError("Firebase Admin Auth não está configurado.");
  }

  return adminAuth as unknown as SessionAuthGateway;
}

function getProfileStore(): UsuarioProfileStore {
  if (!adminDb) {
    throw new AuthServiceUnavailableError("Firestore Admin não está configurado.");
  }

  return createFirestoreUsuarioProfileStore(adminDb);
}

function providerFromToken(token: DecodedIdToken): string | undefined {
  return token.firebase?.sign_in_provider;
}

export async function verifyInstitutionalIdToken(
  idToken: string,
  dependencies?: {
    auth: SessionAuthGateway;
    profileStore: UsuarioProfileStore;
  },
): Promise<AuthenticatedSession> {
  const config = getServerSsoConfig();
  if (!config) {
    throw new SsoNotConfiguredError();
  }

  const resolvedDependencies = dependencies ?? {
    auth: getAuthGateway(),
    profileStore: getProfileStore(),
  };

  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await resolvedDependencies.auth.verifyIdToken(idToken, true);
  } catch {
    throw new UnauthorizedError("Token de identidade inválido ou expirado.");
  }

  if (providerFromToken(decodedToken) !== config.providerId) {
    throw new ForbiddenError("O provedor de identidade não é institucional.");
  }

  if (decodedToken.email_verified !== true) {
    throw new ForbiddenError("A identidade institucional não foi verificada.");
  }

  if (!isInstitutionalEmail(decodedToken.email, config)) {
    throw new ForbiddenError("O e-mail não pertence ao domínio institucional.");
  }

  const principal = await resolveAuthenticatedPrincipal(
    decodedToken.uid,
    decodedToken.email,
    resolvedDependencies.profileStore,
  );

  if (!principal) {
    throw new ProfileNotFoundError("Usuário autenticado sem perfil institucional cadastrado.");
  }

  return { ...principal, token: decodedToken };
}

export async function createSessionCookie(
  idToken: string,
  auth: SessionAuthGateway = getAuthGateway(),
): Promise<string> {
  try {
    return await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
  } catch {
    throw new AuthServiceUnavailableError("Não foi possível criar a sessão segura.");
  }
}

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;
    if (cookie.slice(0, separator).trim() === name) {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    }
  }
  return undefined;
}

export async function getAuthenticatedSession(
  request: Request,
  dependencies: {
    auth?: SessionAuthGateway;
    profileStore?: UsuarioProfileStore;
  } = {},
): Promise<AuthenticatedSession> {
  const sessionCookie = getCookie(request, SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    throw new UnauthorizedError();
  }

  const auth = dependencies.auth ?? getAuthGateway();
  const profileStore = dependencies.profileStore ?? getProfileStore();

  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await auth.verifySessionCookie(sessionCookie, true);
  } catch {
    throw new UnauthorizedError("Sessão inválida ou expirada.");
  }

  const principal = await resolveAuthenticatedPrincipal(
    decodedToken.uid,
    decodedToken.email,
    profileStore,
  );

  if (!principal) {
    throw new ProfileNotFoundError("Usuário autenticado sem perfil institucional cadastrado.");
  }

  return { ...principal, token: decodedToken };
}

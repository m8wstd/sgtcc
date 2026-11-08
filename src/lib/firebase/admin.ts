import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

let adminApp: App | undefined;

function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let formatted = key.trim();
  // Remove aspas externas se existirem (comum ao copiar de arquivos .env)
  while (
    (formatted.startsWith('"') && formatted.endsWith('"')) ||
    (formatted.startsWith("'") && formatted.endsWith("'"))
  ) {
    formatted = formatted.slice(1, -1).trim();
  }
  return formatted.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

export let adminInitError: string | null = null;

if (!getApps().length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    if (serviceAccount) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  } catch (error) {
    adminInitError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("Aviso: Falha ao inicializar Firebase Admin SDK:", error);
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;
export const adminDb: Firestore | null = adminApp ? getFirestore(adminApp) : null;
if (adminDb) {
  try {
    adminDb.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Configuração pode já ter sido inicializada
  }
}
export const adminStorage: Storage | null = adminApp ? getStorage(adminApp) : null;
export { adminApp };

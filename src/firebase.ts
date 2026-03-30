import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { doc, getDocFromServer, getFirestore, type Firestore } from "firebase/firestore";

function getOptionalEnv(name: keyof ImportMetaEnv) {
  return import.meta.env[name]?.trim() || "";
}

const firebaseConfig = {
  projectId: getOptionalEnv("VITE_FIREBASE_PROJECT_ID"),
  appId: getOptionalEnv("VITE_FIREBASE_APP_ID"),
  apiKey: getOptionalEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getOptionalEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  storageBucket: getOptionalEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getOptionalEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  measurementId: getOptionalEnv("VITE_FIREBASE_MEASUREMENT_ID") || undefined,
};

const firestoreDatabaseId = getOptionalEnv("VITE_FIREBASE_DATABASE_ID");

export const isFirebaseConfigured = Boolean(
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firestoreDatabaseId
);

let app: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;
export let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firestoreDatabaseId);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || [],
    },
    operationType,
    path,
  };

  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db) {
    return;
  }

  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

if (isFirebaseConfigured) {
  void testConnection();
}
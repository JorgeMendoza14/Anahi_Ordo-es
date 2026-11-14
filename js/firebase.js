import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig, ADMIN_EMAILS } from "./firebase-config.js";

// Para pruebas locales con el emulador de Firebase: abre la página con ?emulador
let useEmu = false;
try {
  if (new URLSearchParams(location.search).has("emulador")) sessionStorage.setItem("emu", "1");
  useEmu = sessionStorage.getItem("emu") === "1";
} catch {}

export const configured = useEmu || (!!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("TU_"));

let db = null, auth = null;
if (configured) {
  const app = initializeApp(useEmu ? { ...firebaseConfig, apiKey: "demo-key", projectId: "demo-multiservicio" } : firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  if (useEmu) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
}
export { db, auth };

// ¿Este correo es de un administrador? (lista en firebase-config.js)
export const isAdminEmail = (email) =>
  (ADMIN_EMAILS || []).map((e) => e.toLowerCase().trim()).includes(String(email || "").toLowerCase());

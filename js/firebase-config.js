// Datos del proyecto Firebase "ApkMA".
// No son secretos: la seguridad la dan las reglas de Firestore (firestore.rules).
export const firebaseConfig = {
  apiKey: "AIzaSyBcXuXZlALYO-z49cclAGlk34-tMYYf300",
  authDomain: "apkma-de1a3.firebaseapp.com",
  projectId: "apkma-de1a3",
  storageBucket: "apkma-de1a3.firebasestorage.app",
  messagingSenderId: "764536483419",
  appId: "1:764536483419:web:390d396bb28edcb351d97e",
  measurementId: "G-0QBFMRW5C8",
};


// ROLES: cada cuenta tiene un documento en Firestore  usuarios/{uid}  con el campo  rol.
// Al registrarse queda como "estudiante". Para hacer a alguien administrador, en la consola
// de Firebase → Firestore → usuarios → (su documento) cambia rol a: admin

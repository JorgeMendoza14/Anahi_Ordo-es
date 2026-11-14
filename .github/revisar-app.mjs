// Abre la app publicada en un navegador real y muestra errores en el log de GitHub Actions.
// Solo lee: no crea cuentas ni modifica datos.
import { chromium } from "playwright";
const URL = "https://apkma-de1a3.web.app/";
const b = await chromium.launch();
const p = await b.newPage();
const log = (...a) => console.log("[revisar]", ...a);
p.on("console", (m) => log("consola", m.type(), m.text()));
p.on("pageerror", (e) => log("ERROR DE PÁGINA:", e.message, (e.stack || "").split("\n").slice(0, 3).join(" | ")));
p.on("requestfailed", (r) => log("FALLÓ CARGA:", r.url(), r.failure()?.errorText));
p.on("response", (r) => { if (r.status() >= 400) log("HTTP", r.status(), r.url()); });
await p.goto(URL, { waitUntil: "load" });
const js = await (await p.request.get(URL + "js/tienda.js")).text();
log("tienda.js publicado contiene '#direccion'?", js.includes('"#direccion"'), "| tamaño", js.length);
const html = await (await p.request.get(URL)).text();
log("index.html script:", (html.match(/src="js\/tienda\.js[^"]*"/) || ["(no encontrado)"])[0]);
await p.waitForTimeout(8000);
const estado = await p.evaluate(() => ({
  appLista: !!window.__appLista,
  cargandoVisible: !document.getElementById("gateLoading")?.hidden,
  formVisible: !!document.getElementById("authForm")?.offsetParent,
  mensaje: document.getElementById("authError")?.hidden ? "" : document.getElementById("authError")?.textContent,
}));
log("estado inicial:", JSON.stringify(estado));
if (estado.formVisible) {
  await p.fill("#authEmail", "prueba-inexistente@example.com");
  await p.fill("#authPass", "contrasena-falsa-123");
  await p.click("#authSubmit");
  await p.waitForTimeout(6000);
  log("tras login falso:", JSON.stringify(await p.evaluate(() => ({
    mensaje: document.getElementById("authError")?.hidden ? "(sin mensaje)" : document.getElementById("authError")?.textContent,
    url: location.href,
  }))));
}
await b.close();

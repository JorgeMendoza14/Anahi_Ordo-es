import { db, auth, configured, isAdminEmail } from "./firebase.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, getDoc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc,
  writeBatch, increment, serverTimestamp, query, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { DEFAULT_CONFIG, DEMO_PRODUCTS, DEMO_SERVICES } from "./data.js";
import { money, esc, toast, waLink, fecha, thumb, ESTADOS } from "./util.js";

const $ = (s) => document.querySelector(s);
const screens = ["scLoading", "scNoConfig", "scLogin", "scDenied", "scPanel"];
const show = (id) => screens.forEach((s) => ($("#" + s).hidden = s !== id));

let orders = [], products = [], services = [], users = [], config = { ...DEFAULT_CONFIG };
let orderFilter = "pendiente";
let unsubs = [];
let firstOrdersLoad = true;
let sound = true;
try { sound = localStorage.getItem("mea-sound") !== "0"; } catch {}

// ===== Autenticación y rol =====
if (!configured) {
  show("scNoConfig");
} else {
  onAuthStateChanged(auth, async (user) => {
    unsubs.forEach((u) => u()); unsubs = [];
    if (!user) return show("scLogin");
    show("scLoading");
    const enter = () => { $("#userEmail").textContent = user.email; show("scPanel"); startPanel(); };
    if (isAdminEmail(user.email)) return enter();
    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      if (snap.exists() && snap.data().rol === "admin") enter();
      else denied(user, "");
    } catch (e) {
      console.error(e);
      denied(user, e.code === "permission-denied"
        ? "Firestore bloqueó la lectura: revisa que las reglas de firestore.rules estén publicadas."
        : `Error al leer tu rol: ${e.code || e.message}`);
    }
  });
}

function denied(user, why) {
  $("#deniedEmail").textContent = user.email;
  $("#deniedUid").textContent = user.uid;
  $("#deniedWhy").textContent = why;
  $("#deniedWhy").hidden = !why;
  show("scDenied");
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn");
  $("#loginError").hidden = true;
  btn.disabled = true; btn.textContent = "Ingresando…";
  try {
    await signInWithEmailAndPassword(auth, $("#loginEmail").value.trim(), $("#loginPass").value);
  } catch (err) {
    const m = {
      "auth/invalid-credential": "Correo o contraseña incorrectos.",
      "auth/wrong-password": "Correo o contraseña incorrectos.",
      "auth/user-not-found": "Correo o contraseña incorrectos.",
      "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
      "auth/network-request-failed": "Sin conexión a internet.",
    };
    $("#loginError").textContent = m[err.code] || "No se pudo ingresar (" + err.code + ").";
    $("#loginError").hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Ingresar";
  }
});
document.querySelectorAll("[data-logout]").forEach((b) => b.addEventListener("click", () => signOut(auth)));
$("#deniedRetry").addEventListener("click", () => location.reload());


// ===== Panel =====
function startPanel() {
  firstOrdersLoad = true;
  unsubs.push(onSnapshot(query(collection(db, "pedidos"), orderBy("creado", "desc"), limit(300)), (snap) => {
    const nuevos = snap.docChanges().filter((c) => c.type === "added" && c.doc.data().estado === "pendiente");
    orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!firstOrdersLoad && nuevos.length) { beep(); toast(`🛎️ Nuevo pedido #${nuevos[0].doc.data().codigo}`); }
    firstOrdersLoad = false;
    renderOrders();
  }, err));
  unsubs.push(onSnapshot(collection(db, "productos"), (snap) => {
    products = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.categoria || "").localeCompare(b.categoria || "") || (a.nombre || "").localeCompare(b.nombre || ""));
    renderProducts();
  }, err));
  unsubs.push(onSnapshot(collection(db, "servicios"), (snap) => {
    services = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
    renderServices();
  }, err));
  unsubs.push(onSnapshot(collection(db, "usuarios"), (snap) => {
    users = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.creado?.toMillis?.() ?? 0) - (a.creado?.toMillis?.() ?? 0));
    renderUsers();
  }, err));
  unsubs.push(onSnapshot(doc(db, "config", "tienda"), (snap) => {
    config = { ...DEFAULT_CONFIG, ...(snap.data() || {}) };
    config.precios = { ...DEFAULT_CONFIG.precios, ...(snap.data()?.precios || {}) };
    fillConfig();
  }, err));
  renderSound();
}
function err(e) { console.error(e); toast("Error: " + (e.code || e.message)); }

// Navegación
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-view]");
  if (!b) return;
  const v = b.dataset.view;
  document.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("on", x.dataset.view === v));
  ["pedidos", "productos", "servicios", "estudiantes", "ajustes"].forEach((n) =>
    ($("#v" + n[0].toUpperCase() + n.slice(1)).hidden = n !== v));
  window.scrollTo(0, 0);
});

// ===== Pedidos =====
const FILTERS = ["pendiente", "aceptado", "listo", "entregado", "rechazado", "todos"];

function isToday(ts) {
  const d = ts?.toDate?.();
  if (!d) return true;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function renderOrders() {
  const count = (s) => orders.filter((o) => s === "todos" || o.estado === s).length;
  const pend = count("pendiente");
  ["#pendBadge", "#pendBadge2"].forEach((s) => { $(s).textContent = pend; $(s).hidden = !pend; });
  document.title = (pend ? `(${pend}) ` : "") + "Panel Administrador";
  const hoy = orders.filter((o) => isToday(o.creado));
  $("#stPend").textContent = pend;
  $("#stHoy").textContent = hoy.length;
  $("#stVentas").textContent = money(hoy.filter((o) => ["aceptado", "listo", "entregado"].includes(o.estado))
    .reduce((a, o) => a + (o.total || 0), 0));

  $("#orderChips").innerHTML = FILTERS.map((f) =>
    `<button class="chip ${f === orderFilter ? "on" : ""}" data-ofilter="${f}">${f === "todos" ? "Todos" : ESTADOS[f].label}<em>${count(f)}</em></button>`).join("");

  const list = orders.filter((o) => orderFilter === "todos" || o.estado === orderFilter);
  $("#ordersGrid").innerHTML = list.length ? list.map(orderCard).join("")
    : `<div class="empty-box"><div>📭</div><p>No hay pedidos ${orderFilter === "todos" ? "" : ESTADOS[orderFilter].label.toLowerCase() + "s"}.</p></div>`;
  if (users.length) renderUsers();
}

function orderCard(o) {
  const e = ESTADOS[o.estado] || ESTADOS.pendiente;
  const tel = String(o.cliente?.telefono || "");
  const waNum = tel.replace(/\D/g, "").replace(/^0/, "593"); // Ecuador: 09… -> 5939…
  const avisos = {
    aceptado: `Hola ${o.cliente?.nombre}, tu pedido #${o.codigo} fue aceptado. Te avisamos cuando esté listo. Total: ${money(o.total)}`,
    listo: `Hola ${o.cliente?.nombre}, tu pedido #${o.codigo} ya está listo${o.entrega === "Retiro en local" ? " para retirar" : " y va en camino"}. Total: ${money(o.total)}`,
    rechazado: `Hola ${o.cliente?.nombre}, lo sentimos, no pudimos aceptar tu pedido #${o.codigo}.${o.motivo ? " Motivo: " + o.motivo : ""}`,
  };
  let actions = "";
  if (o.estado === "pendiente") actions = `
    <button class="btn btn-primary" data-act="aceptar" data-id="${o.id}">✓ Aceptar</button>
    <button class="btn btn-ghost danger" data-act="rechazar" data-id="${o.id}">Rechazar</button>`;
  else if (o.estado === "aceptado") actions = `<button class="btn btn-primary" data-act="listo" data-id="${o.id}">Marcar listo</button>`;
  else if (o.estado === "listo") actions = `<button class="btn btn-primary" data-act="entregado" data-id="${o.id}">Marcar entregado</button>`;
  if (avisos[o.estado] && waNum)
    actions += `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(waLink(waNum, avisos[o.estado]))}">Avisar 💬</a>`;
  if (["entregado", "rechazado"].includes(o.estado))
    actions += `<button class="btn btn-ghost btn-sm danger" data-act="borrar" data-id="${o.id}">Borrar</button>`;

  return `
  <article class="order is-${esc(o.estado)}">
    <div class="order-top">
      <div><strong>#${esc(o.codigo)}</strong><small>${fecha(o.creado)}</small></div>
      <span class="badge b-${esc(o.estado)}">${e.ico} ${e.label}</span>
    </div>
    <div class="cust">
      <span>👤 <b>${esc(o.cliente?.nombre)}</b></span>
      <span>📞 <a href="${esc(waLink(waNum, `Hola ${o.cliente?.nombre}, te escribimos por tu pedido #${o.codigo}.`))}" target="_blank" rel="noopener">${esc(tel)}</a></span>
      <span>${o.entrega === "Retiro en local" ? "🏪" : "🛵"} ${esc(o.entrega)}${o.direccion ? ": " + esc(o.direccion) : ""}</span>
    </div>
    <ul class="items">
      ${(o.items || []).map((i) => `<li><span>${i.cantidad}× ${esc(i.nombre)}${i.detalle ? `<small>${esc(i.detalle)}</small>` : ""}</span><b>${money(i.precio * i.cantidad)}</b></li>`).join("")}
    </ul>
    ${o.notas ? `<div class="notes">📝 ${esc(o.notas)}</div>` : ""}
    ${o.motivo ? `<div class="notes">Motivo: ${esc(o.motivo)}</div>` : ""}
    <div class="order-total"><span>Total</span><strong>${money(o.total)}</strong></div>
    <div class="order-actions">${actions}</div>
  </article>`;
}

document.addEventListener("click", async (e) => {
  const f = e.target.closest("[data-ofilter]");
  if (f) { orderFilter = f.dataset.ofilter; renderOrders(); return; }
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const o = orders.find((x) => x.id === b.dataset.id);
  if (!o) return;
  const ref = doc(db, "pedidos", o.id);
  b.disabled = true;
  try {
    if (b.dataset.act === "aceptar") {
      // Acepta y descuenta el stock de los productos
      const batch = writeBatch(db);
      batch.update(ref, { estado: "aceptado", actualizado: serverTimestamp() });
      (o.items || []).filter((i) => i.tipo === "producto").forEach((i) => {
        const p = products.find((x) => x.id === i.id);
        if (p && typeof p.stock === "number") batch.update(doc(db, "productos", i.id), { stock: increment(-i.cantidad) });
      });
      await batch.commit();
      toast(`Pedido #${o.codigo} aceptado`);
    } else if (b.dataset.act === "rechazar") {
      const motivo = prompt("¿Motivo del rechazo? (opcional, el cliente lo verá)", "");
      if (motivo === null) return;
      await updateDoc(ref, { estado: "rechazado", motivo: motivo.slice(0, 200), actualizado: serverTimestamp() });
      toast(`Pedido #${o.codigo} rechazado`);
    } else if (b.dataset.act === "listo" || b.dataset.act === "entregado") {
      await updateDoc(ref, { estado: b.dataset.act, actualizado: serverTimestamp() });
      toast(`Pedido #${o.codigo}: ${ESTADOS[b.dataset.act].label}`);
    } else if (b.dataset.act === "borrar") {
      if (!confirm(`¿Borrar el pedido #${o.codigo}? No se puede deshacer.`)) return;
      await deleteDoc(ref);
      toast("Pedido borrado");
    }
  } catch (e2) { err(e2); }
  finally { b.disabled = false; }
});

// Sonido de nuevo pedido
let audioCtx;
function beep() {
  if (!sound) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach((t, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = i ? 1046 : 784; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.2, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.25);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.26);
    });
  } catch {}
}
function renderSound() { $("#soundBtn").textContent = sound ? "🔔 Sonido: sí" : "🔕 Sonido: no"; }
$("#soundBtn").addEventListener("click", () => {
  sound = !sound; renderSound();
  try { localStorage.setItem("mea-sound", sound ? "1" : "0"); } catch {}
  if (sound) beep();
});

// ===== Productos y servicios =====
function renderProducts() {
  const q = $("#prodSearch").value.trim().toLowerCase();
  const list = products.filter((p) => !q || (p.nombre || "").toLowerCase().includes(q) || (p.categoria || "").toLowerCase().includes(q));
  $("#catList").innerHTML = [...new Set(products.map((p) => p.categoria).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join("");
  $("#productsTable").innerHTML = `<div class="trow head"><span></span><span>Producto</span><span>Precio</span><span>Stock</span><span>Visible</span><span></span></div>` +
    (list.length ? list.map((p) => `
    <div class="trow ${p.activo === false ? "off" : ""}">
      <div class="tthumb">${thumb(p)}</div>
      <div class="tname"><strong>${esc(p.nombre)}</strong><small>${esc(p.categoria)}${p.etiqueta ? " · " + esc(p.etiqueta) : ""}</small></div>
      <span class="tprice">${money(p.precio)}</span>
      <span class="hide-m">${typeof p.stock === "number" ? (p.stock <= 5 ? `<span class="stock-low">${p.stock}</span>` : p.stock) : "—"}</span>
      <label class="mini-toggle hide-m"><input type="checkbox" data-toggle="productos/${p.id}" ${p.activo !== false ? "checked" : ""}></label>
      <button class="edit-btn" data-edit="producto" data-id="${p.id}" aria-label="Editar">✏️</button>
    </div>`).join("") : `<div class="empty-box">No hay productos. Crea uno o carga los de ejemplo en Ajustes.</div>`);
}
function renderServices() {
  $("#servicesTable").innerHTML = `<div class="trow head"><span></span><span>Servicio</span><span>Precio</span><span>Unidad</span><span>Visible</span><span></span></div>` +
    (services.length ? services.map((s) => `
    <div class="trow ${s.activo === false ? "off" : ""}">
      <div class="tthumb">${thumb(s)}</div>
      <div class="tname"><strong>${esc(s.nombre)}</strong><small>${esc(s.descripcion)}</small></div>
      <span class="tprice">${money(s.precio)}</span>
      <span class="hide-m">${esc(s.unidad) || "—"}</span>
      <label class="mini-toggle hide-m"><input type="checkbox" data-toggle="servicios/${s.id}" ${s.activo !== false ? "checked" : ""}></label>
      <button class="edit-btn" data-edit="servicio" data-id="${s.id}" aria-label="Editar">✏️</button>
    </div>`).join("") : `<div class="empty-box">No hay servicios. Crea uno o carga los de ejemplo en Ajustes.</div>`);
}
$("#prodSearch").addEventListener("input", renderProducts);

document.addEventListener("change", async (e) => {
  const t = e.target.closest("[data-toggle]");
  if (!t) return;
  try { await updateDoc(doc(db, ...t.dataset.toggle.split("/")), { activo: t.checked }); toast(t.checked ? "Visible en la tienda" : "Oculto de la tienda"); }
  catch (e2) { err(e2); t.checked = !t.checked; }
});

// Modal de edición
let editing = null; // { kind, id }
let imgData = "";

function openItem(kind, id) {
  editing = { kind, id };
  const it = (kind === "producto" ? products : services).find((x) => x.id === id) || {};
  $("#itemTitle").textContent = (id ? "Editar " : "Nuevo ") + kind;
  document.querySelectorAll(".only-prod").forEach((el) => (el.hidden = kind !== "producto"));
  document.querySelectorAll(".only-serv").forEach((el) => (el.hidden = kind !== "servicio"));
  $("#fNombre").value = it.nombre || "";
  $("#fPrecio").value = it.precio ?? "";
  $("#fStock").value = it.stock ?? (id ? "" : 20);
  $("#fUnidad").value = it.unidad || "";
  $("#fCategoria").value = it.categoria || "";
  $("#fEtiqueta").value = it.etiqueta || "";
  $("#fDescripcion").value = it.descripcion || "";
  $("#fEmoji").value = it.emoji || (kind === "producto" ? "📦" : "🖨️");
  $("#fActivo").checked = it.activo !== false;
  imgData = it.imagen || "";
  $("#itemDelete").hidden = !id;
  renderPreview();
  $("#itemModal").hidden = false;
  $("#fNombre").focus();
}
function renderPreview() {
  $("#imgPrev").innerHTML = imgData ? `<img src="${esc(imgData)}" alt="">` : esc($("#fEmoji").value || "📦");
  $("#imgRemove").hidden = !imgData;
}
function closeItem() { $("#itemModal").hidden = true; editing = null; $("#imgFile").value = ""; }

$("#newProduct").addEventListener("click", () => openItem("producto", null));
$("#newService").addEventListener("click", () => openItem("servicio", null));
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit]");
  if (b) openItem(b.dataset.edit, b.dataset.id);
  if (e.target.closest("[data-close]") || e.target === $("#itemModal")) closeItem();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#itemModal").hidden) closeItem(); });
$("#fEmoji").addEventListener("input", renderPreview);
$("#imgRemove").addEventListener("click", () => { imgData = ""; renderPreview(); });

// Reduce la foto a 500px y la guarda dentro de Firestore (no requiere Firebase Storage)
$("#imgFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 500, k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    imgData = c.toDataURL("image/jpeg", 0.75);
    renderPreview();
  } catch { toast("No se pudo leer la imagen"); }
});

$("#itemForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editing) return;
  const { kind, id } = editing;
  const data = {
    nombre: $("#fNombre").value.trim(),
    precio: Math.round((parseFloat($("#fPrecio").value) || 0) * 100) / 100,
    emoji: $("#fEmoji").value.trim(),
    imagen: imgData,
    activo: $("#fActivo").checked,
    actualizado: serverTimestamp(),
  };
  if (kind === "producto") {
    const st = $("#fStock").value.trim();
    Object.assign(data, {
      categoria: $("#fCategoria").value.trim() || "Otros",
      etiqueta: $("#fEtiqueta").value.trim(),
      stock: st === "" ? null : Math.max(0, parseInt(st, 10) || 0),
    });
  } else {
    Object.assign(data, { descripcion: $("#fDescripcion").value.trim(), unidad: $("#fUnidad").value.trim() });
    if (!id) data.orden = services.length;
  }
  const col = kind === "producto" ? "productos" : "servicios";
  $("#itemSave").disabled = true;
  try {
    if (id) await updateDoc(doc(db, col, id), data);
    else await addDoc(collection(db, col), { ...data, creado: serverTimestamp() });
    toast(id ? "Cambios guardados" : `${kind === "producto" ? "Producto" : "Servicio"} creado`);
    closeItem();
  } catch (e2) { err(e2); }
  finally { $("#itemSave").disabled = false; }
});

$("#itemDelete").addEventListener("click", async () => {
  if (!editing?.id) return;
  if (!confirm(`¿Eliminar "${$("#fNombre").value}"? No se puede deshacer.`)) return;
  try {
    await deleteDoc(doc(db, editing.kind === "producto" ? "productos" : "servicios", editing.id));
    toast("Eliminado");
    closeItem();
  } catch (e2) { err(e2); }
});

// ===== Estudiantes =====
function renderUsers() {
  const q = $("#userSearch").value.trim().toLowerCase();
  const list = users.filter((u) => !q || [u.nombre, u.email, u.curso, u.telefono].some((x) => String(x || "").toLowerCase().includes(q)));
  const nPedidos = (uid) => orders.filter((o) => o.uid === uid).length;
  $("#usersTable").innerHTML = `<div class="trow urow head"><span></span><span>Estudiante</span><span>Teléfono</span><span>Pedidos</span><span>Rol</span></div>` +
    (list.length ? list.map((u) => {
      const ini = String(u.nombre || u.email || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
      const waNum = String(u.telefono || "").replace(/\D/g, "").replace(/^0/, "593");
      const isMe = u.id === auth.currentUser?.uid;
      return `
      <div class="trow urow">
        <div class="avatar">${esc(ini)}</div>
        <div class="tname"><strong>${esc(u.nombre)}</strong><small>${esc(u.email)}${u.curso ? " · " + esc(u.curso) : ""}</small></div>
        <span class="hide-m">${u.telefono ? `<a href="${esc(waLink(waNum, `Hola ${u.nombre}`))}" target="_blank" rel="noopener" class="tprice">${esc(u.telefono)}</a>` : "—"}</span>
        <span class="hide-m">${nPedidos(u.id)}</span>
        <span>${isMe ? `<span class="role-pill admin">admin</span>`
          : `<button class="role-pill ${u.rol === "admin" ? "admin" : ""}" data-role="${esc(u.id)}" title="Cambiar rol">${u.rol === "admin" ? "admin ✓" : "estudiante"}</button>`}</span>
      </div>`;
    }).join("") : `<div class="empty-box">Todavía no hay estudiantes registrados.</div>`);
}
$("#userSearch").addEventListener("input", renderUsers);
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-role]");
  if (!b) return;
  const u = users.find((x) => x.id === b.dataset.role);
  const nuevo = u.rol === "admin" ? "estudiante" : "admin";
  const msg = nuevo === "admin"
    ? `¿Dar acceso de ADMINISTRADOR a ${u.nombre}? Podrá ver todos los pedidos y cambiar productos.`
    : `¿Quitar el acceso de administrador a ${u.nombre}?`;
  if (!confirm(msg)) return;
  try { await updateDoc(doc(db, "usuarios", u.id), { rol: nuevo }); toast(`${u.nombre} ahora es ${nuevo}`); }
  catch (e2) { err(e2); }
});

// ===== Ajustes =====
function fillConfig() {
  if (document.activeElement?.closest("#configForm")) return; // no pisar lo que se está escribiendo
  const p = config.precios;
  $("#cfWhatsapp").value = config.whatsapp || "";
  $("#cfAviso").value = config.aviso || "";
  $("#cfDireccion").value = config.direccion || "";
  $("#cfHorario").value = (config.horario || []).map((h) => `${h.dia} = ${h.horas}`).join("\n");
  $("#cfBn").value = p.bn; $("#cfColor").value = p.color; $("#cfAnillado").value = p.anillado;
  $("#cfPortada").value = p.portada; $("#cfDescDesde").value = p.descuentoDesde; $("#cfDesc").value = p.descuento;
}
$("#configForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const num = (s, d) => { const v = parseFloat($(s).value); return Number.isFinite(v) && v >= 0 ? v : d; };
  const d = DEFAULT_CONFIG.precios;
  const data = {
    nombre: config.nombre || DEFAULT_CONFIG.nombre,
    whatsapp: $("#cfWhatsapp").value.replace(/\D/g, ""),
    aviso: $("#cfAviso").value.trim(),
    direccion: $("#cfDireccion").value.trim(),
    horario: $("#cfHorario").value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [dia, ...h] = l.split("="); return { dia: dia.trim(), horas: h.join("=").trim() };
    }),
    precios: {
      bn: num("#cfBn", d.bn), color: num("#cfColor", d.color), anillado: num("#cfAnillado", d.anillado),
      portada: num("#cfPortada", d.portada), descuentoDesde: Math.max(1, num("#cfDescDesde", d.descuentoDesde)),
      descuento: Math.min(90, num("#cfDesc", d.descuento)),
    },
  };
  try { await setDoc(doc(db, "config", "tienda"), data); document.activeElement?.blur(); toast("Ajustes guardados"); }
  catch (e2) { err(e2); }
});

$("#seedBtn").addEventListener("click", async () => {
  if (products.length || services.length) {
    if (!confirm("Ya tienes productos o servicios. ¿Agregar también los de ejemplo?")) return;
  }
  try {
    const batch = writeBatch(db);
    DEMO_PRODUCTS.forEach((p) => batch.set(doc(collection(db, "productos")), { ...p, creado: serverTimestamp() }));
    DEMO_SERVICES.forEach((s) => batch.set(doc(collection(db, "servicios")), { ...s, imagen: "", creado: serverTimestamp() }));
    const cfg = await getDoc(doc(db, "config", "tienda"));
    if (!cfg.exists()) batch.set(doc(db, "config", "tienda"), DEFAULT_CONFIG);
    await batch.commit();
    toast("Datos de ejemplo cargados");
  } catch (e2) { err(e2); }
});

import { db, configured } from "./firebase.js";
import {
  collection, doc, onSnapshot, addDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { DEFAULT_CONFIG, DEMO_PRODUCTS, DEMO_SERVICES } from "./data.js";
import { money, esc, toast, waLink, fecha, codigoPedido, thumb, ESTADOS } from "./util.js";

const $ = (s) => document.querySelector(s);

// ===== Estado =====
let config = { ...DEFAULT_CONFIG };
let products = [];
let services = [];
let cart = read("mea-cart", []);
let myOrders = read("mea-pedidos", []); // ids de pedidos hechos desde este dispositivo
const orderData = {};                   // id -> datos en vivo
let filter = { cat: "Todos", q: "" };
let delivery = "Retiro en local";

function read(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ===== Fuente de datos =====
function startData() {
  if (!configured) {
    $("#demoBanner").hidden = false;
    products = DEMO_PRODUCTS.map((p, i) => ({ id: "demo-p" + i, ...p }));
    services = DEMO_SERVICES.map((s, i) => ({ id: "demo-s" + i, ...s }));
    renderAll();
    return;
  }
  onSnapshot(doc(db, "config", "tienda"), (snap) => {
    config = { ...DEFAULT_CONFIG, ...(snap.data() || {}) };
    config.precios = { ...DEFAULT_CONFIG.precios, ...(snap.data()?.precios || {}) };
    renderConfig(); calcQuote();
  }, (e) => console.error(e));
  onSnapshot(collection(db, "productos"), (snap) => {
    products = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.activo !== false)
      .sort((a, b) => (a.categoria || "").localeCompare(b.categoria || "") || (a.nombre || "").localeCompare(b.nombre || ""));
    syncCart(); renderChips(); renderProducts();
  }, (e) => console.error(e));
  onSnapshot(collection(db, "servicios"), (snap) => {
    services = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.activo !== false)
      .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
    syncCart(); renderServices();
  }, (e) => console.error(e));
  myOrders.forEach(watchOrder);
}

function watchOrder(id) {
  onSnapshot(doc(db, "pedidos", id), (snap) => {
    if (!snap.exists()) return;
    const prev = orderData[id]?.estado;
    orderData[id] = snap.data();
    if (prev && prev !== orderData[id].estado) {
      toast(`Pedido ${orderData[id].codigo}: ${ESTADOS[orderData[id].estado]?.label}`);
    }
    renderOrders();
  }, () => {});
}

// Actualiza precios del carrito con el catálogo en vivo y quita lo que ya no existe
function syncCart() {
  const all = [...products, ...services];
  if (!all.length) return;
  cart = cart.filter((c) => c.tipo === "cotizacion" || all.some((x) => x.id === c.id))
    .map((c) => {
      const live = all.find((x) => x.id === c.id);
      return live ? { ...c, nombre: live.nombre, precio: Number(live.precio) || 0 } : c;
    });
  write("mea-cart", cart);
  renderCart();
}

// ===== Render =====
function renderAll() { renderConfig(); renderServices(); renderChips(); renderProducts(); renderCart(); renderOrders(); calcQuote(); }

function renderConfig() {
  $("#aviso").textContent = config.aviso || "";
  $("#aviso").hidden = !config.aviso;
  $("#direccion").textContent = config.direccion || "";
  $("#horario").innerHTML = (config.horario || []).map((h) =>
    `<li><span>${esc(h.dia)}</span><strong>${esc(h.horas)}</strong></li>`).join("");
  $("#waContact").href = waLink(config.whatsapp, "Hola, quisiera información sobre sus servicios.");
  const p = config.precios;
  $("#lblBinding").textContent = `Anillado (+${money(p.anillado)})`;
  $("#lblCover").textContent = `Portada plastificada (+${money(p.portada)})`;
  $("#lblDesc").textContent = `Descuento automático desde ${p.descuentoDesde} hojas`;
}

function renderServices() {
  $("#servicesGrid").innerHTML = services.length ? services.map((s) => `
    <button class="service" data-service="${esc(s.id)}">
      <span class="s-ico">${thumb(s)}</span>
      <h3>${esc(s.nombre)}</h3>
      <p>${esc(s.descripcion)}</p>
      <span class="s-foot">
        <span class="price">${money(s.precio)} <small>${esc(s.unidad)}</small></span>
        <span class="add-mini">+</span>
      </span>
    </button>`).join("") : `<p class="empty">Pronto publicaremos nuestros servicios.</p>`;
}

function renderChips() {
  const cats = ["Todos", ...new Set(products.map((p) => p.categoria).filter(Boolean))];
  if (!cats.includes(filter.cat)) filter.cat = "Todos";
  $("#chips").innerHTML = cats.map((c) =>
    `<button class="chip ${c === filter.cat ? "on" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
}

function renderProducts() {
  const q = filter.q.trim().toLowerCase();
  const list = products.filter((p) =>
    (filter.cat === "Todos" || p.categoria === filter.cat) &&
    (!q || (p.nombre || "").toLowerCase().includes(q) || (p.categoria || "").toLowerCase().includes(q)));
  $("#emptyMsg").hidden = list.length > 0;
  $("#productsGrid").innerHTML = list.map((p) => {
    const inCart = cart.find((c) => c.id === p.id)?.qty || 0;
    const agotado = typeof p.stock === "number" && p.stock <= 0;
    return `
    <article class="product ${agotado ? "sold" : ""}">
      <div class="p-thumb">${p.etiqueta ? `<span class="p-tag">${esc(p.etiqueta)}</span>` : ""}${agotado ? `<span class="p-tag out">Agotado</span>` : ""}${thumb(p)}</div>
      <div class="p-body">
        <small>${esc(p.categoria)}</small>
        <h3>${esc(p.nombre)}</h3>
        <div class="p-foot">
          <span class="price">${money(p.precio)}</span>
          ${agotado ? "" : inCart
            ? `<div class="qty"><button data-dec="${esc(p.id)}" aria-label="Quitar">−</button><span>${inCart}</span><button data-inc="${esc(p.id)}" aria-label="Agregar">+</button></div>`
            : `<button class="add-mini" data-product="${esc(p.id)}" aria-label="Agregar">+</button>`}
        </div>
      </div>
    </article>`;
  }).join("");
}

function renderCart() {
  const box = $("#cartItems");
  box.innerHTML = cart.length ? cart.map((c) => `
      <div class="cart-line">
        <div class="ci">${thumb(c)}</div>
        <div class="cn"><strong>${esc(c.nombre)}</strong><small>${esc(c.detalle || money(c.precio) + " c/u")}</small></div>
        <div class="qty">
          <button data-dec="${esc(c.id)}" aria-label="Quitar">−</button>
          <span>${c.qty}</span>
          <button data-inc="${esc(c.id)}" aria-label="Agregar">+</button>
        </div>
        <div class="cp">${money(c.precio * c.qty)}</div>
      </div>`).join("")
    : `<div class="cart-empty"><div>🛒</div><p>Tu pedido está vacío.<br>Agrega servicios o útiles.</p></div>`;
  $("#cartTotal").textContent = money(total());
  $("#cartCount").textContent = cart.reduce((a, c) => a + c.qty, 0);
  $("#cartFoot").hidden = !cart.length;
}

function renderOrders() {
  const ids = [...myOrders].reverse().filter((id) => orderData[id]);
  $("#ordersCount").textContent = ids.filter((id) => !["entregado", "rechazado"].includes(orderData[id].estado)).length || "";
  $("#ordersList").innerHTML = ids.length ? ids.map((id) => {
    const o = orderData[id];
    const e = ESTADOS[o.estado] || ESTADOS.pendiente;
    const steps = ["pendiente", "aceptado", "listo", "entregado"];
    const idx = steps.indexOf(o.estado);
    return `
    <div class="order-card">
      <div class="oc-head">
        <div><strong>Pedido #${esc(o.codigo)}</strong><small>${fecha(o.creado)} · ${money(o.total)}</small></div>
        <span class="badge b-${esc(o.estado)}">${e.ico} ${e.label}</span>
      </div>
      ${o.estado === "rechazado" ? "" : `<div class="steps">${steps.map((s, i) => `<span class="${i <= idx ? "on" : ""}"></span>`).join("")}</div>`}
      <p class="oc-msg">${esc(e.msg)}${o.motivo ? ` <em>${esc(o.motivo)}</em>` : ""}</p>
      <small class="oc-items">${o.items.map((i) => `${i.cantidad}× ${esc(i.nombre)}`).join(", ")}</small>
    </div>`;
  }).join("") : `<div class="cart-empty"><div>📋</div><p>Aquí verás el estado de tus pedidos.</p></div>`;
}

// ===== Carrito =====
const total = () => Math.round(cart.reduce((a, c) => a + c.precio * c.qty, 0) * 100) / 100;

function addItem(item, tipo, qty = 1) {
  const found = cart.find((c) => c.id === item.id);
  const max = typeof item.stock === "number" ? item.stock : Infinity;
  if (found) {
    if (found.qty + qty > max) return toast("No hay más stock de este producto");
    found.qty += qty;
  } else {
    cart.push({ id: item.id, tipo, nombre: item.nombre, precio: Number(item.precio) || 0,
      emoji: item.emoji || "", imagen: item.imagen || "", detalle: item.detalle || "", qty });
  }
  commit();
  toast(`Agregado: ${item.nombre}`);
}
function setQty(id, qty) {
  const it = cart.find((c) => c.id === id);
  if (!it) return;
  const p = products.find((x) => x.id === id);
  if (p && typeof p.stock === "number" && qty > p.stock) return toast("No hay más stock de este producto");
  it.qty = qty;
  if (it.qty <= 0) cart = cart.filter((c) => c.id !== id);
  commit();
}
function commit() {
  write("mea-cart", cart);
  renderCart(); renderProducts();
  const el = $("#cartCount");
  el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
}

// ===== Cotizador =====
const quote = { type: "bn", size: "a4" };
const SIZE = { a4: 1, oficio: 1.2, a3: 2 };
const SIZE_LBL = { a4: "A4", oficio: "Oficio", a3: "A3" };

function calcQuote() {
  const p = config.precios;
  const pages = Math.max(1, parseInt($("#pages").value, 10) || 1);
  const duplex = $("#duplex").checked;
  const desc = pages >= p.descuentoDesde;
  let unit = (quote.type === "bn" ? p.bn : p.color) * SIZE[quote.size];
  if (duplex) unit *= 1.6;
  if (desc) unit *= 1 - p.descuento / 100;
  let t = unit * pages;
  if ($("#binding").checked) t += p.anillado;
  if ($("#cover").checked) t += p.portada;
  const detail = [
    `${pages} hojas`, quote.type === "bn" ? "B/N" : "Color", SIZE_LBL[quote.size],
    duplex && "doble cara", $("#binding").checked && "anillado", $("#cover").checked && "portada",
    desc && `-${p.descuento}%`,
  ].filter(Boolean).join(" · ");
  $("#quoteTotal").textContent = money(t);
  $("#quoteDetail").textContent = detail;
  return { total: Math.round(t * 100) / 100, detail };
}

function bindSeg(sel, cb) {
  $(sel).addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    $(sel).querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    cb(b.dataset.v);
  });
}

// ===== Drawer =====
function openCart(tab = "cart") {
  $("#toast").classList.remove("show");
  showTab(tab);
  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  $("#overlay").hidden = false;
}
function closeCart() {
  $("#drawer").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#overlay").hidden = true;
}
function showTab(tab) {
  document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  $("#paneCart").hidden = tab !== "cart";
  $("#paneOrders").hidden = tab !== "orders";
}

// ===== Enviar pedido =====
function orderText(o) {
  return [
    `Hola, soy *${o.cliente.nombre}*. ${o.codigo ? `Hice el pedido *#${o.codigo}*:` : "Quiero hacer este pedido:"}`, "",
    ...o.items.map((i) => `• ${i.cantidad} x ${i.nombre}${i.detalle ? ` (${i.detalle})` : ""} — ${money(i.precio * i.cantidad)}`),
    "", `*Total: ${money(o.total)}*`, `Entrega: ${o.entrega}${o.direccion ? ` – ${o.direccion}` : ""}`,
    o.notas && `Notas: ${o.notas}`,
  ].filter((x) => x !== false && x !== "").join("\n");
}

async function checkout() {
  if (!cart.length) return toast("Agrega algo a tu pedido primero");
  const nombre = $("#custName").value.trim();
  const telefono = $("#custPhone").value.trim();
  const direccion = $("#custAddress").value.trim();
  if (!nombre) { $("#custName").focus(); return toast("Escribe tu nombre"); }
  if (!/^\+?[\d\s-]{7,15}$/.test(telefono)) { $("#custPhone").focus(); return toast("Escribe un teléfono válido"); }
  if (delivery !== "Retiro en local" && !direccion) { $("#custAddress").focus(); return toast("Escribe la dirección de entrega"); }

  const pedido = {
    cliente: { nombre: nombre.slice(0, 80), telefono: telefono.slice(0, 20) },
    entrega: delivery,
    direccion: delivery === "Retiro en local" ? "" : direccion.slice(0, 200),
    notas: $("#notes").value.trim().slice(0, 500),
    items: cart.map((c) => ({ id: c.id, tipo: c.tipo, nombre: c.nombre, precio: c.precio, cantidad: c.qty,
      detalle: c.detalle || "", emoji: c.emoji || "" })),
    total: total(),
  };
  write("mea-cliente", { nombre, telefono, direccion });

  if (!configured) {
    window.open(waLink(config.whatsapp, orderText(pedido)), "_blank", "noopener");
    return;
  }

  const btn = $("#checkout");
  btn.disabled = true; btn.textContent = "Enviando…";
  try {
    pedido.codigo = codigoPedido();
    pedido.estado = "pendiente";
    pedido.creado = serverTimestamp();
    const ref = await addDoc(collection(db, "pedidos"), pedido);
    myOrders.push(ref.id); write("mea-pedidos", myOrders);
    watchOrder(ref.id);
    cart = []; commit();
    $("#notes").value = "";
    $("#okCode").textContent = "#" + pedido.codigo;
    $("#okWa").href = waLink(config.whatsapp, orderText(pedido));
    closeCart();
    $("#okModal").hidden = false;
  } catch (e) {
    console.error(e);
    toast("No se pudo enviar el pedido. Revisa tu conexión.");
  } finally {
    btn.disabled = false; btn.textContent = "Confirmar pedido";
  }
}

// ===== Eventos =====
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-service],[data-product],[data-inc],[data-dec],[data-cat],[data-tab]");
  if (!t) return;
  const find = (id) => products.find((p) => p.id === id);
  if (t.dataset.service) addItem(services.find((s) => s.id === t.dataset.service), "servicio");
  else if (t.dataset.product) addItem(find(t.dataset.product), "producto");
  else if (t.dataset.inc) setQty(t.dataset.inc, cart.find((c) => c.id === t.dataset.inc).qty + 1);
  else if (t.dataset.dec) setQty(t.dataset.dec, cart.find((c) => c.id === t.dataset.dec).qty - 1);
  else if (t.dataset.cat) { filter.cat = t.dataset.cat; renderChips(); renderProducts(); }
  else if (t.dataset.tab) showTab(t.dataset.tab);
});

$("#search").addEventListener("input", (e) => { filter.q = e.target.value; renderProducts(); });
$("#openCart").addEventListener("click", () => openCart("cart"));
$("#openOrders").addEventListener("click", () => openCart("orders"));
$("#closeCart").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeCart(); $("#okModal").hidden = true; } });
$("#checkout").addEventListener("click", checkout);
$("#clearCart").addEventListener("click", () => { cart = []; commit(); });
bindSeg("#delivery", (v) => { delivery = v; $("#addressField").hidden = v === "Retiro en local"; });
$("#okClose").addEventListener("click", () => { $("#okModal").hidden = true; });
$("#okTrack").addEventListener("click", () => { $("#okModal").hidden = true; openCart("orders"); });

$("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
$("#nav").addEventListener("click", (e) => e.target.tagName === "A" && $("#nav").classList.remove("open"));

bindSeg("#printType", (v) => { quote.type = v; calcQuote(); });
bindSeg("#paperSize", (v) => { quote.size = v; calcQuote(); });
["#pages", "#duplex", "#binding", "#cover"].forEach((s) => $(s).addEventListener("input", calcQuote));
$("#pagesMinus").addEventListener("click", () => { $("#pages").value = Math.max(1, (+$("#pages").value || 1) - 1); calcQuote(); });
$("#pagesPlus").addEventListener("click", () => { $("#pages").value = (+$("#pages").value || 0) + 1; calcQuote(); });
$("#addQuote").addEventListener("click", () => {
  const { total: t, detail } = calcQuote();
  addItem({ id: "q-" + Date.now(), emoji: "🖨️", nombre: "Impresión cotizada", precio: t, detalle: detail }, "cotizacion");
});

// ===== Init =====
const saved = read("mea-cliente", {});
$("#custName").value = saved.nombre || "";
$("#custPhone").value = saved.telefono || "";
$("#custAddress").value = saved.direccion || "";
$("#year").textContent = new Date().getFullYear();
renderAll();
startData();

// ===== Configuración =====
const WHATSAPP = "593 994713884"; // Cambia por el número del local (código de país sin +)
const money = (n) => "$" + n.toFixed(2);

const SERVICES = [
  { id: "s-copia",   ico: "📄", name: "Copias B/N",          desc: "Copias rápidas en blanco y negro, A4 u oficio.", price: 0.05, unit: "c/u" },
  { id: "s-color",   ico: "🎨", name: "Impresión a color",   desc: "Ideal para portadas, mapas y presentaciones.",   price: 0.25, unit: "c/u" },
  { id: "s-anillo",  ico: "🌀", name: "Anillado",            desc: "Anillado plástico o metálico para tus trabajos.", price: 1.50, unit: "" },
  { id: "s-plast",   ico: "🛡️", name: "Plastificado",        desc: "Protege carnets, certificados y láminas.",       price: 0.75, unit: "" },
  { id: "s-scan",    ico: "📠", name: "Escaneo",             desc: "Digitaliza documentos y te los enviamos.",       price: 0.20, unit: "c/u" },
  { id: "s-tarea",   ico: "🔎", name: "Investigaciones",     desc: "Te ayudamos a buscar e imprimir tu consulta.",   price: 1.00, unit: "" },
  { id: "s-tipeo",   ico: "⌨️", name: "Tipeo de trabajos",   desc: "Pasamos tu trabajo a computadora con formato.", price: 0.50, unit: "pág." },
  { id: "s-foto",    ico: "🪪", name: "Fotos carnet",        desc: "6 fotos tamaño carnet listas en minutos.",       price: 2.00, unit: "" },
];

const PRODUCTS = [
  { id: "p1",  ico: "📒", name: "Cuaderno universitario 100 h", cat: "Cuadernos", price: 1.80, tag: "Más vendido" },
  { id: "p2",  ico: "📓", name: "Cuaderno pequeño 60 h",        cat: "Cuadernos", price: 0.90 },
  { id: "p3",  ico: "📔", name: "Cuaderno de dibujo A4",        cat: "Cuadernos", price: 2.20 },
  { id: "p4",  ico: "✏️", name: "Lápiz HB #2",                  cat: "Escritura", price: 0.30 },
  { id: "p5",  ico: "🖊️", name: "Esferos azul/negro/rojo (3)",  cat: "Escritura", price: 1.00, tag: "Combo" },
  { id: "p6",  ico: "🖍️", name: "Pinturas x12",                 cat: "Arte",      price: 2.50 },
  { id: "p7",  ico: "🖌️", name: "Témperas x6",                  cat: "Arte",      price: 3.00 },
  { id: "p8",  ico: "🟩", name: "Cartulina (pliego)",           cat: "Papelería", price: 0.35 },
  { id: "p9",  ico: "📃", name: "Resma papel bond A4",          cat: "Papelería", price: 5.50 },
  { id: "p10", ico: "🗂️", name: "Carpeta con vincha",           cat: "Papelería", price: 0.60 },
  { id: "p11", ico: "📐", name: "Juego de geometría",           cat: "Accesorios", price: 1.50 },
  { id: "p12", ico: "✂️", name: "Tijera escolar",               cat: "Accesorios", price: 0.90 },
  { id: "p13", ico: "🧴", name: "Goma en barra",                cat: "Accesorios", price: 0.75 },
  { id: "p14", ico: "🧽", name: "Borrador + sacapuntas",        cat: "Escritura", price: 0.50 },
  { id: "p15", ico: "🎒", name: "Mochila escolar",              cat: "Accesorios", price: 12.00, tag: "Nuevo" },
  { id: "p16", ico: "🖍️", name: "Marcadores fluorescentes x4",  cat: "Arte",      price: 2.00 },
];

// ===== Estado =====
const $ = (s) => document.querySelector(s);
let cart = load();
let filter = { cat: "Todos", q: "" };

function load() {
  try { return JSON.parse(localStorage.getItem("mea-cart")) || []; } catch { return []; }
}
function save() {
  try { localStorage.setItem("mea-cart", JSON.stringify(cart)); } catch {}
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}

// ===== Carrito =====
function addItem(item, qty = 1) {
  const found = cart.find((c) => c.id === item.id);
  if (found) found.qty += qty;
  else cart.push({ ...item, qty });
  commit();
  toast(`Agregado: ${item.name}`);
}
function setQty(id, qty) {
  const it = cart.find((c) => c.id === id);
  if (!it) return;
  it.qty = qty;
  if (it.qty <= 0) cart = cart.filter((c) => c.id !== id);
  commit();
}
function commit() {
  save();
  renderCart();
  renderProducts();
  const n = cart.reduce((a, c) => a + c.qty, 0);
  const el = $("#cartCount");
  el.textContent = n;
  el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
}
const total = () => cart.reduce((a, c) => a + c.price * c.qty, 0);

function renderCart() {
  const box = $("#cartItems");
  if (!cart.length) {
    box.innerHTML = `<div class="cart-empty"><div>🛒</div><p>Tu pedido está vacío.<br>Agrega servicios o útiles.</p></div>`;
  } else {
    box.innerHTML = cart.map((c) => `
      <div class="cart-line">
        <div class="ci">${c.ico}</div>
        <div class="cn"><strong>${c.name}</strong><small>${c.detail || money(c.price) + " c/u"}</small></div>
        <div class="qty">
          <button data-dec="${c.id}" aria-label="Quitar">−</button>
          <span>${c.qty}</span>
          <button data-inc="${c.id}" aria-label="Agregar">+</button>
        </div>
        <div class="cp">${money(c.price * c.qty)}</div>
      </div>`).join("");
  }
  $("#cartTotal").textContent = money(total());
}

// ===== Servicios =====
function renderServices() {
  $("#servicesGrid").innerHTML = SERVICES.map((s) => `
    <button class="service" data-service="${s.id}">
      <span class="s-ico">${s.ico}</span>
      <h3>${s.name}</h3>
      <p>${s.desc}</p>
      <span class="s-foot">
        <span class="price">${money(s.price)} <small>${s.unit}</small></span>
        <span class="add-mini">+</span>
      </span>
    </button>`).join("");
}

// ===== Productos =====
function renderChips() {
  const cats = ["Todos", ...new Set(PRODUCTS.map((p) => p.cat))];
  $("#chips").innerHTML = cats.map((c) =>
    `<button class="chip ${c === filter.cat ? "on" : ""}" data-cat="${c}">${c}</button>`).join("");
}
function renderProducts() {
  const q = filter.q.trim().toLowerCase();
  const list = PRODUCTS.filter((p) =>
    (filter.cat === "Todos" || p.cat === filter.cat) &&
    (!q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)));
  $("#emptyMsg").hidden = list.length > 0;
  $("#productsGrid").innerHTML = list.map((p) => {
    const inCart = cart.find((c) => c.id === p.id)?.qty || 0;
    return `
    <article class="product">
      <div class="p-thumb">${p.tag ? `<span class="p-tag">${p.tag}</span>` : ""}${p.ico}</div>
      <div class="p-body">
        <small>${p.cat}</small>
        <h3>${p.name}</h3>
        <div class="p-foot">
          <span class="price">${money(p.price)}</span>
          ${inCart
            ? `<div class="qty"><button data-dec="${p.id}" aria-label="Quitar">−</button><span>${inCart}</span><button data-inc="${p.id}" aria-label="Agregar">+</button></div>`
            : `<button class="add-mini" data-product="${p.id}" aria-label="Agregar ${p.name}">+</button>`}
        </div>
      </div>
    </article>`;
  }).join("");
}

// ===== Cotizador =====
const quote = { type: "bn", size: "a4" };
const BASE = { bn: 0.05, color: 0.25 };
const SIZE = { a4: 1, oficio: 1.2, a3: 2 };
const SIZE_LBL = { a4: "A4", oficio: "Oficio", a3: "A3" };

function calcQuote() {
  const pages = Math.max(1, parseInt($("#pages").value, 10) || 1);
  const duplex = $("#duplex").checked;
  let unit = BASE[quote.type] * SIZE[quote.size];
  if (duplex) unit *= 1.6;
  if (pages >= 50) unit *= 0.85;
  let t = unit * pages;
  if ($("#binding").checked) t += 1.5;
  if ($("#cover").checked) t += 0.75;
  const parts = [
    `${pages} hojas`, quote.type === "bn" ? "B/N" : "Color", SIZE_LBL[quote.size],
    duplex && "doble cara", $("#binding").checked && "anillado", $("#cover").checked && "portada",
  ].filter(Boolean);
  const detail = parts.join(" · ") + (pages >= 50 ? " · -15%" : "");
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
function openCart() {
  $("#toast").classList.remove("show");
  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  $("#overlay").hidden = false;
}
function closeCart() {
  $("#drawer").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#overlay").hidden = true;
}

let delivery = "Retiro en local";

function checkout() {
  if (!cart.length) return toast("Agrega algo a tu pedido primero");
  const name = $("#custName").value.trim();
  if (!name) { $("#custName").focus(); return toast("Escribe tu nombre"); }
  const lines = cart.map((c) => `• ${c.qty} x ${c.name}${c.detail ? ` (${c.detail})` : ""} — ${money(c.price * c.qty)}`);
  const notes = $("#notes").value.trim();
  const msg = [
    `Hola, soy *${name}*. Quiero hacer este pedido:`, "", ...lines, "",
    `*Total: ${money(total())}*`, `Entrega: ${delivery}`, notes && `Notas: ${notes}`,
  ].filter((x) => x !== false && x !== "").join("\n");
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}

// ===== Eventos =====
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-service],[data-product],[data-inc],[data-dec],[data-cat]");
  if (!t) return;
  if (t.dataset.service) addItem(SERVICES.find((s) => s.id === t.dataset.service));
  else if (t.dataset.product) addItem(PRODUCTS.find((p) => p.id === t.dataset.product));
  else if (t.dataset.inc) setQty(t.dataset.inc, cart.find((c) => c.id === t.dataset.inc).qty + 1);
  else if (t.dataset.dec) setQty(t.dataset.dec, cart.find((c) => c.id === t.dataset.dec).qty - 1);
  else if (t.dataset.cat) { filter.cat = t.dataset.cat; renderChips(); renderProducts(); }
});

$("#search").addEventListener("input", (e) => { filter.q = e.target.value; renderProducts(); });
$("#openCart").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeCart());
$("#checkout").addEventListener("click", checkout);
$("#clearCart").addEventListener("click", () => { cart = []; commit(); });
bindSeg("#delivery", (v) => (delivery = v));

$("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
$("#nav").addEventListener("click", (e) => e.target.tagName === "A" && $("#nav").classList.remove("open"));

bindSeg("#printType", (v) => { quote.type = v; calcQuote(); });
bindSeg("#paperSize", (v) => { quote.size = v; calcQuote(); });
["#pages", "#duplex", "#binding", "#cover"].forEach((s) => $(s).addEventListener("input", calcQuote));
$("#pagesMinus").addEventListener("click", () => { $("#pages").value = Math.max(1, (+$("#pages").value || 1) - 1); calcQuote(); });
$("#pagesPlus").addEventListener("click", () => { $("#pages").value = (+$("#pages").value || 0) + 1; calcQuote(); });
$("#addQuote").addEventListener("click", () => {
  const { total: t, detail } = calcQuote();
  addItem({ id: "q-" + Date.now(), ico: "🖨️", name: "Impresión cotizada", price: t, detail });
});

// ===== Init =====
$("#waContact").href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, quisiera información sobre sus servicios.")}`;
$("#year").textContent = new Date().getFullYear();
renderServices();
renderChips();
renderProducts();
renderCart();
calcQuote();
$("#cartCount").textContent = cart.reduce((a, c) => a + c.qty, 0);

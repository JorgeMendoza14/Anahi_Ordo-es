export const money = (n) => "$" + (Number(n) || 0).toFixed(2);

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const ESTADOS = {
  pendiente: { label: "Pendiente", ico: "⏳", msg: "Recibimos tu pedido, en breve lo revisamos." },
  aceptado:  { label: "Aceptado",  ico: "👍", msg: "¡Tu pedido fue aceptado! Lo estamos preparando." },
  listo:     { label: "Listo",     ico: "✅", msg: "Tu pedido está listo." },
  entregado: { label: "Entregado", ico: "📦", msg: "Pedido entregado. ¡Gracias por tu compra!" },
  rechazado: { label: "Rechazado", ico: "✖️", msg: "No pudimos aceptar tu pedido." },
};

export function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

export function waLink(num, text) {
  const n = String(num || "").replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function fecha(ts) {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!d) return "ahora";
  return d.toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Código corto y legible para el pedido
export function codigoPedido() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 5; i++) c += abc[Math.floor(Math.random() * abc.length)];
  return c;
}

export function thumb(item) {
  return item.imagen
    ? `<img src="${esc(item.imagen)}" alt="" loading="lazy">`
    : esc(item.emoji || "📦");
}

// Datos de ejemplo: se usan en MODO DEMO y para el botón "Cargar datos de ejemplo" del panel.
export const DEFAULT_CONFIG = {
  nombre: "Multiservicio Mariscal de Ayacucho",
  whatsapp: "593994713884",
  horario: [
    { dia: "Lunes a viernes", horas: "7:00 – 20:00" },
    { dia: "Sábado", horas: "8:00 – 14:00" },
    { dia: "Domingo", horas: "Cerrado" },
  ],
  aviso: "Abierto hoy · 7:00 – 20:00",
  precios: { bn: 0.05, color: 0.25, anillado: 1.5, portada: 0.75, descuentoDesde: 50, descuento: 15 },
};

export const DEMO_SERVICES = [
  { emoji: "📄", nombre: "Copias B/N",        descripcion: "Copias rápidas en blanco y negro, A4 u oficio.", precio: 0.05, unidad: "c/u" },
  { emoji: "🎨", nombre: "Impresión a color", descripcion: "Ideal para portadas, mapas y presentaciones.",   precio: 0.25, unidad: "c/u" },
  { emoji: "🌀", nombre: "Anillado",          descripcion: "Anillado plástico o metálico para tus trabajos.", precio: 1.50, unidad: "" },
  { emoji: "🛡️", nombre: "Plastificado",      descripcion: "Protege carnets, certificados y láminas.",       precio: 0.75, unidad: "" },
  { emoji: "📠", nombre: "Escaneo",           descripcion: "Digitaliza documentos y te los enviamos.",       precio: 0.20, unidad: "c/u" },
  { emoji: "🔎", nombre: "Investigaciones",   descripcion: "Te ayudamos a buscar e imprimir tu consulta.",   precio: 1.00, unidad: "" },
  { emoji: "⌨️", nombre: "Tipeo de trabajos", descripcion: "Pasamos tu trabajo a computadora con formato.", precio: 0.50, unidad: "pág." },
  { emoji: "🪪", nombre: "Fotos carnet",      descripcion: "6 fotos tamaño carnet listas en minutos.",       precio: 2.00, unidad: "" },
].map((s, i) => ({ ...s, activo: true, orden: i }));

export const DEMO_PRODUCTS = [
  { emoji: "📒", nombre: "Cuaderno universitario 100 h", categoria: "Cuadernos",  precio: 1.80, etiqueta: "Más vendido" },
  { emoji: "📓", nombre: "Cuaderno pequeño 60 h",        categoria: "Cuadernos",  precio: 0.90 },
  { emoji: "📔", nombre: "Cuaderno de dibujo A4",        categoria: "Cuadernos",  precio: 2.20 },
  { emoji: "✏️", nombre: "Lápiz HB #2",                  categoria: "Escritura",  precio: 0.30 },
  { emoji: "🖊️", nombre: "Esferos azul/negro/rojo (3)",  categoria: "Escritura",  precio: 1.00, etiqueta: "Combo" },
  { emoji: "🖍️", nombre: "Pinturas x12",                 categoria: "Arte",       precio: 2.50 },
  { emoji: "🖌️", nombre: "Témperas x6",                  categoria: "Arte",       precio: 3.00 },
  { emoji: "🟩", nombre: "Cartulina (pliego)",           categoria: "Papelería",  precio: 0.35 },
  { emoji: "📃", nombre: "Resma papel bond A4",          categoria: "Papelería",  precio: 5.50 },
  { emoji: "🗂️", nombre: "Carpeta con vincha",           categoria: "Papelería",  precio: 0.60 },
  { emoji: "📐", nombre: "Juego de geometría",           categoria: "Accesorios", precio: 1.50 },
  { emoji: "✂️", nombre: "Tijera escolar",               categoria: "Accesorios", precio: 0.90 },
  { emoji: "🧴", nombre: "Goma en barra",                categoria: "Accesorios", precio: 0.75 },
  { emoji: "🧽", nombre: "Borrador + sacapuntas",        categoria: "Escritura",  precio: 0.50 },
  { emoji: "🎒", nombre: "Mochila escolar",              categoria: "Accesorios", precio: 12.00, etiqueta: "Nuevo" },
  { emoji: "🖍️", nombre: "Marcadores fluorescentes x4",  categoria: "Arte",       precio: 2.00 },
].map((p) => ({ etiqueta: "", imagen: "", stock: 50, activo: true, ...p }));

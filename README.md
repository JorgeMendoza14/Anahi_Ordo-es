# Multiservicio Escolar Anahí

Tienda web en blanco y verde para un multiservicio escolar, conectada a **Firebase**.

- **Tienda** (`index.html`): servicios, cotizador de impresiones, útiles con stock, carrito y pedidos.
  El cliente ve el estado de su pedido en tiempo real (pestaña *Mis pedidos*).
- **Panel administrador** (`admin.html`): login, pedidos en vivo (aceptar / rechazar / listo / entregado,
  con sonido y aviso por WhatsApp), productos con foto y stock, servicios y ajustes del local.

Sin Firebase configurado la tienda funciona en **modo demo** (los pedidos se envían por WhatsApp).

## Estructura

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css` | Tienda |
| `admin.html`, `admin.css` | Panel administrador |
| `js/firebase-config.js` | **Aquí pegas los datos de tu proyecto Firebase** |
| `js/tienda.js` | Lógica de la tienda |
| `js/admin.js` | Lógica del panel |
| `js/data.js` | Datos de ejemplo y ajustes por defecto |
| `firestore.rules` | Reglas de seguridad |

## Conectar Firebase (una sola vez)

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto**.
2. En la página del proyecto, pulsa el icono **`</>`** (App web), ponle un nombre y copia el objeto
   `firebaseConfig` en `js/firebase-config.js`.
3. Menú **Compilación → Authentication → Comenzar** → habilita **Correo electrónico/contraseña**.
   En la pestaña **Users → Agregar usuario**, crea tu cuenta de administrador.
4. Menú **Compilación → Firestore Database → Crear base de datos** (modo producción).
5. En Firestore → pestaña **Reglas**, borra lo que hay, pega el contenido de `firestore.rules` y **Publicar**.
6. **Administrador:** abre la app, regístrate (o ingresa) con tu cuenta. Toda cuenta nueva es `estudiante`.
   En la consola → Firestore → colección `usuarios` → tu documento → cambia el campo `rol` a `admin`.
   La app te pasa al panel automáticamente.
7. En el panel → **Ajustes**: pon el WhatsApp del local y pulsa **Cargar datos de ejemplo** si quieres empezar
   con productos.


## Flujo de la app y roles

1. Al abrir la app lo primero es **Ingresar / Registrarme**. Sin cuenta no se ve nada.
2. Toda cuenta nueva queda con `rol: "estudiante"` → entra a la tienda, hace pedidos y ve solo los suyos.
3. Si en Firestore (`usuarios/{uid}`) cambias `rol` a `admin`, esa persona entra al **panel administrador**.
   El cambio se aplica al instante, incluso con la app abierta. También se puede cambiar desde el panel → **Estudiantes**.

## Ejecutar en tu computadora

Los archivos usan módulos de JavaScript, así que **no funcionan con doble clic**: hay que abrirlos con un servidor.
En VS Code instala la extensión **Live Server**, clic derecho en `index.html` → **Open with Live Server**.
Los administradores son llevados al panel (`admin.html`) al iniciar sesión; desde ahí pueden abrir la tienda con **Ver tienda**.

## Publicar en internet (gratis con Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase use --add      # elige tu proyecto
firebase deploy         # sube la página y las reglas
```

Te dará una dirección como `https://tu-proyecto.web.app`.

## Base de datos (Firestore)

- `productos`: nombre, categoria, precio, stock, emoji, imagen, etiqueta, activo
- `servicios`: nombre, descripcion, precio, unidad, emoji, activo, orden
- `pedidos`: codigo, cliente {nombre, telefono}, entrega, direccion, notas, items, total, estado, creado
- `config/tienda`: whatsapp, aviso, direccion, horario, precios del cotizador
- `usuarios/{uid}`: rol ("estudiante" o "admin"), nombre, email, telefono, curso
- `pedidos.uid`: el estudiante que hizo el pedido

Estados de un pedido: `pendiente → aceptado → listo → entregado` (o `rechazado`).
Al **aceptar** un pedido se descuenta el stock de los productos.

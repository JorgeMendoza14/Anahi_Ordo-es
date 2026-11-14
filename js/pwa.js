// Instalación de la app (PWA) y enlace al APK de Android. Script clásico: funciona aunque falle el resto.
(function () {
  var APK = "https://github.com/JorgeMendoza14/Anahi_Ordo-es/releases/download/apk/MariscalAyacucho.apk";
  var ua = navigator.userAgent || "";
  var enApp = /MariscalApp/.test(ua) || window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  var esAndroid = /Android/i.test(ua);
  var esIOS = /iPhone|iPad|iPod/i.test(ua);
  var promptEvt = null;

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function refresh() {
    each("[data-install]", function (b) { b.hidden = enApp || !(promptEvt || esIOS); });
    each("[data-apk]", function (a) { a.href = APK; a.hidden = enApp || !esAndroid; });
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); promptEvt = e; refresh(); });
  window.addEventListener("appinstalled", function () { promptEvt = null; enApp = true; refresh(); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-install]");
    if (!b) return;
    if (promptEvt) { promptEvt.prompt(); promptEvt.userChoice.finally(function () { promptEvt = null; refresh(); }); }
    else if (esIOS) alert("Para instalar en iPhone:\n1. Toca el botón Compartir (cuadro con flecha ↑) de Safari.\n2. Elige \"Agregar a pantalla de inicio\".");
  });
  document.addEventListener("DOMContentLoaded", refresh);
  refresh();
})();

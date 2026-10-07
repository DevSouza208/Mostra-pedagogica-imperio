if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .catch(error => console.warn("PWA: não foi possível registrar o service worker.", error));
  });
}

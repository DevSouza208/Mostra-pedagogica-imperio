(() => {
  const splash = document.getElementById("appSplash");
  if (!splash) return;

  const KEY = "mostra_splash_seen";
  const MIN_TIME = 1550;
  const startedAt = performance.now();

  if (sessionStorage.getItem(KEY) === "1") {
    splash.remove();
    return;
  }

  document.body.classList.add("splash-lock");

  const finish = () => {
    const elapsed = performance.now() - startedAt;
    const wait = Math.max(0, MIN_TIME - elapsed);

    window.setTimeout(() => {
      sessionStorage.setItem(KEY, "1");
      splash.classList.add("is-hiding");
      document.body.classList.remove("splash-lock");

      window.setTimeout(() => splash.remove(), 460);
    }, wait);
  };

  if (document.readyState === "complete") {
    finish();
  } else {
    window.addEventListener("load", finish, { once:true });
  }

  window.setTimeout(finish, 2600);
})();

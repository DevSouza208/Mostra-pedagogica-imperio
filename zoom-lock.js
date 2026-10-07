(() => {
  const viewport = document.querySelector('meta[name="viewport"]');
  const lockedViewport = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content";

  if (viewport) viewport.setAttribute("content", lockedViewport);

  const stopGesture = event => event.preventDefault();

  document.addEventListener("gesturestart", stopGesture, { passive: false });
  document.addEventListener("gesturechange", stopGesture, { passive: false });
  document.addEventListener("gestureend", stopGesture, { passive: false });

  document.addEventListener("touchmove", event => {
    if (event.touches && event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("wheel", event => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("keydown", event => {
    if (!(event.ctrlKey || event.metaKey)) return;

    const zoomKeys = new Set(["+", "=", "-", "_", "0"]);
    if (zoomKeys.has(event.key)) {
      event.preventDefault();
    }
  });

  document.addEventListener("dblclick", event => {
    const target = event.target;
    const editable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;

    if (!editable) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("focusin", event => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      target.style.fontSize = "16px";
      if (viewport) viewport.setAttribute("content", lockedViewport);
    }
  });
})();

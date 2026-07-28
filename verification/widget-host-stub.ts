export const lifecycle = {
  activeEffects: 0,
  mountedRoots: 0,
  unmountCalls: 0,
};

export function resetLifecycle() {
  lifecycle.activeEffects = 0;
  lifecycle.mountedRoots = 0;
  lifecycle.unmountCalls = 0;
}

export function mountWidget(el: HTMLElement) {
  lifecycle.mountedRoots += 1;
  lifecycle.activeEffects += 1;
  el.textContent = "Widget effect is active";
  let mounted = true;

  return {
    render() {},
    unmount() {
      if (!mounted) return;
      mounted = false;
      lifecycle.mountedRoots -= 1;
      lifecycle.activeEffects -= 1;
      lifecycle.unmountCalls += 1;
      el.replaceChildren();
    },
  };
}

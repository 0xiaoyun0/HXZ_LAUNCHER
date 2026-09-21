export function secretSequence(open: () => void) {
  const sequence = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "KeyB",
    "KeyA"
  ];
  let index = 0,
    last = 0;
  return (event: KeyboardEvent) => {
    if (
      event.repeat ||
      event.isComposing ||
      event.defaultPrevented ||
      document.querySelector('[data-arcade-playing="true"]') ||
      (event.target instanceof Element &&
        event.target.closest(
          'input,textarea,select,[contenteditable="true"],[role="textbox"]'
        ))
    ) {
      index = 0;
      return;
    }
    if (Date.now() - last > 2500) index = 0;
    last = Date.now();
    index =
      (event.code === sequence[index] || ({KeyW:"ArrowUp",KeyS:"ArrowDown",KeyA:"ArrowLeft",KeyD:"ArrowRight"} as Record<string,string>)[event.code] === sequence[index])
        ? index + 1
        : (event.code === sequence[0] || event.code === "KeyW")
          ? 1
          : 0;
    if (index) event.preventDefault();
    if (index === sequence.length) {
      index = 0;
      open();
    }
  };
}

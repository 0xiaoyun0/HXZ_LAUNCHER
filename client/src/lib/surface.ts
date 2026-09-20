export function surfaceColor(color: string, opacity: number) {
  if (CSS.supports('color', 'color-mix(in srgb, black, white)'))
    return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
  const resolved = color.startsWith('var(')
    ? getComputedStyle(document.documentElement).getPropertyValue(color.slice(4, -1)).trim() : color;
  const hex = /^#([a-f\d]{6})$/i.exec(resolved)?.[1];
  if (hex) return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${opacity})`;
  return resolved || color;
}

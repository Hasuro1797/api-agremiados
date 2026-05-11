/** Convierte un color hex #RRGGBB a HSL [h(0-360), s(0-100), l(0-100)]. */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Convierte HSL [h(0-360), s(0-100), l(0-100)] a color hex #RRGGBB. */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Deriva primaryLight y accentHover a partir de los colores base.
 *
 *  primaryLight  = primary con +8% de luminosidad (versión más clara para hovers/fondos sutiles)
 *  accentHover   = accent con -10% de luminosidad (versión más oscura para estado hover)
 */
export function deriveOrganizationColors(
  primaryHex: string,
  accentHex: string,
): { primaryLight: string; accentHover: string } {
  const [ph, ps, pl] = hexToHsl(primaryHex);
  const [ah, as_, al] = hexToHsl(accentHex);

  const primaryLight = hslToHex(ph, ps, Math.min(pl + 8, 90));
  const accentHover = hslToHex(ah, as_, Math.max(al - 10, 5));

  return { primaryLight, accentHover };
}

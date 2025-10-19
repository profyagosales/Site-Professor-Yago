type ClassColorResult = {
  background: string;
  hoverBackground: string;
  textColor: string;
};

const HOVER_DELTA = -0.06;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function formatHsl(h: number, s: number, l: number): string {
  const hue = Math.round((h % 360 + 360) % 360);
  const saturation = Math.round(clamp01(s) * 100);
  const lightness = Math.round(clamp01(l) * 100);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function adjustLightness(h: number, s: number, l: number, delta: number): string {
  return formatHsl(h, s, clamp01(l + delta));
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

function hslToRgb(h: number, s: number, l: number) {
  const hue = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const convert = (t: number) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const r = Math.round(convert(hue + 1 / 3) * 255);
  const g = Math.round(convert(hue) * 255);
  const b = Math.round(convert(hue - 1 / 3) * 255);
  return { r, g, b };
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

function parseHsl(color: string) {
  const match = color.match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i);
  if (!match) return null;
  const h = Number.parseFloat(match[1]);
  const s = Number.parseFloat(match[2]) / 100;
  const l = Number.parseFloat(match[3]) / 100;
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return null;
  return { h, s, l };
}

export function classColor(classId?: string | null): ClassColorResult {
  const base = classId && classId.trim() ? classId.trim() : 'default';
  const hue = hashString(base);
  const saturation = 0.68;
  const lightness = 0.58;
  const { r, g, b } = hslToRgb(hue, saturation, lightness);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const textColor = luminance > 0.6 ? '#0f172a' : '#ffffff';
  return {
    background: formatHsl(hue, saturation, lightness),
    hoverBackground: adjustLightness(hue, saturation, lightness, HOVER_DELTA),
    textColor,
  };
}

export function resolveClassColors(explicitColor: string | null | undefined, classId?: string | null) {
  if (explicitColor && explicitColor.trim()) {
    const color = explicitColor.trim();
    const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const chunkSize = hex.length === 3 ? 1 : 2;
      const expanded = chunkSize === 1
        ? hex.split('').map((ch) => ch + ch).join('')
        : hex;
      const r = Number.parseInt(expanded.slice(0, 2), 16);
      const g = Number.parseInt(expanded.slice(2, 4), 16);
      const b = Number.parseInt(expanded.slice(4, 6), 16);
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const { h, s, l } = rgbToHsl(r, g, b);
      return {
        background: color,
        hoverBackground: adjustLightness(h, s, l, HOVER_DELTA),
        textColor: luminance > 0.6 ? '#0f172a' : '#ffffff',
      };
    }
    if (color.startsWith('hsl')) {
      const parsed = parseHsl(color);
      const hoverBackground = parsed
        ? adjustLightness(parsed.h, parsed.s, parsed.l, HOVER_DELTA)
        : color;
      return { background: color, hoverBackground, textColor: '#0f172a' };
    }
  }
  return classColor(classId);
}

export type { ClassColorResult };

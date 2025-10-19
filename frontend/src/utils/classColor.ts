type ClassColorResult = {
  background: string;
  textColor: string;
};

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

export function classColor(classId?: string | null): ClassColorResult {
  const base = classId && classId.trim() ? classId.trim() : 'default';
  const hue = hashString(base);
  const saturation = 0.68;
  const lightness = 0.58;
  const { r, g, b } = hslToRgb(hue, saturation, lightness);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const textColor = luminance > 0.6 ? '#0f172a' : '#ffffff';
  return {
    background: `hsl(${hue}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`,
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
      return {
        background: color,
        textColor: luminance > 0.6 ? '#0f172a' : '#ffffff',
      };
    }
    if (color.startsWith('hsl')) {
      return { background: color, textColor: '#0f172a' };
    }
  }
  return classColor(classId);
}

export type { ClassColorResult };

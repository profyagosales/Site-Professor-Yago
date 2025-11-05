const { rgb } = require('pdf-lib');

const A4 = { width: 595, height: 842 };
const PAGE = {
  margin: 24,
  gutter: 12,
};

const TYPOGRAPHY = {
  title: 11,
  body: 10,
  label: 9,
  small: 8,
  display: 14,
};

const HERO = {
  height: 72,
  radius: 16,
  padX: 18,
  padY: 12,
  gap: 14,
};

const BRAND = {
  ICON: 44,
};

const SCORE_CARD = {
  width: 150,
  height: 56,
  radius: 14,
  pad: 10,
};

const AVATAR = { size: 36 };

const COLORS = {
  background: '#FFFFFF',
  page: '#F8FAFC',
  border: '#E2E8F0',
  borderMuted: '#F1F5F9',
  text: '#1F2937',
  textSubtle: '#64748B',
  textInverted: '#FFFFFF',
  brand: '#FB923C',
  brandDark: '#EA580C',
  brandPastel: '#FFF7ED',
  heroAccent: '#FDBA74',
};

const COMMENT_RAIL = {
  widthRatio: 0.2,
  headerSize: 10,
  chipSize: 8,
  gap: 16,
  padding: 10,
  cardRadius: 14,
  cardGap: 10,
  lineGap: 3,
};

const SPACING = {
  section: 16,
  block: 12,
  title: 6,
  subtitle: 10,
  cardGap: 14,
  tableRow: 6,
  tableRowGap: 8,
};

const CARD = {
  radius: 18,
  paddingX: 18,
  paddingY: 18,
  border: '#E2E8F0',
  background: '#FFFFFF',
  backgroundMuted: '#F8FAFC',
  shadowOpacity: 0.08,
  headerGap: 10,
  displayGap: 8,
};

const COLUMN = {
  mainRatio: 0.8,
  railRatio: 0.2,
  gap: PAGE.gutter,
};

const ENEM_COLORS = {
  C1: { strong: '#065F46', title: '#0F766E', pastel: '#D1FAE5' },
  C2: { strong: '#9D174D', title: '#BE185D', pastel: '#FCE7F3' },
  C3: { strong: '#92400E', title: '#B45309', pastel: '#FEF3C7' },
  C4: { strong: '#1E40AF', title: '#1D4ED8', pastel: '#DBEAFE' },
  C5: { strong: '#9A3412', title: '#EA580C', pastel: '#FFEDD5' },
};

const PAS_COLORS = {
  macro: { strong: '#1E40AF', title: '#1D4ED8', pastel: '#DBEAFE' },
  micro: { strong: '#9D174D', title: '#BE185D', pastel: '#FCE7F3' },
};

function colorFromHex(hex) {
  if (typeof hex !== 'string') return rgb(0, 0, 0);
  const normalized = hex.replace('#', '').trim();
  const expanded = normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized.padStart(6, '0').slice(0, 6);
  const int = parseInt(expanded, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return rgb(r / 255, g / 255, b / 255);
}

function columns(totalWidth) {
  const railWidth = Math.round(totalWidth * COLUMN.railRatio);
  const mainWidth = totalWidth - railWidth - COLUMN.gap;
  return { mainWidth, railWidth };
}

module.exports = {
  A4,
  PAGE,
  HERO,
  BRAND,
  SCORE_CARD,
  AVATAR,
  COLORS,
  COMMENT_RAIL,
  SPACING,
  CARD,
  COLUMN,
  ENEM_COLORS,
  PAS_COLORS,
  TYPOGRAPHY,
  columns,
  colorFromHex,
};

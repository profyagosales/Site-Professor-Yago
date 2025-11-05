const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { ENEM_RUBRIC, ENEM_REASON_LABELS } = require('../constants/enemRubric');
const pdfTheme = require('./pdfTheme');

const {
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
	ENEM_COLORS,
	PAS_COLORS,
	TYPOGRAPHY,
	columns: computeColumns,
	colorFromHex: themeColorFromHex,
} = pdfTheme;

const MARGIN = PAGE.margin;
const CONTENT_GAP = PAGE.gutter;
const SECTION_GAP = SPACING.section;
const TITLE_SIZE = TYPOGRAPHY.title;
const BODY_SIZE = TYPOGRAPHY.body;

const COMMENT = {
	titleSize: BODY_SIZE,
	numberSize: TYPOGRAPHY.small,
	categorySize: TYPOGRAPHY.small,
	textSize: TYPOGRAPHY.small,
	lineGap: COMMENT_RAIL.lineGap,
	cardGap: COMMENT_RAIL.cardGap || SPACING.block,
	padding: COMMENT_RAIL.padding,
	maxLines: 6,
	circleSize: 14,
};

const HIGHLIGHT_FILL_OPACITY = 0.22;
const HIGHLIGHT_BORDER_OPACITY = 0.8;
const PDF_FONT = {
	xs: TYPOGRAPHY.small - 1,
	sm: TYPOGRAPHY.small,
	md: TYPOGRAPHY.body,
	lg: TYPOGRAPHY.display,
};
const LINE_GAP = 4;
const BULLET_INDENT = 12;

const CLASS_TABLE = {
	headerHeight: 28,
	rowHeight: 44,
	borderRadius: 14,
	avatarSize: 34,
	paddingX: 12,
	paddingY: 12,
	colGap: 10,
	badgeSize: 18,
	badgeFont: TYPOGRAPHY.small,
	badgePadding: 4,
};

const DOCUMENT_PREVIEW = {
	padding: 16,
	radius: CARD.radius,
	shadowOffset: 4,
	shadowOpacity: 0.12,
	aspectRatio: Math.SQRT2 || 1.41421356237,
	pagePadding: 18,
	pageRadius: 12,
	pageBorder: CARD.border,
	pageBackground: CARD.background,
	pageHeaderHeight: 26,
	pageHeaderColor: CARD.backgroundMuted,
	lineColor: COLORS.border,
	lineGap: 10,
	lineThickness: 0.8,
	footerGap: 12,
	footerSize: BODY_SIZE - 2,
	subtitleSize: BODY_SIZE - 1,
};

const CARD_FRAME = {
	radius: CARD.radius,
	paddingX: CARD.paddingX,
	paddingY: CARD.paddingY,
	border: CARD.border,
	background: CARD.background,
	mutedBackground: CARD.backgroundMuted,
	gap: CARD.displayGap || 14,
	headerGap: CARD.headerGap,
	displayGap: CARD.displayGap,
	dividerColor: CARD.border,
	shadowOpacity: CARD.shadowOpacity,
};
const ANNUL_CARD = {
	padding: CARD_FRAME.paddingX,
	titleSize: 12,
	textSize: 9,
	optionGap: 8,
	lineSpacing: 3,
	headingGap: 6,
	sectionGap: 8,
	checkboxSize: 10,
	checkboxGap: 10,
	badgeHeight: 18,
	radius: CARD_FRAME.radius,
	border: CARD_FRAME.border,
};

const SUMMARY_GRID = {
	columns: 2,
	cardHeight: 56,
	padX: 12,
	padY: 12,
	gapX: 12,
	gapY: 12,
	labelSize: 9,
	valueSize: 16,
	valueGap: 6,
};

const ENEM_SUMMARY_CARD = {
	highlightHeight: 56,
	rowPaddingY: 8,
	columnGap: 12,
	columnPaddingX: 12,
	columnLabelSize: BODY_SIZE - 1,
	columnValueSize: BODY_SIZE,
	rowRadius: 12,
};
ENEM_SUMMARY_CARD.rowHeight =
	ENEM_SUMMARY_CARD.rowPaddingY * 2
	+ ENEM_SUMMARY_CARD.columnLabelSize
	+ ENEM_SUMMARY_CARD.columnValueSize
	+ LINE_GAP;

const PAS_TABLE = {
	rowHeight: BODY_SIZE + 16,
	rowGap: 6,
	headerHeight: BODY_SIZE + 6,
	radius: 10,
};

const PAS_FOOTER = {
	topGap: 6,
	middleGap: 4,
	bottomGap: 6,
};

const HEX = {
	background: COLORS.background,
	pageBg: COLORS.page,
	border: COLORS.border,
	borderSoft: COLORS.borderMuted,
	text: COLORS.text,
	textMuted: COLORS.textSubtle,
	textInverted: COLORS.textInverted,
	brand: COLORS.brand,
	brandDark: COLORS.brandDark,
	brandPastel: COLORS.brandPastel,
	heroAccent: COLORS.heroAccent,
};

const TEXT = HEX.text;
const TEXT_SUBTLE = HEX.textMuted;
const BG = HEX.background;
const GRAY = HEX.border;

const COMMENT_CATEGORIES = {
	argumentacao: { label: 'Argumentação', hex: '#FFD666' },
	ortografia: { label: 'Ortografia/Gramática', hex: '#94E3B1' },
	coesao: { label: 'Coesão/Coerência', hex: '#A8D1FF' },
	apresentacao: { label: 'Apresentação', hex: '#FFC999' },
	comentarios: { label: 'Comentários gerais', hex: '#FFC0C0' },
};

const ANNUL_OPTIONS = [
	{ key: 'MENOS_7_LINHAS', label: 'Menos de 7 linhas' },
	{ key: 'FUGA_TEMA', label: 'Fuga ao tema' },
	{ key: 'COPIA', label: 'Cópia' },
	{ key: 'ILEGIVEL', label: 'Ilegível' },
	{ key: 'FUGA_GENERO', label: 'Fuga ao gênero' },
	{ key: 'OUTROS', label: 'Outros (especificar)', hasInput: true },
];

const ENEM_COLORS_HEX = ENEM_COLORS;

let brandMarkBytesCache = null;
let brandMarkLoadAttempted = false;

function resolveBrandMarkPath() {
	return path.resolve(__dirname, '../assets/brand-mark.png');
}

function getBrandMarkBytes() {
	if (brandMarkLoadAttempted) return brandMarkBytesCache;
	brandMarkLoadAttempted = true;
	const filePath = resolveBrandMarkPath();
	try {
		brandMarkBytesCache = fs.readFileSync(filePath);
	} catch (err) {
		brandMarkBytesCache = null;
		console.warn('[pdf] Marca do professor indisponível em', filePath, err?.message || err);
	}
	return brandMarkBytesCache;
}

async function embedBrandMark(pdfDoc) {
	const bytes = getBrandMarkBytes();
	if (!bytes || !bytes.length) return null;
	try {
		return await pdfDoc.embedPng(bytes);
	} catch (err) {
		console.warn('[pdf] Falha ao incorporar marca do professor', err?.message || err);
		return null;
	}
}

function hexToRgbComponents(hex) {
	if (typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
	const normalized = hex.replace('#', '').trim();
	const expand = normalized.length === 3
		? normalized.split('').map((ch) => ch + ch).join('')
		: normalized.padStart(6, '0').slice(0, 6);
	const value = Number.parseInt(expand, 16);
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;
	return { r, g, b };
}

function colorFromHex(hex) {
	return themeColorFromHex(hex);
}

function blendHex(hexA, hexB, amount = 0.5) {
	const { r: r1, g: g1, b: b1 } = hexToRgbComponents(hexA);
	const { r: r2, g: g2, b: b2 } = hexToRgbComponents(hexB);
	const mix = (a, b) => Math.round(a + (b - a) * amount);
	const r = mix(r1, r2);
	const g = mix(g1, g2);
	const b = mix(b1, b2);
	return colorFromHex(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function wrapText(text, font, fontSize, maxWidth) {
	if (!text || !String(text).trim()) return [];
	const lines = [];
	const paragraphs = String(text).replace(/\r\n/g, '\n').split('\n');
	paragraphs.forEach((paragraph, index) => {
		const sanitized = paragraph.trim();
		if (!sanitized) {
			if (index < paragraphs.length - 1) lines.push('');
			return;
		}
		const words = sanitized.split(/\s+/);
		let current = '';
		words.forEach((word) => {
			const candidate = current ? `${current} ${word}` : word;
			if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth || !current) {
				current = candidate;
			} else {
				lines.push(current);
				current = word;
			}
		});
		if (current) lines.push(current);
		if (index < paragraphs.length - 1) lines.push('');
	});
	while (lines.length && lines[lines.length - 1] === '') {
		lines.pop();
	}
	return lines;
}

function truncateText(text, font, fontSize, maxWidth) {
	if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text;
	const ellipsis = '…';
	const ellipsisWidth = font.widthOfTextAtSize(ellipsis, fontSize);
	let result = '';
	for (const char of text) {
		const candidate = result + char;
		if (font.widthOfTextAtSize(candidate, fontSize) + ellipsisWidth > maxWidth) break;
		result = candidate;
	}
	return `${result.trimEnd()}${ellipsis}`;
}

function ellipsize(text, maxChars) {
	if (!text) return '';
	const clean = String(text);
	if (clean.length <= maxChars) return clean;
	if (maxChars <= 1) return clean.slice(0, 1);
	return `${clean.slice(0, maxChars - 1)}…`;
}

function drawRoundedRect(page, {
	x,
	y,
	width,
	height,
	radius = 0,
	fill = null,
	stroke = null,
	strokeWidth = 0,
	opacity = 1,
}) {
	if (![x, y, width, height].every((value) => typeof value === 'number' && Number.isFinite(value))) {
		throw new Error(
			`Invalid rectangle dimensions: ${JSON.stringify({ x, y, width, height })}`,
		);
	}
	const r = Math.max(0, Math.min(radius, width / 2, height / 2));
	const path = [
		`M ${x + r} ${y}`,
		`L ${x + width - r} ${y}`,
		`Q ${x + width} ${y} ${x + width} ${y + r}`,
		`L ${x + width} ${y + height - r}`,
		`Q ${x + width} ${y + height} ${x + width - r} ${y + height}`,
		`L ${x + r} ${y + height}`,
		`Q ${x} ${y + height} ${x} ${y + height - r}`,
		`L ${x} ${y + r}`,
		`Q ${x} ${y} ${x + r} ${y}`,
		'Z',
	].join(' ');
	page.drawSvgPath(path, {
		color: fill || undefined,
		borderColor: stroke || undefined,
		borderWidth: strokeWidth || undefined,
		opacity,
	});
}

function drawCardContainer(page, {
	x,
	yTop,
	width,
	height,
	radius = CARD_FRAME.radius,
	fill = CARD_FRAME.background,
	stroke = CARD_FRAME.border,
	strokeWidth = 1,
	shadowOffset = 1.5,
	shadowOpacity = CARD_FRAME.shadowOpacity,
	shadowColor = '#0F172A',
}) {
	const bottom = yTop - height;
	if (shadowOpacity > 0) {
		drawRoundedRect(page, {
			x: x + shadowOffset,
			y: bottom - shadowOffset,
			width,
			height,
			radius,
			fill: colorFromHex(shadowColor),
			opacity: shadowOpacity,
		});
	}
	drawRoundedRect(page, {
		x,
		y: bottom,
		width,
		height,
		radius,
		fill: colorFromHex(fill),
		stroke: stroke ? colorFromHex(stroke) : undefined,
		strokeWidth: stroke ? strokeWidth : 0,
	});
	return bottom;
}

function fetchRemoteBytes(url) {
	if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
		return Promise.resolve(null);
	}
	const client = url.startsWith('https') ? https : http;
	return new Promise((resolve, reject) => {
		const request = client.get(url, { timeout: 20000 }, (response) => {
			if (response.statusCode && response.statusCode >= 400) {
				response.resume();
				reject(new Error(`Falha ao baixar arquivo (status ${response.statusCode})`));
				return;
			}
			const chunks = [];
			response.on('data', (chunk) => chunks.push(chunk));
			response.on('end', () => resolve(Buffer.concat(chunks)));
			response.on('error', (err) => reject(err));
		});
		request.on('error', (err) => reject(err));
		request.on('timeout', () => {
			request.destroy(new Error('Timeout ao baixar arquivo.'));
		});
	});
}

function parseBase64Image(dataUri) {
	if (typeof dataUri !== 'string') return null;
	const match = dataUri.match(/^data:(image\/(?:png|jpeg|jpg));base64,([\s\S]+)$/i);
	if (!match) return null;
	try {
		return Buffer.from(match[2], 'base64');
	} catch (err) {
		return null;
	}
}

function maybeDecodeLooseBase64(raw) {
	if (typeof raw !== 'string') return null;
	if (/^https?:\/\//i.test(raw)) return null;
	if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) return null;
	try {
		const cleaned = raw.replace(/\s+/g, '');
		if (!cleaned || cleaned.length % 4 !== 0) return null;
		const buffer = Buffer.from(cleaned, 'base64');
		return buffer.length ? buffer : null;
	} catch (err) {
		return null;
	}
}

async function embedRemoteImage(pdfDoc, source) {
	if (!source) return null;
	try {
		let data = null;
		if (source.startsWith('data:image/')) {
			data = parseBase64Image(source);
		} else {
			data = await fetchRemoteBytes(source);
		}
		if (!data) data = maybeDecodeLooseBase64(source);
		if (!data) return null;
		if (data[0] === 0x89 && data[1] === 0x50) return pdfDoc.embedPng(data);
		if (data[0] === 0xff && data[1] === 0xd8) return pdfDoc.embedJpg(data);
		return null;
	} catch (err) {
		console.warn('[pdf] Falha ao incorporar imagem remota', err?.message || err);
		return null;
	}
}

function resolveClassLabel(classInfo) {
	if (!classInfo) return null;
	const parts = [];
	if (classInfo.series) {
		const suffix = classInfo.letter ? String(classInfo.letter).trim().toUpperCase() : '';
		parts.push(`${classInfo.series}${suffix}`.trim());
	}
	if (classInfo.discipline) parts.push(classInfo.discipline);
	if (!parts.length && classInfo.name) parts.push(classInfo.name);
	return parts.filter(Boolean).join(' • ') || null;
}

function resolveThemeName(essay) {
	if (!essay) return 'Tema não informado';
	if (essay.customTheme) return essay.customTheme;
	if (essay.themeId && typeof essay.themeId.name === 'string') return essay.themeId.name;
	if (essay.theme) return essay.theme;
	if (essay.topic) return essay.topic;
	return 'Tema não informado';
}

function resolveFinalScore(score) {
	if (!score) return { value: '-', annulled: false };
	if (score.annulled) return { value: '0', annulled: true };
	if (score.type === 'PAS') {
		const nr = typeof score.pas?.NR === 'number' ? score.pas.NR : null;
		return { value: nr != null ? nr.toFixed(1) : '-', annulled: false };
	}
	if (score.type === 'ENEM') {
		const total = typeof score.enem?.total === 'number' ? score.enem.total : null;
		return { value: total != null ? String(total) : '-', annulled: false };
	}
	const fallback = typeof score?.enem?.total === 'number'
		? score.enem.total
		: typeof score?.pas?.NR === 'number'
			? score.pas.NR
			: null;
	return { value: fallback != null ? String(fallback) : '-', annulled: false };
}

function formatDateLabel(input) {
	if (!input) return '—';
	try {
		const date = new Date(input);
		if (Number.isNaN(date.getTime())) return '—';
		return date.toLocaleDateString('pt-BR');
	} catch (err) {
		return '—';
	}
}

function resolveAnnotationNumber(annotation, fallback) {
	if (Number.isFinite(annotation?.number) && annotation.number > 0) return Number(annotation.number);
	const candidates = [annotation?.n, annotation?.index, annotation?.order, annotation?.seq];
	for (const value of candidates) {
		const numeric = Number(value);
		if (Number.isFinite(numeric) && numeric > 0) return numeric;
	}
	return fallback;
}

function resolveAnnotationMessage(annotation) {
	const candidates = [annotation?.comment, annotation?.text, annotation?.body, annotation?.message];
	for (const value of candidates) {
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed) return trimmed;
		}
	}
	return '';
}

function getCategoryStyle(key) {
	return COMMENT_CATEGORIES[key] || COMMENT_CATEGORIES.comentarios;
}

function prepareAnnotations(annotations) {
	if (!Array.isArray(annotations)) return [];
	const ordered = annotations
		.map((ann, index) => ({ ...ann, index }))
		.sort((a, b) => {
			if (a.page !== b.page) return a.page - b.page;
			if (a.number !== b.number) return a.number - b.number;
			return a.index - b.index;
		});
	return ordered;
}

function drawHeroHeader({
	page,
	fonts,
	studentName,
	heroMeta,
	theme,
	finalScore,
	finalSuffix,
	modelLabel,
	deliveredAt,
	avatarImage,
	studentInitials,
	professorName,
	brandMark,
}) {
	const pageHeight = page.getHeight();
	const cardWidth = A4.width - MARGIN * 2;
	const cardHeight = HERO.height;
	const cardTop = pageHeight - MARGIN;
	const cardBottom = drawCardContainer(page, {
		x: MARGIN,
		yTop: cardTop,
		width: cardWidth,
		height: cardHeight,
		radius: HERO.radius,
	});
	const cardX = MARGIN;

	const accentHeight = 22;
	if (accentHeight > 0) {
		drawRoundedRect(page, {
			x: cardX,
			y: cardBottom + cardHeight - accentHeight,
			width: cardWidth,
			height: accentHeight,
			radius: HERO.radius,
			fill: colorFromHex(HEX.brandPastel),
			strokeWidth: 0,
		});
	}

	const brandX = cardX + HERO.padX;
	const brandY = cardBottom + cardHeight - HERO.padY - BRAND.ICON;
	drawRoundedRect(page, {
		x: brandX,
		y: brandY,
		width: BRAND.ICON,
		height: BRAND.ICON,
		radius: BRAND.ICON / 2,
		fill: colorFromHex(HEX.brand),
	});

	if (brandMark) {
		page.drawImage(brandMark, {
			x: brandX + 4,
			y: brandY + 4,
			width: BRAND.ICON - 8,
			height: BRAND.ICON - 8,
		});
	} else {
		const fallbackLabel = 'PY';
		const brandFontSize = 14;
		const labelWidth = fonts.bold.widthOfTextAtSize(fallbackLabel, brandFontSize);
		page.drawText(fallbackLabel, {
			x: brandX + (BRAND.ICON - labelWidth) / 2,
			y: brandY + (BRAND.ICON - brandFontSize) / 2,
			size: brandFontSize,
			font: fonts.bold,
			color: colorFromHex('#FFFFFF'),
		});
	}

	const scoreX = cardX + cardWidth - SCORE_CARD.width - HERO.padX;
	const contentTop = cardBottom + cardHeight - HERO.padY;
	const centerStart = brandX + BRAND.ICON + HERO.gap;
	const centerWidth = Math.max(0, scoreX - centerStart - HERO.gap);
	const canShowAvatar = Boolean(avatarImage) && centerWidth > AVATAR.size + 60;
	const avatarSlot = canShowAvatar ? AVATAR.size : 0;
	const avatarGap = canShowAvatar ? 14 : 0;
	const textMaxWidth = Math.max(120, centerWidth - avatarSlot - avatarGap);
	const textStart = centerStart + avatarSlot + avatarGap;

	if (canShowAvatar && avatarImage) {
		const avatarX = centerStart;
		const avatarY = cardBottom + (cardHeight - AVATAR.size) / 2;
		drawRoundedRect(page, {
			x: avatarX,
			y: avatarY,
			width: AVATAR.size,
			height: AVATAR.size,
			radius: AVATAR.size / 2,
			fill: blendHex(HEX.brand, '#FFFFFF', 0.2),
		});
		page.drawImage(avatarImage, {
			x: avatarX + 2,
			y: avatarY + 2,
			width: AVATAR.size - 4,
			height: AVATAR.size - 4,
		});
	} else {
		const placeholderSize = AVATAR.size;
		const placeholderX = centerStart;
		const placeholderY = cardBottom + (cardHeight - placeholderSize) / 2;
		drawRoundedRect(page, {
			x: placeholderX,
			y: placeholderY,
			width: placeholderSize,
			height: placeholderSize,
			radius: placeholderSize / 2,
			fill: blendHex(HEX.brand, '#FFFFFF', 0.65),
		});
		const initialsWidth = fonts.bold.widthOfTextAtSize(studentInitials || 'A', 11);
		page.drawText(studentInitials || 'A', {
			x: placeholderX + (placeholderSize - initialsWidth) / 2,
			y: placeholderY + (placeholderSize - 11) / 2,
			size: 11,
			font: fonts.bold,
			color: colorFromHex(HEX.brandDark),
		});
	}

	const professorLabel = professorName || 'Professor Yago Sales';
	const labelY = contentTop - PDF_FONT.sm;
	page.drawText(professorLabel, {
		x: textStart,
		y: labelY,
		size: PDF_FONT.sm,
		font: fonts.bold,
		color: colorFromHex(TEXT_SUBTLE),
	});

	const displayName = ellipsize(studentName || 'Aluno', 42);
	const nameY = labelY - 6 - PDF_FONT.lg;
	page.drawText(displayName, {
		x: textStart,
		y: nameY,
		size: PDF_FONT.lg,
		font: fonts.bold,
		color: colorFromHex(TEXT),
	});

	let textCursor = nameY - (PDF_FONT.md + 6);
	if (heroMeta) {
		const metaLines = wrapText(heroMeta, fonts.regular, PDF_FONT.sm, textMaxWidth);
		metaLines.forEach((line) => {
			page.drawText(line, {
				x: textStart,
				y: textCursor,
				size: PDF_FONT.sm,
				font: fonts.regular,
				color: colorFromHex(TEXT_SUBTLE),
			});
			textCursor -= PDF_FONT.sm + 4;
		});
	}

	const themeLines = wrapText(`Tema: ${theme || 'Tema não informado'}`, fonts.regular, PDF_FONT.sm, textMaxWidth);
	themeLines.forEach((line) => {
		page.drawText(line, {
			x: textStart,
			y: textCursor,
			size: PDF_FONT.sm,
			font: fonts.regular,
			color: colorFromHex(TEXT_SUBTLE),
		});
		textCursor -= PDF_FONT.sm + 3;
	});

	const totalLabel = modelLabel === 'PAS/UnB' ? 'TOTAL PAS' : 'TOTAL ENEM';
	const valueText = finalScore || '--';
	const suffixText = finalSuffix || (modelLabel === 'PAS/UnB' ? '/10' : '/1000');
	const scoreY = cardBottom + (cardHeight - SCORE_CARD.height) / 2;

	drawRoundedRect(page, {
		x: scoreX,
		y: scoreY,
		width: SCORE_CARD.width,
		height: SCORE_CARD.height,
		radius: SCORE_CARD.radius,
		fill: colorFromHex('#FFFFFF'),
		stroke: colorFromHex(HEX.brandPastel),
		strokeWidth: 1,
	});

	const labelWidth = fonts.bold.widthOfTextAtSize(totalLabel, PDF_FONT.sm);
	page.drawText(totalLabel, {
		x: scoreX + SCORE_CARD.width - SCORE_CARD.pad - labelWidth,
		y: scoreY + SCORE_CARD.height - SCORE_CARD.pad - PDF_FONT.sm,
		size: PDF_FONT.sm,
		font: fonts.bold,
		color: colorFromHex(HEX.brand),
	});

	const valueSize = PDF_FONT.lg + 6;
	const suffixSize = PDF_FONT.md;
	const suffixGap = 4;
	const valueWidth = fonts.bold.widthOfTextAtSize(valueText, valueSize);
	const suffixWidth = fonts.bold.widthOfTextAtSize(suffixText, suffixSize);
	const valueX = scoreX + SCORE_CARD.width - SCORE_CARD.pad - (valueWidth + suffixGap + suffixWidth);
	const valueY = scoreY + SCORE_CARD.pad + 4;

	page.drawText(valueText, {
		x: valueX,
		y: valueY,
		size: valueSize,
		font: fonts.bold,
		color: colorFromHex(HEX.brandDark),
	});

	page.drawText(suffixText, {
		x: valueX + valueWidth + suffixGap,
		y: valueY + (valueSize - suffixSize) / 2,
		size: suffixSize,
		font: fonts.bold,
		color: colorFromHex(TEXT_SUBTLE),
	});

	const modelUpper = (modelLabel || '-').toUpperCase();
	const modelWidth = fonts.bold.widthOfTextAtSize(modelUpper, PDF_FONT.sm);
	page.drawText(modelUpper, {
		x: scoreX + SCORE_CARD.width - SCORE_CARD.pad - modelWidth,
		y: scoreY + SCORE_CARD.pad,
		size: PDF_FONT.sm,
		font: fonts.bold,
		color: colorFromHex(TEXT_SUBTLE),
	});

	if (deliveredAt) {
		page.drawText(`Entregue em ${deliveredAt}`, {
			x: textStart,
			y: cardBottom + HERO.padY,
			size: PDF_FONT.sm,
			font: fonts.regular,
			color: colorFromHex(TEXT_SUBTLE),
		});
	}

	return cardBottom - CONTENT_GAP;
}


function drawCommentsColumn({
	page,
	fonts,
	area,
	annotations,
	startIndex = 0,
	title,
}) {
	const { x, top, bottom, width } = area;
	let cursor = top;
	if (title) {
		page.drawText(title, {
			x,
			y: cursor,
			size: COMMENT.titleSize,
			font: fonts.bold,
			color: colorFromHex(HEX.text),
		});
		cursor -= COMMENT.titleSize + 10;
	}

	const totalAnnotations = annotations.length;
	if (totalAnnotations <= startIndex) {
		if (startIndex === 0) {
			const baseline = Math.max(bottom, cursor - COMMENT.textSize);
			page.drawText('Sem comentários nesta página.', {
				x,
				y: baseline,
				size: COMMENT.textSize,
				font: fonts.regular,
				color: colorFromHex(HEX.textMuted),
			});
		}
		return totalAnnotations;
	}

	const innerWidth = Math.max(12, width - COMMENT.padding * 2);
	let index = startIndex;
	let drewAny = false;

	while (index < totalAnnotations) {
		const ann = annotations[index];
		const style = getCategoryStyle(ann.category);
		const cardPadding = COMMENT.padding;
		const bodyText = resolveAnnotationMessage(ann) || 'Sem comentário.';
		let textLines = wrapText(bodyText, fonts.regular, COMMENT.textSize, innerWidth);
		if (!textLines.length) textLines = ['Sem comentário.'];

		if (textLines.length > COMMENT.maxLines) {
			const clipped = textLines.slice(0, COMMENT.maxLines);
			const last = clipped[clipped.length - 1] || '';
			clipped[clipped.length - 1] = truncateText(last.endsWith('…') ? last : `${last} …`, fonts.regular, COMMENT.textSize, innerWidth);
			textLines = clipped;
		}

		const textBlockHeight = textLines.length * COMMENT.textSize + Math.max(0, textLines.length - 1) * COMMENT.lineGap;
		const headerHeight = Math.max(COMMENT.circleSize, COMMENT.categorySize) + 4;
		const cardHeight = cardPadding * 2 + headerHeight + textBlockHeight;
		if (cursor - cardHeight < bottom) {
			if (drewAny) break;
			if (cursor <= bottom) break;
		}

		const cardTop = cursor;
		const cardBottom = Math.max(bottom, cardTop - cardHeight);
		const fillColor = blendHex(style.hex, '#FFFFFF', 0.85);
		const borderColor = blendHex(style.hex, '#FFFFFF', 0.55);
		drawRoundedRect(page, {
			x,
			y: cardBottom,
			width,
			height: cardTop - cardBottom,
			radius: 14,
			fill: fillColor,
			stroke: borderColor,
			strokeWidth: 1,
		});

		const circleRadius = COMMENT.circleSize / 2;
		const circleCenterX = x + cardPadding + circleRadius;
		const circleCenterY = cardTop - cardPadding - circleRadius;
		page.drawCircle({
			x: circleCenterX,
			y: circleCenterY,
			size: circleRadius,
			color: colorFromHex('#FFFFFF'),
			borderColor: colorFromHex(style.hex),
			borderWidth: 1,
		});
		const numberLabel = String(resolveAnnotationNumber(ann, index + 1));
		const numberWidth = fonts.bold.widthOfTextAtSize(numberLabel, COMMENT.numberSize);
		const numberHeight = fonts.bold.heightAtSize(COMMENT.numberSize);
		page.drawText(numberLabel, {
			x: circleCenterX - numberWidth / 2,
			y: circleCenterY - numberHeight / 2,
			size: COMMENT.numberSize,
			font: fonts.bold,
			color: colorFromHex(style.hex),
		});

		const titleX = x + cardPadding + COMMENT.circleSize + 6;
		const titleY = cardTop - cardPadding - COMMENT.categorySize;
		const categoryLabel = style.label;
		page.drawText(categoryLabel, {
			x: titleX,
			y: titleY,
			size: COMMENT.categorySize,
			font: fonts.bold,
			color: colorFromHex('#0F172A'),
		});
		if (ann.page > 1) {
			const pageLabel = `Página ${ann.page}`;
			const pageWidth = fonts.regular.widthOfTextAtSize(pageLabel, COMMENT.textSize);
			page.drawText(pageLabel, {
				x: x + width - cardPadding - pageWidth,
				y: titleY,
				size: COMMENT.textSize,
				font: fonts.regular,
				color: colorFromHex(HEX.textMuted),
			});
		}

		let textY = titleY - COMMENT.categorySize - 4;
		for (let i = 0; i < textLines.length; i += 1) {
			const line = textLines[i];
			const nextY = textY - COMMENT.textSize;
			if (nextY < cardBottom + cardPadding) break;
			page.drawText(line, {
				x: x + cardPadding,
				y: nextY,
				size: COMMENT.textSize,
				font: fonts.regular,
				color: colorFromHex('#0F172A'),
			});
			textY = nextY - COMMENT.lineGap;
		}

		cursor = cardBottom - COMMENT.cardGap;
		index += 1;
		drewAny = true;
		if (cursor <= bottom) break;
	}

	return index;
}

/**
 * Desenha a seção "Notas da turma" na coluna principal (lado esquerdo).
 * Esta função tenta extrair uma lista de estudantes de `classInfo.students` e
 * desenha uma tabela simples com Foto, Nº, Aluno e colunas de bimestres.
 * Retorna o novo cursor (y) após desenhar a seção.
 */
function drawClassGradesSection(page, fonts, x, yTop, width, classInfo = {}, currentStudent = null, annotations = []) {
	let cursor = yTop;
	const headerSize = TITLE_SIZE;
	const subtitleSize = BODY_SIZE - 1;
	const headerColor = colorFromHex(TEXT);
	const subtitleColor = colorFromHex(TEXT_SUBTLE);

	// Section title
	page.drawText('Notas da turma', {
		x,
		y: cursor,
		size: headerSize,
		font: fonts.bold,
		color: headerColor,
	});
	cursor -= headerSize + SPACING.title;

	const classLabel = resolveClassLabel(classInfo) || classInfo?.name || null;
	const disciplineLabel = classInfo?.discipline || classInfo?.subject || null;
	const bimester = classInfo?.bimester || classInfo?.bimestre || classInfo?.term || null;
	const subtitleParts = [classLabel, disciplineLabel, bimester].filter(Boolean);
	if (subtitleParts.length) {
		page.drawText(subtitleParts.join(' • '), {
			x,
			y: cursor,
			size: subtitleSize,
			font: fonts.regular,
			color: subtitleColor,
		});
		cursor -= subtitleSize + SPACING.subtitle;
	}

	// Prepare table data
	const students = Array.isArray(classInfo?.students) && classInfo.students.length
		? classInfo.students
		: (currentStudent ? [currentStudent] : []);
	const headers = ['Foto', 'Nº', 'Aluno'];
	let bimCount = 0;
	if (Array.isArray(classInfo?.bimesters) && classInfo.bimesters.length) {
		bimCount = classInfo.bimesters.length;
	} else if (Number.isFinite(classInfo?.bimesterCount)) {
		bimCount = Number(classInfo.bimesterCount) || 0;
	} else if (students.some((st) => Array.isArray(st?.grades) && st.grades.length)) {
		bimCount = students.reduce((max, st) => Math.max(max, Array.isArray(st?.grades) ? st.grades.length : 0), 0);
	}
	bimCount = Math.max(1, bimCount);
	const bimHeaders = Array.from({ length: bimCount }, (_, index) => `${index + 1}º Bimestre`);

	const tableTop = cursor;
	const tableHeight = CLASS_TABLE.headerHeight
		+ (students.length ? students.length * CLASS_TABLE.rowHeight + Math.max(0, students.length - 1) * SPACING.tableRowGap : CLASS_TABLE.rowHeight);
	const tableBottom = tableTop - tableHeight;

	// Table container
	drawRoundedRect(page, {
		x,
		y: tableBottom,
		width,
		height: tableHeight,
		radius: CLASS_TABLE.borderRadius,
		fill: colorFromHex('#FFFFFF'),
		stroke: colorFromHex('#E2E8F0'),
		strokeWidth: 1,
	});

	// Table header background
	const headerBottom = tableTop - CLASS_TABLE.headerHeight;
	drawRoundedRect(page, {
		x,
		y: headerBottom,
		width,
		height: CLASS_TABLE.headerHeight,
		radius: CLASS_TABLE.borderRadius,
		fill: colorFromHex('#F8FAFC'),
		strokeWidth: 0,
	});

	const headerTextY = headerBottom + CLASS_TABLE.headerHeight / 2 + (subtitleSize / 2) - 1;
	const photoColWidth = CLASS_TABLE.avatarSize + CLASS_TABLE.paddingX * 1.5;
	const numberColWidth = 32;
	const bimColWidth = 54;
	const totalBimWidth = bimCount * bimColWidth;
	const remaining = width - (photoColWidth + numberColWidth + totalBimWidth + CLASS_TABLE.paddingX * 2 + SPACING.tableRowGap * (2 + bimCount));
	const nameColWidth = Math.max(120, remaining);

	let headerX = x + CLASS_TABLE.paddingX;
	page.drawText(headers[0], {
		x: headerX,
		y: headerTextY,
		size: subtitleSize,
		font: fonts.bold,
		color: subtitleColor,
	});
	headerX += photoColWidth + SPACING.tableRowGap;
	page.drawText(headers[1], {
		x: headerX,
		y: headerTextY,
		size: subtitleSize,
		font: fonts.bold,
		color: subtitleColor,
	});
	headerX += numberColWidth + SPACING.tableRowGap;
	page.drawText(headers[2], {
		x: headerX,
		y: headerTextY,
		size: subtitleSize,
		font: fonts.bold,
		color: subtitleColor,
	});

	let bimHeaderX = x + width - CLASS_TABLE.paddingX - totalBimWidth;
	bimHeaders.forEach((label) => {
		const labelWidth = fonts.bold.widthOfTextAtSize(label, subtitleSize);
		page.drawText(label, {
			x: bimHeaderX + (bimColWidth - labelWidth) / 2,
			y: headerTextY,
			size: subtitleSize,
			font: fonts.bold,
			color: subtitleColor,
		});
		bimHeaderX += bimColWidth;
	});

	let rowTop = headerBottom - SPACING.tableRowGap;
	const avatarRadius = CLASS_TABLE.avatarSize / 2;
	const rowFontSize = BODY_SIZE - 1;

	students.forEach((studentItem, index) => {
		const rowBottom = rowTop - CLASS_TABLE.rowHeight;
		const rowY = rowBottom + CLASS_TABLE.rowHeight / 2 + rowFontSize / 2 - 2;

		drawRoundedRect(page, {
			x,
			y: rowBottom,
			width,
			height: CLASS_TABLE.rowHeight,
			radius: 8,
			fill: colorFromHex(index % 2 === 0 ? '#FFFFFF' : '#F9FAFB'),
			strokeWidth: 0,
		});

		const avatarX = x + CLASS_TABLE.paddingX;
		const avatarY = rowBottom + (CLASS_TABLE.rowHeight - CLASS_TABLE.avatarSize) / 2;
	drawRoundedRect(page, {
			x: avatarX,
			y: avatarY,
			width: CLASS_TABLE.avatarSize,
			height: CLASS_TABLE.avatarSize,
			radius: avatarRadius,
			fill: blendHex(HEX.brand, HEX.brandPastel, 0.4),
		});
		const initials = ((studentItem?.name || currentStudent?.name || '')
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((piece) => piece[0]?.toUpperCase() ?? '')
			.join('')) || 'A';
		const initialsWidth = fonts.bold.widthOfTextAtSize(initials, 10);
		page.drawText(initials, {
			x: avatarX + (CLASS_TABLE.avatarSize - initialsWidth) / 2,
			y: avatarY + (CLASS_TABLE.avatarSize - 10) / 2,
			size: 10,
			font: fonts.bold,
			color: colorFromHex(HEX.brandDark),
		});

		let cellX = avatarX + CLASS_TABLE.avatarSize + SPACING.tableRowGap;
		const orderLabel = String(
			studentItem?.number || studentItem?.nr || studentItem?.order || index + 1,
		);
		page.drawText(orderLabel, {
			x: cellX,
			y: rowY,
			size: rowFontSize,
			font: fonts.regular,
			color: headerColor,
		});

		cellX += numberColWidth + SPACING.tableRowGap;
		const nameMaxWidth = nameColWidth - CLASS_TABLE.colGap;
		const displayName = truncateText(
			studentItem?.name || currentStudent?.name || 'Aluno',
			fonts.regular,
			rowFontSize,
			nameMaxWidth,
		);
		page.drawText(displayName, {
			x: cellX,
			y: rowY,
			size: rowFontSize,
			font: fonts.regular,
			color: headerColor,
		});

		let gradeX = x + width - CLASS_TABLE.paddingX - totalBimWidth;
		for (let i = 0; i < bimCount; i += 1) {
			const gradeValue = Array.isArray(studentItem?.grades) && studentItem.grades[i] != null
				? studentItem.grades[i]
				: studentItem?.[`bim${i + 1}`];
			const gradeLabel = gradeValue != null && gradeValue !== ''
				? String(gradeValue)
				: '—';
			const gradeWidth = fonts.bold.widthOfTextAtSize(gradeLabel, rowFontSize);
			page.drawText(gradeLabel, {
				x: gradeX + (bimColWidth - gradeWidth) / 2,
				y: rowY,
				size: rowFontSize,
				font: fonts.bold,
				color: headerColor,
			});
			gradeX += bimColWidth;
		}

		rowTop = rowBottom - SPACING.tableRowGap;
	});

	if (!students.length) {
		const emptyText = 'Sem dados de notas disponíveis.';
		const emptyWidth = fonts.regular.widthOfTextAtSize(emptyText, rowFontSize);
		page.drawText(emptyText, {
			x: x + (width - emptyWidth) / 2,
			y: headerBottom - CLASS_TABLE.rowHeight / 2,
			size: rowFontSize,
			font: fonts.regular,
			color: subtitleColor,
		});
	}

	const highlightArea = {
		x: x + CLASS_TABLE.paddingX * 0.5,
		y: tableBottom + CLASS_TABLE.paddingY * 0.5,
		width: width - CLASS_TABLE.paddingX,
		height: tableHeight - CLASS_TABLE.paddingY,
	};
	drawAnnotationHighlights(page, fonts, highlightArea, annotations);

	return tableBottom - SPACING.section;
}

function drawAnnotationHighlights(page, fonts, area, annotations) {
	if (!annotations || !annotations.length) return;
	const labelFontSize = CLASS_TABLE.badgeFont;
	const badgeSize = CLASS_TABLE.badgeSize;
	const badgeRadius = badgeSize / 2;
	const baseOffset = 4;
	annotations.forEach((annotation, annotationIndex) => {
		if (!Array.isArray(annotation?.rects)) return;
		const style = getCategoryStyle(annotation.category);
		const color = colorFromHex(style.hex);
		const label = String(resolveAnnotationNumber(annotation, annotationIndex + 1));
		annotation.rects.forEach((rect) => {
			const width = clamp(rect.w ?? rect.width ?? 0, 0, 1) * area.width;
			const height = clamp(rect.h ?? rect.height ?? 0, 0, 1) * area.height;
			const posX = area.x + clamp(rect.x ?? 0, 0, 1) * area.width;
			const posY = area.y + (area.height - clamp((rect.y ?? 0) + (rect.h ?? rect.height ?? 0), 0, 1) * area.height);
			if (width <= 0 || height <= 0) return;

			page.drawRectangle({
				x: posX,
				y: posY,
				width,
				height,
				color,
				opacity: HIGHLIGHT_FILL_OPACITY,
				borderColor: color,
				borderOpacity: HIGHLIGHT_BORDER_OPACITY,
				borderWidth: 1,
			});

			const badgeX = posX + baseOffset;
			const badgeY = posY + height - badgeSize - baseOffset;
			page.drawCircle({
				x: badgeX + badgeRadius,
				y: badgeY + badgeRadius,
				size: badgeRadius,
				color: colorFromHex('#FFFFFF'),
				borderColor: color,
				borderWidth: 1,
			});

			const labelWidth = fonts.bold.widthOfTextAtSize(label, labelFontSize);
			const labelHeight = fonts.bold.heightAtSize(labelFontSize);
			page.drawText(label, {
				x: badgeX + badgeRadius - labelWidth / 2,
				y: badgeY + badgeRadius - labelHeight / 2,
				size: labelFontSize,
				font: fonts.bold,
				color,
			});
		});
	});
}

function estimateEssayPreviewHeight(width) {
	if (!width || width <= 0) return 0;
	const titleHeight = TITLE_SIZE + SPACING.title;
	const subtitleHeight = DOCUMENT_PREVIEW.subtitleSize + SPACING.subtitle;
	const docWidth = Math.max(120, width - DOCUMENT_PREVIEW.padding * 2);
	const docHeight = docWidth * DOCUMENT_PREVIEW.aspectRatio;
	const cardHeight = DOCUMENT_PREVIEW.padding * 2
		+ docHeight
		+ DOCUMENT_PREVIEW.footerGap
		+ DOCUMENT_PREVIEW.footerSize;
	return titleHeight + subtitleHeight + cardHeight;
}

function drawEssayPreviewSection(page, fonts, x, yTop, width, essay, annotations = []) {
	let cursor = yTop;
	page.drawText('Pré-visualização da redação', {
		x,
		y: cursor,
		size: TITLE_SIZE,
		font: fonts.bold,
		color: colorFromHex(TEXT),
	});
	cursor -= TITLE_SIZE + SPACING.title;

	page.drawText('Visualize a primeira página corrigida e os destaques das anotações.', {
		x,
		y: cursor,
		size: DOCUMENT_PREVIEW.subtitleSize,
		font: fonts.regular,
		color: colorFromHex(TEXT_SUBTLE),
	});
	cursor -= DOCUMENT_PREVIEW.subtitleSize + SPACING.subtitle;

	const cardWidth = width;
	const docWidth = Math.max(120, cardWidth - DOCUMENT_PREVIEW.padding * 2);
	const docHeight = docWidth * DOCUMENT_PREVIEW.aspectRatio;
	const cardHeight = DOCUMENT_PREVIEW.padding * 2
		+ docHeight
		+ DOCUMENT_PREVIEW.footerGap
		+ DOCUMENT_PREVIEW.footerSize;
	const cardTop = cursor;
	const cardBottom = cardTop - cardHeight;

	drawRoundedRect(page, {
		x,
		y: cardBottom,
		width: cardWidth,
		height: cardHeight,
		radius: DOCUMENT_PREVIEW.radius,
		fill: colorFromHex('#FFFFFF'),
		stroke: colorFromHex('#E2E8F0'),
		strokeWidth: 1,
	});

	const docX = x + DOCUMENT_PREVIEW.padding;
	const docTop = cardTop - DOCUMENT_PREVIEW.padding;
	const docBottom = docTop - docHeight;

	const shadowX = docX + DOCUMENT_PREVIEW.shadowOffset;
	const shadowY = docBottom - DOCUMENT_PREVIEW.shadowOffset;
	drawRoundedRect(page, {
		x: shadowX,
		y: shadowY,
		width: docWidth,
		height: docHeight,
		radius: DOCUMENT_PREVIEW.pageRadius,
		fill: colorFromHex('#0F172A'),
		opacity: DOCUMENT_PREVIEW.shadowOpacity,
	});

	drawRoundedRect(page, {
		x: docX,
		y: docBottom,
		width: docWidth,
		height: docHeight,
		radius: DOCUMENT_PREVIEW.pageRadius,
		fill: colorFromHex(DOCUMENT_PREVIEW.pageBackground),
		stroke: colorFromHex(DOCUMENT_PREVIEW.pageBorder),
		strokeWidth: 1,
	});

	const headerHeight = Math.min(DOCUMENT_PREVIEW.pageHeaderHeight, docHeight * 0.25);
	page.drawRectangle({
		x: docX,
		y: docTop - headerHeight,
		width: docWidth,
		height: headerHeight,
		color: colorFromHex(DOCUMENT_PREVIEW.pageHeaderColor),
	});

	const headerBadgeWidth = 70;
	const headerBadgeHeight = 18;
	const headerBadgeBottom = docTop - headerHeight + (headerHeight - headerBadgeHeight) / 2;
	const badgeX = docX + docWidth - DOCUMENT_PREVIEW.pagePadding - headerBadgeWidth;
	drawRoundedRect(page, {
		x: badgeX,
		y: headerBadgeBottom,
		width: headerBadgeWidth,
		height: headerBadgeHeight,
		radius: headerBadgeHeight / 2,
		fill: colorFromHex('#E2E8F0'),
	});
	const badgeLabel = '1ª página';
	const badgeFontSize = BODY_SIZE - 1;
	const badgeLabelWidth = fonts.bold.widthOfTextAtSize(badgeLabel, badgeFontSize);
	const badgeLabelHeight = fonts.bold.heightAtSize(badgeFontSize);
	page.drawText(badgeLabel, {
		x: badgeX + (headerBadgeWidth - badgeLabelWidth) / 2,
		y: headerBadgeBottom + (headerBadgeHeight - badgeLabelHeight) / 2,
		size: badgeFontSize,
		font: fonts.bold,
		color: colorFromHex(TEXT_SUBTLE),
	});

	const textAreaLeft = docX + DOCUMENT_PREVIEW.pagePadding;
	const textAreaRight = docX + docWidth - DOCUMENT_PREVIEW.pagePadding;
	let lineY = docTop - headerHeight - DOCUMENT_PREVIEW.pagePadding;
	const minContentY = docBottom + DOCUMENT_PREVIEW.pagePadding;
	let variation = 0;
	while (lineY > minContentY) {
		const fullWidth = textAreaRight - textAreaLeft;
		const variance = variation % 3;
		const reduction = variance === 2 ? fullWidth * 0.35 : variance === 1 ? fullWidth * 0.18 : 0;
		const endX = textAreaRight - reduction;
		page.drawLine({
			start: { x: textAreaLeft, y: lineY },
			end: { x: endX, y: lineY },
			color: colorFromHex(DOCUMENT_PREVIEW.lineColor),
			thickness: DOCUMENT_PREVIEW.lineThickness,
			opacity: 0.85,
		});
		lineY -= DOCUMENT_PREVIEW.lineGap;
		variation += 1;
	}

	const highlightsArea = {
		x: docX,
		y: docBottom,
		width: docWidth,
		height: docHeight,
	};
	drawAnnotationHighlights(page, fonts, highlightsArea, annotations);

	const highlightsCount = Array.isArray(annotations) ? annotations.length : 0;
	const highlightsLabel = highlightsCount
		? `${highlightsCount} anotação${highlightsCount > 1 ? 's' : ''} destacada${highlightsCount > 1 ? 's' : ''}`
		: 'Sem anotações destacadas';
	const footerText = `Prévia ilustrativa • ${highlightsLabel}`;
	const footerY = docBottom - DOCUMENT_PREVIEW.footerGap;
	page.drawText(footerText, {
		x: x + DOCUMENT_PREVIEW.padding,
		y: footerY,
		size: DOCUMENT_PREVIEW.footerSize,
		font: fonts.regular,
		color: colorFromHex(TEXT_SUBTLE),
	});

	return cardBottom - SPACING.section;
}

function estimateClassGradesHeight(classInfo = {}, currentStudent = null) {
	const hasClass = Boolean(resolveClassLabel(classInfo) || classInfo?.name);
	const hasDiscipline = Boolean(classInfo?.discipline || classInfo?.subject);
	const hasBimester = Boolean(classInfo?.bimester || classInfo?.bimestre || classInfo?.term);
	const hasSubtitle = hasClass || hasDiscipline || hasBimester;
	let rowCount = 0;
	if (Array.isArray(classInfo?.students) && classInfo.students.length) {
		rowCount = classInfo.students.length;
	} else if (currentStudent) {
		rowCount = 1;
	}
	rowCount = Math.max(1, rowCount);
	let total = 0;
	total += TITLE_SIZE + SPACING.title;
	if (hasSubtitle) {
		total += (BODY_SIZE - 1) + SPACING.subtitle;
	}
	total += CLASS_TABLE.headerHeight;
	total += rowCount * CLASS_TABLE.rowHeight + (rowCount - 1) * SPACING.tableRowGap;
	total += SPACING.section;
	return total;
}

function formatEnemPoints(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return '0';
	const normalized = Math.max(0, numeric);
	return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

function buildEnemCompetencyLayout(width, index, title, level, points, justification, reasons, fonts, colors) {
	const innerWidth = width - CARD_FRAME.paddingX * 2;
	const operations = [];
	const roman = ['I', 'II', 'III', 'IV', 'V'][index] || String(index + 1);
	const headerColor = colors?.title || TEXT;
	const strongColor = colors?.strong || TEXT;
	operations.push({
		text: `Competência ${roman} — ${title}`,
		font: 'bold',
		size: TITLE_SIZE,
		color: headerColor,
		gapAfter: LINE_GAP,
	});

	const clampedLevel = clampLevel(level);
	const pointsLabel = formatEnemPoints(points);
	operations.push({
		text: '',
		font: 'regular',
		size: BODY_SIZE,
		color: TEXT,
		gapAfter: LINE_GAP,
		rich: [
			{ text: 'Nível: ', font: 'regular', color: TEXT_SUBTLE },
			{ text: String(clampedLevel), font: 'bold', color: strongColor },
			{ text: ' · Pontuação: ', font: 'regular', color: TEXT_SUBTLE },
			{ text: pointsLabel, font: 'bold', color: strongColor },
			{ text: ' pts', font: 'regular', color: TEXT_SUBTLE },
		],
	});

	const trimmedJustification = typeof justification === 'string' ? justification.trim() : '';
	if (trimmedJustification) {
		operations.push({
			text: 'Justificativa',
			font: 'bold',
			size: BODY_SIZE,
			color: TEXT,
			gapAfter: LINE_GAP,
		});
		const lines = wrapText(trimmedJustification, fonts.regular, BODY_SIZE, innerWidth);
		lines.forEach((line, indexLine) => {
			operations.push({
				text: line,
				font: 'regular',
				size: BODY_SIZE,
				color: TEXT,
				gapAfter: indexLine === lines.length - 1 ? 0 : LINE_GAP,
			});
		});
	} else {
		const validReasons = Array.isArray(reasons)
			? reasons
				.map((reason) => (typeof reason === 'string' ? reason.trim() : ''))
				.filter((reason) => reason.length > 0)
			: [];
		if (validReasons.length) {
			operations.push({
				text: 'Justificativas',
				font: 'bold',
				size: BODY_SIZE,
				color: TEXT,
				gapAfter: LINE_GAP,
			});
			validReasons.forEach((reason, reasonIndex) => {
				const wrapped = wrapText(reason, fonts.regular, BODY_SIZE, innerWidth - BULLET_INDENT);
				const lines = wrapped.length ? wrapped : [''];
				lines.forEach((line, lineIndex) => {
					const isFirstLine = lineIndex === 0;
					operations.push({
						text: isFirstLine ? `• ${line}` : line,
						font: 'regular',
						size: BODY_SIZE,
						color: TEXT,
						indent: isFirstLine ? 0 : BULLET_INDENT,
						gapAfter:
							reasonIndex === validReasons.length - 1 && lineIndex === lines.length - 1
								? 0
								: LINE_GAP,
					});
				});
			});
		} else {
			operations.push({
				text: 'Sem justificativas registradas.',
				font: 'regular',
				size: BODY_SIZE,
				color: TEXT_SUBTLE,
				gapAfter: 0,
			});
		}
	}

	const contentHeight = operations.reduce((sum, op) => sum + op.size + (op.gapAfter || 0), 0);
	const cardHeight = CARD_FRAME.paddingY * 2 + contentHeight;
	return { operations, cardHeight };
}

function drawEnemCompetencyCard(page, x, yTop, width, layout, fonts) {
	const { operations, cardHeight } = layout;
	const cardBottom = drawCardContainer(page, {
		x,
		yTop,
		width,
		height: cardHeight,
	});
	const innerX = x + CARD_FRAME.paddingX;
	let cursor = yTop - CARD_FRAME.paddingY;
	for (let i = 0; i < operations.length; i += 1) {
		const op = operations[i];
		cursor -= op.size;
		const baseY = cursor;
		let penX = innerX + (op.indent || 0);
		if (op.rich && op.rich.length) {
			op.rich.forEach((seg) => {
				const font = seg.font === 'bold' ? fonts.bold : fonts.regular;
				page.drawText(seg.text, {
					x: penX,
					y: baseY,
					size: op.size,
					font,
					color: colorFromHex(seg.color || op.color || TEXT),
				});
				penX += font.widthOfTextAtSize(seg.text, op.size);
			});
		} else {
			const font = op.font === 'bold' ? fonts.bold : fonts.regular;
			page.drawText(op.text, {
				x: penX,
				y: baseY,
				size: op.size,
				font,
				color: colorFromHex(op.color || TEXT),
			});
		}
		if (op.gapAfter) cursor -= op.gapAfter;
	}
	return cardBottom;
}

function drawTextSimple(page, text, x, y, size, font, colorHex = TEXT) {
	page.drawText(text, {
		x,
		y,
		size,
		font,
		color: colorFromHex(colorHex),
	});
}

function drawPasSummarySection(page, fonts, x, yTop, width, summary) {
	if (!summary) return yTop;
	const cards = [
		{ label: 'Total de linhas', value: summary.tl, decimals: 0 },
		{ label: 'Nota de conteúdo', value: summary.nc, decimals: 2 },
		{ label: 'Número de erros', value: summary.totalErros, decimals: 0 },
		{ label: 'Nota final prevista (NR)', value: summary.nr, decimals: 2, highlight: true },
	];
	const subtitleSize = BODY_SIZE - 1;
	const columns = SUMMARY_GRID.columns;
	const innerWidth = width - CARD_FRAME.paddingX * 2;
	const cardWidth = columns > 1
		? (innerWidth - (columns - 1) * SUMMARY_GRID.gapX) / columns
		: innerWidth;
	const rows = Math.ceil(cards.length / columns);
	const gridHeight = rows * SUMMARY_GRID.cardHeight + Math.max(0, rows - 1) * SUMMARY_GRID.gapY;
	const headerHeight = TITLE_SIZE + CARD_FRAME.headerGap + subtitleSize + CARD_FRAME.displayGap;
	const cardHeight = CARD_FRAME.paddingY * 2 + headerHeight + gridHeight;
	const cardBottom = drawCardContainer(page, {
		x,
		yTop,
		width,
		height: cardHeight,
	});
	const innerX = x + CARD_FRAME.paddingX;
	let cursor = yTop - CARD_FRAME.paddingY;

	cursor -= TITLE_SIZE;
	page.drawText('Resumo do espelho — PAS', {
		x: innerX,
		y: cursor,
		size: TITLE_SIZE,
		font: fonts.bold,
		color: colorFromHex(TEXT),
	});
	cursor -= CARD_FRAME.headerGap;

	cursor -= subtitleSize;
	page.drawText('Indicadores consolidados do desempenho.', {
		x: innerX,
		y: cursor,
		size: subtitleSize,
		font: fonts.regular,
		color: colorFromHex(TEXT_SUBTLE),
	});
	cursor -= CARD_FRAME.displayGap;

	const gridTop = cursor;
	cards.forEach((card, index) => {
		const row = Math.floor(index / columns);
		const col = index % columns;
		const cardX = innerX + col * (cardWidth + SUMMARY_GRID.gapX);
		const cardTop = gridTop - row * (SUMMARY_GRID.cardHeight + SUMMARY_GRID.gapY);
		const fillHex = card.highlight ? '#FFF7ED' : '#FFFFFF';
		const borderHex = card.highlight ? '#FDBA74' : CARD_FRAME.border;
		drawRoundedRect(page, {
			x: cardX,
			y: cardTop - SUMMARY_GRID.cardHeight,
			width: cardWidth,
			height: SUMMARY_GRID.cardHeight,
			radius: 12,
			fill: colorFromHex(fillHex),
			stroke: colorFromHex(borderHex),
			strokeWidth: 1,
		});

		const labelY = cardTop - SUMMARY_GRID.padY - SUMMARY_GRID.labelSize;
		page.drawText(card.label, {
			x: cardX + SUMMARY_GRID.padX,
			y: labelY,
			size: SUMMARY_GRID.labelSize,
			font: fonts.regular,
			color: colorFromHex('#475569'),
		});

		const formatted = formatPasValue(card.value, card.decimals);
		const valueY = labelY - SUMMARY_GRID.valueGap - SUMMARY_GRID.valueSize;
		page.drawText(formatted, {
			x: cardX + SUMMARY_GRID.padX,
			y: valueY,
			size: SUMMARY_GRID.valueSize,
			font: fonts.bold,
			color: colorFromHex(card.highlight ? '#B45309' : '#0F172A'),
		});
	});

	return cardBottom - SPACING.section;
}

function drawPasMacroSection(page, fonts, x, yTop, width, summary) {
	const rows = Array.isArray(summary?.macro) ? summary.macro : [];
	if (!rows.length) return yTop;
	const subtitleSize = BODY_SIZE - 1;
	const innerWidth = width - CARD_FRAME.paddingX * 2;
	const headerHeight = TITLE_SIZE + CARD_FRAME.headerGap + subtitleSize + CARD_FRAME.displayGap;
	const tableHeight = PAS_TABLE.headerHeight
		+ rows.length * PAS_TABLE.rowHeight
		+ Math.max(0, rows.length - 1) * PAS_TABLE.rowGap;
	const cardHeight = CARD_FRAME.paddingY * 2 + headerHeight + tableHeight;
	const cardBottom = drawCardContainer(page, {
		x,
		yTop,
		width,
		height: cardHeight,
	});
	const innerX = x + CARD_FRAME.paddingX;
	let cursor = yTop - CARD_FRAME.paddingY;

	cursor -= TITLE_SIZE;
	page.drawText('Aspectos macroestruturais', {
		x: innerX,
		y: cursor,
		size: TITLE_SIZE,
		font: fonts.bold,
		color: colorFromHex(TEXT),
	});
	cursor -= CARD_FRAME.headerGap;

	cursor -= subtitleSize;
	page.drawText('Critérios avaliados e respectivas notas.', {
		x: innerX,
		y: cursor,
		size: subtitleSize,
		font: fonts.regular,
		color: colorFromHex(TEXT_SUBTLE),
	});
	cursor -= CARD_FRAME.displayGap;

	const tableLeft = innerX;
	const tableWidth = innerWidth;
	let rowTop = cursor;
	const headerTop = rowTop;
	rowTop -= PAS_TABLE.headerHeight;
	drawPasRow(page, fonts, tableLeft, headerTop, PAS_TABLE.headerHeight, tableWidth, [
		{ text: 'Critério', ratio: 0.5, font: fonts.bold, color: TEXT },
		{ text: 'Faixa esperada', ratio: 0.25, font: fonts.bold, color: TEXT_SUBTLE, align: 'center' },
		{ text: 'Nota obtida', ratio: 0.25, font: fonts.bold, color: TEXT, align: 'right' },
	], {
		fill: '#F1F5F9',
		textSize: BODY_SIZE - 1,
		paddingX: 16,
		paddingY: 8,
		radius: 12,
	});
	rowTop -= PAS_TABLE.rowGap;

	rows.forEach((row, index) => {
		const currentTop = rowTop;
		rowTop -= PAS_TABLE.rowHeight;
		drawPasRow(page, fonts, tableLeft, currentTop, PAS_TABLE.rowHeight, tableWidth, [
			{ text: row.label, ratio: 0.5, font: fonts.regular, color: TEXT },
			{ text: `0,00 – ${row.max.toFixed(2)}`, ratio: 0.25, font: fonts.regular, color: '#1D4ED8', align: 'center' },
			{ text: `${row.value.toFixed(2)} / ${row.max.toFixed(2)}`, ratio: 0.25, font: fonts.bold, color: TEXT, align: 'right' },
		], {
			fill: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
			textSize: BODY_SIZE - 1,
			paddingX: 16,
			paddingY: 8,
			radius: 10,
		});
		if (index < rows.length - 1) rowTop -= PAS_TABLE.rowGap;
	});

	return cardBottom - SPACING.section;
}

function drawPasMicroSection(page, fonts, x, yTop, width, summary) {
	const rows = Array.isArray(summary?.micro) ? summary.micro : [];
	if (!rows.length) return yTop;
	const subtitleSize = BODY_SIZE - 1;
	const discountSize = BODY_SIZE - 1;
	const highlightHeight = BODY_SIZE + 12;
	const innerWidth = width - CARD_FRAME.paddingX * 2;
	const headerHeight = TITLE_SIZE + CARD_FRAME.headerGap + subtitleSize + CARD_FRAME.displayGap;
	const tableHeight = PAS_TABLE.headerHeight
		+ rows.length * PAS_TABLE.rowHeight
		+ Math.max(0, rows.length - 1) * PAS_TABLE.rowGap;
	const cardHeight = CARD_FRAME.paddingY * 2
		+ headerHeight
		+ tableHeight
		+ CARD_FRAME.displayGap
		+ discountSize
		+ CARD_FRAME.displayGap
		+ highlightHeight;
	const cardBottom = drawCardContainer(page, {
		x,
		yTop,
		width,
		height: cardHeight,
	});
	const innerX = x + CARD_FRAME.paddingX;
	let cursor = yTop - CARD_FRAME.paddingY;

	cursor -= TITLE_SIZE;
	page.drawText('Aspectos microestruturais (erros)', {
		x: innerX,
		y: cursor,
		size: TITLE_SIZE,
		font: fonts.bold,
		color: colorFromHex(TEXT),
	});
	cursor -= CARD_FRAME.headerGap;

	cursor -= subtitleSize;
	page.drawText('Erros identificados e descontos aplicados.', {
		x: innerX,
		y: cursor,
		size: subtitleSize,
		font: fonts.regular,
		color: colorFromHex(TEXT_SUBTLE),
	});
	cursor -= CARD_FRAME.displayGap;

	const tableLeft = innerX;
	const tableWidth = innerWidth;
	let headerTop = cursor;
	let currentTop = headerTop;
	currentTop -= PAS_TABLE.headerHeight;
	drawPasRow(page, fonts, tableLeft, headerTop, PAS_TABLE.headerHeight, tableWidth, [
		{ text: 'Tipo de erro', ratio: 0.7, font: fonts.bold, color: TEXT },
		{ text: 'Ocorrências', ratio: 0.3, font: fonts.bold, color: '#BE185D', align: 'right' },
	], {
		fill: '#FCE8F3',
		textSize: BODY_SIZE - 1,
		paddingX: 16,
		paddingY: 8,
		radius: 12,
	});
	currentTop -= PAS_TABLE.rowGap;

	rows.forEach((row, index) => {
		const rowTop = currentTop;
		currentTop -= PAS_TABLE.rowHeight;
		drawPasRow(page, fonts, tableLeft, rowTop, PAS_TABLE.rowHeight, tableWidth, [
			{ text: row.label, ratio: 0.7, font: fonts.regular, color: TEXT },
			{ text: String(row.value), ratio: 0.3, font: fonts.bold, color: '#BE185D', align: 'right' },
		], {
			fill: index % 2 === 0 ? '#FFFFFF' : '#FDF2F8',
			textSize: BODY_SIZE - 1,
			paddingX: 16,
			paddingY: 8,
			radius: 10,
		});
		if (index < rows.length - 1) currentTop -= PAS_TABLE.rowGap;
	});

	let footerCursor = currentTop - CARD_FRAME.displayGap;
	const discountLabel = summary.discount
		? `Desconto por erro: ${summary.discount.toFixed(3)} ponto(s)`
		: 'Desconto por erro: —';
	footerCursor -= discountSize;
	page.drawText(discountLabel, {
		x: innerX,
		y: footerCursor,
		size: discountSize,
		font: fonts.regular,
		color: colorFromHex(TEXT_SUBTLE),
	});

	footerCursor -= CARD_FRAME.displayGap;
	const highlightBottom = footerCursor - highlightHeight;
	drawRoundedRect(page, {
		x: innerX,
		y: highlightBottom,
		width: innerWidth,
		height: highlightHeight,
		radius: 12,
		fill: colorFromHex('#FFFBEB'),
		stroke: colorFromHex('#FCD34D'),
		strokeWidth: 1,
	});
	const nrLabel = `Nota final prevista (NR): ${summary.nr.toFixed(2)} / 10`;
	const nrLabelY = highlightBottom + (highlightHeight - BODY_SIZE) / 2;
	page.drawText(nrLabel, {
		x: innerX + 12,
		y: nrLabelY,
		size: BODY_SIZE,
		font: fonts.bold,
		color: colorFromHex('#B45309'),
	});

	return cardBottom - SPACING.section;
}

function drawPasRow(page, fonts, x, yTop, height, width, cells, options = {}) {
	const {
		fill = '#FFFFFF',
		border = CARD_FRAME.border,
		strokeWidth = 1,
		radius = PAS_TABLE.radius,
		textSize = BODY_SIZE - 1,
		paddingX = 12,
		paddingY = 8,
	} = options;
	const bottom = yTop - height;
	drawRoundedRect(page, {
		x,
		y: bottom,
		width,
		height,
		radius,
		fill: colorFromHex(fill),
		stroke: border ? colorFromHex(border) : undefined,
		strokeWidth: border ? strokeWidth : 0,
	});
	let offset = x;
	cells.forEach((cell) => {
		const cellRatio = cell.ratio != null ? cell.ratio : 1 / cells.length;
		const cellWidth = width * cellRatio;
		const align = cell.align || 'left';
		const font = cell.font || fonts.regular;
		const color = cell.color || TEXT;
		const innerHeight = Math.max(textSize, height - paddingY * 2);
		const textY = bottom + paddingY + (innerHeight - textSize) / 2;
		if (align === 'right') {
			const labelWidth = font.widthOfTextAtSize(cell.text, textSize);
			page.drawText(cell.text, {
				x: offset + cellWidth - paddingX - labelWidth,
				y: textY,
				size: textSize,
				font,
				color: colorFromHex(color),
			});
		} else if (align === 'center') {
			const labelWidth = font.widthOfTextAtSize(cell.text, textSize);
			page.drawText(cell.text, {
				x: offset + (cellWidth - labelWidth) / 2,
				y: textY,
				size: textSize,
				font,
				color: colorFromHex(color),
			});
		} else {
			page.drawText(cell.text, {
				x: offset + paddingX,
				y: textY,
				size: textSize,
				font,
				color: colorFromHex(color),
			});
		}
		offset += cellWidth;
	});
}

function formatPasValue(value, decimals = 0) {
	if (!Number.isFinite(value)) return '—';
	if (decimals <= 0) return String(Math.round(value));
	return value.toFixed(decimals);
}

function calculatePasSummaryHeight(summary) {
	if (!summary) return 0;
	const columns = SUMMARY_GRID.columns;
	const cardsCount = 4;
	const rows = Math.ceil(cardsCount / columns);
	const gridHeight = rows * SUMMARY_GRID.cardHeight + Math.max(0, rows - 1) * SUMMARY_GRID.gapY;
	const headerHeight = TITLE_SIZE + CARD_FRAME.headerGap + (BODY_SIZE - 1) + CARD_FRAME.displayGap;
	return CARD_FRAME.paddingY * 2 + headerHeight + gridHeight + SPACING.section;
}

function calculatePasMacroHeight(summary) {
	const rows = Array.isArray(summary?.macro) ? summary.macro.length : 0;
	if (!rows) return 0;
	const headerHeight = TITLE_SIZE + CARD_FRAME.headerGap + (BODY_SIZE - 1) + CARD_FRAME.displayGap;
	const tableHeight = PAS_TABLE.headerHeight
		+ rows * PAS_TABLE.rowHeight
		+ Math.max(0, rows - 1) * PAS_TABLE.rowGap;
	return CARD_FRAME.paddingY * 2 + headerHeight + tableHeight + SPACING.section;
}

function calculatePasMicroHeight(summary) {
	const rows = Array.isArray(summary?.micro) ? summary.micro.length : 0;
	if (!rows) return 0;
	const discountSize = BODY_SIZE - 1;
	const highlightHeight = BODY_SIZE + 12;
	const headerHeight = TITLE_SIZE + CARD_FRAME.headerGap + (BODY_SIZE - 1) + CARD_FRAME.displayGap;
	const tableHeight = PAS_TABLE.headerHeight
		+ rows * PAS_TABLE.rowHeight
		+ Math.max(0, rows - 1) * PAS_TABLE.rowGap;
	return CARD_FRAME.paddingY * 2
		+ headerHeight
		+ tableHeight
		+ CARD_FRAME.displayGap
		+ discountSize
		+ CARD_FRAME.displayGap
		+ highlightHeight
		+ SPACING.section;
}

function drawEnemSummarySection(page, fonts, x, yTop, width, summary) {
	if (!summary) return yTop;
	const competencies = Array.isArray(summary?.competencies) ? summary.competencies : [];
	const innerX = x + CARD_FRAME.paddingX;
	const innerWidth = width - CARD_FRAME.paddingX * 2;
	const highlightHeight = ENEM_SUMMARY_CARD.highlightHeight;
	const rowHeight = competencies.length ? ENEM_SUMMARY_CARD.rowHeight : 0;
	const cardHeight = CARD_FRAME.paddingY * 2
		+ TITLE_SIZE
		+ CARD_FRAME.headerGap
		+ highlightHeight
		+ (rowHeight ? CARD_FRAME.displayGap + rowHeight : 0);
	const cardBottom = drawCardContainer(page, {
		x,
		yTop,
		width,
		height: cardHeight,
	});
	let cursor = yTop - CARD_FRAME.paddingY;

	cursor -= TITLE_SIZE;
	page.drawText('ESPELHO DE CORREÇÃO — ENEM', {
		x: innerX,
		y: cursor,
		size: TITLE_SIZE,
		font: fonts.bold,
		color: colorFromHex(TEXT),
	});
	cursor -= CARD_FRAME.headerGap;

	const highlightTop = cursor;
	const highlightBottom = highlightTop - highlightHeight;
	drawRoundedRect(page, {
		x: innerX,
		y: highlightBottom,
		width: innerWidth,
		height: highlightHeight,
		radius: ENEM_SUMMARY_CARD.rowRadius,
		fill: colorFromHex('#FFFBEB'),
		stroke: colorFromHex('#FCD34D'),
		strokeWidth: 1,
	});
	const labelSize = SUMMARY_GRID.labelSize;
	const valueSize = SUMMARY_GRID.valueSize + 2;
	const labelY = highlightTop - SUMMARY_GRID.padY - labelSize;
	page.drawText('NOTA FINAL', {
		x: innerX + SUMMARY_GRID.padX,
		y: labelY,
		size: labelSize,
		font: fonts.bold,
		color: colorFromHex('#B45309'),
	});
	const totalValue = `${Math.max(0, Math.round(summary.total || 0))} / 1000`;
	const valueY = labelY - SUMMARY_GRID.valueGap - valueSize;
	page.drawText(totalValue, {
		x: innerX + SUMMARY_GRID.padX,
		y: valueY,
		size: valueSize,
		font: fonts.bold,
		color: colorFromHex('#0F172A'),
	});
	cursor = highlightBottom;

	if (rowHeight) {
		cursor -= CARD_FRAME.displayGap;
		const rowTop = cursor;
		const rowBottom = rowTop - rowHeight;
		drawRoundedRect(page, {
			x: innerX,
			y: rowBottom,
			width: innerWidth,
			height: rowHeight,
			radius: ENEM_SUMMARY_CARD.rowRadius,
			fill: colorFromHex(CARD_FRAME.mutedBackground),
			stroke: colorFromHex(CARD_FRAME.border),
			strokeWidth: 1,
		});
		const columns = competencies.length;
		const availableGap = ENEM_SUMMARY_CARD.columnGap * Math.max(columns - 1, 0);
		const columnWidth = (innerWidth - availableGap) / columns;
		const labelY = rowTop - ENEM_SUMMARY_CARD.rowPaddingY - ENEM_SUMMARY_CARD.columnLabelSize;
		const valueY = labelY - LINE_GAP - ENEM_SUMMARY_CARD.columnValueSize;
		for (let i = 0; i < columns; i += 1) {
			const comp = competencies[i] || {};
			const columnX = innerX + i * (columnWidth + ENEM_SUMMARY_CARD.columnGap);
			const levelLabel = clampLevel(comp.level);
			const colorKey = `C${i + 1}`;
			const palette = ENEM_COLORS_HEX[colorKey] || ENEM_COLORS_HEX.C1;
			const labelX = columnX + ENEM_SUMMARY_CARD.columnPaddingX;
			page.drawText(`C${i + 1}`, {
				x: labelX,
				y: labelY,
				size: ENEM_SUMMARY_CARD.columnLabelSize,
				font: fonts.bold,
				color: colorFromHex(TEXT_SUBTLE),
			});
			page.drawText(`Nível ${levelLabel}`, {
				x: labelX,
				y: valueY,
				size: ENEM_SUMMARY_CARD.columnValueSize,
				font: fonts.bold,
				color: colorFromHex(palette.title),
			});
		}
		cursor = rowBottom;
	}

	return cardBottom - SPACING.section;
}

function calculateEnemSummaryHeight(summary) {
	if (!summary) return 0;
	const hasCompetencies = Array.isArray(summary?.competencies) && summary.competencies.length > 0;
	let total = CARD_FRAME.paddingY * 2 + TITLE_SIZE + CARD_FRAME.headerGap + ENEM_SUMMARY_CARD.highlightHeight;
	if (hasCompetencies) {
		total += CARD_FRAME.displayGap + ENEM_SUMMARY_CARD.rowHeight;
	}
	return total + SPACING.section;
}

function buildAnnulmentLayout(fonts, width, score) {
	const selected = new Set(Array.isArray(score?.reasons) ? score.reasons.map(String) : []);
	const otherReason = typeof score?.otherReason === 'string' ? score.otherReason.trim() : '';
	const annulled = Boolean(score?.annulled || selected.size > 0);
	const innerWidth = width - ANNUL_CARD.padding * 2;
	const subtitleSize = ANNUL_CARD.textSize;
	const optionWidth = innerWidth - ANNUL_CARD.checkboxSize - ANNUL_CARD.checkboxGap;

	const description = annulled
		? 'Redação anulada. Verifique os motivos abaixo.'
		: 'Selecione os motivos aplicáveis antes de finalizar a correção.';
	const descriptionLines = wrapText(description, fonts.regular, subtitleSize, innerWidth);

	const optionsLayout = ANNUL_OPTIONS.map((opt) => {
		const lines = wrapText(opt.label, fonts.regular, subtitleSize, optionWidth);
		const textHeight = lines.length * subtitleSize + Math.max(0, lines.length - 1) * ANNUL_CARD.lineSpacing;
		const height = Math.max(ANNUL_CARD.checkboxSize, textHeight);
		return { ...opt, lines, height };
	});

	let otherLines = [];
	if (selected.has('OUTROS') && otherReason) {
		otherLines = wrapText(otherReason, fonts.regular, subtitleSize, optionWidth);
	}

	const descriptionHeight = descriptionLines.length
		? descriptionLines.length * subtitleSize + (descriptionLines.length - 1) * ANNUL_CARD.lineSpacing
		: 0;
	const optionsHeight = optionsLayout.reduce((acc, opt) => acc + opt.height, 0);
	const optionsGap = ANNUL_CARD.optionGap * Math.max(optionsLayout.length - 1, 0);
	const otherHeight = otherLines.length
		? ANNUL_CARD.headingGap + otherLines.length * subtitleSize + Math.max(0, otherLines.length - 1) * ANNUL_CARD.lineSpacing + ANNUL_CARD.sectionGap
		: 0;
	const badgeHeight = annulled ? ANNUL_CARD.badgeHeight + ANNUL_CARD.sectionGap : 0;

	const totalHeight =
		ANNUL_CARD.padding * 2 +
		ANNUL_CARD.titleSize +
		(descriptionHeight ? descriptionHeight + ANNUL_CARD.headingGap : ANNUL_CARD.headingGap) +
		optionsHeight +
		optionsGap +
		otherHeight +
		badgeHeight;

	return {
		totalHeight,
		selected,
		annulled,
		descriptionLines,
		optionsLayout,
		otherLines,
		innerWidth,
	};
}

function drawAnnulmentSection(page, fonts, x, yTop, width, score) {
	const layout = buildAnnulmentLayout(fonts, width, score);
	const subtitleSize = ANNUL_CARD.textSize;
	const cardBottom = yTop - layout.totalHeight;

	drawRoundedRect(page, {
		x,
		y: cardBottom,
		width,
		height: layout.totalHeight,
		radius: ANNUL_CARD.radius,
		fill: colorFromHex('#FFFFFF'),
		stroke: colorFromHex('#F5D0A3'),
		strokeWidth: 1,
	});

	let cursor = yTop - ANNUL_CARD.padding;
	page.drawText('Espelho do aluno', {
		x: x + ANNUL_CARD.padding,
		y: cursor - ANNUL_CARD.titleSize,
		size: ANNUL_CARD.titleSize,
		font: fonts.bold,
		color: colorFromHex('#AA4A0A'),
	});
	cursor -= ANNUL_CARD.titleSize + ANNUL_CARD.headingGap;

	layout.descriptionLines.forEach((line) => {
		cursor -= subtitleSize;
		page.drawText(line, {
			x: x + ANNUL_CARD.padding,
			y: cursor,
			size: subtitleSize,
			font: fonts.regular,
			color: colorFromHex(HEX.textMuted),
		});
		cursor -= ANNUL_CARD.lineSpacing;
	});
	if (layout.descriptionLines.length) {
		cursor += ANNUL_CARD.lineSpacing;
		cursor -= ANNUL_CARD.headingGap;
	}

	layout.optionsLayout.forEach((opt) => {
		const checked = layout.selected.has(opt.key);
		const checkboxX = x + ANNUL_CARD.padding;
		const checkboxY = cursor - ANNUL_CARD.checkboxSize;
		page.drawRectangle({
			x: checkboxX,
			y: checkboxY,
			width: ANNUL_CARD.checkboxSize,
			height: ANNUL_CARD.checkboxSize,
			radius: 2,
			color: colorFromHex(checked ? '#FDBA74' : '#FFFFFF'),
			borderColor: colorFromHex('#F97316'),
			borderWidth: 1,
		});
		if (checked) {
			page.drawText('✓', {
				x: checkboxX + 1.5,
				y: checkboxY + 1,
				size: subtitleSize,
				font: fonts.bold,
				color: colorFromHex('#B45309'),
			});
		}
		let lineCursor = cursor;
		opt.lines.forEach((line) => {
			lineCursor -= subtitleSize;
			page.drawText(line, {
				x: checkboxX + ANNUL_CARD.checkboxSize + ANNUL_CARD.checkboxGap,
				y: lineCursor,
				size: subtitleSize,
				font: fonts.regular,
				color: colorFromHex('#0F172A'),
			});
			lineCursor -= ANNUL_CARD.lineSpacing;
		});
		cursor -= opt.height + ANNUL_CARD.optionGap;
	});
	if (layout.optionsLayout.length) {
		cursor += ANNUL_CARD.optionGap;
	}

	if (layout.otherLines.length) {
		page.drawText('Observação', {
			x: x + ANNUL_CARD.padding,
			y: cursor - subtitleSize,
			size: subtitleSize,
			font: fonts.bold,
			color: colorFromHex('#B45309'),
		});
		cursor -= subtitleSize + ANNUL_CARD.headingGap;
		layout.otherLines.forEach((line) => {
			cursor -= subtitleSize;
			page.drawText(line, {
				x: x + ANNUL_CARD.padding,
				y: cursor,
				size: subtitleSize,
				font: fonts.regular,
				color: colorFromHex('#0F172A'),
			});
			cursor -= ANNUL_CARD.lineSpacing;
		});
		cursor += ANNUL_CARD.lineSpacing;
		cursor -= ANNUL_CARD.sectionGap;
	}

	if (layout.annulled) {
		cursor -= ANNUL_CARD.badgeHeight;
		drawRoundedRect(page, {
			x: x + ANNUL_CARD.padding,
			y: cursor,
			width: 148,
			height: ANNUL_CARD.badgeHeight,
			radius: ANNUL_CARD.badgeHeight / 2,
			fill: colorFromHex('#FDE68A'),
			stroke: colorFromHex('#F59E0B'),
			strokeWidth: 1,
		});
		page.drawText('Correção anulada', {
			x: x + ANNUL_CARD.padding + 12,
			y: cursor + 4,
			size: subtitleSize,
			font: fonts.bold,
			color: colorFromHex('#92400E'),
		});
		cursor -= ANNUL_CARD.sectionGap;
	}

	return cardBottom;
}

function estimateAnnulmentHeight(fonts, width, score) {
	return buildAnnulmentLayout(fonts, width, score).totalHeight;
}

function buildHeroMeta({ classLabel, subjectLabel, modelLabel, bimesterLabel }) {
	const parts = [];
	if (classLabel) parts.push(classLabel);
	if (subjectLabel) parts.push(subjectLabel);
	if (modelLabel) parts.push(modelLabel);
	if (bimesterLabel) parts.push(bimesterLabel);
	return parts.join(' • ') || '—';
}

function collectEnemData(score) {
	if (!score?.enem?.levels || !score?.enem?.points) return null;
	const levels = score.enem.levels || [];
	const points = score.enem.points || [];
	const total = score.enem.total ?? points.reduce((acc, val) => acc + (Number(val) || 0), 0);
	const competencies = ENEM_RUBRIC.map((comp, index) => {
		const key = comp.key;
		const level = levels[index] ?? 0;
		const pts = points[index] ?? 0;
		const competencyNode = score.enem.competencies?.[key] || {};
		const reasonIds = competencyNode.reasonIds || [];
		const reasons = reasonIds
			.map((id) => ENEM_REASON_LABELS[id])
			.filter(Boolean);
		const globalJustifications = score.enem?.justifications;
		let manualJustification = null;
		if (Array.isArray(globalJustifications)) {
			manualJustification = globalJustifications[index];
		} else if (globalJustifications && typeof globalJustifications === 'object') {
			manualJustification = globalJustifications[key];
		}
		const candidateJustifications = [
			competencyNode.justification,
			competencyNode.text,
			competencyNode.description,
			manualJustification,
		];
		const justification = candidateJustifications
			.map((value) => (typeof value === 'string' ? value.trim() : ''))
			.find((value) => value.length > 0) || null;
		return {
			key,
			title: comp.title,
			level,
			points: pts,
			reasons,
			justification,
		};
	});
	return { total, competencies };
}

function collectPasData(score) {
	const pas = score?.pas;
	if (!pas) return null;
	const macro = [
		{ key: 'apresentacao', label: 'Apresentação', value: Number(pas.apresentacao) || 0, max: 0.5 },
		{ key: 'argumentacao', label: 'Conteúdo', value: Number(pas.argumentacao) || 0, max: 4.5 },
		{ key: 'adequacao', label: 'Gênero textual', value: Number(pas.adequacao) || 0, max: 2 },
		{ key: 'coesao', label: 'Coesão e coerência', value: Number(pas.coesao) || 0, max: 3 },
	];
	const micro = [
		{ key: 'grafia', label: 'Grafia / Acentuação', value: Number(pas.erros?.grafia) || 0 },
		{ key: 'pontuacao', label: 'Pontuação / Morfossintaxe', value: Number(pas.erros?.pontuacao) || 0 },
		{ key: 'propriedade', label: 'Propriedade vocabular', value: Number(pas.erros?.propriedade) || 0 },
	];
	const totalErros = micro.reduce((acc, item) => acc + item.value, 0);
	const discount = pas.descontoPorErro != null ? pas.descontoPorErro : pas.NL ? 2 / pas.NL : 0;
	const macroSum = macro.reduce((acc, item) => acc + item.value, 0);
	const nr = pas.NR != null ? pas.NR : macroSum - totalErros * discount;
	return {
		macro,
		micro,
		totalErros,
		discount,
		tl: pas.TL || pas.NL || 0,
		nc: pas.NC || macroSum,
		nr,
	};
}

function clampLevel(level) {
	if (!Number.isFinite(level)) return 0;
	return Math.max(0, Math.min(Math.round(level), 5));
}

async function generateCorrectedEssayPdf({ essay, annotations, score, student, classInfo }) {
	const pdfDoc = await PDFDocument.create();
	const fonts = {
		regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
		bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
	};

	const brandMarkImage = await embedBrandMark(pdfDoc);

	const studentEntity = student || essay?.studentId || {};
	const studentName = studentEntity?.name || essay?.studentName || 'Aluno';
	const classLabel = resolveClassLabel(classInfo) || classInfo?.name || essay?.className || null;
	const subjectLabel = essay?.subject || essay?.subjectName || classInfo?.discipline || null;
	const modelLabel = essay?.type === 'PAS' ? 'PAS/UnB' : 'ENEM';
	const bimesterRaw = essay?.bimester ?? essay?.term ?? essay?.bimestre ?? essay?.bimesterNumber;
	const bimesterLabel = Number.isFinite(Number(bimesterRaw)) ? `${Number(bimesterRaw)}º bimestre` : null;
	const heroMeta = buildHeroMeta({ classLabel, subjectLabel, modelLabel, bimesterLabel });
	const finalScoreInfo = resolveFinalScore(score);
	const finalSuffix = modelLabel === 'PAS/UnB' ? '/10' : '/1000';
	const deliveredAtLabel = formatDateLabel(
		essay?.submittedAt || essay?.sentAt || essay?.deliveryDate || essay?.createdAt || essay?.updatedAt,
	);
	const themeName = resolveThemeName(essay);
	const studentPhotoUrl =
		studentEntity?.photo || studentEntity?.photoUrl || studentEntity?.avatarUrl || studentEntity?.avatar || null;
	const avatarImage = await embedRemoteImage(pdfDoc, studentPhotoUrl);
	const studentInitials = studentName
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((piece) => piece[0]?.toUpperCase() ?? '')
		.join('') || 'A';

	const annotationsOrdered = prepareAnnotations(annotations);
	const firstPageAnnotations = annotationsOrdered.filter((ann) => ann.page === 1);
	const totalComments = annotationsOrdered.length;

	const heroArgs = (page, fontsPack) => ({
		page,
		fonts: fontsPack,
		studentName,
		heroMeta,
		theme: themeName,
		finalScore: finalScoreInfo.value,
		finalSuffix,
		modelLabel,
		deliveredAt: deliveredAtLabel,
		avatarImage,
		studentInitials,
		professorName: 'Professor Yago Sales',
		brandMark: brandMarkImage,
	});

	const contentWidth = A4.width - MARGIN * 2;
	const { mainWidth: mainColumnWidth, railWidth: rightRailWidth } = computeColumns(contentWidth);
	if (!mainColumnWidth || !rightRailWidth) {
		throw new Error('Layout de colunas inválido para o PDF.');
	}
	const columnGap = PAGE.gutter;
	const mainX = MARGIN;
	const railX = mainX + mainColumnWidth + columnGap;

	let commentsIndex = 0;
	let currentPage = null;
	let pageNumber = 0;

	const ensureSpace = (height = 0) => {
		if (!currentPage) currentPage = startPage(true);
		if (height <= 0) return;
		if (currentPage.cursor - height < currentPage.bottom + CARD_FRAME.paddingY) {
			currentPage = startPage(false);
		}
	};

	const applyGap = (gap = SPACING.block) => {
		if (!currentPage || !gap) return;
		if (currentPage.cursor - gap < currentPage.bottom + CARD_FRAME.paddingY) {
			currentPage = startPage(false);
		} else {
			currentPage.cursor -= gap;
		}
	};

	const startPage = (isFirst) => {
		pageNumber += 1;
		const page = pdfDoc.addPage([A4.width, A4.height]);
		page.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: colorFromHex(HEX.pageBg) });
		const top = drawHeroHeader(heroArgs(page, fonts));
		const railArea = {
			x: railX,
			width: rightRailWidth,
			top,
			bottom: MARGIN,
		};
		const title = pageNumber === 1
			? `Comentários (${totalComments})`
			: `Comentários (${totalComments}) - continuação`;
		commentsIndex = drawCommentsColumn({
			page,
			fonts,
			area: railArea,
			annotations: annotationsOrdered,
			startIndex: commentsIndex,
			title,
		});
		return {
			page,
			cursor: top,
			bottom: MARGIN,
		};
	};

	currentPage = startPage(true);

	const classGradesHeight = estimateClassGradesHeight(classInfo, student);
	ensureSpace(classGradesHeight);
	currentPage.cursor = drawClassGradesSection(
		currentPage.page,
		fonts,
		mainX,
		currentPage.cursor,
		mainColumnWidth,
		classInfo,
		student,
		firstPageAnnotations,
	);
	applyGap(SPACING.section);

	const previewHeight = estimateEssayPreviewHeight(mainColumnWidth);
	ensureSpace(previewHeight);
	currentPage.cursor = drawEssayPreviewSection(
		currentPage.page,
		fonts,
		mainX,
		currentPage.cursor,
	mainColumnWidth,
	essay,
		firstPageAnnotations,
	);
	applyGap(SPACING.section);

	const isPas = essay?.type === 'PAS';
	const pasSummary = isPas ? collectPasData(score) : null;
	const enemSummary = essay?.type === 'ENEM' ? collectEnemData(score) : null;

	if (isPas) {
		if (pasSummary) {
			const summaryHeight = calculatePasSummaryHeight(pasSummary);
			ensureSpace(summaryHeight);
			currentPage.cursor = drawPasSummarySection(
				currentPage.page,
				fonts,
				mainX,
				currentPage.cursor,
				mainColumnWidth,
				pasSummary,
			);
			applyGap(SPACING.section);

			const macroHeight = calculatePasMacroHeight(pasSummary);
			ensureSpace(macroHeight);
			currentPage.cursor = drawPasMacroSection(
				currentPage.page,
				fonts,
				mainX,
				currentPage.cursor,
				mainColumnWidth,
				pasSummary,
			);
			applyGap(SPACING.block);

			const microHeight = calculatePasMicroHeight(pasSummary);
			ensureSpace(microHeight);
			currentPage.cursor = drawPasMicroSection(
				currentPage.page,
				fonts,
				mainX,
				currentPage.cursor,
				mainColumnWidth,
				pasSummary,
			);
			applyGap(SPACING.section);
		} else {
			const fallbackHeight = BODY_SIZE + 4;
			ensureSpace(fallbackHeight);
			currentPage.page.drawText('Dados PAS indisponíveis.', {
				x: mainX,
				y: currentPage.cursor,
				size: BODY_SIZE,
				font: fonts.regular,
				color: colorFromHex(TEXT_SUBTLE),
			});
			currentPage.cursor -= fallbackHeight;
			applyGap(SPACING.section);
		}
	} else if (enemSummary) {
		const summaryHeight = calculateEnemSummaryHeight(enemSummary);
		ensureSpace(summaryHeight);
		currentPage.cursor = drawEnemSummarySection(
			currentPage.page,
			fonts,
			mainX,
			currentPage.cursor,
			mainColumnWidth,
			enemSummary,
		);
		applyGap(SPACING.section);

		const competencies = Array.isArray(enemSummary?.competencies) ? enemSummary.competencies : [];
		if (competencies.length) {
			competencies.forEach((comp, index) => {
				const key = `C${index + 1}`;
				const colors = ENEM_COLORS_HEX[key] || ENEM_COLORS_HEX.C1;
				const layout = buildEnemCompetencyLayout(
					mainColumnWidth,
					index,
					comp.title || ENEM_RUBRIC?.[index]?.title || `Competência ${index + 1}`,
					comp.level,
					comp.points,
					comp.justification,
					comp.reasons || [],
					fonts,
					colors,
				);
				ensureSpace(layout.cardHeight);
				currentPage.cursor = drawEnemCompetencyCard(
					currentPage.page,
					mainX,
					currentPage.cursor,
					mainColumnWidth,
					layout,
					fonts,
				);
				applyGap(SPACING.section);
			});
		} else {
			const fallbackHeight = BODY_SIZE + 4;
			ensureSpace(fallbackHeight);
			currentPage.page.drawText('Dados de competências ENEM indisponíveis.', {
				x: mainX,
				y: currentPage.cursor,
				size: BODY_SIZE,
				font: fonts.regular,
				color: colorFromHex(TEXT_SUBTLE),
			});
			currentPage.cursor -= fallbackHeight;
			applyGap(SPACING.section);
		}
	} else {
		const fallbackHeight = BODY_SIZE + 4;
		ensureSpace(fallbackHeight);
		currentPage.page.drawText('Dados de competências ENEM indisponíveis.', {
			x: mainX,
			y: currentPage.cursor,
			size: BODY_SIZE,
			font: fonts.regular,
			color: colorFromHex(TEXT_SUBTLE),
		});
		currentPage.cursor -= fallbackHeight;
		applyGap(SPACING.section);
	}

	const annulHeight = estimateAnnulmentHeight(fonts, mainColumnWidth, score);
	if (annulHeight > 0) {
		ensureSpace(annulHeight);
		currentPage.cursor = drawAnnulmentSection(
			currentPage.page,
			fonts,
			mainX,
			currentPage.cursor,
			mainColumnWidth,
			score,
		);
	}

	while (commentsIndex < annotationsOrdered.length) {
		currentPage = startPage(false);
		currentPage.cursor = currentPage.bottom;
	}

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

module.exports = {
	generateCorrectedEssayPdf,
};
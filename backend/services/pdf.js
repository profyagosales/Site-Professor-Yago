const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { ENEM_RUBRIC, ENEM_REASON_LABELS } = require('../constants/enemRubric');

const A4 = { width: 595, height: 842 };
const MARGIN = 24;
const CONTENT_GAP = 12;
const TITLE_SIZE = 11;
const BODY_SIZE = 10;
const PREVIEW_PADDING = 8;
const PREVIEW_GAP = 8;

const HERO = { height: 72, radius: 16, padX: 18, padY: 12, gap: 14 };
const BRAND = { ICON: 44 };
const SCORE_CARD = { width: 150, height: 56, radius: 14, pad: 10 };

const COMMENT = {
	titleSize: BODY_SIZE,
	numberSize: 8,
	categorySize: 6,
	textSize: 7,
	lineGap: 1,
	cardGap: 6,
	padding: 4,
	bandHeight: 12,
	bandTextGap: 3,
	titleTextGap: 3,
	maxLines: 6,
};

const HIGHLIGHT_FILL_OPACITY = 0.22;
const HIGHLIGHT_BORDER_OPACITY = 0.8;
const HIGHLIGHT_LABEL_SIZE = 16;
const HIGHLIGHT_LABEL_FONT_SIZE = 9;
const PDF_FONT = { xs: 7, sm: 8, md: 10, lg: 14 };
const AVATAR = { size: 36 };
const POINTS_PER_LEVEL = [0, 40, 80, 120, 160, 200];
const CARD_PADDING = 12;
const LINE_GAP = 4;
const BULLET_INDENT = 12;

const HEX = {
	background: '#FFFFFF',
	pageBg: '#F8FAFC',
	border: '#E2E8F0',
	borderSoft: '#F1F5F9',
	text: '#1F2937',
	textMuted: '#64748B',
	textInverted: '#FFFFFF',
	brand: '#FB923C',
	brandDark: '#EA580C',
	brandPastel: '#FFF7ED',
	heroAccent: '#FDBA74',
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

const ENEM_COLORS_HEX = {
	C1: { strong: '#065F46', title: '#0F766E', pastel: '#D1FAE5' },
	C2: { strong: '#9D174D', title: '#BE185D', pastel: '#FCE7F3' },
	C3: { strong: '#92400E', title: '#B45309', pastel: '#FEF3C7' },
	C4: { strong: '#1E40AF', title: '#1D4ED8', pastel: '#DBEAFE' },
	C5: { strong: '#9A3412', title: '#EA580C', pastel: '#FFEDD5' },
};

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
	const { r, g, b } = hexToRgbComponents(hex);
	return rgb(r / 255, g / 255, b / 255);
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
	const card = {
		x: MARGIN,
		y: pageHeight - MARGIN - HERO.height,
		width: cardWidth,
		height: HERO.height,
	};

	drawRoundedRect(page, {
		x: card.x,
		y: card.y,
		width: card.width,
		height: card.height,
		radius: HERO.radius,
		fill: colorFromHex(HEX.brand),
	});

	const brandX = card.x + HERO.padX;
	const brandY = card.y + (card.height - BRAND.ICON) / 2;
	drawRoundedRect(page, {
		x: brandX,
		y: brandY,
		width: BRAND.ICON,
		height: BRAND.ICON,
		radius: BRAND.ICON / 2,
		fill: colorFromHex(HEX.background),
	});

	if (brandMark) {
		page.drawImage(brandMark, {
			x: brandX + 4,
			y: brandY + 4,
			width: BRAND.ICON - 8,
			height: BRAND.ICON - 8,
		});
	} else {
		const brandLabel = 'PY';
		const brandFontSize = 14;
		const brandLabelWidth = fonts.bold.widthOfTextAtSize(brandLabel, brandFontSize);
		page.drawText(brandLabel, {
			x: brandX + (BRAND.ICON - brandLabelWidth) / 2,
			y: brandY + (BRAND.ICON - brandFontSize) / 2,
			size: brandFontSize,
			font: fonts.bold,
			color: colorFromHex(HEX.brandDark),
		});
	}

	page.drawText(professorName || 'Professor Yago Sales', {
		x: brandX,
		y: card.y + HERO.padY,
		size: PDF_FONT.sm,
		font: fonts.bold,
		color: colorFromHex(HEX.textInverted),
	});

	const scoreX = card.x + card.width - SCORE_CARD.width - HERO.padX;
	const centerStart = brandX + BRAND.ICON + HERO.gap;
	const centerWidth = Math.max(0, scoreX - centerStart - HERO.gap);
	const canShowAvatar = Boolean(avatarImage) && centerWidth > AVATAR.size + 60;
	const avatarSlot = canShowAvatar ? AVATAR.size : 0;
	const avatarGap = canShowAvatar ? 14 : 0;
	const textMaxWidth = Math.max(120, centerWidth - avatarSlot - avatarGap);
	const textStart = centerStart + avatarSlot + avatarGap;

	if (canShowAvatar && avatarImage) {
		const avatarX = centerStart;
		const avatarY = card.y + (card.height - AVATAR.size) / 2;
		drawRoundedRect(page, {
			x: avatarX,
			y: avatarY,
			width: AVATAR.size,
			height: AVATAR.size,
			radius: AVATAR.size / 2,
			fill: colorFromHex(HEX.heroAccent),
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
		const placeholderY = card.y + (card.height - placeholderSize) / 2;
		drawRoundedRect(page, {
			x: placeholderX,
			y: placeholderY,
			width: placeholderSize,
			height: placeholderSize,
			radius: placeholderSize / 2,
			fill: blendHex(HEX.brand, HEX.brandPastel, 0.35),
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

	const displayName = ellipsize(studentName || 'Aluno', 42);
	const nameY = card.y + card.height - HERO.padY - PDF_FONT.lg;
	page.drawText(displayName, {
		x: textStart,
		y: nameY,
		size: PDF_FONT.lg,
		font: fonts.bold,
		color: colorFromHex(HEX.textInverted),
	});

	let textCursor = nameY - (PDF_FONT.md + 4);
	if (heroMeta) {
		const metaLines = wrapText(heroMeta, fonts.regular, PDF_FONT.sm, textMaxWidth);
		metaLines.forEach((line) => {
			page.drawText(line, {
				x: textStart,
				y: textCursor,
				size: PDF_FONT.sm,
				font: fonts.regular,
				color: colorFromHex(HEX.textInverted),
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
			color: colorFromHex(HEX.textInverted),
		});
		textCursor -= PDF_FONT.sm + 3;
	});

	const totalLabel = modelLabel === 'PAS/UnB' ? 'TOTAL PAS' : 'TOTAL ENEM';
	const valueText = finalScore || '--';
	const suffixText = finalSuffix || (modelLabel === 'PAS/UnB' ? '/10' : '/1000');
	const scoreY = card.y + (card.height - SCORE_CARD.height) / 2;

	drawRoundedRect(page, {
		x: scoreX,
		y: scoreY,
		width: SCORE_CARD.width,
		height: SCORE_CARD.height,
		radius: SCORE_CARD.radius,
		fill: colorFromHex(HEX.brandPastel),
		stroke: colorFromHex(HEX.heroAccent),
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
		color: colorFromHex(HEX.text),
	});

	page.drawText(suffixText, {
		x: valueX + valueWidth + suffixGap,
		y: valueY + (valueSize - suffixSize) / 2,
		size: suffixSize,
		font: fonts.bold,
		color: colorFromHex(HEX.textMuted),
	});

	const modelUpper = (modelLabel || '-').toUpperCase();
	const modelWidth = fonts.bold.widthOfTextAtSize(modelUpper, PDF_FONT.sm);
	page.drawText(modelUpper, {
		x: scoreX + SCORE_CARD.width - SCORE_CARD.pad - modelWidth,
		y: scoreY + SCORE_CARD.pad,
		size: PDF_FONT.sm,
		font: fonts.bold,
		color: colorFromHex(HEX.textMuted),
	});

	if (deliveredAt) {
		page.drawText(`Entregue em ${deliveredAt}`, {
			x: card.x + HERO.padX,
			y: card.y - 14,
			size: PDF_FONT.sm,
			font: fonts.regular,
			color: colorFromHex(HEX.textMuted),
		});
	}

	return card.y - CONTENT_GAP;
}

function drawDocumentPreview({
	page,
	fonts,
	area,
	embeddedPage,
	embeddedImage,
	annotations,
}) {
	const availableHeight = area.top - area.bottom;
	if (availableHeight <= PREVIEW_PADDING * 2) return { drawn: false, highlightMap: null };

	const innerWidth = area.width - PREVIEW_PADDING * 2;
	const innerHeight = availableHeight - PREVIEW_PADDING * 2;
	if (innerWidth <= 0 || innerHeight <= 0) return { drawn: false, highlightMap: null };

	drawRoundedRect(page, {
		x: area.x,
		y: area.bottom,
		width: area.width,
		height: availableHeight,
		radius: 16,
		fill: colorFromHex(HEX.background),
		stroke: colorFromHex(HEX.border),
		strokeWidth: 1,
	});

	let sourceWidth = 0;
	let sourceHeight = 0;
	let drawMethod = null;

	if (embeddedPage) {
		sourceWidth = embeddedPage.width;
		sourceHeight = embeddedPage.height;
		drawMethod = 'page';
	} else if (embeddedImage) {
		sourceWidth = embeddedImage.width;
		sourceHeight = embeddedImage.height;
		drawMethod = 'image';
	}

	if (!sourceWidth || !sourceHeight) {
		const placeholder = 'Pré-visualização indisponível';
		const width = fonts.bold.widthOfTextAtSize(placeholder, 10);
		page.drawText(placeholder, {
			x: area.x + (area.width - width) / 2,
			y: area.bottom + availableHeight / 2,
			size: 10,
			font: fonts.bold,
			color: colorFromHex(HEX.textMuted),
		});
		return { drawn: false, highlightMap: null };
	}

	const scale = Math.min(innerWidth / sourceWidth, innerHeight / sourceHeight);
	const targetWidth = sourceWidth * scale;
	const targetHeight = sourceHeight * scale;
	const targetX = area.x + PREVIEW_PADDING + (innerWidth - targetWidth) / 2;
	const targetY = area.bottom + PREVIEW_PADDING + (innerHeight - targetHeight) / 2;

	if (drawMethod === 'page') {
		page.drawPage(embeddedPage, {
			x: targetX,
			y: targetY,
			width: targetWidth,
			height: targetHeight,
		});
	} else if (drawMethod === 'image') {
		page.drawImage(embeddedImage, {
			x: targetX,
			y: targetY,
			width: targetWidth,
			height: targetHeight,
		});
	}

	annotations.forEach((ann, index) => {
		if (!Array.isArray(ann.rects) || !ann.rects.length) return;
		const style = getCategoryStyle(ann.category);
		const baseColor = colorFromHex(style.hex);
		const displayNumber = resolveAnnotationNumber(ann, index + 1);
		ann.rects.forEach((rect) => {
			const rawWidth = clamp(rect.w, 0, 1) * targetWidth;
			const rawHeight = clamp(rect.h, 0, 1) * targetHeight;
			const rawX = targetX + clamp(rect.x, 0, 1) * targetWidth;
			const rawY = targetY + (targetHeight - clamp(rect.y + rect.h, 0, 1) * targetHeight);

			const clippedX = Math.max(targetX, rawX);
			const clippedY = Math.max(targetY, rawY);
			const clippedWidth = Math.max(0, Math.min(rawX + rawWidth, targetX + targetWidth) - clippedX);
			const clippedHeight = Math.max(0, Math.min(rawY + rawHeight, targetY + targetHeight) - clippedY);
			if (clippedWidth <= 0 || clippedHeight <= 0) return;

			page.drawRectangle({
				x: clippedX,
				y: clippedY,
				width: clippedWidth,
				height: clippedHeight,
				color: baseColor,
				opacity: HIGHLIGHT_FILL_OPACITY,
				borderColor: baseColor,
				borderWidth: 1,
				borderOpacity: HIGHLIGHT_BORDER_OPACITY,
			});

			const labelWidth = Math.min(HIGHLIGHT_LABEL_SIZE, clippedWidth);
			const labelHeight = Math.min(HIGHLIGHT_LABEL_SIZE, clippedHeight);
			if (labelWidth <= 0 || labelHeight <= 0) return;
			const labelText = `#${displayNumber}`;
			const labelX = clippedX;
			const labelY = clippedY + clippedHeight - labelHeight;

			page.drawRectangle({
				x: labelX,
				y: labelY,
				width: labelWidth,
				height: labelHeight,
				color: baseColor,
				opacity: Math.min(1, HIGHLIGHT_BORDER_OPACITY + 0.1),
				borderWidth: 0,
			});

			const textWidth = fonts.bold.widthOfTextAtSize(labelText, HIGHLIGHT_LABEL_FONT_SIZE);
			const textHeight = fonts.bold.heightAtSize(HIGHLIGHT_LABEL_FONT_SIZE);
			const textX = labelX + Math.max((labelWidth - textWidth) / 2, 2);
			const textY = labelY + Math.max((labelHeight - textHeight) / 2, 1);
			page.drawText(labelText, {
				x: textX,
				y: textY,
				size: HIGHLIGHT_LABEL_FONT_SIZE,
				font: fonts.bold,
				color: colorFromHex(HEX.text),
			});
		});
	});

	return {
		drawn: true,
		highlightMap: {
			x: targetX,
			y: targetY,
			width: targetWidth,
			height: targetHeight,
		},
	};
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
		cursor -= COMMENT.titleSize + PREVIEW_GAP;
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
		const bandColor = blendHex(style.hex, '#FFFFFF', 0.35);
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
		const cardHeight = COMMENT.bandHeight + COMMENT.bandTextGap + COMMENT.categorySize + COMMENT.titleTextGap + textBlockHeight + cardPadding;
		if (cursor - cardHeight < bottom) {
			if (drewAny) break;
			if (cursor <= bottom) break;
		}

		const cardTop = cursor;
		const cardBottom = Math.max(bottom, cardTop - cardHeight);
		drawRoundedRect(page, {
			x,
			y: cardBottom,
			width,
			height: cardTop - cardBottom,
			radius: 14,
			fill: colorFromHex(HEX.background),
			stroke: colorFromHex(HEX.border),
			strokeWidth: 1,
		});

		page.drawRectangle({
			x,
			y: cardTop - COMMENT.bandHeight,
			width,
			height: COMMENT.bandHeight,
			color: bandColor,
		});

		const numberLabel = `#${resolveAnnotationNumber(ann, index + 1)}`;
		const numberBaseline = cardTop - COMMENT.bandHeight + (COMMENT.bandHeight - COMMENT.numberSize) / 2;
		page.drawText(numberLabel, {
			x: x + cardPadding,
			y: numberBaseline,
			size: COMMENT.numberSize,
			font: fonts.bold,
			color: colorFromHex(HEX.text),
		});

		let textY = cardTop - COMMENT.bandHeight - COMMENT.bandTextGap;
		const categoryLabel = `${style.label}${ann.page > 1 ? ` • Página ${ann.page}` : ''}`.toUpperCase();
		textY -= COMMENT.categorySize;
		page.drawText(categoryLabel, {
			x: x + cardPadding,
			y: textY,
			size: COMMENT.categorySize,
			font: fonts.bold,
			color: colorFromHex(HEX.textMuted),
		});

		textY -= COMMENT.titleTextGap;
		for (let i = 0; i < textLines.length; i += 1) {
			const line = textLines[i];
			const nextY = textY - COMMENT.textSize;
			if (nextY < cardBottom) break;
			page.drawText(line, {
				x: x + cardPadding,
				y: nextY,
				size: COMMENT.textSize,
				font: fonts.regular,
				color: colorFromHex(HEX.text),
			});
			textY = nextY - COMMENT.lineGap;
		}

		// Adjust cursor for next card
		cursor = cardBottom - COMMENT.cardGap;
		index += 1;
		drewAny = true;
		if (cursor <= bottom) break;
	}

	return index;
}

function splitWithSpaces(input) {
	const parts = [];
	let acc = '';
	for (let i = 0; i < input.length; i += 1) {
		const ch = input[i];
		if (ch === ' ') {
			if (acc) parts.push(acc);
			parts.push(' ');
			acc = '';
		} else {
			acc += ch;
		}
	}
	if (acc) parts.push(acc);
	return parts;
}

function isUpperToken(token) {
	const letters = token.replace(/[^A-Za-zÀ-ÿ]/g, '');
	if (letters.length < 3) return false;
	return letters === letters.toUpperCase();
}

function isConnectorToken(token) {
	const trimmed = token.trim();
	if (!trimmed) return false;
	const normalized = trimmed.replace(/[.,;:!?)]$/, '').replace(/^[(]/, '');
	return normalized === 'E' || normalized === 'OU' || normalized === 'E/OU';
}

function makeRichLine(line, strongHex, normalHex) {
	return splitWithSpaces(line).map((token) => {
		if (token.trim().length === 0) return { text: token, font: 'regular', color: normalHex };
		if (isConnectorToken(token)) return { text: token, font: 'bold', color: strongHex };
		if (isUpperToken(token)) return { text: token, font: 'bold', color: strongHex };
		return { text: token, font: 'regular', color: normalHex };
	});
}

function buildCompetencyLayout(width, index, title, level, points, justification, reasons, fonts, colors) {
	const textWidth = width - CARD_PADDING * 2;
	const operations = [];
	const roman = ['I', 'II', 'III', 'IV', 'V'][index] || String(index + 1);
	operations.push({
		text: `Competência ${roman} — ${title}`,
		font: 'bold',
		size: TITLE_SIZE,
		color: colors.title,
		gapAfter: LINE_GAP,
	});

	operations.push({
		text: '',
		font: 'regular',
		size: BODY_SIZE,
		color: TEXT,
		gapAfter: LINE_GAP,
		rich: [
			{ text: 'Nível: ', font: 'regular', color: colors.title },
			{ text: String(level), font: 'bold', color: colors.strong },
			{ text: ' · Pontuação: ', font: 'regular', color: colors.title },
			{ text: String(points), font: 'bold', color: colors.strong },
			{ text: ' pts', font: 'regular', color: colors.title },
		],
	});

	const trimmedJustification = justification ? justification.trim() : '';
	if (trimmedJustification) {
		operations.push({
			text: 'Justificativa selecionada:',
			font: 'regular',
			size: BODY_SIZE,
			color: colors.title,
			gapAfter: LINE_GAP,
		});

		let wrapped = wrapText(trimmedJustification, fonts.regular, BODY_SIZE, textWidth - BULLET_INDENT);
		if (wrapped.length > 2) {
			wrapped = wrapped.slice(0, 2);
			const lastIndex = wrapped.length - 1;
			wrapped[lastIndex] = `${wrapped[lastIndex]}…`;
		}
		const startIdx = operations.length;
		wrapped.forEach((line, lineIndex) => {
			const text = lineIndex === 0 ? `• ${line}` : line;
			operations.push({
				text,
				font: 'regular',
				size: BODY_SIZE,
				color: TEXT,
				indent: lineIndex === 0 ? 0 : BULLET_INDENT,
				gapAfter: LINE_GAP,
				rich: makeRichLine(text, colors.strong, TEXT),
			});
		});
		if (operations.length) operations[operations.length - 1].gapAfter = 0;
		const contentHeight = operations.reduce((sum, op) => sum + op.size + (op.gapAfter || 0), 0);
		const cardHeight = CARD_PADDING * 2 + contentHeight;
		return { operations, cardHeight, reasonStartIdx: startIdx, reasonCount: wrapped.length };
	}

	if (Array.isArray(reasons) && reasons.length) {
		operations.push({
			text: 'Justificativas selecionadas:',
			font: 'regular',
			size: BODY_SIZE,
			color: colors.title,
			gapAfter: LINE_GAP,
		});
		let reasonStartIdx = null;
		let reasonCount = 0;
		reasons.forEach((reason) => {
			const cleaned = (reason || '').trim();
			if (!cleaned) return;
			const wrapped = wrapText(cleaned, fonts.regular, BODY_SIZE, textWidth - BULLET_INDENT);
			const lines = wrapped.length ? wrapped : [''];
			lines.forEach((line, idx) => {
				const text = idx === 0 ? `• ${line}` : line;
				if (reasonStartIdx === null) reasonStartIdx = operations.length;
				operations.push({
					text,
					font: 'regular',
					size: BODY_SIZE,
					color: TEXT,
					indent: idx === 0 ? 0 : BULLET_INDENT,
					gapAfter: LINE_GAP,
					rich: makeRichLine(text, colors.strong, TEXT),
				});
				reasonCount += 1;
			});
		});
		if (operations.length) operations[operations.length - 1].gapAfter = 0;
		const contentHeight = operations.reduce((sum, op) => sum + op.size + (op.gapAfter || 0), 0);
		const cardHeight = CARD_PADDING * 2 + contentHeight;
		return { operations, cardHeight, reasonStartIdx, reasonCount };
	}

	operations.push({
		text: 'Sem justificativas selecionadas.',
		font: 'regular',
		size: BODY_SIZE,
		color: TEXT_SUBTLE,
		gapAfter: LINE_GAP,
	});
	if (operations.length) operations[operations.length - 1].gapAfter = 0;
	const contentHeight = operations.reduce((sum, op) => sum + op.size + (op.gapAfter || 0), 0);
	const cardHeight = CARD_PADDING * 2 + contentHeight;
	return { operations, cardHeight, reasonStartIdx: null, reasonCount: 0 };
}

function drawCompetencyCard(page, x, yTop, width, layout, fonts, colors) {
	const { operations, cardHeight, reasonStartIdx, reasonCount } = layout;
	const cardBottom = yTop - cardHeight;
	page.drawRectangle({
		x,
		y: cardBottom,
		width,
		height: cardHeight,
		color: colorFromHex(BG),
		borderColor: colorFromHex(colors.title),
		borderWidth: 1,
		borderOpacity: 0.6,
	});
	page.drawRectangle({
		x,
		y: cardBottom,
		width: 2,
		height: cardHeight,
		color: colorFromHex(colors.strong),
	});

	const baselines = [];
	let cursor = yTop - CARD_PADDING;
	for (let i = 0; i < operations.length; i += 1) {
		const op = operations[i];
		cursor -= op.size;
		baselines[i] = cursor;
		if (op.gapAfter) cursor -= op.gapAfter;
	}

	if (
		colors && reasonStartIdx !== null && reasonCount > 0 &&
		reasonStartIdx >= 0 && reasonStartIdx < operations.length
	) {
		const start = reasonStartIdx;
		const end = start + reasonCount - 1;
		const topY = baselines[start] + operations[start].size + 2;
		const bottomY = baselines[end] - 2;
		const rectHeight = Math.max(0, topY - bottomY);
		if (rectHeight > 0) {
			page.drawRectangle({
				x: x + CARD_PADDING,
				y: bottomY,
				width: width - CARD_PADDING * 2,
				height: rectHeight,
				color: colorFromHex(colors.pastel),
				borderWidth: 0,
			});
		}
	}

	for (let i = 0; i < operations.length; i += 1) {
		const op = operations[i];
		const baseY = baselines[i];
		let penX = x + CARD_PADDING + (op.indent || 0);
		if (op.rich && op.rich.length) {
			op.rich.forEach((seg) => {
				const font = seg.font === 'bold' ? fonts.bold : fonts.regular;
				page.drawText(seg.text, {
					x: penX,
					y: baseY,
					size: op.size,
					font,
					color: colorFromHex(seg.color),
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
				color: colorFromHex(op.color),
			});
		}
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
	const cards = [
		{ label: 'Total de linhas', value: summary.tl, decimals: 0 },
		{ label: 'Nota de conteúdo', value: summary.nc, decimals: 2 },
		{ label: 'Número de erros', value: summary.totalErros, decimals: 0 },
		{ label: 'Nota final prevista', value: summary.nr, decimals: 2, highlight: true },
	];
	let cursor = yTop;
	drawTextSimple(page, 'Resumo do espelho', x, cursor, BODY_SIZE, fonts.bold, TEXT);
	cursor -= BODY_SIZE + 6;

	const columns = 2;
	const gapX = 12;
	const gapY = 12;
	const cardWidth = columns > 1 ? (width - gapX) / columns : width;
	const cardHeight = 56;
	const padX = 12;
	const padY = 12;
	const labelSize = 9;
	const valueSize = 16;
	const valueGap = 6;

	cards.forEach((card, index) => {
		const col = index % columns;
		const row = Math.floor(index / columns);
		const cardX = x + col * (cardWidth + gapX);
		const cardTop = cursor - row * (cardHeight + gapY);
		const fillHex = card.highlight ? '#FFF7ED' : '#FFFFFF';
		const strokeHex = card.highlight ? '#FDBA74' : '#E6E8EB';
		drawRoundedRect(page, {
			x: cardX,
			y: cardTop - cardHeight,
			width: cardWidth,
			height: cardHeight,
			radius: 12,
			fill: colorFromHex(fillHex),
			stroke: colorFromHex(strokeHex),
			strokeWidth: 1,
		});

		const labelY = cardTop - padY - labelSize;
		page.drawText(card.label, {
			x: cardX + padX,
			y: labelY,
			size: labelSize,
			font: fonts.regular,
			color: colorFromHex('#6B7280'),
		});

		const formatted = formatPasValue(card.value, card.decimals);
		const valueY = labelY - valueGap - valueSize;
		page.drawText(formatted, {
			x: cardX + padX,
			y: valueY,
			size: valueSize,
			font: fonts.bold,
			color: colorFromHex('#0F172A'),
		});
	});

	const rows = Math.ceil(cards.length / columns);
	const gridHeight = rows * cardHeight + Math.max(0, rows - 1) * gapY;
	cursor -= gridHeight + (rows > 0 ? gapY : 0);
	return cursor;
}

function drawPasSectionHeader(page, x, y, width, label, fonts, options = {}) {
	drawRoundedRect(page, {
		x,
		y: y - BODY_SIZE - 4,
		width,
		height: BODY_SIZE + 6,
		radius: 10,
		fill: options.fill ? colorFromHex(options.fill) : colorFromHex('#F8FAFC'),
		stroke: options.border ? colorFromHex(options.border) : colorFromHex('#E2E8F0'),
		strokeWidth: 1,
	});
	page.drawText(label, {
		x: x + 12,
		y: y - BODY_SIZE,
		size: BODY_SIZE,
		font: fonts.bold,
		color: colorFromHex(options.title || TEXT_SUBTLE),
	});
	return y - (BODY_SIZE + 6);
}

function drawPasMacroSection(page, fonts, x, yTop, width, summary) {
	let cursor = yTop;
	cursor = drawPasSectionHeader(page, x, cursor, width, 'ASPECTOS MACROESTRUTURAIS', fonts, {
		fill: '#EBF2FF',
		border: '#CBD5F5',
		title: '#1D4ED8',
	});
	const rowHeight = BODY_SIZE + 16;
	summary.macro.forEach((row) => {
		const rowTop = cursor;
		cursor -= rowHeight;
		drawPasRow(page, fonts, x, rowTop, rowHeight, width, [
			{ text: row.label, ratio: 0.6, font: fonts.regular, color: TEXT },
			{ text: `0,00 – ${row.max.toFixed(2)}`, ratio: 0.2, font: fonts.regular, color: '#1D4ED8', align: 'center' },
			{ text: `${row.value.toFixed(2)} / ${row.max.toFixed(2)}`, ratio: 0.2, font: fonts.bold, color: TEXT, align: 'right' },
		]);
		cursor -= 6;
	});
	return cursor;
}

function drawPasMicroSection(page, fonts, x, yTop, width, summary) {
	let cursor = yTop;
	cursor = drawPasSectionHeader(page, x, cursor, width, 'ASPECTOS MICROESTRUTURAIS (ERROS)', fonts, {
		fill: '#FEF2F7',
		border: '#FCC5DB',
		title: '#BE185D',
	});
	const rowHeight = BODY_SIZE + 16;
	summary.micro.forEach((row) => {
		const rowTop = cursor;
		cursor -= rowHeight;
		drawPasRow(page, fonts, x, rowTop, rowHeight, width, [
			{ text: row.label, ratio: 0.7, font: fonts.regular, color: TEXT },
			{ text: String(row.value), ratio: 0.3, font: fonts.bold, color: '#BE185D', align: 'right' },
		]);
		cursor -= 6;
	});

	cursor -= BODY_SIZE + 6;
	const discountLabel = summary.discount ? `Desconto por erro: ${summary.discount.toFixed(3)} pt(s)` : 'Desconto por erro: —';
	drawTextSimple(page, discountLabel, x, cursor, BODY_SIZE - 1, fonts.regular, TEXT_SUBTLE);
	cursor -= BODY_SIZE + 4;
	const nrLabel = `Nota final prevista (NR): ${summary.nr.toFixed(2)} / 10`;
	drawTextSimple(page, nrLabel, x, cursor, BODY_SIZE, fonts.bold, TEXT);
	cursor -= BODY_SIZE + 6;
	return cursor;
}

function drawPasRow(page, fonts, x, yTop, height, width, cells) {
	const rowHeight = height;
	const bottom = yTop - rowHeight;
	drawRoundedRect(page, {
		x,
		y: bottom,
		width,
		height: rowHeight,
		radius: 10,
		fill: colorFromHex('#FFFFFF'),
		stroke: colorFromHex('#E2E8F0'),
		strokeWidth: 1,
	});
	let offset = x;
	cells.forEach((cell) => {
		const cellWidth = width * cell.ratio;
		const textX = offset + 12;
		const textY = bottom + (rowHeight - (BODY_SIZE - 1)) / 2;
		const align = cell.align || 'left';
		const font = cell.font || fonts.regular;
		const color = cell.color || TEXT;
		if (align === 'right') {
			const labelWidth = font.widthOfTextAtSize(cell.text, BODY_SIZE - 1);
			page.drawText(cell.text, {
				x: offset + cellWidth - 12 - labelWidth,
				y: textY,
				size: BODY_SIZE - 1,
				font,
				color: colorFromHex(color),
			});
		} else if (align === 'center') {
			const labelWidth = font.widthOfTextAtSize(cell.text, BODY_SIZE - 1);
			page.drawText(cell.text, {
				x: offset + (cellWidth - labelWidth) / 2,
				y: textY,
				size: BODY_SIZE - 1,
				font,
				color: colorFromHex(color),
			});
		} else {
			page.drawText(cell.text, {
				x: textX,
				y: textY,
				size: BODY_SIZE - 1,
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

function drawEnemMirrorInArea({ page, fonts, area, score }) {
	const summary = collectEnemData(score);
	let cursor = area.top;
	const title = 'ESPELHO DE CORREÇÃO — ENEM';
	page.drawText(title, {
		x: area.x,
		y: cursor,
		size: TITLE_SIZE,
		font: fonts.bold,
		color: colorFromHex(TEXT),
	});
	cursor -= TITLE_SIZE + 6;
	page.drawText('Competências e justificativas da avaliação', {
		x: area.x,
		y: cursor,
		size: BODY_SIZE,
		font: fonts.regular,
		color: colorFromHex(TEXT_SUBTLE),
	});
	cursor -= BODY_SIZE + 8;
	if (!summary) {
		page.drawText('Dados de competências ENEM indisponíveis.', {
			x: area.x,
			y: cursor,
			size: BODY_SIZE,
			font: fonts.regular,
			color: colorFromHex(TEXT_SUBTLE),
		});
		return;
	}

	const competencies = summary.competencies || [];
	const cardWidth = area.width;
	const minY = area.bottom;
	for (let index = 0; index < competencies.length; index += 1) {
		const comp = competencies[index];
		const key = `C${index + 1}`;
		const colors = ENEM_COLORS_HEX[key] || ENEM_COLORS_HEX.C1;
		const level = clampLevel(comp.level);
		const points = Number(comp.points) || POINTS_PER_LEVEL[level] || 0;
		const layout = buildCompetencyLayout(
			cardWidth,
			index,
			comp.title || `Competência ${index + 1}`,
			level,
			points,
			comp.justification,
			comp.reasons || [],
			fonts,
			colors,
		);

		if (cursor - layout.cardHeight < minY) {
			if (cursor <= minY) break;
		}

		const cardBottom = drawCompetencyCard(page, area.x, cursor, cardWidth, layout, fonts, colors);
		cursor = cardBottom - CONTENT_GAP;
		if (cursor <= minY) break;
	}

	const totalPoints = Array.isArray(summary.competencies)
		? summary.competencies.reduce((sum, comp) => {
			const lvl = clampLevel(comp.level);
			return sum + (POINTS_PER_LEVEL[lvl] || 0);
		}, 0)
		: null;
	if (totalPoints != null && cursor - (TITLE_SIZE + 4) > minY) {
		page.drawText(`NOTA FINAL: ${totalPoints} / 1000`, {
			x: area.x,
			y: cursor,
			size: TITLE_SIZE,
			font: fonts.bold,
			color: colorFromHex(TEXT),
		});
	}
}

function drawPasMirrorInArea({ page, fonts, area, score }) {
	const summary = collectPasData(score);
	let cursor = area.top;
	const title = 'ESPELHO DE CORREÇÃO — PAS/UnB';
	page.drawText(title, {
		x: area.x,
		y: cursor,
		size: TITLE_SIZE,
		font: fonts.bold,
		color: colorFromHex(TEXT),
	});
	cursor -= TITLE_SIZE + 6;
	page.drawText('Aspectos macro e microestruturais', {
		x: area.x,
		y: cursor,
		size: BODY_SIZE,
		font: fonts.regular,
		color: colorFromHex(TEXT_SUBTLE),
	});
	cursor -= BODY_SIZE + 8;
	if (!summary) {
		page.drawText('Dados PAS indisponíveis.', {
			x: area.x,
			y: cursor,
			size: BODY_SIZE,
			font: fonts.regular,
			color: colorFromHex(TEXT_SUBTLE),
		});
		return;
	}

	const minY = area.bottom;
	cursor = drawPasSummarySection(page, fonts, area.x, cursor, area.width, summary);
	cursor -= CONTENT_GAP;
	if (cursor <= minY) return;
	cursor = drawPasMacroSection(page, fonts, area.x, cursor, area.width, summary);
	cursor -= CONTENT_GAP;
	if (cursor <= minY) return;
	drawPasMicroSection(page, fonts, area.x, cursor, area.width, summary);
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
	if (!essay?.originalUrl) {
		throw new Error('Redação sem arquivo original.');
	}

	const originalBytes = await fetchRemoteBytes(essay.originalUrl);
	if (!originalBytes || !originalBytes.length) {
		throw new Error('Arquivo original indisponível para gerar o PDF corrigido.');
	}

	const pdfDoc = await PDFDocument.create();
	const fonts = {
		regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
		bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
	};

	const brandMarkImage = await embedBrandMark(pdfDoc);

	const declaredMime = essay?.originalMimeType || null;
	const inferredImage = (() => {
		if (!originalBytes || originalBytes.length < 4) return null;
		const b0 = originalBytes[0];
		const b1 = originalBytes[1];
		if (b0 === 0x89 && b1 === 0x50) return 'image/png';
		if (b0 === 0xff && b1 === 0xd8) return 'image/jpeg';
		return null;
	})();
	let treatAsImage = Boolean(declaredMime?.startsWith('image/')) || (!declaredMime && inferredImage);
	let embeddedImage = null;
	let embeddedPages = [];

	if (treatAsImage) {
		try {
			embeddedImage = declaredMime?.includes('png') || inferredImage?.includes('png')
				? await pdfDoc.embedPng(originalBytes)
				: await pdfDoc.embedJpg(originalBytes);
		} catch (err) {
			console.warn('[pdf] Falha ao incorporar imagem, tentando carregar como PDF.', err?.message || err);
			treatAsImage = false;
		}
	}

	if (!treatAsImage) {
		try {
			const originalDoc = await PDFDocument.load(originalBytes);
			const count = originalDoc.getPageCount();
			embeddedPages = await pdfDoc.embedPdf(originalBytes, Array.from({ length: count }, (_, idx) => idx));
		} catch (err) {
			console.warn('[pdf] Falha ao carregar PDF original, tentando como imagem.', err?.message || err);
			treatAsImage = true;
			embeddedImage = await pdfDoc.embedJpg(originalBytes);
		}
	}

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
	const commentsWidth = Math.min(Math.round(contentWidth * 0.3), contentWidth - 120);
	const previewWidth = Math.max(contentWidth - commentsWidth - CONTENT_GAP, 160);
	const previewX = MARGIN;
	const gap = CONTENT_GAP;
	const commentsAreaX = previewX + previewWidth + gap;
	const commentsAreaWidth = Math.min(commentsWidth, contentWidth - previewWidth - gap);

	const firstPage = pdfDoc.addPage([A4.width, A4.height]);
	firstPage.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: colorFromHex(HEX.pageBg) });
	const firstTop = drawHeroHeader(heroArgs(firstPage, fonts));

	let embeddedPreviewPage = null;
	if (!treatAsImage && embeddedPages.length) {
		embeddedPreviewPage = embeddedPages[0];
	}

	const previewArea = {
		x: previewX,
		width: previewWidth,
		top: firstTop,
		bottom: MARGIN,
	};
	drawDocumentPreview({
		page: firstPage,
		fonts,
		area: previewArea,
		embeddedPage: embeddedPreviewPage,
		embeddedImage: treatAsImage ? embeddedImage : null,
		annotations: firstPageAnnotations,
	});

	const commentsAreaPage1 = {
		x: commentsAreaX,
		width: commentsAreaWidth,
		top: firstTop,
		bottom: MARGIN,
	};
	let commentsIndex = drawCommentsColumn({
		page: firstPage,
		fonts,
		area: commentsAreaPage1,
		annotations: annotationsOrdered,
		startIndex: 0,
		title: 'Comentários',
	});

	const secondPage = pdfDoc.addPage([A4.width, A4.height]);
	secondPage.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: colorFromHex(HEX.pageBg) });
	const secondTop = drawHeroHeader(heroArgs(secondPage, fonts));

	const mirrorArea = {
		x: previewX,
		width: previewWidth,
		top: secondTop,
		bottom: MARGIN,
	};
	if (essay?.type === 'ENEM') {
		drawEnemMirrorInArea({ page: secondPage, fonts, area: mirrorArea, score });
	} else {
		drawPasMirrorInArea({ page: secondPage, fonts, area: mirrorArea, score });
	}

	const commentsAreaPage2 = {
		x: commentsAreaX,
		width: commentsAreaWidth,
		top: secondTop,
		bottom: MARGIN,
	};
	commentsIndex = drawCommentsColumn({
		page: secondPage,
		fonts,
		area: commentsAreaPage2,
		annotations: annotationsOrdered,
		startIndex: commentsIndex,
		title: commentsIndex > 0 ? 'Comentários (continuação)' : 'Comentários',
	});

	if (commentsIndex < annotationsOrdered.length) {
		const note = 'Comentários adicionais disponíveis no workspace.';
		const noteY = commentsAreaPage2.bottom + COMMENT.textSize + 4;
		secondPage.drawText(note, {
			x: commentsAreaPage2.x,
			y: noteY,
			size: COMMENT.textSize,
			font: fonts.regular,
			color: colorFromHex(TEXT_SUBTLE),
		});
	}

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

module.exports = {
	generateCorrectedEssayPdf,
};
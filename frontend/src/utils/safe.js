export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

export function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}

export function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function asString(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

import { classColor } from '@/utils/classColor';

type ClassIdentifier = string | { id?: string | null; name?: string | null } | null | undefined;

function resolveIdentifier(input: ClassIdentifier): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (input.id) return String(input.id);
  if (input.name) return String(input.name);
  return '';
}

export function getClassColor(identifier: ClassIdentifier): string {
  const { background } = classColor(resolveIdentifier(identifier));
  return background;
}

export function getClassColorPair(identifier: ClassIdentifier) {
  return classColor(resolveIdentifier(identifier));
}

export default getClassColor;

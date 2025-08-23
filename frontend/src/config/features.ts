export const flags = {
  redaction: ((import.meta as any).env?.REDACTION_ENABLED ?? 'false') === 'true',
};

export default flags;

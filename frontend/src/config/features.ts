let redaction = process.env.REDACTION_ENABLED;
if (redaction === undefined) {
  try {
    redaction = new Function('return import.meta.env.REDACTION_ENABLED')();
  } catch {}
}

export const flags = {
  redaction: (redaction ?? 'false') === 'true',
};

export default flags;

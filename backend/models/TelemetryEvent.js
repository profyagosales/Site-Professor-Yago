const mongoose = require('mongoose');

const telemetryEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  message: { type: String, default: null },
  payload: { type: Object, default: {} },
  ua: { type: String, default: null },
  ip: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

telemetryEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TelemetryEvent', telemetryEventSchema, 'telemetry_events');

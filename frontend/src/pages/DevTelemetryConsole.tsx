import React from 'react';
import TelemetryConsole from '@/components/TelemetryConsole';

const enabled = import.meta.env.VITE_FEATURE_TELEMETRY_VIEW === '1';

export default function DevTelemetryConsole() {
  if (!enabled) return null;
  return (
    <div className="max-w-5xl mx-auto my-6">
      <TelemetryConsole />
    </div>
  );
}

import type { DragEvent } from 'react';

export const RADAR_ITEM_MIME = 'application/x-radar-item';

export type RadarDraggableKind = 'student' | 'class' | 'activity';

export type RadarDraggablePayload = {
  id: string;
  label: string;
  kind: RadarDraggableKind;
};

export function readRadarDragData(event: DragEvent): RadarDraggablePayload | null {
  try {
    const json = event.dataTransfer.getData(RADAR_ITEM_MIME);
    if (!json) return null;
    const payload = JSON.parse(json);
    if (payload && typeof payload.id === 'string' && typeof payload.kind === 'string') {
      return payload as RadarDraggablePayload;
    }
    return null;
  } catch (error) {
    console.warn('[Radar] drag payload parse failed', error);
    return null;
  }
}

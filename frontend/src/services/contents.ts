import type { ContentItem } from '@/types/school';
import {
  listContents as listContentsImpl,
  listUpcomingContents as listUpcomingContentsImpl,
  createContent as createContentImpl,
  updateContent as updateContentImpl,
  deleteContent as deleteContentImpl,
  quickCreateContent as quickCreateContentImpl,
  toggleContentStatus as toggleContentStatusImpl,
} from './contents.js';

export type ListContentsParams = {
  classId?: string;
  bimester?: number | string;
  from?: string;
  to?: string;
  done?: boolean | string;
  limit?: number;
  offset?: number;
  sort?: 'asc' | 'desc';
};

export type ContentsListResponse = {
  items: ContentItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ContentUpsertPayload = {
  classId: string;
  bimester: number;
  title: string;
  description?: string;
  date?: string;
  done?: boolean;
};

export type QuickContentPayload = {
  classId: string;
  term: number;
  title: string;
  description?: string;
  date: string;
  done?: boolean;
};

export async function listContents(params: ListContentsParams = {}): Promise<ContentsListResponse> {
  return listContentsImpl(params);
}

export async function listUpcomingContents(args: { teacherId: string; daysAhead?: number; limit?: number }): Promise<ContentItem[]> {
  return listUpcomingContentsImpl(args);
}

export async function createContent(payload: ContentUpsertPayload): Promise<ContentItem> {
  return createContentImpl(payload);
}

export async function quickCreateContent(payload: QuickContentPayload): Promise<ContentItem> {
  return quickCreateContentImpl(payload);
}

export async function updateContent(id: string, payload: Partial<ContentUpsertPayload>): Promise<ContentItem> {
  return updateContentImpl(id, payload);
}

export async function deleteContent(id: string): Promise<boolean> {
  return deleteContentImpl(id);
}

export async function toggleContentStatus(contentId: string, done: boolean): Promise<ContentItem> {
  return toggleContentStatusImpl(contentId, done);
}

export default {
  listContents,
  listUpcomingContents,
  createContent,
  quickCreateContent,
  updateContent,
  deleteContent,
  toggleContentStatus,
};

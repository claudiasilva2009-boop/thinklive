import { api } from './api';
import {
  BookShelfStatus,
  CatalogWorkSnapshot,
  MediaShelfEntry,
} from '../types/thinklive';

export const GUEST_BOOKS_SHELF_KEY = 'thinklive_guest_books_shelf_v1';

export const BOOK_SHELF_LABELS: Record<BookShelfStatus, string> = {
  quero_ler: 'Quero Ler',
  lendo: 'Lendo Atualmente',
  ja_li: 'Já Li',
  abandonado: 'Abandonados',
};

export const BOOK_SHELF_ORDER: BookShelfStatus[] = [
  'quero_ler',
  'lendo',
  'ja_li',
  'abandonado',
];

export function normalizeBookIdentity(title?: string, creator?: string): string {
  const clean = (value?: string) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const normTitle = clean(title);
  const normCreator = clean(creator);
  return normTitle ? `${normTitle}::${normCreator}` : '';
}

export function isSameBookEntry(
  a: Pick<MediaShelfEntry, 'workId' | 'mediaKind' | 'workSnapshot'>,
  b: { workId: string; title?: string; creator?: string; mediaKind?: string }
): boolean {
  if (a.workId === b.workId) return true;
  if (a.mediaKind === 'livro' && (!b.mediaKind || b.mediaKind === 'livro')) {
    const keyA = normalizeBookIdentity(a.workSnapshot?.title, a.workSnapshot?.creator);
    const keyB = normalizeBookIdentity(b.title, b.creator);
    if (keyA && keyB && keyA === keyB) return true;
  }
  return false;
}

export function deduplicateBookShelves(entries: MediaShelfEntry[]): MediaShelfEntry[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
  const seenWorkIds = new Set<string>();
  const seenBookKeys = new Set<string>();
  const result: MediaShelfEntry[] = [];

  for (const entry of sorted) {
    if (entry.mediaKind !== 'livro') continue;
    if (!entry.status && !entry.isFavorite) continue;
    if (seenWorkIds.has(entry.workId)) continue;
    const bookKey = normalizeBookIdentity(
      entry.workSnapshot?.title,
      entry.workSnapshot?.creator
    );
    if (bookKey && seenBookKeys.has(bookKey)) continue;

    seenWorkIds.add(entry.workId);
    if (bookKey) seenBookKeys.add(bookKey);
    result.push(entry);
  }

  return result;
}

export function readGuestBookShelves(): MediaShelfEntry[] {
  try {
    const raw = localStorage.getItem(GUEST_BOOKS_SHELF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateBookShelves(parsed as MediaShelfEntry[]);
  } catch {
    return [];
  }
}

export function writeGuestBookShelves(entries: MediaShelfEntry[]): MediaShelfEntry[] {
  const deduped = deduplicateBookShelves(entries);
  try {
    localStorage.setItem(GUEST_BOOKS_SHELF_KEY, JSON.stringify(deduped));
  } catch {
    // ignore storage quota errors
  }
  return deduped;
}

export function upsertGuestBookShelf(
  workId: string,
  snapshot: CatalogWorkSnapshot,
  patch: { status?: BookShelfStatus | null; isFavorite?: boolean }
): { entries: MediaShelfEntry[]; myShelf: MediaShelfEntry | null } {
  const current = readGuestBookShelves();
  const existing = current.find((item) =>
    isSameBookEntry(item, {
      workId,
      title: snapshot.title,
      creator: snapshot.creator,
      mediaKind: snapshot.mediaKind,
    })
  );

  const nextStatus =
    patch.status !== undefined ? patch.status : (existing?.status as BookShelfStatus | null) ?? null;
  const nextFavorite =
    patch.isFavorite !== undefined ? Boolean(patch.isFavorite) : existing?.isFavorite ?? false;

  const remaining = current.filter(
    (item) =>
      !isSameBookEntry(item, {
        workId,
        title: snapshot.title,
        creator: snapshot.creator,
        mediaKind: snapshot.mediaKind,
      })
  );

  if (!nextStatus && !nextFavorite) {
    const saved = writeGuestBookShelves(remaining);
    return { entries: saved, myShelf: null };
  }

  const nextEntry: MediaShelfEntry = {
    id: existing?.id || `guest_${workId}`,
    userId: 'guest',
    workId,
    mediaKind: 'livro',
    status: nextStatus,
    isFavorite: nextFavorite,
    workSnapshot: { ...snapshot, id: workId, mediaKind: 'livro' },
    updatedAt: new Date().toISOString(),
  };

  const saved = writeGuestBookShelves([nextEntry, ...remaining]);
  return { entries: saved, myShelf: nextEntry };
}

export async function syncGuestBookShelvesToAccount(
  existingDbEntries: MediaShelfEntry[]
): Promise<MediaShelfEntry[]> {
  const guestEntries = readGuestBookShelves();
  if (guestEntries.length === 0) return deduplicateBookShelves(existingDbEntries);

  const merged = [...existingDbEntries];
  for (const guest of guestEntries) {
    const match = merged.find((dbItem) =>
      isSameBookEntry(dbItem, {
        workId: guest.workId,
        title: guest.workSnapshot.title,
        creator: guest.workSnapshot.creator,
        mediaKind: 'livro',
      })
    );

    if (!match) {
      try {
        const res = await api.updateWorkShelf(guest.workId, {
          status: guest.status,
          isFavorite: guest.isFavorite,
          workSnapshot: guest.workSnapshot,
        });
        if (res.myShelf) merged.unshift(res.myShelf);
      } catch {
        // ignore transient sync error for individual item
      }
    } else if ((!match.status && guest.status) || (!match.isFavorite && guest.isFavorite)) {
      try {
        const res = await api.updateWorkShelf(match.workId, {
          status: match.status || guest.status,
          isFavorite: match.isFavorite || guest.isFavorite,
          workSnapshot: match.workSnapshot,
        });
        if (res.myShelf) {
          const idx = merged.findIndex((m) => m.workId === match.workId);
          if (idx >= 0) merged[idx] = res.myShelf;
        }
      } catch {
        // ignore
      }
    }
  }

  try {
    localStorage.removeItem(GUEST_BOOKS_SHELF_KEY);
  } catch {
    // ignore
  }

  return deduplicateBookShelves(merged);
}

/**
 * Notes storage utility with TTL and quota management
 * - 7-day TTL for all notes
 * - Max 50 notes per event
 * - Auto-cleanup on quota exceeded
 * - Clear all on logout
 */

const NOTES_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_NOTES_PER_EVENT = 50;
const STORAGE_PREFIX = 'brace-notes-';

interface StoredNote {
  value: string;
  timestamp: number;
}

function getCommonKey(eventId?: string): string {
  return eventId ? `${STORAGE_PREFIX}common-${eventId}` : `${STORAGE_PREFIX}global`;
}

function getProblemKey(problemId: string): string {
  return `${STORAGE_PREFIX}problem-${problemId}`;
}

function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > NOTES_TTL_MS;
}

function getEventIdFromProblemKey(key: string): string | null {
  const match = key.match(/brace-notes-problem-(.+?)-/);
  return match?.[1] || null;
}

export function getNote(type: 'common' | 'problem', id: string): string {
  try {
    const key = type === 'common' ? getCommonKey(id) : getProblemKey(id);
    const raw = localStorage.getItem(key);
    if (!raw) return "";
    
    const stored: StoredNote = JSON.parse(raw);
    if (isExpired(stored.timestamp)) {
      localStorage.removeItem(key);
      return "";
    }
    return stored.value;
  } catch {
    return "";
  }
}

export function setNote(type: 'common' | 'problem', id: string, value: string): void {
  try {
    // Enforce quota for problem notes
    if (type === 'problem') {
      const eventId = id; // problemId includes eventId prefix
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith(`${STORAGE_PREFIX}problem-${eventId}-`) || k === getCommonKey(eventId)
      );
      if (keys.length >= MAX_NOTES_PER_EVENT) {
        // Remove oldest problem note (not common)
        const problemKeys = keys.filter(k => k.startsWith(`${STORAGE_PREFIX}problem-`));
        if (problemKeys.length > 0) {
          const oldest = problemKeys.sort((a, b) => {
            const ta = JSON.parse(localStorage.getItem(a) || '{}').timestamp || 0;
            const tb = JSON.parse(localStorage.getItem(b) || '{}').timestamp || 0;
            return ta - tb;
          })[0];
          localStorage.removeItem(oldest);
        }
      }
    }
    
    const key = type === 'common' ? getCommonKey(id) : getProblemKey(id);
    localStorage.setItem(key, JSON.stringify({
      value,
      timestamp: Date.now(),
    }));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      clearOldNotes();
      try {
        const key = type === 'common' ? getCommonKey(id) : getProblemKey(id);
        localStorage.setItem(key, JSON.stringify({
          value,
          timestamp: Date.now(),
        }));
      } catch {
        console.warn('Notes storage full, could not save');
      }
    }
  }
}

export function clearEventNotes(eventId: string, problemIds: string[]): void {
  localStorage.removeItem(getCommonKey(eventId));
  problemIds.forEach((id) => localStorage.removeItem(getProblemKey(id)));
}

export function clearAllNotes(): void {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

function clearOldNotes(): void {
  const now = Date.now();
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(STORAGE_PREFIX)) {
      try {
        const stored: StoredNote = JSON.parse(localStorage.getItem(key) || '{}');
        if (isExpired(stored.timestamp)) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key); // Corrupted entry
      }
    }
  });
}
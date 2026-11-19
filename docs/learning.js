import { sanitizeSessions } from './study-session.js';
import { defaultVideos, sanitizeVideos } from './videos.js';
/** Pure learning state helpers. Review intervals are product defaults, not a level certificate. */
const DAY = 86_400_000;
const PARTS = ['vocab', 'grammar', 'shadow', 'apply'];
const RATINGS = ['again', 'hard', 'good'];
const KINDS = ['grammar', 'shadow'];
const GOOD_INTERVALS = [1, 3, 7, 14, 30];
const LESSON_ID = /^w[1-4]d[1-7]$/;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function asDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('Ngày không hợp lệ.');
  return date;
}

export function localDay(date = new Date()) {
  const value = asDate(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function freshState(now = new Date()) {
  return {
    version: 1,
    startedAt: localDay(now),
    activeLesson: 'w1d1',
    completed: {},
    vocab: {},
    history: [],
    attempts: [],
    preferences: { rate: 0.85, voice: '', shadowSupport: 'auto', oceanMotion: true },
    videos: defaultVideos(),
    sessions: {},
    lastPage: 'home',
    lastBackupAt: null,
    backupDismissedUntil: null,
  };
}

export function getCardId(word) {
  const text = typeof word === 'string' ? word : word?.en;
  return typeof text === 'string' ? text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

export function scheduleCard(existing, rating, now = new Date()) {
  if (!RATINGS.includes(rating)) throw new TypeError('Mức ghi nhớ không hợp lệ.');
  const time = asDate(now).getTime();
  const oldReps = Number.isSafeInteger(existing?.reps) && existing.reps >= 0 ? existing.reps : 0;
  const oldLapses = Number.isSafeInteger(existing?.lapses) && existing.lapses >= 0 ? existing.lapses : 0;
  const reps = rating === 'again' ? 0 : rating === 'good' ? oldReps + 1 : oldReps;
  const interval = rating === 'again' ? 0 : rating === 'hard' ? 1 : GOOD_INTERVALS[Math.min(reps - 1, GOOD_INTERVALS.length - 1)];
  return {
    due: time + (rating === 'again' ? 10 * 60_000 : interval * DAY),
    interval,
    reps,
    lapses: oldLapses + (rating === 'again' ? 1 : 0),
    lastRating: rating,
  };
}

/** Extra practice before a card is due must not inflate its recall interval. */
export function reviewCard(existing, rating, now = new Date()) {
  if (!RATINGS.includes(rating)) throw new TypeError('Mức ghi nhớ không hợp lệ.');
  const date = asDate(now);
  const early = Number.isFinite(existing?.due) && existing.due > date.getTime();
  if (early && rating !== 'again') return { ...existing, lastRating: rating };
  const next = scheduleCard(existing, rating, date);
  if (early && rating === 'again') next.due = Math.min(existing.due, next.due);
  return next;
}

export function dueCards(state, allWords, now = new Date()) {
  const time = asDate(now).getTime();
  const seen = new Set();
  const due = [];
  for (const word of allWords) {
    const cardId = getCardId(word);
    if (!cardId || seen.has(cardId)) continue;
    seen.add(cardId);
    if (!Object.prototype.hasOwnProperty.call(state.vocab ?? {}, cardId)) continue;
    const card = state.vocab[cardId];
    if (Number.isFinite(card?.due) && card.due <= time) due.push({ ...word, cardId, due: card.due });
  }
  return due.sort((a, b) => a.due - b.due || a.cardId.localeCompare(b.cardId));
}

/** Accepts lessonDone(state, lessonId), or lessonDone(completedRecord). */
export function lessonDone(stateOrRecord, lessonId) {
  const record = lessonId === undefined ? stateOrRecord : stateOrRecord?.completed?.[lessonId];
  return PARTS.every(part => record?.[part] === true);
}

export function completionCount(state) {
  return Object.values(state.completed ?? {}).filter(record => lessonDone(record)).length;
}

export function markLessonPart(state, lessonId, part, now = new Date()) {
  if (!LESSON_ID.test(lessonId) || !PARTS.includes(part)) throw new TypeError('Phần bài học không hợp lệ.');
  const old = state.completed?.[lessonId];
  if (old?.[part] === true) return state;
  const record = { vocab: false, grammar: false, shadow: false, apply: false, ...old, [part]: true };
  const newlyCompleted = lessonDone(record) && !lessonDone(old);
  const history = [...(state.history ?? [])];
  if (newlyCompleted) {
    const date = asDate(now);
    record.finishedAt = date.toISOString();
    const day = localDay(date);
    if (!history.includes(day)) history.push(day);
  }
  return { ...state, completed: { ...(state.completed ?? {}), [lessonId]: record }, history };
}

export function recordAttempt(state, kind, score, hints = 0, now = new Date()) {
  if (!KINDS.includes(kind) || !Number.isFinite(score) || score < 0 || score > 1 || !Number.isSafeInteger(hints) || hints < 0) {
    throw new TypeError('Kết quả luyện tập không hợp lệ.');
  }
  const attempt = { kind, score, hints, at: asDate(now).toISOString() };
  return { ...state, attempts: [...(state.attempts ?? []), attempt].slice(-180) };
}

export function suggestedSupport(state, kind = 'shadow') {
  const recent = (state.attempts ?? []).filter(attempt => attempt.kind === kind).slice(-3);
  if (recent.length < 3) return 'guided';
  if (recent.every(attempt => attempt.score >= 0.8 && attempt.hints === 0)) return 'independent';
  if (recent.every(attempt => attempt.score >= 0.6 && attempt.hints <= 1)) return 'balanced';
  return 'guided';
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function isCalendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTimestamp(value) {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
}

/** Returns a clean state or null. Unknown properties are discarded. */
export function sanitizeState(value) {
  if (!isObject(value) || value.version !== 1 || !isCalendarDay(value.startedAt) || !LESSON_ID.test(value.activeLesson)) return null;
  if (!isObject(value.completed) || Object.keys(value.completed).length > 28 || !isObject(value.vocab) || Object.keys(value.vocab).length > 1000) return null;
  if (!Array.isArray(value.history) || value.history.length > 5000 || !value.history.every(isCalendarDay)) return null;
  const preferences = value.preferences;
  if (!isObject(preferences) || !Number.isFinite(preferences.rate) || preferences.rate < 0.5 || preferences.rate > 1.5 || typeof preferences.voice !== 'string' || preferences.voice.length > 300) return null;
  const completed = {};
  for (const [id, entry] of Object.entries(value.completed)) {
    if (!LESSON_ID.test(id) || !isObject(entry) || !PARTS.every(part => typeof entry[part] === 'boolean')) return null;
    if (entry.finishedAt !== undefined && !isTimestamp(entry.finishedAt)) return null;
    const clean = Object.fromEntries(PARTS.map(part => [part, entry[part]]));
    if (entry.finishedAt !== undefined && lessonDone(clean)) clean.finishedAt = new Date(entry.finishedAt).toISOString();
    completed[id] = clean;
  }
  const vocabEntries = [];
  for (const [id, card] of Object.entries(value.vocab)) {
    if (!id || id.length > 200 || UNSAFE_KEYS.has(id) || getCardId(id) !== id || !isObject(card)) return null;
    if (!Number.isFinite(card.due) || card.due < 0 || card.due > 8_640_000_000_000_000 || !Number.isFinite(card.interval) || card.interval < 0 || card.interval > 365) return null;
    if (!Number.isSafeInteger(card.reps) || card.reps < 0 || card.reps > 100_000 || !Number.isSafeInteger(card.lapses) || card.lapses < 0 || card.lapses > 100_000 || !RATINGS.includes(card.lastRating)) return null;
    vocabEntries.push([id, { due: card.due, interval: card.interval, reps: card.reps, lapses: card.lapses, lastRating: card.lastRating }]);
  }
  const rawAttempts = value.attempts ?? [];
  if (!Array.isArray(rawAttempts) || rawAttempts.length > 500) return null;
  const attempts = [];
  for (const attempt of rawAttempts) {
    if (!isObject(attempt) || !KINDS.includes(attempt.kind) || !Number.isFinite(attempt.score) || attempt.score < 0 || attempt.score > 1 || !Number.isSafeInteger(attempt.hints) || attempt.hints < 0 || attempt.hints > 1000 || !isTimestamp(attempt.at)) return null;
    attempts.push({ kind: attempt.kind, score: attempt.score, hints: attempt.hints, at: new Date(attempt.at).toISOString() });
  }
  return {
    version: 1,
    startedAt: value.startedAt,
    activeLesson: value.activeLesson,
    completed,
    vocab: Object.fromEntries(vocabEntries),
    history: [...new Set(value.history)],
    attempts: attempts.slice(-180),
    preferences: { rate: preferences.rate, voice: preferences.voice, shadowSupport: ['auto', 'guided', 'balanced', 'independent'].includes(preferences.shadowSupport) ? preferences.shadowSupport : 'auto', oceanMotion: preferences.oceanMotion !== false },
    videos: sanitizeVideos(value.videos),
    sessions: sanitizeSessions(value.sessions),
    lastPage: ['home', 'weeks', 'vocab', 'grammar', 'shadow', 'settings', 'phat'].includes(value.lastPage) ? value.lastPage : 'home',
    lastBackupAt: isTimestamp(value.lastBackupAt) ? new Date(value.lastBackupAt).toISOString() : null,
    backupDismissedUntil: isTimestamp(value.backupDismissedUntil) ? new Date(value.backupDismissedUntil).toISOString() : null,
  };
}

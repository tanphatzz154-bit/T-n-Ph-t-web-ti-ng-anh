import { weeks } from './curriculum.js';

const lessons = weeks.flatMap(week => week.days);
const lessonById = new Map(lessons.map(lesson => [lesson.id, lesson]));
const pages = new Set(['home', 'weeks', 'vocab', 'grammar', 'shadow', 'settings']);
const ratings = new Set(['hard', 'okay', 'easy']);
const epoch = '1970-01-01T00:00:00.000Z';
const cardId = word => word.en.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const knownCards = new Set(lessons.flatMap(lesson => lesson.words.map(cardId)));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const isIndex = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const boundedString = (value, maximum) => typeof value === 'string' ? value.slice(0, maximum) : '';

function calendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

function timestamp(value) {
  if (typeof value !== 'string' || value.length > 40 || !Number.isFinite(Date.parse(value))) return epoch;
  return new Date(value).toISOString();
}

/** A fresh, independent snapshot. Unknown lesson IDs return null. */
export function defaultStudySession(lessonId) {
  const lesson = lessonById.get(lessonId);
  if (!lesson) return null;
  return {
    page: 'home',
    vocab: {
      mode: 'learn', cardIds: lesson.words.map(cardId), index: 0, visited: [],
      revealed: false, reviewFirst: false, reviewDoneOn: '',
    },
    grammar: {
      index: 0, answers: lesson.grammar.questions.map(() => null), finished: false,
      attemptSaved: false, writing: '', showSample: false, draft: '',
    },
    shadow: {
      lineIndex: 0, showEnglish: true, showVietnamese: true,
      usedEnglish: false, usedVietnamese: false, rating: null,
      attemptSaved: false, hasPlayed: false,
    },
    updatedAt: epoch,
  };
}

function sanitizeVocab(value, fallback) {
  if (!isObject(value) || !['learn', 'review'].includes(value.mode)
      || !Array.isArray(value.cardIds) || value.cardIds.length > 1000
      || !value.cardIds.every(id => typeof id === 'string' && knownCards.has(id))
      || new Set(value.cardIds).size !== value.cardIds.length) return fallback;
  const ids = value.cardIds;
  if (value.mode === 'learn' && (ids.length !== fallback.cardIds.length
      || ids.some((id, index) => id !== fallback.cardIds[index]))) return fallback;
  if (!isIndex(value.index, ids.length) || !Array.isArray(value.visited)
      || value.visited.length > ids.length
      || !value.visited.every(index => isIndex(index, ids.length - 1))
      || new Set(value.visited).size !== value.visited.length) return fallback;
  const visited = [...value.visited];
  const missing = ids.findIndex((_, index) => !visited.includes(index));
  // A stale or hand-edited snapshot cannot bypass cards just by setting index to the end.
  const index = value.index === ids.length && missing !== -1 ? missing : value.index;
  return {
    mode: value.mode, cardIds: [...ids], index, visited,
    revealed: index < ids.length && value.revealed === true,
    reviewFirst: value.reviewFirst === true,
    reviewDoneOn: calendarDay(value.reviewDoneOn),
  };
}

function sanitizeGrammar(value, fallback, lesson) {
  if (!isObject(value)) return fallback;
  const writing = boundedString(value.writing, 4000);
  const showSample = value.showSample === true;
  const draft = boundedString(value.draft, 300);
  const reset = () => ({ ...fallback, writing, showSample, draft });
  const questions = lesson.grammar.questions;
  if (!isIndex(value.index, questions.length - 1) || !Array.isArray(value.answers)
      || value.answers.length > questions.length) return reset();
  const answers = questions.map((question, index) => {
    const answer = value.answers[index];
    if (answer === null || answer === undefined) return null;
    if (question.type === 'fill') {
      return typeof answer === 'string' && answer.trim() && answer.length <= 300 ? answer : null;
    }
    return isIndex(answer, question.options.length - 1) ? answer : null;
  });
  const missing = answers.findIndex(answer => answer === null);
  const finished = value.finished === true && missing === -1;
  // Revisit any earlier unfinished question instead of restoring a skipped position.
  const index = missing !== -1 && missing < value.index ? missing : value.index;
  return {
    index, answers, finished, attemptSaved: finished && value.attemptSaved === true,
    writing, showSample, draft,
  };
}

function sanitizeShadow(value, fallback, lesson) {
  if (!isObject(value)) return fallback;
  const rating = ratings.has(value.rating) ? value.rating : null;
  const hasPlayed = value.hasPlayed === true;
  return {
    lineIndex: isIndex(value.lineIndex, lesson.shadow.lines.length - 1) ? value.lineIndex : 0,
    showEnglish: typeof value.showEnglish === 'boolean' ? value.showEnglish : true,
    showVietnamese: typeof value.showVietnamese === 'boolean' ? value.showVietnamese : true,
    usedEnglish: value.usedEnglish === true,
    usedVietnamese: value.usedVietnamese === true,
    rating,
    attemptSaved: hasPlayed && rating !== null && value.attemptSaved === true,
    hasPlayed,
  };
}

/**
 * Optional resume data never makes an otherwise valid progress backup unreadable.
 * Unknown entries are dropped; damaged sections reset independently. Returned data
 * contains only known fields, is detached from input, and has at most 28 entries.
 */
export function sanitizeSessions(value) {
  if (!isObject(value)) return {};
  const result = {};
  for (const lesson of lessons) {
    if (!Object.prototype.hasOwnProperty.call(value, lesson.id)) continue;
    const entry = value[lesson.id];
    if (!isObject(entry) || entry.page !== undefined && !pages.has(entry.page)) continue;
    const fallback = defaultStudySession(lesson.id);
    result[lesson.id] = {
      page: entry.page ?? 'home',
      vocab: sanitizeVocab(entry.vocab, fallback.vocab),
      grammar: sanitizeGrammar(entry.grammar, fallback.grammar, lesson),
      shadow: sanitizeShadow(entry.shadow, fallback.shadow, lesson),
      updatedAt: timestamp(entry.updatedAt),
    };
  }
  return result;
}

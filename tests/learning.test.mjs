import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, localDay, getCardId, scheduleCard, reviewCard, dueCards, markLessonPart, lessonDone, completionCount, recordAttempt, suggestedSupport, sanitizeState } from '../docs/learning.js';

const now = new Date(2026, 10, 19, 10, 0, 0);
const DAY = 86_400_000;

test('uses the local calendar day, including near-midnight times', () => {
  assert.equal(localDay(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
  assert.equal(localDay(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  assert.equal(freshState(now).startedAt, '2026-11-19');
});

test('successful recall progresses through intervals and caps at thirty days', () => {
  let card;
  for (const expected of [1, 3, 7, 14, 30, 30]) {
    const previous = card ? { ...card } : undefined;
    const original = card;
    card = scheduleCard(card, 'good', now);
    assert.equal(card.interval, expected);
    assert.equal(card.due, now.getTime() + expected * DAY);
    if (original) assert.deepEqual(original, previous);
  }
});

test('forgotten cards return in ten minutes and restart successful-recall spacing', () => {
  const established = { reps: 4, lapses: 1 };
  const missed = scheduleCard(established, 'again', now);
  assert.equal(missed.due, now.getTime() + 600_000);
  assert.equal(missed.reps, 0);
  assert.equal(missed.lapses, 2);
  assert.equal(scheduleCard(missed, 'good', now).interval, 1);
  const hard = scheduleCard(established, 'hard', now);
  assert.equal(hard.interval, 1);
  assert.equal(hard.reps, 4);
});

test('extra practice before the due time never promotes the recall schedule', () => {
  const original = reviewCard(null, 'good', now);
  let card = original;
  for (let i = 0; i < 6; i++) card = reviewCard(card, 'good', new Date(now.getTime() + i * 1000));
  assert.equal(card.due, original.due);
  assert.equal(card.reps, 1);
  assert.equal(card.interval, 1);
  const hard = reviewCard(card, 'hard', now);
  assert.equal(hard.due, original.due);
  assert.equal(hard.reps, 1);
  assert.equal(original.lastRating, 'good');
  assert.equal(hard.lastRating, 'hard');
});

test('due recall progresses, while forgetting during early practice moves the card earlier', () => {
  const original = reviewCard(null, 'good', now);
  const dueTime = new Date(original.due);
  const recalled = reviewCard(original, 'good', dueTime);
  assert.equal(recalled.interval, 3);
  assert.equal(recalled.reps, 2);
  const forgotten = reviewCard(original, 'again', now);
  assert.equal(forgotten.due, now.getTime() + 600_000);
  assert.equal(forgotten.reps, 0);
  const dueSoon = { ...original, due: now.getTime() + 60_000 };
  assert.equal(reviewCard(dueSoon, 'again', now).due, dueSoon.due);
});

test('due queue contains learned cards only, normalizes duplicate phrases and sorts by due time', () => {
  const state = freshState(now);
  state.vocab['good morning'] = { ...scheduleCard(null, 'good', now), due: now.getTime() - 100 };
  state.vocab.hello = { ...scheduleCard(null, 'good', now), due: now.getTime() - 200 };
  state.vocab.tomorrow = scheduleCard(null, 'good', now);
  const cards = dueCards(state, [{ en: 'Good   morning', vi: 'Chào buổi sáng' }, { en: 'HELLO' }, { en: 'good morning' }, { en: 'tomorrow' }, { en: 'unseen' }], now);
  assert.deepEqual(cards.map(card => card.cardId), ['hello', 'good morning']);
  assert.equal(getCardId({ en: '  Good  MORNING  ' }), 'good morning');
});

test('only all four lesson parts complete a lesson; updates preserve previous state', () => {
  const initial = freshState(now);
  const first = markLessonPart(initial, 'w1d1', 'vocab', now);
  assert.deepEqual(initial.completed, {});
  assert.equal(lessonDone(first, 'w1d1'), false);
  assert.deepEqual(first.history, []);
  let state = first;
  for (const part of ['grammar', 'shadow', 'apply']) state = markLessonPart(state, 'w1d1', part, now);
  assert.equal(completionCount(state), 1);
  assert.equal(lessonDone(state, 'w1d1'), true);
  assert.equal(state.completed.w1d1.finishedAt, now.toISOString());
  assert.deepEqual(state.history, ['2026-11-19']);
  assert.equal(first.completed.w1d1.grammar, false);
  const repeated = markLessonPart(state, 'w1d1', 'apply', new Date(now.getTime() + DAY));
  assert.equal(repeated, state);
  assert.deepEqual(repeated.history, ['2026-11-19']);
});

test('completing two lessons on the same day records one active day', () => {
  let state = freshState(now);
  for (const id of ['w1d1', 'w1d2']) for (const part of ['vocab', 'grammar', 'shadow', 'apply']) state = markLessonPart(state, id, part, now);
  assert.equal(completionCount(state), 2);
  assert.deepEqual(state.history, ['2026-11-19']);
});

test('support is skill-specific and requires three strong attempts before reducing guidance', () => {
  let state = freshState(now);
  assert.equal(suggestedSupport(state), 'guided');
  for (let i = 0; i < 3; i++) state = recordAttempt(state, 'grammar', 1, 0, now);
  assert.equal(suggestedSupport(state, 'grammar'), 'independent');
  assert.equal(suggestedSupport(state, 'shadow'), 'guided');
  state = recordAttempt(state, 'shadow', 0.9, 0, now);
  assert.equal(suggestedSupport(state), 'guided');
  state = recordAttempt(state, 'shadow', 0.4, 2, now);
  state = recordAttempt(state, 'shadow', 0.5, 2, now);
  assert.equal(suggestedSupport(state), 'guided');
  state = recordAttempt(state, 'shadow', 0.9, 0, now);
  state = recordAttempt(state, 'shadow', 0.8, 1, now);
  state = recordAttempt(state, 'shadow', 1, 0, now);
  assert.equal(suggestedSupport(state), 'balanced');
  for (let i=0;i<3;i++) state=recordAttempt(state,'shadow',1,0,now);
  assert.equal(suggestedSupport(state), 'independent');
});

test('easy ratings with visible scripts never remove guidance automatically', () => {
  let state=freshState(now);
  for(let i=0;i<3;i++) state=recordAttempt(state,'shadow',1,2,now);
  assert.equal(suggestedSupport(state),'guided');
});

test('old backups preserve progress and receive safe defaults for optional additions', () => {
  const state=freshState(now);
  delete state.sessions;delete state.lastPage;delete state.lastBackupAt;delete state.backupDismissedUntil;
  delete state.preferences.shadowSupport;
  delete state.preferences.oceanMotion;delete state.videos;
  state.vocab.hello=scheduleCard(null,'good',now);
  const clean=sanitizeState(state);
  assert.deepEqual(clean.vocab,state.vocab);
  assert.deepEqual(clean.sessions,{});
  assert.equal(clean.preferences.shadowSupport,'auto');
  assert.equal(clean.lastPage,'home');
  assert.equal(clean.preferences.oceanMotion,true);
  assert.deepEqual(clean.videos,[{id:'MKsNBLssYyM',title:'Video của Phát',isShort:false}]);
});

test('restoring saved progress replaces the retired video without duplicating or resetting user data', () => {
  const oldVideo = { id: '73qQ6nag6F8', title: 'Cây ami cảnh', isShort: true };
  const otherVideo = { id: 'abcdefghijk', title: 'My video', isShort: false };
  const state = markLessonPart(freshState(now), 'w1d1', 'grammar', now);
  state.vocab.hello = scheduleCard(null, 'good', now);
  state.lastPage = 'phat';
  state.videos = [oldVideo, otherVideo];
  const restored = sanitizeState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored, { ...state, videos: [...freshState(now).videos, otherVideo] });
  assert.deepEqual(sanitizeState(restored), restored);
  assert.deepEqual(state.videos, [oldVideo, otherVideo]);
  const existingNew = { id: 'MKsNBLssYyM', title: 'Tên đã đặt', isShort: false };
  state.videos = [oldVideo, otherVideo, existingNew];
  assert.deepEqual(sanitizeState(state).videos, [otherVideo, existingNew]);
});

test('video library, its page and motion preference survive backup restore without affecting study progress', () => {
  let state = freshState(now);
  state = markLessonPart(state, 'w1d1', 'vocab', now);
  state.videos = [{ id: 'abcdefghijk', title: 'My video', isShort: false }];
  state.lastPage = 'phat';
  state.preferences.oceanMotion = false;
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(state))), state);
  state.videos = [];
  assert.deepEqual(sanitizeState(state).videos, []);
  assert.equal(sanitizeState(state).completed.w1d1.vocab, true);
  state.videos = [{ id: 'invalid', title: 'discard' }, { id: 'abcdefghijk', title: 'My video', unknown: 1 }];
  assert.deepEqual(sanitizeState(state).videos, [{ id: 'abcdefghijk', title: 'My video', isShort: false }]);
});

test('state round-trips safely and strips unrecognized fields', () => {
  let state = freshState(now);
  state = recordAttempt(state, 'shadow', 0.8, 1, now);
  state = markLessonPart(state, 'w1d1', 'grammar', now);
  state.vocab.hello = scheduleCard(null, 'good', now);
  const imported = JSON.parse(JSON.stringify({ ...state, arbitrary: 'discard' }));
  const clean = sanitizeState(imported);
  assert.deepEqual(clean, state);
  assert.notEqual(clean, imported);
  assert.notEqual(clean.vocab, imported.vocab);
});

test('rejects incompatible, malformed and prototype-polluting imported state', () => {
  const state = freshState(now);
  assert.equal(sanitizeState({ ...state, version: 2 }), null);
  assert.equal(sanitizeState({ ...state, startedAt: '2026-02-30' }), null);
  assert.equal(sanitizeState({ ...state, activeLesson: 'w99d1' }), null);
  assert.equal(sanitizeState({ ...state, preferences: { rate: 99, voice: '' } }), null);
  assert.equal(sanitizeState({ ...state, completed: { w1d1: { vocab: 'yes' } } }), null);
  const malicious = JSON.parse(JSON.stringify(state));
  malicious.vocab = JSON.parse('{"__proto__":{"due":1,"interval":1,"reps":1,"lapses":0,"lastRating":"good"}}');
  assert.equal(sanitizeState(malicious), null);
  assert.equal({}.due, undefined);
});

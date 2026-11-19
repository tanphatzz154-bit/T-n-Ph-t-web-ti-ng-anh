import test from 'node:test';
import assert from 'node:assert/strict';
import { weeks } from '../docs/curriculum.js';
import { defaultStudySession, sanitizeSessions } from '../docs/study-session.js';

test('legacy and malformed optional resume data defaults safely', () => {
  for (const input of [undefined, null, [], 42, 'data']) assert.deepEqual(sanitizeSessions(input), {});
  assert.equal(defaultStudySession('w99d1'), null);
  assert.deepEqual(sanitizeSessions({ w1d1: null, w9d9: {}, w1d2: { page: 'unknown' } }), {});
  const restored = sanitizeSessions({ w1d1: {} }).w1d1;
  assert.deepEqual(restored, defaultStudySession('w1d1'));
});

test('vocabulary restores the exact queue, revealed card and completed positions', () => {
  const session = defaultStudySession('w1d1');
  session.page = 'vocab';
  session.vocab.index = 2;
  session.vocab.visited = [0, 1];
  session.vocab.revealed = true;
  session.vocab.reviewDoneOn = '2026-11-19';
  session.updatedAt = '2026-11-19T04:00:00Z';
  const restored = sanitizeSessions({ w1d1: session }).w1d1;
  assert.deepEqual(restored.vocab, session.vocab);
  assert.equal(restored.updatedAt, '2026-11-19T04:00:00.000Z');
  restored.vocab.visited.push(4);
  restored.vocab.cardIds.pop();
  assert.deepEqual(session.vocab.visited, [0, 1]);
  assert.equal(session.vocab.cardIds.length, 5);
});

test('invalid vocabulary queues reset only vocabulary, not the ongoing quiz', () => {
  const session = defaultStudySession('w1d1');
  session.grammar.answers = [1, null, null];
  session.grammar.index = 1;
  for (const patch of [
    { cardIds: ['unrecognised word'] },
    { cardIds: [...session.vocab.cardIds].reverse() },
    { index: 50 },
    { visited: [-1] },
    { visited: [0, 0] },
    { mode: 'review', cardIds: ['hello', 'hello'] },
  ]) {
    const input = { ...session, vocab: { ...session.vocab, ...patch } };
    const restored = sanitizeSessions({ w1d1: input }).w1d1;
    assert.deepEqual(restored.vocab, defaultStudySession('w1d1').vocab);
    assert.deepEqual(restored.grammar.answers, [1, null, null]);
    assert.equal(restored.grammar.index, 1);
  }
});

test('review sessions retain cards from different lessons and cannot skip unvisited cards', () => {
  const session = defaultStudySession('w1d1');
  session.vocab = {
    mode: 'review', cardIds: ['hello', 'work'], index: 2, visited: [0],
    revealed: true, reviewFirst: true, reviewDoneOn: '2026-02-30',
  };
  const restored = sanitizeSessions({ w1d1: session }).w1d1.vocab;
  assert.equal(restored.index, 1);
  assert.equal(restored.reviewFirst, true);
  assert.equal(restored.reviewDoneOn, '');
  session.vocab.visited = [0, 1];
  const complete = sanitizeSessions({ w1d1: session }).w1d1.vocab;
  assert.equal(complete.index, 2);
  assert.equal(complete.revealed, false);
});

test('partial quizzes cannot claim completion or bypass unanswered questions', () => {
  const session = defaultStudySession('w1d1');
  session.grammar = {
    index: 2, answers: [0, null, 2], finished: true, attemptSaved: true,
    writing: 'My name is Phat.', showSample: true, draft: 'hello',
  };
  const restored = sanitizeSessions({ w1d1: session }).w1d1.grammar;
  assert.equal(restored.index, 1);
  assert.equal(restored.finished, false);
  assert.equal(restored.attemptSaved, false);
  assert.equal(restored.writing, 'My name is Phat.');
  assert.equal(restored.draft, 'hello');
  session.grammar.answers[1] = 1;
  const complete = sanitizeSessions({ w1d1: session }).w1d1.grammar;
  assert.equal(complete.finished, true);
  assert.equal(complete.attemptSaved, true);
});

test('invalid answers and indexes do not restore arbitrary quiz state', () => {
  const session = defaultStudySession('w1d1');
  session.grammar.answers = ['1', 999, { answer: 1 }];
  assert.deepEqual(sanitizeSessions({ w1d1: session }).w1d1.grammar.answers, [null, null, null]);
  session.grammar.index = -1;
  session.grammar.writing = 'x'.repeat(5000);
  session.grammar.draft = 'y'.repeat(400);
  const restored = sanitizeSessions({ w1d1: session }).w1d1.grammar;
  assert.equal(restored.index, 0);
  assert.equal(restored.writing.length, 4000);
  assert.equal(restored.draft.length, 300);
});

test('fill-in answers and unsubmitted drafts remain distinct', () => {
  const lesson = weeks.flatMap(week => week.days).find(item => item.grammar.questions.some(question => question.type === 'fill'));
  assert.ok(lesson, 'Curriculum must include the new weekly fill-in questions.');
  const fillIndex = lesson.grammar.questions.findIndex(question => question.type === 'fill');
  const session = defaultStudySession(lesson.id);
  session.grammar.answers = lesson.grammar.questions.map(question => question.type === 'fill' ? null : 0);
  session.grammar.index = fillIndex;
  session.grammar.draft = 'still thinking';
  let restored = sanitizeSessions({ [lesson.id]: session })[lesson.id].grammar;
  assert.equal(restored.answers[fillIndex], null);
  assert.equal(restored.draft, 'still thinking');
  session.grammar.answers[fillIndex] = lesson.grammar.questions[fillIndex].answers[0];
  restored = sanitizeSessions({ [lesson.id]: session })[lesson.id].grammar;
  assert.equal(restored.answers[fillIndex], session.grammar.answers[fillIndex]);
  session.grammar.answers[fillIndex] = 1;
  assert.equal(sanitizeSessions({ [lesson.id]: session })[lesson.id].grammar.answers[fillIndex], null);
});

test('shadow sessions preserve actual hint use without inventing a completed attempt', () => {
  const session = defaultStudySession('w1d1');
  session.shadow = {
    lineIndex: 1, showEnglish: false, showVietnamese: false,
    usedEnglish: true, usedVietnamese: true, rating: 'easy',
    attemptSaved: true, hasPlayed: true,
  };
  assert.deepEqual(sanitizeSessions({ w1d1: session }).w1d1.shadow, session.shadow);
  session.shadow.hasPlayed = false;
  session.shadow.lineIndex = 900;
  const restored = sanitizeSessions({ w1d1: session }).w1d1.shadow;
  assert.equal(restored.attemptSaved, false);
  assert.equal(restored.lineIndex, 0);
  assert.equal(restored.usedEnglish, true);
});

test('unknown fields and prototype keys are discarded and defaults never share arrays', () => {
  const input = JSON.parse('{"__proto__":{"polluted":true},"constructor":{},"w1d1":{"page":"home","unexpected":true,"grammar":{"index":0,"answers":[]}}}');
  const restored = sanitizeSessions(input);
  assert.deepEqual(Object.keys(restored), ['w1d1']);
  assert.equal({}.polluted, undefined);
  assert.equal(restored.w1d1.unexpected, undefined);
  const first = defaultStudySession('w1d1');
  first.grammar.answers[0] = 1;
  assert.equal(defaultStudySession('w1d1').grammar.answers[0], null);
  assert.ok(Object.keys(sanitizeSessions(Object.fromEntries(weeks.flatMap(week => week.days).map(lesson => [lesson.id, {}])))).length <= 28);
});

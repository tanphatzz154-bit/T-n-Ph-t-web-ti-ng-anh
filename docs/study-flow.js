/** Compare a submitted answer. Fill questions allow case, spacing and sentence punctuation differences. */
export function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();
}

export function isCorrectAnswer(question, answer) {
  if (answer === null || answer === undefined) return false;
  return question.type === 'fill'
    ? typeof answer === 'string' && question.answers.some(value => normalizeAnswer(value) === normalizeAnswer(answer))
    : Number.isInteger(answer) && answer === question.answer;
}

/** Resume an unfinished activity first; otherwise put due review ahead of new work. */
export function chooseStudyStart({ resumePage, hasDue, reviewDoneToday, parts = {} }) {
  if (['vocab', 'grammar', 'shadow'].includes(resumePage)) return resumePage;
  if (hasDue && !reviewDoneToday) return 'review';
  if (!parts.vocab) return 'vocab';
  if (!parts.grammar) return 'grammar';
  return 'shadow';
}

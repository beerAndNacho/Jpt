import { DAILY_GOAL } from './data.js';

export const DAY_MS = 86400000;
export const DEFAULT_PROFILE = {
  xp: 0,
  streak: 0,
  lastStudyDate: '',
  todayDate: '',
  todayCount: 0,
  todayCorrect: 0,
  selectedLevel: 'N5',
  progress: {},
  recentWrong: [],
};

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeProfile(raw = {}) {
  const profile = {
    ...DEFAULT_PROFILE,
    ...raw,
    progress: { ...(raw.progress || {}) },
    recentWrong: Array.isArray(raw.recentWrong) ? [...raw.recentWrong] : [],
  };
  return rolloverDay(profile);
}

export function rolloverDay(profile, now = new Date()) {
  const today = dayKey(now);
  if (profile.todayDate !== today) {
    profile.todayDate = today;
    profile.todayCount = 0;
    profile.todayCorrect = 0;
  }
  return profile;
}

export function touchStudyDay(profile, now = new Date()) {
  const today = dayKey(now);
  if (profile.lastStudyDate === today) return profile;
  const yesterday = dayKey(new Date(now.getTime() - DAY_MS));
  profile.streak = profile.lastStudyDate === yesterday ? profile.streak + 1 : 1;
  profile.lastStudyDate = today;
  return profile;
}

export function wordProgress(profile, wordId) {
  return profile.progress[wordId] || { stage: 0, dueAt: 0, seen: 0, correct: 0, wrong: 0, lastAt: 0 };
}

function nextIntervalDays(stage) {
  const intervals = [0, 3, 7, 14, 30, 60, 120, 240];
  return intervals[Math.min(stage, intervals.length - 1)];
}

export function reviewWord(profile, wordId, grade, now = Date.now()) {
  const current = wordProgress(profile, wordId);
  let stage = current.stage;
  let xp = 0;
  let correct = true;

  if (grade === 'again') { stage = 0; xp = 1; correct = false; }
  if (grade === 'hard') { stage = Math.max(1, stage); xp = 3; }
  if (grade === 'good') { stage = Math.min(7, stage + 1); xp = 6; }
  if (grade === 'easy') { stage = Math.min(7, stage + 2); xp = 9; }

  let dueAt;
  if (grade === 'again') dueAt = now + 5 * 60 * 1000;
  else if (grade === 'hard') dueAt = now + DAY_MS;
  else dueAt = now + nextIntervalDays(stage) * DAY_MS;

  profile.progress[wordId] = {
    ...current,
    stage,
    dueAt,
    seen: current.seen + 1,
    correct: current.correct + (correct ? 1 : 0),
    wrong: current.wrong + (correct ? 0 : 1),
    lastAt: now,
  };
  profile.xp += xp;
  profile.todayCount += 1;
  if (correct) profile.todayCorrect += 1;
  touchStudyDay(profile, new Date(now));

  if (!correct) {
    profile.recentWrong = [wordId, ...profile.recentWrong.filter((id) => id !== wordId)].slice(0, 20);
  } else if (stage >= 2) {
    profile.recentWrong = profile.recentWrong.filter((id) => id !== wordId);
  }
  return profile.progress[wordId];
}

export function dueWords(words, profile, level = profile.selectedLevel, now = Date.now()) {
  return words
    .filter((word) => word.level === level)
    .filter((word) => {
      const p = wordProgress(profile, word.id);
      return p.seen > 0 && p.dueAt <= now;
    })
    .sort((a, b) => wordProgress(profile, a.id).dueAt - wordProgress(profile, b.id).dueAt);
}

export function newWords(words, profile, level = profile.selectedLevel) {
  return words.filter((word) => word.level === level && wordProgress(profile, word.id).seen === 0);
}

export function dailyDeck(words, profile, level = profile.selectedLevel, limit = DAILY_GOAL, now = Date.now()) {
  const due = dueWords(words, profile, level, now);
  const wrong = profile.recentWrong
    .map((id) => words.find((word) => word.id === id && word.level === level))
    .filter(Boolean)
    .filter((word) => !due.some((item) => item.id === word.id));
  const fresh = newWords(words, profile, level);
  const mastered = words
    .filter((word) => word.level === level && wordProgress(profile, word.id).stage >= 2)
    .sort((a, b) => wordProgress(profile, a.id).lastAt - wordProgress(profile, b.id).lastAt);

  const result = [];
  for (const pool of [due, wrong, fresh, mastered]) {
    for (const word of pool) {
      if (!result.some((item) => item.id === word.id)) result.push(word);
      if (result.length >= limit) return result;
    }
  }
  return result;
}

export function masteryStats(words, profile, level = profile.selectedLevel) {
  const scoped = words.filter((word) => word.level === level);
  const learned = scoped.filter((word) => wordProgress(profile, word.id).seen > 0).length;
  const familiar = scoped.filter((word) => wordProgress(profile, word.id).stage >= 2).length;
  const mastered = scoped.filter((word) => wordProgress(profile, word.id).stage >= 5).length;
  return {
    total: scoped.length,
    learned,
    familiar,
    mastered,
    percent: scoped.length ? Math.round((familiar / scoped.length) * 100) : 0,
  };
}

export function levelFromXp(xp) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 35)) + 1);
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const start = (level - 1) ** 2 * 35;
  const end = level ** 2 * 35;
  return { level, current: xp - start, needed: end - start, percent: Math.round(((xp - start) / (end - start)) * 100) };
}

export function quizOptions(words, target, count = 4) {
  const others = words.filter((word) => word.id !== target.id && word.level === target.level);
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, Math.max(0, count - 1));
  return [target, ...shuffled].sort(() => Math.random() - 0.5);
}

export function accuracy(profile) {
  const attempts = Object.values(profile.progress).reduce((sum, p) => sum + (p.correct || 0) + (p.wrong || 0), 0);
  const correct = Object.values(profile.progress).reduce((sum, p) => sum + (p.correct || 0), 0);
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

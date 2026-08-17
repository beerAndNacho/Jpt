import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS } from '../src/data.js';
import {
  DEFAULT_PROFILE, DAY_MS, dailyDeck, dayKey, dueWords, levelFromXp,
  masteryStats, normalizeProfile, reviewWord, touchStudyDay, wordProgress,
} from '../src/learning.js';

test('good review advances stage and schedules later review', () => {
  const profile = normalizeProfile({});
  const now = Date.parse('2026-08-17T00:00:00Z');
  const result = reviewWord(profile, 'n5-001', 'good', now);
  assert.equal(result.stage, 1);
  assert.ok(result.dueAt >= now + DAY_MS);
  assert.equal(profile.xp, 6);
});

test('again resets stage and adds recent wrong', () => {
  const profile = normalizeProfile({ progress: { 'n5-001': { stage: 4, dueAt: 0, seen: 4, correct: 4, wrong: 0, lastAt: 0 } } });
  reviewWord(profile, 'n5-001', 'again', 1000);
  assert.equal(wordProgress(profile, 'n5-001').stage, 0);
  assert.equal(profile.recentWrong[0], 'n5-001');
});

test('daily deck prefers due words before unseen words', () => {
  const profile = normalizeProfile({
    selectedLevel: 'N5',
    progress: { 'n5-010': { stage: 2, dueAt: 1, seen: 2, correct: 2, wrong: 0, lastAt: 1 } },
  });
  const deck = dailyDeck(WORDS, profile, 'N5', 10, 1000);
  assert.equal(deck[0].id, 'n5-010');
  assert.equal(deck.length, 10);
});

test('due words only returns studied words whose time has arrived', () => {
  const profile = normalizeProfile({
    progress: {
      'n5-001': { stage: 1, dueAt: 100, seen: 1, correct: 1, wrong: 0, lastAt: 1 },
      'n5-002': { stage: 1, dueAt: 10000, seen: 1, correct: 1, wrong: 0, lastAt: 1 },
    },
  });
  assert.deepEqual(dueWords(WORDS, profile, 'N5', 1000).map((word) => word.id), ['n5-001']);
});

test('mastery stats count familiar words', () => {
  const profile = normalizeProfile({
    progress: {
      'n5-001': { stage: 2, dueAt: 0, seen: 2, correct: 2, wrong: 0, lastAt: 1 },
      'n5-002': { stage: 1, dueAt: 0, seen: 1, correct: 1, wrong: 0, lastAt: 1 },
    },
  });
  const stats = masteryStats(WORDS, profile, 'N5');
  assert.equal(stats.learned, 2);
  assert.equal(stats.familiar, 1);
});

test('streak increases on consecutive local study dates', () => {
  const profile = { ...DEFAULT_PROFILE, streak: 1, lastStudyDate: '2026-08-16', progress: {}, recentWrong: [] };
  touchStudyDay(profile, new Date('2026-08-17T12:00:00'));
  assert.equal(profile.streak, 2);
  assert.equal(profile.lastStudyDate, dayKey(new Date('2026-08-17T12:00:00')));
});

test('xp produces increasing mascot level', () => {
  assert.equal(levelFromXp(0), 1);
  assert.ok(levelFromXp(500) > levelFromXp(50));
});

import { DAILY_GOAL, LEVELS, WORDS } from './data.js';
import {
  accuracy, dailyDeck, dueWords, levelProgress, masteryStats, normalizeProfile,
  quizOptions, reviewWord, rolloverDay, wordProgress,
} from './learning.js';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'kotonoha:village:v1';
let profile = loadProfile();
let currentView = 'home';
let studyDeck = [];
let studyIndex = 0;
let studyRevealed = false;
let quizDeck = [];
let quizIndex = 0;
let quizCombo = 0;
let quizAnswered = false;
let libraryFilter = 'all';
let toastTimer = null;

function loadProfile() {
  try { return normalizeProfile(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { return normalizeProfile({}); }
}
function saveProfile() {
  rolloverDay(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
}
function scopedWords(level = profile.selectedLevel) { return WORDS.filter((word) => word.level === level); }
function dueForLevel(level = profile.selectedLevel) {
  const due = dueWords(WORDS, profile, level);
  const wrong = profile.recentWrong.map((id) => WORDS.find((word) => word.id === id && word.level === level)).filter(Boolean);
  const map = new Map([...due, ...wrong].map((word) => [word.id, word]));
  return [...map.values()];
}
function speak(word) {
  if (!('speechSynthesis' in window)) { showToast('이 브라우저는 음성 읽기를 지원하지 않아요.'); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'ja-JP';
  utterance.rate = .82;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}
function nav(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.dataset.view === view));
  document.querySelectorAll('.bottom-nav button').forEach((button) => button.classList.toggle('active', button.dataset.nav === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'home') renderHome();
  if (view === 'study') { if (!studyDeck.length) startDailyStudy(false); else renderStudy(); }
  if (view === 'quiz') startQuiz();
  if (view === 'review') renderReview();
  if (view === 'library') renderLibrary();
}

function renderHome() {
  rolloverDay(profile);
  const n5 = masteryStats(WORDS, profile, 'N5');
  const n4 = masteryStats(WORDS, profile, 'N4');
  const lp = levelProgress(profile.xp);
  const due = dueForLevel();
  const dailyPercent = Math.min(100, Math.round((profile.todayCount / DAILY_GOAL) * 100));

  $('topStreak').textContent = profile.streak;
  $('topXp').textContent = profile.xp;
  $('mascotLevel').textContent = `Lv.${lp.level}`;
  $('dailyCount').textContent = `${Math.min(profile.todayCount, DAILY_GOAL)} / ${DAILY_GOAL}`;
  $('dailyBar').style.width = `${dailyPercent}%`;
  $('todayCorrect').textContent = profile.todayCorrect;
  $('streakStat').textContent = `${profile.streak}일`;
  $('accuracyStat').textContent = `${accuracy(profile)}%`;
  $('dueBadge').textContent = due.length;
  $('n5Percent').textContent = `${n5.percent}%`;
  $('n4Percent').textContent = `${n4.percent}%`;
  $('heroMessage').textContent = profile.todayCount >= DAILY_GOAL
    ? '오늘 목표 완료! 코하루가 아주 뿌듯해해요. 복습이나 퀴즈로 한 걸음 더 가볼까요?'
    : due.length
      ? `복습할 단어 ${due.length}개가 기다려요. 오늘 목표까지 ${Math.max(0, DAILY_GOAL - profile.todayCount)}번만 더 만나면 돼요.`
      : '조금씩 자주 보는 게 제일 오래 남아요. 코하루가 기다리고 있어요.';

  document.querySelectorAll('.level-card').forEach((button) => button.classList.toggle('active', button.dataset.level === profile.selectedLevel));
  $('foxMascot').dataset.level = String(lp.level);
}

function startDailyStudy(go = true) {
  studyDeck = dailyDeck(WORDS, profile, profile.selectedLevel, DAILY_GOAL);
  studyIndex = 0;
  studyRevealed = false;
  if (!studyDeck.length) { showToast('이 레벨의 단어를 모두 잘 기억하고 있어요!'); return; }
  if (go) nav('study'); else renderStudy();
}
function startReviewStudy() {
  const review = dueForLevel();
  if (!review.length) { showToast('지금 복습할 단어가 없어요.'); return; }
  studyDeck = review.slice(0, 20);
  studyIndex = 0;
  studyRevealed = false;
  nav('study');
}
function renderStudy() {
  if (!studyDeck.length) { startDailyStudy(false); return; }
  const word = studyDeck[Math.min(studyIndex, studyDeck.length - 1)];
  if (!word) { finishStudy(); return; }
  const p = wordProgress(profile, word.id);
  $('studyCounter').textContent = `${studyIndex + 1} / ${studyDeck.length}`;
  $('wordLevel').textContent = word.level;
  $('wordTag').textContent = word.tags[0] || '단어';
  $('wordText').textContent = word.word;
  $('wordReading').textContent = word.reading;
  $('wordMeaning').textContent = word.meaning;
  $('wordExample').textContent = word.example;
  $('wordExampleKo').textContent = word.exampleKo;
  $('wordCard').classList.toggle('revealed', studyRevealed);
  $('studyPercent').textContent = `${Math.round((studyIndex / Math.max(1, studyDeck.length)) * 100)}%`;
  $('studyBar').style.width = `${Math.round((studyIndex / Math.max(1, studyDeck.length)) * 100)}%`;
  $('studyTip').textContent = p.seen === 0
    ? '처음 보는 단어예요. 글자 모양보다 소리와 뜻을 먼저 연결해 보세요.'
    : p.wrong > p.correct
      ? '전에 헷갈렸던 단어예요. 예문까지 소리 내어 읽어볼까요?'
      : '익숙해지고 있어요. 뜻을 보기 전에 먼저 머릿속으로 떠올려 보세요.';
}
function revealStudy() {
  studyRevealed = true;
  $('wordCard').classList.add('revealed');
}
function gradeStudy(grade) {
  if (!studyRevealed) { showToast('먼저 카드를 눌러 뜻을 확인해 주세요.'); return; }
  const word = studyDeck[studyIndex];
  if (!word) return;
  const beforeLevel = levelProgress(profile.xp).level;
  reviewWord(profile, word.id, grade);
  const afterLevel = levelProgress(profile.xp).level;
  if (grade === 'again') {
    const insertAt = Math.min(studyDeck.length, studyIndex + 4);
    studyDeck.splice(insertAt, 0, word);
  }
  studyIndex += 1;
  studyRevealed = false;
  saveProfile();
  if (afterLevel > beforeLevel) showToast(`코하루가 Lv.${afterLevel}로 성장했어요! ✦`);
  if (studyIndex >= studyDeck.length) finishStudy(); else renderStudy();
}
function finishStudy() {
  saveProfile();
  showToast('학습 세션 완료! 코하루에게 XP가 쌓였어요.');
  studyDeck = [];
  studyIndex = 0;
  nav('home');
}

function startQuiz() {
  quizDeck = dailyDeck(WORDS, profile, profile.selectedLevel, DAILY_GOAL);
  if (!quizDeck.length) quizDeck = scopedWords().slice(0, DAILY_GOAL);
  quizIndex = 0;
  quizCombo = 0;
  quizAnswered = false;
  renderQuiz();
}
function renderQuiz() {
  if (!quizDeck.length) return;
  if (quizIndex >= quizDeck.length) {
    showToast(`퀴즈 완료! 최고 ${quizCombo}콤보까지 갔어요.`);
    nav('home');
    return;
  }
  const target = quizDeck[quizIndex];
  const options = quizOptions(WORDS, target, 4);
  quizAnswered = false;
  $('quizCounter').textContent = `${quizIndex + 1} / ${quizDeck.length}`;
  $('quizCombo').textContent = `${quizCombo} COMBO`;
  $('comboBig').textContent = quizCombo;
  $('quizLevel').textContent = target.level;
  $('quizWord').textContent = target.word;
  $('quizReading').textContent = target.reading;
  $('quizFeedback').hidden = true;
  $('optionGrid').innerHTML = options.map((option) => `<button type="button" data-word-id="${option.id}">${escapeHtml(option.meaning)}</button>`).join('');
}
function answerQuiz(selectedId) {
  if (quizAnswered) return;
  quizAnswered = true;
  const target = quizDeck[quizIndex];
  const selected = WORDS.find((word) => word.id === selectedId);
  const correct = selectedId === target.id;
  document.querySelectorAll('#optionGrid button').forEach((button) => {
    button.disabled = true;
    if (button.dataset.wordId === target.id) button.classList.add('correct');
    if (!correct && button.dataset.wordId === selectedId) button.classList.add('wrong');
  });
  if (correct) {
    quizCombo += 1;
    reviewWord(profile, target.id, 'good');
    if (quizCombo > 0 && quizCombo % 5 === 0) { profile.xp += 5; showToast('5콤보 보너스 +5 XP!'); }
  } else {
    quizCombo = 0;
    reviewWord(profile, target.id, 'again');
  }
  $('quizCombo').textContent = `${quizCombo} COMBO`;
  $('comboBig').textContent = quizCombo;
  $('feedbackIcon').textContent = correct ? '✓' : '×';
  $('feedbackTitle').textContent = correct ? '정답이에요!' : '조금 헷갈렸네요';
  $('feedbackText').textContent = correct
    ? `${target.word}(${target.reading}) · ${target.meaning}`
    : `정답은 “${target.meaning}”입니다. 복습 바구니에 다시 넣어둘게요.`;
  $('quizFeedback').hidden = false;
  saveProfile();
}
function nextQuiz() { quizIndex += 1; renderQuiz(); }

function renderReview() {
  const review = dueForLevel();
  $('reviewCount').textContent = `${review.length}개`;
  $('basketCount').textContent = review.length;
  $('reviewHeadline').textContent = review.length ? `${review.length}개 단어가 다시 만나고 싶대요` : '복습할 단어가 없어요';
  $('reviewMessage').textContent = review.length ? '오답과 복습 시간이 된 단어를 먼저 모았습니다.' : '오늘 단어를 먼저 만나보면 복습 바구니가 채워집니다.';
  $('reviewStartButton').disabled = !review.length;
  $('reviewList').innerHTML = review.length ? review.slice(0, 20).map((word) => {
    const p = wordProgress(profile, word.id);
    return `<article class="review-row"><div><strong>${escapeHtml(word.word)}</strong><span>${escapeHtml(word.reading)}</span><small>${escapeHtml(word.meaning)}</small></div><button type="button" data-speak="${word.id}">♪ 듣기</button></article>`;
  }).join('') : '<div class="empty-note">🌿 지금은 바구니가 비어 있어요. 새로운 단어를 만나볼까요?</div>';
}

function renderLibrary() {
  const search = ($('librarySearch')?.value || '').trim().toLowerCase();
  const level = profile.selectedLevel;
  const stats = masteryStats(WORDS, profile, level);
  $('libraryStats').innerHTML = `<article><small>${level} 전체</small><b>${stats.total}</b></article><article><small>한 번 이상 학습</small><b>${stats.learned}</b></article><article><small>익숙한 단어</small><b>${stats.familiar}</b></article>`;
  const list = scopedWords(level).filter((word) => {
    const p = wordProgress(profile, word.id);
    if (libraryFilter === 'learning' && !(p.seen > 0 && p.stage < 2)) return false;
    if (libraryFilter === 'mastered' && p.stage < 2) return false;
    if (search && !`${word.word} ${word.reading} ${word.meaning}`.toLowerCase().includes(search)) return false;
    return true;
  });
  $('wordList').innerHTML = list.map((word) => {
    const p = wordProgress(profile, word.id);
    const dots = Array.from({ length: 5 }, (_, index) => `<i class="${p.stage > index ? 'on' : ''}"></i>`).join('');
    return `<article class="word-row"><div><strong>${escapeHtml(word.word)}</strong><div><span>${escapeHtml(word.reading)} · ${escapeHtml(word.meaning)}</span><small>${escapeHtml(word.example)}</small><div class="stage-dots">${dots}</div></div></div><button type="button" data-speak="${word.id}">♪ 듣기</button></article>`;
  }).join('');
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function setLevel(level) {
  if (!LEVELS.includes(level)) return;
  profile.selectedLevel = level;
  studyDeck = [];
  quizDeck = [];
  saveProfile();
  renderHome();
  showToast(`${level} 길로 이동했어요.`);
}

// Navigation
for (const element of document.querySelectorAll('[data-nav]')) element.addEventListener('click', () => nav(element.dataset.nav));
for (const element of document.querySelectorAll('[data-level]')) element.addEventListener('click', () => setLevel(element.dataset.level));
$('startTodayButton').addEventListener('click', () => startDailyStudy(true));
$('reviewStartButton').addEventListener('click', startReviewStudy);

// Study
$('wordCard').addEventListener('click', revealStudy);
$('wordCard').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); revealStudy(); } });
$('speakButton').addEventListener('click', (event) => { event.stopPropagation(); const word = studyDeck[studyIndex]; if (word) speak(word.word); });
$('gradePanel').addEventListener('click', (event) => { const button = event.target.closest('button[data-grade]'); if (button) gradeStudy(button.dataset.grade); });

// Quiz
$('optionGrid').addEventListener('click', (event) => { const button = event.target.closest('button[data-word-id]'); if (button) answerQuiz(button.dataset.wordId); });
$('nextQuizButton').addEventListener('click', nextQuiz);
$('quizSpeak').addEventListener('click', () => { const word = quizDeck[quizIndex]; if (word) speak(word.word); });

// Review/library delegated audio
for (const id of ['reviewList','wordList']) $(id).addEventListener('click', (event) => {
  const button = event.target.closest('button[data-speak]');
  if (!button) return;
  const word = WORDS.find((item) => item.id === button.dataset.speak);
  if (word) speak(word.word);
});
$('libraryFilter').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]'); if (!button) return;
  libraryFilter = button.dataset.filter;
  document.querySelectorAll('#libraryFilter button').forEach((item) => item.classList.toggle('active', item === button));
  renderLibrary();
});
$('librarySearch').addEventListener('input', renderLibrary);

renderHome();

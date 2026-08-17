import './koharu.js';

const SFX_KEY = 'kotonoha:sfx:v1';

let enabled = true;
let audioContext = null;

try {
  enabled = localStorage.getItem(SFX_KEY) !== 'off';
} catch {}

function getAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function tone(frequency, delay = 0, duration = 0.07, gain = 0.035, type = 'sine') {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const volume = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.008);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(volume).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function play(name) {
  if (!enabled) return;
  if (name === 'tap') { tone(520, 0, 0.035, 0.018, 'sine'); return; }
  if (name === 'flip') { tone(360, 0, 0.04, 0.018, 'triangle'); tone(520, 0.028, 0.045, 0.018, 'triangle'); return; }
  if (name === 'correct') { tone(660, 0, 0.08, 0.033, 'sine'); tone(880, 0.065, 0.11, 0.028, 'sine'); return; }
  if (name === 'wrong') { tone(260, 0, 0.08, 0.025, 'triangle'); tone(220, 0.07, 0.1, 0.018, 'triangle'); return; }
  if (name === 'hard') { tone(430, 0, 0.06, 0.022, 'triangle'); tone(500, 0.05, 0.07, 0.018, 'triangle'); return; }
  if (name === 'easy') { tone(740, 0, 0.07, 0.025, 'sine'); tone(930, 0.055, 0.08, 0.025, 'sine'); tone(1180, 0.115, 0.12, 0.022, 'sine'); return; }
  if (name === 'combo') { [587, 740, 880, 1175].forEach((freq, index) => tone(freq, index * 0.055, 0.12, 0.028, 'sine')); return; }
  if (name === 'levelup') { [523, 659, 784, 1047].forEach((freq, index) => tone(freq, index * 0.075, 0.16, 0.034, 'triangle')); }
}

function injectStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .sfx-toggle{border:1px solid rgba(88,65,55,.12);background:rgba(255,255,255,.72);color:#7b665b;border-radius:999px;height:36px;min-width:44px;padding:0 11px;font:inherit;font-size:14px;cursor:pointer;box-shadow:0 5px 14px rgba(105,80,62,.08);transition:.18s transform,.18s background}
    .sfx-toggle:hover{transform:translateY(-1px);background:#fff}
    .sfx-toggle[aria-pressed="false"]{opacity:.58}
    @media(max-width:600px){.sfx-toggle{height:34px;min-width:40px;padding:0 9px}}
  `;
  document.head.appendChild(style);
}

function renderToggle() {
  const host = document.querySelector('.top-actions');
  if (!host || document.getElementById('sfxToggle')) return;
  const button = document.createElement('button');
  button.id = 'sfxToggle';
  button.className = 'sfx-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', '효과음 켜기 또는 끄기');
  host.prepend(button);
  updateToggle(button);
}

function updateToggle(button = document.getElementById('sfxToggle')) {
  if (!button) return;
  button.textContent = enabled ? '🔊' : '🔇';
  button.setAttribute('aria-pressed', String(enabled));
  button.title = enabled ? '효과음 켜짐' : '효과음 꺼짐';
}

function toggleSound() {
  enabled = !enabled;
  try { localStorage.setItem(SFX_KEY, enabled ? 'on' : 'off'); } catch {}
  updateToggle();
  if (enabled) play('correct');
}

function maybePlayLevelUp() {
  setTimeout(() => {
    const toast = document.getElementById('toast');
    if (toast?.textContent?.includes('성장했어요')) play('levelup');
  }, 20);
}

injectStyle();
renderToggle();

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest('#sfxToggle')) { toggleSound(); return; }
  if (target.closest('#speakButton, #quizSpeak, [data-speak]')) return;
  if (target.closest('#wordCard')) { play('flip'); return; }
  const grade = target.closest('button[data-grade]');
  if (grade) {
    const value = grade.dataset.grade;
    if (value === 'again') play('wrong');
    else if (value === 'hard') play('hard');
    else if (value === 'easy') play('easy');
    else play('correct');
    maybePlayLevelUp();
    return;
  }
  const option = target.closest('#optionGrid button');
  if (option) {
    setTimeout(() => {
      const comboText = document.getElementById('quizCombo')?.textContent || '';
      const combo = Number.parseInt(comboText, 10) || 0;
      if (option.classList.contains('correct')) {
        if (combo > 0 && combo % 5 === 0) play('combo');
        else play('correct');
      } else if (option.classList.contains('wrong')) play('wrong');
      maybePlayLevelUp();
    }, 0);
    return;
  }
  if (target.closest('.level-card')) { play('easy'); return; }
  if (target.closest('.primary, .soft-button, .village-card, .bottom-nav button, .back-button, .filter-segment button, .brand')) play('tap');
});

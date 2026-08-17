const mascot = document.getElementById('foxMascot');
const stage = document.querySelector('.mascot-stage');
let moodTimer = null;
let speechTimer = null;

function decorateMascot() {
  if (!mascot || mascot.dataset.decorated === 'true') return;
  mascot.dataset.decorated = 'true';
  const head = mascot.querySelector('.fox-head');
  const body = mascot.querySelector('.fox-body');
  if (head && !head.querySelector('.fox-mouth')) {
    const mouth = document.createElement('i');
    mouth.className = 'fox-mouth';
    head.appendChild(mouth);
  }
  if (body) {
    if (!mascot.querySelector('.fox-paw.left')) {
      const left = document.createElement('i'); left.className = 'fox-paw left'; mascot.appendChild(left);
      const right = document.createElement('i'); right.className = 'fox-paw right'; mascot.appendChild(right);
    }
    if (!mascot.querySelector('.fox-charm')) {
      const charm = document.createElement('i'); charm.className = 'fox-charm'; mascot.appendChild(charm);
      const flower = document.createElement('i'); flower.className = 'fox-flower'; mascot.appendChild(flower);
      const star = document.createElement('i'); star.className = 'fox-star'; star.textContent = '✦'; mascot.appendChild(star);
    }
  }
  updateEvolution();
}

function decorateMiniMascots() {
  document.querySelectorAll('.mini-fox').forEach((host) => {
    if (host.dataset.decorated === 'true') return;
    host.dataset.decorated = 'true';
    host.textContent = '';
    host.innerHTML = '<span class="mini-koharu"><i class="m-eye left"></i><i class="m-eye right"></i><i class="m-nose"></i></span>';
  });
}

function currentLevel() {
  const text = document.getElementById('mascotLevel')?.textContent || 'Lv.1';
  return Number.parseInt(text.replace(/\D/g, ''), 10) || 1;
}

function updateEvolution() {
  if (!mascot) return;
  const level = currentLevel();
  mascot.classList.toggle('evo-2', level >= 3);
  mascot.classList.toggle('evo-3', level >= 5);
  mascot.classList.toggle('evo-4', level >= 8);
  mascot.classList.toggle('evo-5', level >= 12);
}

function setMood(name, duration = 1200) {
  if (!mascot) return;
  clearTimeout(moodTimer);
  mascot.classList.remove('mood-happy', 'mood-oops', 'mood-wave', 'mood-proud', 'mood-celebrate');
  if (name) mascot.classList.add(`mood-${name}`);
  document.querySelectorAll('.mini-fox').forEach((host) => {
    host.classList.remove('mini-happy', 'mini-oops');
    if (name === 'happy' || name === 'celebrate' || name === 'proud') host.classList.add('mini-happy');
    if (name === 'oops') host.classList.add('mini-oops');
  });
  moodTimer = setTimeout(() => {
    mascot?.classList.remove('mood-happy', 'mood-oops', 'mood-wave', 'mood-proud', 'mood-celebrate');
    document.querySelectorAll('.mini-fox').forEach((host) => host.classList.remove('mini-happy', 'mini-oops'));
  }, duration);
}

function say(message, duration = 2600) {
  if (!stage) return;
  clearTimeout(speechTimer);
  let bubble = document.getElementById('koharuSpeech');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'koharuSpeech';
    bubble.className = 'koharu-speech';
    stage.appendChild(bubble);
  }
  bubble.innerHTML = message;
  bubble.hidden = false;
  speechTimer = setTimeout(() => { if (bubble) bubble.hidden = true; }, duration);
}

function afterDomUpdate(callback) { requestAnimationFrame(() => requestAnimationFrame(callback)); }

function reactToQuiz(option) {
  afterDomUpdate(() => {
    const comboText = document.getElementById('quizCombo')?.textContent || '0';
    const combo = Number.parseInt(comboText, 10) || 0;
    if (option.classList.contains('wrong')) {
      setMood('oops', 1500);
      say('<b>괜찮아요!</b> 틀린 단어가 더 오래 기억날 때도 있어요.');
      return;
    }
    if (option.classList.contains('correct')) {
      if (combo > 0 && combo % 5 === 0) {
        setMood('celebrate', 1700);
        say(`<b>${combo}콤보!</b> 코하루도 신났어요 ✦`);
      } else {
        setMood('happy');
        say('<b>정답!</b> 방금 연결한 기억을 한 번 더 떠올려 봐요.');
      }
    }
  });
}

function reactToGrade(grade) {
  if (grade === 'again') {
    setMood('oops', 1400);
    say('<b>다시 만나면 돼요.</b> 코하루가 복습 바구니에 넣어둘게요.');
  } else if (grade === 'hard') {
    setMood('proud');
    say('<b>어려워도 괜찮아요.</b> 기억하려고 한 순간부터 이미 학습 중이에요.');
  } else if (grade === 'easy') {
    setMood('celebrate', 1500);
    say('<b>완전 익숙하네요!</b> 다음 단어로 폴짝 ✦');
  } else {
    setMood('happy');
    say('<b>좋아요!</b> 3일 뒤에도 기억나는지 다시 만나봐요.');
  }
  afterDomUpdate(() => {
    const toast = document.getElementById('toast')?.textContent || '';
    if (toast.includes('성장했어요')) {
      updateEvolution();
      setMood('celebrate', 1900);
      say(`<b>레벨 업!</b> ${document.getElementById('mascotLevel')?.textContent || ''} 코하루가 조금 더 멋져졌어요 ✦`, 3200);
    }
  });
}

function observeLevel() {
  const level = document.getElementById('mascotLevel');
  if (!level) return;
  new MutationObserver(() => updateEvolution()).observe(level, { childList: true, subtree: true, characterData: true });
}

decorateMascot();
decorateMiniMascots();
observeLevel();
say('<b>こんにちは!</b> 오늘도 같이 10단어만 만나봐요 🦊', 3800);

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const option = target.closest('#optionGrid button');
  if (option) { reactToQuiz(option); return; }
  const grade = target.closest('button[data-grade]');
  if (grade) { reactToGrade(grade.dataset.grade); return; }
  if (target.closest('#startTodayButton, .village-card.study')) {
    setMood('wave');
    say('<b>출발!</b> 코하루가 옆에서 같이 읽어줄게요.');
    return;
  }
  if (target.closest('.level-card')) {
    setMood('celebrate');
    say('<b>새로운 길!</b> 천천히 가도 괜찮아요.');
    return;
  }
  if (target.closest('[data-nav="home"], .brand')) {
    setMood('wave');
  }
});

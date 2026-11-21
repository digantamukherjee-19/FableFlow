/**
 * FableFlow Learning Hub
 * Focus Zone (Pomodoro), Vocabulary Corner & My Dictionary
 */

window.FableFlow = window.FableFlow || {};

FableFlow.Learning = (function() {
  const DICT_KEY = 'fableflow_user_dictionary';
  const FOCUS_KEY = 'fableflow_focus_sessions';

  function escapeHtml(value) {
    return FableFlow.Backend?.escapeHtml ? FableFlow.Backend.escapeHtml(value) : String(value ?? '');
  }

  // Pomodoro State
  let timerPreset = 25;
  let timeLeft = 25 * 60;
  let isRunning = false;
  let isPaused = false;
  let timerEndTime = null;
  let timerInterval = null;
  let focusActivity = 'Writing';

  // Curated Literary Vocabulary
  const VOCABULARY_LIST = [
    {
      word: 'Luminescent',
      phonetic: '/ˌluː.mɪˈnes.ənt/',
      partOfSpeech: 'adjective',
      meaning: 'Emitting light not caused by heat; glowing softly with an ethereal radiance.',
      synonyms: ['Radiant', 'Phosphorescent', 'Effulgent', 'Incandescent'],
      antonyms: ['Tenebrous', 'Dim', 'Dull'],
      exampleSentence: 'The subterranean cavern was illuminated by luminescent moss clinging to the stalactites.'
    },
    {
      word: 'Petrichor',
      phonetic: '/ˈpet.rɪ.kɔːr/',
      partOfSpeech: 'noun',
      meaning: 'A pleasant, distinctive earthy aroma accompanying the first rain after a warm, dry period.',
      synonyms: ['Rain-scent', 'Earthy aroma', 'Freshness'],
      antonyms: ['Aridity', 'Stagnancy'],
      exampleSentence: 'As the first heavy drops struck the parched cobblestones, the rich petrichor brought memories of youth.'
    },
    {
      word: 'Ephemera',
      phonetic: '/ɪˈfem.ər.ə/',
      partOfSpeech: 'noun',
      meaning: 'Things that exist or are used or enjoyed for only a short time; fleeting artifacts.',
      synonyms: ['Transience', 'Fleeting moments', 'Memorabilia'],
      antonyms: ['Permanence', 'Eternity'],
      exampleSentence: 'The old tin box preserved the ephemera of their love affair: torn theatre stubs and pressed violets.'
    },
    {
      word: 'Verisimilitude',
      phonetic: '/ˌver.ɪ.sɪˈmɪl.ɪ.tjuːd/',
      partOfSpeech: 'noun',
      meaning: 'The appearance or semblance of truth; the quality of realism in creative writing.',
      synonyms: ['Realism', 'Authenticity', 'Plausibility'],
      antonyms: ['Falsity', 'Unreality'],
      exampleSentence: 'The author added meticulous nautical terminology to lend verisimilitude to the storm sequence.'
    },
    {
      word: 'Mellifluous',
      phonetic: '/meˈlɪf.lu.əs/',
      partOfSpeech: 'adjective',
      meaning: 'Sweet or musical; pleasant to hear; having a smooth flowing sound like honey.',
      synonyms: ['Dulcet', 'Euphonious', 'Silken'],
      antonyms: ['Cacophonous', 'Harsh', 'Discordant'],
      exampleSentence: 'Her mellifluous voice resonated throughout the grand library hall, quieting the crowd.'
    }
  ];

  // Quiz State
  let currentQuizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;

  function init() {
    bindEvents();
  }

  function initDefaultData() {
    if (!localStorage.getItem(DICT_KEY)) {
      const defaultDict = [
        {
          id: 'd1',
          word: 'Halcyon',
          meaning: 'Denoting a period of time in the past that was idyllically peaceful and happy.',
          example: 'We often reminisced about the halcyon afternoons spent reading beneath the willow tree.',
          createdAt: new Date().toISOString()
        },
        {
          id: 'd2',
          word: 'Susurrus',
          meaning: 'A whispering or rustling sound like wind through autumn leaves.',
          example: 'A gentle susurrus fluttered through the ancient parchment scrolls.',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      localStorage.setItem(DICT_KEY, JSON.stringify(defaultDict));
    }
  }

  function render() {
    renderPomodoro();
    renderVocab();
    renderDictionary();
  }

  // ==========================================
  // SECTION A: FOCUS ZONE (POMODORO TIMER)
  // ==========================================
  function renderPomodoro() {
    updateTimerDisplay();
    renderFocusHistory();
  }

  function setPreset(mins) {
    if (isRunning) return;
    timerPreset = mins;
    timeLeft = mins * 60;
    document.querySelectorAll('.pomodoro-preset-btn').forEach(b => {
      if (Number(b.getAttribute('data-mins')) === mins) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    updateTimerDisplay();
  }

  function setActivity(act) {
    focusActivity = act;
    document.querySelectorAll('.focus-activity-btn').forEach(b => {
      if (b.getAttribute('data-act') === act) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    isPaused = false;
    timerEndTime = Date.now() + timeLeft * 1000;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!timerEndTime) return;
      const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
      timeLeft = remaining;
      updateTimerDisplay();

      if (remaining <= 0) {
        completeTimer();
      }
    }, 500);

    toggleTimerButtons();
  }

  function pauseTimer() {
    isPaused = true;
    isRunning = false;
    clearInterval(timerInterval);
    toggleTimerButtons();
  }

  function resumeTimer() {
    if (isRunning) return;
    isRunning = true;
    isPaused = false;
    timerEndTime = Date.now() + timeLeft * 1000;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!timerEndTime) return;
      const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
      timeLeft = remaining;
      updateTimerDisplay();

      if (remaining <= 0) {
        completeTimer();
      }
    }, 500);

    toggleTimerButtons();
  }

  function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    isPaused = false;
    timerEndTime = null;
    timeLeft = timerPreset * 60;
    updateTimerDisplay();
    toggleTimerButtons();
  }

  function completeTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    isPaused = false;
    timerEndTime = null;

    // Play gentle Web Audio chime
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {}

    // Save session
    if (FableFlow.Backend?.isReady()) {
      FableFlow.Backend.saveFocusSession(focusActivity, timerPreset)
        .then(renderFocusHistory)
        .catch(error => console.error('Could not save focus session', error));
    } else {
      const sessions = JSON.parse(localStorage.getItem(FOCUS_KEY) || '[]');
      sessions.unshift({ id: `f_${Date.now()}`, duration: timerPreset, activity: focusActivity, completedAt: new Date().toISOString() });
      localStorage.setItem(FOCUS_KEY, JSON.stringify(sessions));
    }

    alert(`🎉 Focus Sprint Completed! You completed a ${timerPreset}-minute ${focusActivity} session.`);
    resetTimer();
    renderFocusHistory();
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const el = document.getElementById('pomodoro-digits');
    if (el) el.textContent = str;
  }

  function toggleTimerButtons() {
    const startBtn = document.getElementById('pomodoro-start-btn');
    const pauseBtn = document.getElementById('pomodoro-pause-btn');
    const resumeBtn = document.getElementById('pomodoro-resume-btn');

    if (!startBtn || !pauseBtn || !resumeBtn) return;

    if (!isRunning && !isPaused) {
      startBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
    } else if (isRunning) {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
      resumeBtn.style.display = 'none';
    } else if (isPaused) {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'inline-flex';
    }
  }

  function renderFocusHistory() {
    const sessions = FableFlow.Backend?.isReady()
      ? FableFlow.Backend.getFocusSessions()
      : JSON.parse(localStorage.getItem(FOCUS_KEY) || '[]');
    const totalMins = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    const totalEl = document.getElementById('focus-total-minutes');
    const countEl = document.getElementById('focus-total-sessions');
    if (totalEl) totalEl.textContent = `${totalMins} mins`;
    if (countEl) countEl.textContent = `${sessions.length}`;
  }

  // ==========================================
  // SECTION B: VOCABULARY CORNER & QUIZ
  // ==========================================
  function renderVocab() {
    const dayIndex = Math.floor(Date.now() / 86400000) % VOCABULARY_LIST.length;
    const wotd = VOCABULARY_LIST[dayIndex];

    const wordEl = document.getElementById('wotd-word');
    const phonEl = document.getElementById('wotd-phonetic');
    const meanEl = document.getElementById('wotd-meaning');
    const exEl = document.getElementById('wotd-example');
    const synEl = document.getElementById('wotd-synonyms');
    const antEl = document.getElementById('wotd-antonyms');

    if (wordEl) wordEl.textContent = wotd.word;
    if (phonEl) phonEl.textContent = `${wotd.phonetic} • ${wotd.partOfSpeech}`;
    if (meanEl) meanEl.textContent = `"${wotd.meaning}"`;
    if (exEl) exEl.textContent = `Example: "${wotd.exampleSentence}"`;
    if (synEl) synEl.innerHTML = wotd.synonyms.map(s => `<span class="vocab-tag-chip">${s}</span>`).join('');
    if (antEl) antEl.innerHTML = wotd.antonyms.map(a => `<span class="vocab-tag-chip">${a}</span>`).join('');

    renderQuiz();
  }

  function pronounceWord(w) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(w || 'Luminescent');
      window.speechSynthesis.speak(u);
    }
  }

  function searchVocab(q) {
    const resBox = document.getElementById('vocab-search-results');
    if (!resBox) return;

    if (!q.trim()) {
      resBox.innerHTML = '';
      return;
    }

    const matches = VOCABULARY_LIST.filter(item => 
      item.word.toLowerCase().includes(q.toLowerCase()) || 
      item.meaning.toLowerCase().includes(q.toLowerCase())
    );

    if (matches.length === 0) {
      resBox.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted); padding: 12px; text-align: center;">No vocabulary entries found.</p>';
      return;
    }

    resBox.innerHTML = matches.map(m => `
      <div class="vocab-search-item">
        <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
          <div>
            <strong class="vocab-search-word">${m.word}</strong>
            <span class="vocab-search-phonetic">${m.phonetic} • ${m.partOfSpeech}</span>
          </div>
          <button class="icon-btn" onclick="FableFlow.Learning.pronounceWord('${m.word.replace(/'/g, "\\'")}')" title="Pronounce word" style="padding: 4px; font-size: 0.85rem; color: var(--color-primary);">🔊</button>
        </div>
        <p class="vocab-search-meaning">${m.meaning}</p>
        <p class="vocab-search-example">Usage: "${m.exampleSentence}"</p>
      </div>
    `).join('');
  }

  function renderQuiz() {
    const quizCard = document.getElementById('vocab-quiz-container');
    if (!quizCard) return;

    const currentWord = VOCABULARY_LIST[currentQuizIndex % VOCABULARY_LIST.length];
    const otherMeanings = VOCABULARY_LIST.filter(v => v.word !== currentWord.word).map(v => v.meaning).slice(0, 3);
    const options = [currentWord.meaning, ...otherMeanings].sort(() => 0.5 - Math.random());

    quizAnswered = false;

    quizCard.innerHTML = `
      <div class="quiz-header">
        <span class="quiz-pill-title">
          Daily Vocabulary Challenge • Question ${currentQuizIndex + 1}
        </span>
        <span class="quiz-score-badge">Score: ${quizScore}</span>
      </div>

      <div class="quiz-prompt-box">
        <h4 class="quiz-word-title">"${currentWord.word}"</h4>
        <p class="quiz-instruction">What is the correct literary definition of this word?</p>
      </div>

      <div id="quiz-options-list">
        ${options.map(opt => `
          <button class="quiz-option-btn" onclick="FableFlow.Learning.answerQuiz(this, '${opt.replace(/'/g, "\\'")}', '${currentWord.meaning.replace(/'/g, "\\'")}')">
            ${opt}
          </button>
        `).join('')}
      </div>
    `;
  }

  function answerQuiz(btn, selected, correct) {
    if (quizAnswered) return;
    quizAnswered = true;

    if (selected === correct) {
      btn.classList.add('correct');
      quizScore += 1;
    } else {
      btn.classList.add('wrong');
      // Highlight the correct one
      document.querySelectorAll('.quiz-option-btn').forEach(b => {
        if (b.textContent.trim() === correct.trim()) {
          b.classList.add('correct');
        }
      });
    }

    setTimeout(() => {
      currentQuizIndex += 1;
      renderQuiz();
    }, 1500);
  }

  // ==========================================
  // SECTION C: MY DICTIONARY
  // ==========================================
  function renderDictionary(sortBy = 'recent') {
    const listEl = document.getElementById('dictionary-entries-list');
    if (!listEl) return;

    let entries = FableFlow.Backend?.isReady()
      ? FableFlow.Backend.getDictionary()
      : JSON.parse(localStorage.getItem(DICT_KEY) || '[]');
    if (sortBy === 'alpha') {
      entries.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (entries.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem;">
          Your dictionary is empty. Click "+ Add Word" to save vocabulary!
        </div>
      `;
      return;
    }

    listEl.innerHTML = entries.map(item => `
      <div class="dict-entry-card">
        <div>
          <h4 class="dict-word-title">${escapeHtml(item.word)}</h4>
          <p class="dict-meaning-text">${escapeHtml(item.meaning)}</p>
          ${item.example ? `<p class="dict-example-text">Personal Usage: "${escapeHtml(item.example)}"</p>` : ''}
        </div>
        <button class="dict-delete-btn" onclick="FableFlow.Learning.deleteDictEntry('${item.id}')" title="Delete word">✕</button>
      </div>
    `).join('');
  }

  function addDictEntry(word, meaning, example) {
    if (!word.trim() || !meaning.trim()) return;
    if (FableFlow.Backend?.isReady()) {
      FableFlow.Backend.addDictionaryEntry(word.trim(), meaning.trim(), example ? example.trim() : '')
        .then(() => renderDictionary())
        .catch(error => console.error('Could not save dictionary entry', error));
      return;
    }
    const entries = JSON.parse(localStorage.getItem(DICT_KEY) || '[]');
    entries.unshift({
      id: `d_${Date.now()}`,
      word: word.trim(),
      meaning: meaning.trim(),
      example: example ? example.trim() : '',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(DICT_KEY, JSON.stringify(entries));
    renderDictionary();
  }

  function deleteDictEntry(id) {
    if (!confirm('Remove this word from your dictionary?')) return;
    if (FableFlow.Backend?.isReady()) {
      FableFlow.Backend.deleteDictionaryEntry(id)
        .then(() => renderDictionary())
        .catch(error => console.error('Could not delete dictionary entry', error));
      return;
    }
    let entries = JSON.parse(localStorage.getItem(DICT_KEY) || '[]');
    entries = entries.filter(e => e.id !== id);
    localStorage.setItem(DICT_KEY, JSON.stringify(entries));
    renderDictionary();
  }

  function bindEvents() {
    // Pomodoro Presets
    document.querySelectorAll('.pomodoro-preset-btn').forEach(b => {
      b.addEventListener('click', () => setPreset(Number(b.getAttribute('data-mins'))));
    });

    // Pomodoro Activities
    document.querySelectorAll('.focus-activity-btn').forEach(b => {
      b.addEventListener('click', () => setActivity(b.getAttribute('data-act')));
    });

    // Timer Controls
    const startBtn = document.getElementById('pomodoro-start-btn');
    const pauseBtn = document.getElementById('pomodoro-pause-btn');
    const resumeBtn = document.getElementById('pomodoro-resume-btn');
    const resetBtn = document.getElementById('pomodoro-reset-btn');

    if (startBtn) startBtn.addEventListener('click', startTimer);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
    if (resumeBtn) resumeBtn.addEventListener('click', resumeTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);

    // Pronunciation button
    const speechBtn = document.getElementById('wotd-pronounce-btn');
    if (speechBtn) {
      speechBtn.addEventListener('click', () => {
        const w = document.getElementById('wotd-word')?.textContent;
        pronounceWord(w);
      });
    }

    // Vocab search input
    const vocabSearch = document.getElementById('vocab-search-input');
    if (vocabSearch) {
      vocabSearch.addEventListener('input', (e) => searchVocab(e.target.value));
    }

    // Add Dictionary modal
    const addDictForm = document.getElementById('add-dictionary-form');
    if (addDictForm) {
      addDictForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const w = document.getElementById('dict-input-word').value;
        const m = document.getElementById('dict-input-meaning').value;
        const ex = document.getElementById('dict-input-example').value;
        addDictEntry(w, m, ex);
        document.getElementById('dict-modal').classList.remove('open');
        addDictForm.reset();
      });
    }
  }

  return {
    init,
    render,
    setPreset,
    setActivity,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    pronounceWord,
    answerQuiz,
    addDictEntry,
    deleteDictEntry,
    renderDictionary
  };
})();

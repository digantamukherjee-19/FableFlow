/**
 * FableFlow Post – Story Writing Studio & AI Co-Pilot
 * Handles manuscript composition, chapter formatting, word counters, and non-destructive AI writing assistance.
 */

window.FableFlow = window.FableFlow || {};

FableFlow.Editor = (function() {
  const STORIES_KEY = 'fableflow_stories';
  const CHAPTERS_KEY = 'fableflow_chapters';

  function escapeHtml(value) {
    return FableFlow.Backend?.escapeHtml ? FableFlow.Backend.escapeHtml(value) : String(value ?? '');
  }

  let currentStoryId = null;
  let activeChapterIndex = 0;
  let currentChapters = [];
  let aiSuggestions = [];

  const PRESET_COVERS = [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80'
  ];

  function init() {
    bindEvents();
  }

  function render(storyId) {
    currentStoryId = storyId || null;
    const allStories = FableFlow.Backend?.isReady()
      ? FableFlow.Stories.getStories()
      : JSON.parse(localStorage.getItem(STORIES_KEY) || '[]');
    const existingStory = allStories.find(s => s.id === currentStoryId);

    const titleInput = document.getElementById('editor-story-title');
    const descInput = document.getElementById('editor-story-desc');
    const genreInput = document.getElementById('editor-story-genre');
    const tagsInput = document.getElementById('editor-story-tags');
    const coverInput = document.getElementById('editor-story-cover');

    if (existingStory) {
      if (titleInput) titleInput.value = existingStory.title;
      if (descInput) descInput.value = existingStory.description;
      if (genreInput) genreInput.value = existingStory.genre;
      if (tagsInput) tagsInput.value = (existingStory.tags || []).join(', ');
      if (coverInput) coverInput.value = existingStory.coverImage;

      const allChapters = FableFlow.Backend?.isReady()
        ? FableFlow.Stories.getChapters(existingStory.id)
        : JSON.parse(localStorage.getItem(CHAPTERS_KEY) || '[]').filter(c => c.storyId === existingStory.id);
      currentChapters = allChapters.sort((a,b) => a.chapterNumber - b.chapterNumber);
      if (currentChapters.length === 0) {
        currentChapters = [createDefaultChapter(existingStory.id, 1)];
      }
    } else {
      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';
      if (genreInput) genreInput.value = 'Fantasy';
      if (tagsInput) tagsInput.value = 'Magic, Adventure';
      if (coverInput) coverInput.value = PRESET_COVERS[0];

      currentChapters = [createDefaultChapter('temp_story', 1)];
    }

    activeChapterIndex = 0;
    loadActiveChapter();
    renderChaptersList();
    renderAiSuggestions();
  }

  function createDefaultChapter(sId, num) {
    return {
      id: `chap_${Date.now()}_${num}`,
      storyId: sId,
      chapterNumber: num,
      title: `Chapter ${num}: Untitled`,
      content: '',
      wordCount: 0
    };
  }

  function loadActiveChapter() {
    const chap = currentChapters[activeChapterIndex] || currentChapters[0];
    if (!chap) return;

    const chapTitle = document.getElementById('editor-chapter-title');
    const chapBody = document.getElementById('editor-chapter-body');

    if (chapTitle) chapTitle.value = chap.title;
    if (chapBody) chapBody.value = chap.content;

    updateCounters();
  }

  function saveActiveChapterInMemory() {
    const chap = currentChapters[activeChapterIndex];
    if (!chap) return;

    const chapTitle = document.getElementById('editor-chapter-title');
    const chapBody = document.getElementById('editor-chapter-body');

    if (chapTitle) chap.title = chapTitle.value;
    if (chapBody) {
      chap.content = chapBody.value;
      chap.wordCount = chap.content.trim() ? chap.content.trim().split(/\s+/).filter(Boolean).length : 0;
    }
  }

  function updateCounters() {
    const chapBody = document.getElementById('editor-chapter-body');
    const text = chapBody ? chapBody.value : '';
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const mins = Math.max(1, Math.ceil(words / 200));

    const wordsEl = document.getElementById('editor-word-count');
    const charsEl = document.getElementById('editor-char-count');
    const timeEl = document.getElementById('editor-read-time');

    if (wordsEl) wordsEl.textContent = `${words} words`;
    if (charsEl) charsEl.textContent = `${chars} characters`;
    if (timeEl) timeEl.textContent = `~${mins} min read`;
  }

  function saveStory(publish = false) {
    if (publish) {
      if (window.FableFlow.Auth && !window.FableFlow.Auth.isRegisteredUser()) {
        window.FableFlow.Auth.showGuestPrompt('publish stories to the FableFlow catalog');
        return;
      }
    }

    saveActiveChapterInMemory();

    const titleInput = document.getElementById('editor-story-title');
    const descInput = document.getElementById('editor-story-desc');
    const genreInput = document.getElementById('editor-story-genre');
    const tagsInput = document.getElementById('editor-story-tags');
    const coverInput = document.getElementById('editor-story-cover');

    const title = titleInput ? titleInput.value.trim() : '';
    if (!title) {
      alert('Please enter a story title before saving.');
      return;
    }

    if (FableFlow.Backend?.isReady()) {
      saveStoryToBackend(publish, title);
      return;
    }

    const allStories = JSON.parse(localStorage.getItem(STORIES_KEY) || '[]');
    const user = FableFlow.Auth.getCurrentUser();

    let story = allStories.find(s => s.id === currentStoryId);
    if (!story) {
      story = {
        id: `story_${Date.now()}`,
        title,
        description: descInput ? descInput.value.trim() : '',
        coverImage: coverInput?.value || PRESET_COVERS[0],
        authorId: user ? user.id : 'usr_author_1',
        authorName: user ? user.username : 'ElenaVance',
        genre: genreInput?.value || 'Fantasy',
        tags: tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: publish ? 'published' : 'draft',
        visibility: 'public',
        reads: 0,
        likes: 0,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      allStories.unshift(story);
      currentStoryId = story.id;
    } else {
      story.title = title;
      story.description = descInput ? descInput.value.trim() : '';
      story.genre = genreInput?.value || 'Fantasy';
      story.tags = tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : [];
      story.coverImage = coverInput?.value || story.coverImage;
      if (publish) story.status = 'published';
      story.updatedAt = new Date().toISOString();
    }

    localStorage.setItem(STORIES_KEY, JSON.stringify(allStories));

    // Save chapters
    const allChapters = JSON.parse(localStorage.getItem(CHAPTERS_KEY) || '[]');
    const otherChapters = allChapters.filter(c => c.storyId !== currentStoryId);
    currentChapters.forEach(c => { c.storyId = currentStoryId; });
    const updatedChapters = [...otherChapters, ...currentChapters];
    localStorage.setItem(CHAPTERS_KEY, JSON.stringify(updatedChapters));

    const statusEl = document.getElementById('editor-save-status');
    if (statusEl) {
      statusEl.textContent = publish ? '🎉 Published!' : '✓ Draft Saved';
      setTimeout(() => { statusEl.textContent = 'All changes saved locally'; }, 3000);
    }

    if (publish) {
      alert(`Story "${title}" is now published and available on the homepage!`);
      FableFlow.Navigation.navigateTo('home');
    }
  }

  async function saveStoryToBackend(publish, title) {
    saveActiveChapterInMemory();
    const user = FableFlow.Auth.getCurrentUser();
    const existing = FableFlow.Stories.getStories().find(story => story.id === currentStoryId && story.authorId === user.id);
    const story = {
      id: existing ? currentStoryId : null,
      title,
      description: document.getElementById('editor-story-desc')?.value.trim() || '',
      coverImage: document.getElementById('editor-story-cover')?.value || PRESET_COVERS[0],
      genre: document.getElementById('editor-story-genre')?.value || 'Fantasy',
      tags: (document.getElementById('editor-story-tags')?.value || '').split(',').map(tag => tag.trim()).filter(Boolean),
      status: publish ? 'published' : (existing?.status || 'draft'),
      visibility: existing?.visibility || 'public'
    };

    const statusEl = document.getElementById('editor-save-status');
    if (statusEl) statusEl.textContent = 'Saving to your FableFlow account…';
    try {
      currentStoryId = await FableFlow.Backend.saveStory(story, currentChapters);
      currentChapters = FableFlow.Stories.getChapters(currentStoryId);
      if (!currentChapters.length) currentChapters = [createDefaultChapter(currentStoryId, 1)];
      if (statusEl) {
        statusEl.textContent = publish ? '🎉 Published!' : '✓ Draft saved to your account';
        setTimeout(() => { if (statusEl) statusEl.textContent = 'All changes saved to your account'; }, 3000);
      }
      if (publish) {
        alert(`Story "${title}" is now published and available on the homepage!`);
        FableFlow.Navigation.navigateTo('home');
      }
    } catch (error) {
      console.error('Could not save story', error);
      if (statusEl) statusEl.textContent = 'Save failed. Please try again.';
    }
  }

  function addChapter() {
    saveActiveChapterInMemory();
    const nextNum = currentChapters.length + 1;
    const newChap = createDefaultChapter(currentStoryId || 'temp_story', nextNum);
    currentChapters.push(newChap);
    activeChapterIndex = currentChapters.length - 1;
    loadActiveChapter();
    renderChaptersList();
  }

  function deleteChapter(idx) {
    if (currentChapters.length <= 1) {
      alert('A story must have at least one chapter.');
      return;
    }
    if (!confirm(`Delete chapter ${idx + 1}?`)) return;
    currentChapters.splice(idx, 1);
    currentChapters.forEach((c, i) => { c.chapterNumber = i + 1; });
    activeChapterIndex = Math.max(0, idx - 1);
    loadActiveChapter();
    renderChaptersList();
  }

  function renderChaptersList() {
    const list = document.getElementById('editor-chapters-directory');
    if (!list) return;

    list.innerHTML = currentChapters.map((c, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 6px; background-color: ${activeChapterIndex === idx ? 'var(--color-secondary)' : 'var(--bg-card)'}; color: ${activeChapterIndex === idx ? 'var(--color-primary)' : 'var(--text-main)'}; border: 1.5px solid var(--border-color); margin-bottom: 6px; cursor: pointer;"
           onclick="FableFlow.Editor.switchChapter(${idx})">
        <span style="font-size: 0.82rem; font-weight: ${activeChapterIndex === idx ? '800' : '600'};">
          Ch. ${c.chapterNumber}: ${escapeHtml(c.title)}
        </span>
        <button style="color: var(--color-accent); font-size: 0.8rem; font-weight: 800;" onclick="event.stopPropagation(); FableFlow.Editor.deleteChapter(${idx})" title="Delete chapter">✕</button>
      </div>
    `).join('');
  }

  function switchChapter(idx) {
    saveActiveChapterInMemory();
    activeChapterIndex = idx;
    loadActiveChapter();
    renderChaptersList();
  }

  function formatText(prefix, suffix = '') {
    const textarea = document.getElementById('editor-chapter-body');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);

    const replacement = prefix + (selected || 'text') + suffix;
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    textarea.focus();
    updateCounters();
  }

  // AI Co-Pilot Assistance Features
  function triggerAI(action) {
    const textarea = document.getElementById('editor-chapter-body');
    const selected = textarea ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd) : '';
    const sample = selected || textarea?.value || 'the journey through the citadel';

    let title = '';
    let suggestionText = '';

    switch (action) {
      case 'grammar':
        title = 'Grammar & Pacing Polish';
        suggestionText = `Polished phrasing: "${sample.replace(/\s+/g, ' ').trim()} Every word carried the pulse of an ancient vow."`;
        break;
      case 'vocabulary':
        title = 'Sensory Vocabulary Enhancements';
        suggestionText = `Evocative alternatives:\n• "walked" → ambled, meandered, drifted like smoke\n• "bright" → incandescent, luminescent, piercing argent glow\n• "cold" → bitter glacial chill, frost-bitten bite`;
        break;
      case 'sentence_improvement':
        title = 'Sentence Flow & Rhythm';
        suggestionText = `Option 1 (Atmospheric): "Beneath the hollow arch of twilight, shadows whispered of promises long buried in frost."\nOption 2 (Punchy): "No warning. Just silence—and the realization the gates had locked."`;
        break;
      case 'plot_development':
        title = 'Narrative Twists & Conflicts';
        suggestionText = `1. The key doesn't unlock the citadel; it wakes whatever was buried beneath it.\n2. The mechanical gyrfalcon Gideon recognizes the prince's circlet from a hidden memory file.`;
        break;
      case 'character_development':
        title = 'Character Nuance & Tells';
        suggestionText = `Give the protagonist an unconscious physical habit: under stress, she traces the birthmark on her collarbone or counts the brass gears in her compass.`;
        break;
      case 'writers_block':
        title = 'Scene Unstuck Solutions';
        suggestionText = `Introduce a sudden physical disruption: a stained glass pane shatters above them, or an unfamiliar mechanical melody begins humming from the stone floor.`;
        break;
      case 'dialogue_improvement':
        title = 'Subtext Dialogue Polish';
        suggestionText = `"You really think they won't follow us?" She set her compass down, brass clattering against cold crystal.\nHe didn't look up from his map. "I'm counting on it."`;
        break;
      case 'creative_prompt':
        title = 'Creative Writing Prompt';
        suggestionText = `A cartographer finds a map that reveals rooms inside people's houses that they themselves have never seen or entered.`;
        break;
    }

    const newSug = {
      id: `sug_${Date.now()}`,
      title,
      text: suggestionText
    };

    aiSuggestions.unshift(newSug);
    renderAiSuggestions();
  }

  function renderAiSuggestions() {
    const tray = document.getElementById('editor-ai-suggestions-tray');
    if (!tray) return;

    if (aiSuggestions.length === 0) {
      tray.innerHTML = `
        <div style="padding: 20px; text-align: center; border: 1px dashed var(--border-color); border-radius: 8px; font-size: 0.78rem; color: var(--text-muted);">
          🤖 Click any AI tool above to generate non-destructive literary suggestions.
        </div>
      `;
      return;
    }

    tray.innerHTML = aiSuggestions.map(s => `
      <div class="ai-suggestion-card" id="card-${s.id}">
        <div class="ai-suggestion-header">
          <span>✨ ${escapeHtml(s.title)}</span>
          <span style="font-size: 0.65rem; color: var(--text-muted);">Demo Co-Pilot</span>
        </div>
        <p style="font-size: 0.8rem; line-height: 1.4; white-space: pre-line; margin-bottom: 8px;">${escapeHtml(s.text)}</p>
        <div class="ai-suggestion-actions">
          <button class="btn-reject" onclick="FableFlow.Editor.rejectSuggestion('${s.id}')">Reject</button>
          <button class="btn-edit-sug" onclick="FableFlow.Editor.editSuggestion('${s.id}')">Edit</button>
          <button class="btn-accept" onclick="FableFlow.Editor.acceptSuggestion('${s.id}')">Accept</button>
        </div>
      </div>
    `).join('');
  }

  function acceptSuggestion(id) {
    const sug = aiSuggestions.find(s => s.id === id);
    if (!sug) return;

    const textarea = document.getElementById('editor-chapter-body');
    if (textarea) {
      textarea.value += `\n\n${sug.text}`;
      updateCounters();
    }
    aiSuggestions = aiSuggestions.filter(s => s.id !== id);
    renderAiSuggestions();
  }

  function rejectSuggestion(id) {
    aiSuggestions = aiSuggestions.filter(s => s.id !== id);
    renderAiSuggestions();
  }

  function editSuggestion(id) {
    const sug = aiSuggestions.find(s => s.id === id);
    if (!sug) return;

    const newText = prompt('Tweak AI suggestion before accepting:', sug.text);
    if (newText !== null && newText.trim()) {
      sug.text = newText.trim();
      acceptSuggestion(id);
    }
  }

  function bindEvents() {
    const body = document.getElementById('editor-chapter-body');
    if (body) {
      body.addEventListener('input', updateCounters);
    }
  }

  return {
    init,
    render,
    saveStory,
    addChapter,
    deleteChapter,
    switchChapter,
    formatText,
    triggerAI,
    acceptSuggestion,
    rejectSuggestion,
    editSuggestion
  };
})();

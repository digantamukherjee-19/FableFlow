/**
 * FableFlow Global Accessibility & Theme Manager
 * Governs font style, font size, line spacing, word spacing, and dark/light themes.
 */

window.FableFlow = window.FableFlow || {};

FableFlow.Accessibility = (function() {
  const fontMap = {
    lexend: "'Lexend', 'Segoe UI', sans-serif",
    georgia: "Georgia, 'Times New Roman', serif",
    arial: "Arial, Helvetica, sans-serif",
    verdana: "Verdana, Geneva, Tahoma, sans-serif",
    dyslexic: "'OpenDyslexic', 'Comic Sans MS', sans-serif"
  };

  const DEFAULT_PREFERENCES = {
    fontFamily: 'lexend',
    fontSize: 16,
    lineSpacing: 1.6,
    wordSpacing: 1,
    theme: 'light'
  };

  let preferences = { ...DEFAULT_PREFERENCES };
  let remoteSaveTimer = null;

  function scheduleRemoteSave() {
    if (!FableFlow.Backend || !FableFlow.Backend.isRegisteredUser()) return;
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(() => {
      FableFlow.Backend.savePreferences({ ...preferences }).catch(error => {
        console.warn('Could not sync accessibility preferences', error);
      });
    }, 400);
  }

  function init() {
    // 1. Load preferences from localStorage
    try {
      const saved = localStorage.getItem('fableflow_accessibility');
      if (saved) {
        preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
      const savedTheme = localStorage.getItem('fableflow_theme');
      if (savedTheme) {
        preferences.theme = savedTheme;
      }
    } catch (e) {
      console.warn('Failed to read accessibility storage', e);
    }

    // 2. Apply theme & typography
    applyTheme(preferences.theme);
    applyTypography();
    bindControls();
  }

  function applyTypography(persist = true) {
    const root = document.documentElement;
    const fontCss = fontMap[preferences.fontFamily] || fontMap.lexend;

    root.style.setProperty('--ff-font-family', fontCss);
    root.style.setProperty('--ff-font-size', `${preferences.fontSize}px`);
    root.style.setProperty('--ff-line-height', `${preferences.lineSpacing}`);
    root.style.setProperty('--ff-word-spacing', `${preferences.wordSpacing}px`);

    // Sync input controls if present
    const fontSelect = document.getElementById('settings-font-select');
    if (fontSelect) fontSelect.value = preferences.fontFamily;

    const sizeRange = document.getElementById('settings-font-size');
    const sizeDisplay = document.getElementById('settings-font-size-val');
    if (sizeRange) sizeRange.value = preferences.fontSize;
    if (sizeDisplay) sizeDisplay.textContent = `${preferences.fontSize}px`;

    const lineRange = document.getElementById('settings-line-spacing');
    const lineDisplay = document.getElementById('settings-line-spacing-val');
    if (lineRange) lineRange.value = preferences.lineSpacing;
    if (lineDisplay) lineDisplay.textContent = `${preferences.lineSpacing}x`;

    const wordRange = document.getElementById('settings-word-spacing');
    const wordDisplay = document.getElementById('settings-word-spacing-val');
    if (wordRange) wordRange.value = preferences.wordSpacing;
    if (wordDisplay) wordDisplay.textContent = `${preferences.wordSpacing}px`;

    // Update live previews
    updateLivePreviews();

    // Persist
    if (persist) {
      localStorage.setItem('fableflow_accessibility', JSON.stringify(preferences));
      scheduleRemoteSave();
    }
  }

  function applyTheme(theme, persist = true) {
    preferences.theme = theme;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) icon.textContent = '☀️';
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) icon.textContent = '🌙';
    }
    if (persist) {
      localStorage.setItem('fableflow_theme', theme);
      scheduleRemoteSave();
    }
  }

  function toggleTheme() {
    const newTheme = preferences.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  }

  function setFontFamily(font) {
    if (fontMap[font]) {
      preferences.fontFamily = font;
      applyTypography();
    }
  }

  function setFontSize(size) {
    preferences.fontSize = Number(size);
    applyTypography();
  }

  function setLineSpacing(spacing) {
    preferences.lineSpacing = Number(spacing);
    applyTypography();
  }

  function setWordSpacing(spacing) {
    preferences.wordSpacing = Number(spacing);
    applyTypography();
  }

  function setPreferences(nextPreferences, options = {}) {
    preferences = { ...DEFAULT_PREFERENCES, ...preferences, ...(nextPreferences || {}) };
    const persist = options.persist !== false;
    applyTheme(preferences.theme, persist);
    applyTypography(persist);
  }

  function updateLivePreviews() {
    const sampleBox = document.getElementById('accessibility-sample-paragraph');
    const studioBox = document.getElementById('accessibility-sample-studio');
    const settingsPreview = document.getElementById('settings-live-preview-box');
    const styleObj = {
      fontFamily: fontMap[preferences.fontFamily] || fontMap.lexend,
      fontSize: `${preferences.fontSize}px`,
      lineHeight: preferences.lineSpacing,
      wordSpacing: `${preferences.wordSpacing}px`
    };

    if (sampleBox) {
      Object.assign(sampleBox.style, styleObj);
    }
    if (studioBox) {
      Object.assign(studioBox.style, styleObj);
    }
    if (settingsPreview) {
      Object.assign(settingsPreview.style, styleObj);
    }
  }

  function bindControls() {
    // Theme toggle in navbar
    const themeBtn = document.getElementById('nav-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }
  }

  return {
    init,
    setFontFamily,
    setFontSize,
    setLineSpacing,
    setWordSpacing,
    setPreferences,
    applyTheme,
    toggleTheme,
    getPreferences: () => ({ ...preferences })
  };
})();

/**
 * FableFlow Navigation & Router
 * Manages view switching, URL hash routing, and navbar tab highlighting.
 */

window.FableFlow = window.FableFlow || {};

FableFlow.Navigation = (function() {
  const views = [
    'home',
    'dashboard',
    'post',
    'community',
    'learning',
    'settings',
    'story-detail',
    'story-reader',
    'author-profile'
  ];

  const protectedViews = ['dashboard', 'post'];

  let currentView = 'home';

  function init() {
    bindNavLinks();
    initNavbarSearch();

    // Make sign-in and accessibility preferences the entry flow on every visit.
    if (window.FableFlow.Auth && window.FableFlow.Auth.getCurrentUser()) {
      navigateTo('settings');
    } else {
      navigateTo('home');
      if (window.FableFlow.Auth) {
        window.FableFlow.Auth.openModal('login', { required: true });
      }
    }

    window.addEventListener('hashchange', handleHashChange);
  }

  function navigateTo(viewName, params = {}) {
    if (!views.includes(viewName)) {
      viewName = 'home';
    }

    closeNavbarSearch();

    // Stop active TTS audio narration when navigating away from reader
    if (viewName !== 'story-reader' && window.FableFlow.Stories && window.FableFlow.Stories.TTS) {
      window.FableFlow.Stories.TTS.stop();
    }

    // Guard registered-only pages (dashboard and post studio)
    if (protectedViews.includes(viewName)) {
      const isRegistered = window.FableFlow.Auth ? window.FableFlow.Auth.isRegisteredUser() : false;
      if (!isRegistered) {
        if (window.FableFlow.Auth && window.FableFlow.Auth.isGuest()) {
          window.FableFlow.Auth.showGuestPrompt(`access the ${viewName === 'post' ? 'Writing Studio' : 'Author Dashboard'}`);
          return;
        } else if (window.FableFlow.Auth) {
          window.FableFlow.Auth.openModal('login');
          return;
        }
      }
    }

    currentView = viewName;

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update active state on navbar tabs
    document.querySelectorAll('.nav-tab-item').forEach(tab => {
      const tabTarget = tab.getAttribute('data-target');
      if (tabTarget === viewName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Close mobile drawer if open
    const drawer = document.getElementById('mobile-nav-drawer');
    if (drawer) drawer.classList.remove('open');

    // Scroll to top
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Hook view-specific initializations
    if (viewName === 'home' && window.FableFlow.Stories) {
      window.FableFlow.Stories.renderHome();
    } else if (viewName === 'dashboard' && window.FableFlow.Stories) {
      window.FableFlow.Stories.renderDashboard();
    } else if (viewName === 'post' && window.FableFlow.Editor) {
      window.FableFlow.Editor.render(params.storyId);
    } else if (viewName === 'community' && window.FableFlow.Community) {
      window.FableFlow.Community.render();
    } else if (viewName === 'learning' && window.FableFlow.Learning) {
      window.FableFlow.Learning.render();
    } else if (viewName === 'story-detail' && window.FableFlow.Stories) {
      window.FableFlow.Stories.renderStoryDetail(params.id);
    } else if (viewName === 'story-reader' && window.FableFlow.Stories) {
      window.FableFlow.Stories.renderStoryReader(params.id, params.ch);
    } else if (viewName === 'author-profile' && window.FableFlow.Stories) {
      window.FableFlow.Stories.renderAuthorProfile(params.id);
    } else if (viewName === 'settings' && window.FableFlow.Settings) {
      window.FableFlow.Settings.render();
    }

    // Update URL hash
    let hash = `#${viewName}`;
    const query = new URLSearchParams(params).toString();
    if (query) hash += `?${query}`;
    if (window.location && window.location.hash !== hash) {
      if (typeof history !== 'undefined' && history.pushState) {
        history.pushState(null, '', hash);
      }
    }
  }

  function handleHashChange() {
    const rawHash = window.location.hash.slice(1) || 'home';
    const [path, queryString] = rawHash.split('?');
    const params = {};
    if (queryString) {
      const sp = new URLSearchParams(queryString);
      for (const [key, value] of sp.entries()) {
        params[key] = value;
      }
    }
    navigateTo(path || 'home', params);
  }

  function bindNavLinks() {
    // Top nav desktop tabs
    document.querySelectorAll('[data-nav-target]').forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.preventDefault();
        const target = elem.getAttribute('data-nav-target');
        navigateTo(target);
      });
    });

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-toggle-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    if (mobileBtn && drawer) {
      mobileBtn.addEventListener('click', () => {
        drawer.classList.toggle('open');
      });
    }

    // Brand logo click
    const brand = document.getElementById('nav-brand-link');
    if (brand) {
      brand.addEventListener('click', () => navigateTo('home'));
    }

    // User Profile click -> opens dashboard for registered, settings for guest
    const userBadge = document.getElementById('nav-user-badge');
    if (userBadge) {
      userBadge.addEventListener('click', () => {
        if (window.FableFlow.Auth && window.FableFlow.Auth.isGuest()) {
          navigateTo('settings');
        } else {
          navigateTo('dashboard');
        }
      });
    }
  }

  // ========================================================
  // FUNCTIONAL NAVBAR LIVE SEARCH
  // Supports Stories, Authors, and Genres across Guest & User modes
  // ========================================================
  let activeSearchHighlight = -1;

  function closeNavbarSearch() {
    const dropdown = document.getElementById('nav-search-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    activeSearchHighlight = -1;
  }

  function initNavbarSearch() {
    const searchInput = document.getElementById('nav-search-input');
    const clearBtn = document.getElementById('nav-search-clear-btn');
    const dropdown = document.getElementById('nav-search-dropdown');
    const container = document.getElementById('nav-search-container');

    if (!searchInput || !dropdown) return;

    // Live search as user types
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (clearBtn) {
        clearBtn.style.display = q.length > 0 ? 'inline-flex' : 'none';
      }
      if (q.length === 0) {
        closeNavbarSearch();
      } else {
        performNavbarSearch(q);
      }
    });

    // Re-open on focus if text already exists
    searchInput.addEventListener('focus', () => {
      const q = searchInput.value.trim();
      if (q.length > 0) {
        performNavbarSearch(q);
      }
    });

    // Clear search input button
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        closeNavbarSearch();
        searchInput.focus();
      });
    }

    // Keyboard navigation (Enter, Escape, ArrowDown, ArrowUp)
    searchInput.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.nav-search-item');
      if (e.key === 'Escape') {
        closeNavbarSearch();
        searchInput.blur();
      } else if (e.key === 'ArrowDown') {
        if (items.length > 0) {
          e.preventDefault();
          activeSearchHighlight = (activeSearchHighlight + 1) % items.length;
          updateHighlight(items);
        }
      } else if (e.key === 'ArrowUp') {
        if (items.length > 0) {
          e.preventDefault();
          activeSearchHighlight = (activeSearchHighlight - 1 + items.length) % items.length;
          updateHighlight(items);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSearchHighlight >= 0 && items[activeSearchHighlight]) {
          items[activeSearchHighlight].click();
        } else if (items.length > 0) {
          // Open top matching item
          items[0].click();
        } else {
          // Fallback to home page search filter
          const q = searchInput.value.trim();
          if (q && window.FableFlow.Stories && typeof window.FableFlow.Stories.setSearchQuery === 'function') {
            window.FableFlow.Stories.setSearchQuery(q);
            navigateTo('home');
            closeNavbarSearch();
          }
        }
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (container && !container.contains(e.target)) {
        closeNavbarSearch();
      }
    });
  }

  function updateHighlight(items) {
    items.forEach((item, idx) => {
      if (idx === activeSearchHighlight) {
        item.classList.add('highlighted');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('highlighted');
      }
    });
  }

  function performNavbarSearch(query) {
    const dropdown = document.getElementById('nav-search-dropdown');
    if (!dropdown) return;

    const q = query.trim().toLowerCase();
    activeSearchHighlight = -1;

    // Get stories from catalog (works in registered-user and guest modes)
    let allStories = [];
    if (window.FableFlow.Stories && typeof window.FableFlow.Stories.getStories === 'function') {
      allStories = window.FableFlow.Stories.getStories();
    } else {
      try {
        allStories = JSON.parse(localStorage.getItem('fableflow_stories') || '[]');
      } catch (e) {
        allStories = [];
      }
    }

    // 1. Match Stories (by title, description, genre, author, tags)
    const matchedStories = allStories.filter(story => {
      const title = (story.title || '').toLowerCase();
      const desc = (story.description || '').toLowerCase();
      const genre = (story.genre || '').toLowerCase();
      const author = (story.authorName || '').toLowerCase();
      const tags = Array.isArray(story.tags) ? story.tags.map(t => String(t).toLowerCase()).join(' ') : '';
      return title.includes(q) || desc.includes(q) || genre.includes(q) || author.includes(q) || tags.includes(q);
    }).slice(0, 5);

    // 2. Match Authors
    let allUsers = [];
    if (window.FableFlow.Backend?.isReady()) {
      allUsers = window.FableFlow.Backend.getProfiles().map(profile => ({
        id: profile.id,
        username: profile.username,
        avatar: profile.avatar_url,
        bio: profile.bio
      }));
    } else {
      try {
        allUsers = JSON.parse(localStorage.getItem('fableflow_users') || '[]');
      } catch (e) {
        allUsers = [];
      }
    }

    const authorMap = new Map();
    allStories.forEach(s => {
      if (s.authorName && !authorMap.has(s.authorName)) {
        authorMap.set(s.authorName, {
          id: s.authorId || s.authorName,
          name: s.authorName,
          avatar: s.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          bio: 'FableFlow Author & Storyteller'
        });
      }
    });
    allUsers.forEach(u => {
      if (u.username) {
        authorMap.set(u.username, {
          id: u.id || u.username,
          name: u.username,
          avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          bio: u.bio || 'FableFlow Author'
        });
      }
    });

    const matchedAuthors = [];
    authorMap.forEach(author => {
      const name = (author.name || '').toLowerCase();
      const bio = (author.bio || '').toLowerCase();
      if (name.includes(q) || bio.includes(q)) {
        const storyCount = allStories.filter(s => s.authorName === author.name || s.authorId === author.id).length;
        matchedAuthors.push({ ...author, storyCount });
      }
    });
    matchedAuthors.splice(3); // Top 3 authors

    // 3. Match Genres
    const GENRE_LIST = [
      'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Horror',
      'Science Fiction', 'Adventure', 'Poetry', 'Drama', 'Fanfiction'
    ];
    const matchedGenres = GENRE_LIST.filter(g => g.toLowerCase().includes(q)).slice(0, 2).map(g => {
      const count = allStories.filter(s => (s.genre || '').toLowerCase() === g.toLowerCase()).length;
      return { name: g, count };
    });

    // 4. Render Results Dropdown
    if (matchedStories.length === 0 && matchedAuthors.length === 0 && matchedGenres.length === 0) {
      dropdown.innerHTML = `
        <div class="nav-search-empty">
          <span class="nav-search-empty-icon" aria-hidden="true">🔍</span>
          <div class="nav-search-empty-text">No results found for "<strong>${escapeHtml(query)}</strong>"</div>
          <span class="nav-search-empty-hint">Try searching for keywords like "Citadel", "ElenaVance", "Fantasy", or "Sci-Fi".</span>
        </div>
      `;
      dropdown.style.display = 'block';
      return;
    }

    let html = '';

    // Render Stories
    if (matchedStories.length > 0) {
      html += `
        <div class="nav-search-group-title">
          <span>Stories</span>
          <span>${matchedStories.length} match${matchedStories.length === 1 ? '' : 'es'}</span>
        </div>
      `;
      matchedStories.forEach(story => {
        html += `
          <div class="nav-search-item story-item" data-action="story" data-id="${escapeHtml(story.id)}" role="button" tabindex="0">
            <img src="${window.FableFlow.Backend?.safeHttpUrl(story.coverImage) || 'assets/icons/Magical Fountain Pen and Open Book.webp'}" class="nav-search-thumb" alt="" onerror="this.src='assets/icons/Magical Fountain Pen and Open Book.webp'" />
            <div class="nav-search-info">
              <div class="nav-search-title">${escapeHtml(story.title)}</div>
              <div class="nav-search-meta">by <strong>${escapeHtml(story.authorName || 'Author')}</strong> • <span class="nav-search-genre-badge">${escapeHtml(story.genre || 'Story')}</span></div>
              <div class="nav-search-stats">👁️ ${(story.reads || 0).toLocaleString()} reads • ❤️ ${(story.likes || 0).toLocaleString()} likes</div>
            </div>
          </div>
        `;
      });
    }

    // Render Authors
    if (matchedAuthors.length > 0) {
      html += `
        <div class="nav-search-group-title">
          <span>Authors</span>
          <span>${matchedAuthors.length} match${matchedAuthors.length === 1 ? '' : 'es'}</span>
        </div>
      `;
      matchedAuthors.forEach(author => {
        html += `
          <div class="nav-search-item author-item" data-action="author" data-id="${escapeHtml(author.id)}" role="button" tabindex="0">
            <img src="${window.FableFlow.Backend?.safeHttpUrl(author.avatar) || 'assets/icons/Magical Fountain Pen and Open Book.webp'}" class="nav-search-avatar" alt="" onerror="this.src='assets/icons/Magical Fountain Pen and Open Book.webp'" />
            <div class="nav-search-info">
              <div class="nav-search-title">${escapeHtml(author.name)}</div>
              <div class="nav-search-meta">${escapeHtml(author.bio)}</div>
              <div class="nav-search-stats">📚 ${author.storyCount} published ${author.storyCount === 1 ? 'story' : 'stories'}</div>
            </div>
          </div>
        `;
      });
    }

    // Render Genres
    if (matchedGenres.length > 0) {
      html += `
        <div class="nav-search-group-title">
          <span>Genres</span>
        </div>
      `;
      matchedGenres.forEach(genre => {
        html += `
          <div class="nav-search-item genre-item" data-action="genre" data-genre="${escapeHtml(genre.name)}" role="button" tabindex="0">
            <div class="nav-search-genre-icon" aria-hidden="true">🏷️</div>
            <div class="nav-search-info">
              <div class="nav-search-title">${escapeHtml(genre.name)}</div>
              <div class="nav-search-meta">Explore all ${genre.count} ${genre.count === 1 ? 'story' : 'stories'} in this category</div>
            </div>
          </div>
        `;
      });
    }

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    // Bind item click events
    dropdown.querySelectorAll('.nav-search-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        const id = item.getAttribute('data-id');
        const genre = item.getAttribute('data-genre');

        if (action === 'story' && id) {
          navigateTo('story-detail', { id });
        } else if (action === 'author' && id) {
          navigateTo('author-profile', { id });
        } else if (action === 'genre' && genre) {
          if (window.FableFlow.Stories && typeof window.FableFlow.Stories.setFilterGenre === 'function') {
            window.FableFlow.Stories.setFilterGenre(genre);
          }
          navigateTo('home');
        }
        closeNavbarSearch();
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    init,
    navigateTo,
    closeNavbarSearch,
    getCurrentView: () => currentView
  };
})();

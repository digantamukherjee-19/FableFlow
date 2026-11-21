/**
 * FableFlow authentication backed by Supabase Auth.
 * Guest sessions remain local; registered accounts use Supabase-managed sessions.
 */
window.FableFlow = window.FableFlow || {};

FableFlow.Auth = (function() {
  const SESSION_TYPE_KEY = 'fableflow_session_type';
  let currentUser = null;
  let entryLoginRequired = false;
  let emailInboxUrl = null;

  async function init() {
    const client = FableFlow.Backend.getClient();
    bindEvents();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    if (data.session?.user) {
      await establishUser(data.session.user, false);
      entryLoginRequired = false;
    } else if (localStorage.getItem(SESSION_TYPE_KEY) === 'guest') {
      currentUser = createGuestUser();
      entryLoginRequired = false;
    } else {
      currentUser = null;
      entryLoginRequired = true;
    }

    updateUI();

    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        currentUser = null;
        updateUI();
      }
    });
  }

  function createGuestUser() {
    return {
      id: 'usr_guest',
      username: 'Guest',
      email: 'guest@fableflow.com',
      bio: 'Browsing FableFlow in Guest Mode',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      preferences: FableFlow.Accessibility?.getPreferences(),
      isGuest: true
    };
  }

  async function establishUser(authUser, loadData = true) {
    const profile = await FableFlow.Backend.getProfile(authUser.id);
    if (!profile) {
      throw new Error('Your account profile is still being prepared. Please try signing in again in a moment.');
    }

    currentUser = {
      id: authUser.id,
      username: profile.username,
      email: authUser.email || '',
      bio: profile.bio,
      avatar: profile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.username)}`,
      preferences: profile.preferences || {},
      createdAt: profile.createdAt,
      isGuest: false
    };
    localStorage.removeItem(SESSION_TYPE_KEY);

    const preferences = currentUser.preferences;
    if (preferences && FableFlow.Accessibility) {
      FableFlow.Accessibility.setPreferences(preferences, { persist: false });
    }

    if (loadData) {
      await FableFlow.Backend.loadCatalog();
      await FableFlow.Backend.loadUserData();
    }
    updateUI();
    return currentUser;
  }

  function setAuthError(message) {
    const errBox = document.getElementById('auth-error-msg');
    const successBox = document.getElementById('auth-success-msg');
    if (successBox) successBox.style.display = 'none';
    if (errBox) {
      errBox.textContent = message;
      errBox.style.display = 'block';
    }
  }

  function setAuthSuccess(message) {
    const errBox = document.getElementById('auth-error-msg');
    const successBox = document.getElementById('auth-success-msg');
    if (errBox) errBox.style.display = 'none';
    if (successBox) {
      successBox.textContent = message;
      successBox.style.display = 'block';
    }
  }

  function hideAuthSuccessBanner() {
    const banner = document.getElementById('auth-success-banner');
    if (banner) banner.style.display = 'none';
  }

  function showEmailConfirmation(email) {
    const modal = document.getElementById('email-confirmation-modal');
    const address = document.getElementById('email-confirmation-address');
    const inboxButton = document.getElementById('email-confirmation-open-inbox');
    if (!modal) return;

    if (address) address.textContent = email;
    const domain = String(email || '').split('@').pop().toLowerCase();
    const inboxes = {
      'gmail.com': 'https://mail.google.com/mail/u/0/#inbox',
      'googlemail.com': 'https://mail.google.com/mail/u/0/#inbox',
      'outlook.com': 'https://outlook.live.com/mail/0/',
      'hotmail.com': 'https://outlook.live.com/mail/0/',
      'live.com': 'https://outlook.live.com/mail/0/',
      'yahoo.com': 'https://mail.yahoo.com/',
      'icloud.com': 'https://www.icloud.com/mail',
      'me.com': 'https://www.icloud.com/mail',
      'proton.me': 'https://mail.proton.me/',
      'protonmail.com': 'https://mail.proton.me/'
    };
    emailInboxUrl = inboxes[domain] || null;
    if (inboxButton) inboxButton.style.display = emailInboxUrl ? 'inline-flex' : 'none';
    modal.classList.add('open');
  }

  function closeEmailConfirmation() {
    const modal = document.getElementById('email-confirmation-modal');
    if (modal) modal.classList.remove('open');
  }

  function openEmailInbox() {
    if (emailInboxUrl) window.open(emailInboxUrl, '_blank', 'noopener,noreferrer');
  }

  async function login(email, password) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) throw new Error('Enter your email address and password.');

    const { data, error } = await FableFlow.Backend.getClient().auth.signInWithPassword({
      email: normalizedEmail,
      password
    });
    if (error) throw new Error('Could not sign in. Check your email and password, then try again.');

    await establishUser(data.user, true);
    entryLoginRequired = false;
    hideAuthSuccessBanner();
    closeModal();
    if (window.FableFlow.Navigation) window.FableFlow.Navigation.navigateTo('settings');
    return currentUser;
  }

  async function register(username, email, password, confirmPassword, preferences) {
    const cleanUsername = (username || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanUsername || !cleanEmail || !password) throw new Error('All fields are required.');
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(cleanUsername)) {
      throw new Error('Use 3–30 characters for your username: letters, numbers, dots, underscores, or hyphens.');
    }
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');
    if (!(await FableFlow.Backend.usernameAvailable(cleanUsername))) {
      throw new Error('That username is already in use. Please choose another.');
    }

    const options = {
      data: {
        username: cleanUsername,
        bio: 'Storywriter & passionate reader on FableFlow.',
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
        preferences: preferences || FableFlow.Accessibility?.getPreferences() || {}
      }
    };
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      options.emailRedirectTo = `${window.location.origin}${window.location.pathname}`;
    }

    const { data, error } = await FableFlow.Backend.getClient().auth.signUp({
      email: cleanEmail,
      password,
      options
    });
    if (error) throw new Error(error.message || 'Account creation failed. Please try again.');

    if (!data.session) {
      const message = 'Your account was created. Check your email to confirm it, then sign in.';
      setAuthSuccess(message);
      const banner = document.getElementById('auth-success-banner');
      if (banner) {
        banner.textContent = message;
        banner.style.display = 'block';
      }
      entryLoginRequired = false;
      closeModal();
      if (window.FableFlow.Navigation) window.FableFlow.Navigation.navigateTo('home');
      showEmailConfirmation(cleanEmail);
      return null;
    }

    await establishUser(data.user, true);
    entryLoginRequired = false;
    hideAuthSuccessBanner();
    closeModal();
    if (window.FableFlow.Navigation) window.FableFlow.Navigation.navigateTo('home');
    return currentUser;
  }

  async function continueAsGuest() {
    currentUser = createGuestUser();
    localStorage.setItem(SESSION_TYPE_KEY, 'guest');
    entryLoginRequired = false;
    await FableFlow.Backend.loadUserData();
    updateUI();
    closeModal();
    if (window.FableFlow.Navigation) window.FableFlow.Navigation.navigateTo('settings');
    return currentUser;
  }

  async function logout() {
    try {
      await FableFlow.Backend.getClient().auth.signOut();
    } catch (error) {
      console.warn('Supabase sign-out failed', error);
    }
    currentUser = null;
    localStorage.removeItem(SESSION_TYPE_KEY);
    try {
      await FableFlow.Backend.loadUserData();
    } catch (error) {
      console.warn('Could not clear the previous account data from memory', error);
    }
    entryLoginRequired = true;
    updateUI();
    if (window.FableFlow.Navigation) window.FableFlow.Navigation.navigateTo('home');
    openModal('login', { required: true });
  }

  function updateUI() {
    const authActions = document.getElementById('nav-auth-actions');
    const userBadge = document.getElementById('nav-user-badge');
    const userNameSpan = document.getElementById('nav-username');
    const userAvatarImg = document.getElementById('nav-user-avatar');

    if (!currentUser) {
      if (authActions) authActions.style.display = 'flex';
      if (userBadge) userBadge.style.display = 'none';
      return;
    }

    if (currentUser.isGuest) {
      if (authActions) authActions.style.display = 'flex';
      if (userBadge) userBadge.title = 'Browsing as Guest (Click to view Settings)';
    } else {
      if (authActions) authActions.style.display = 'none';
      if (userBadge) userBadge.title = `Signed in as ${currentUser.username} (Go to Dashboard)`;
    }
    if (userBadge) userBadge.style.display = 'flex';
    if (userNameSpan) userNameSpan.textContent = currentUser.username;
    if (userAvatarImg) userAvatarImg.src = currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.username)}`;
  }

  function openModal(mode = 'login', options = {}) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('open');

    const closeBtn = document.getElementById('auth-modal-close');
    if (closeBtn) closeBtn.style.display = (entryLoginRequired || options.required) ? 'none' : '';

    ['login-email', 'login-password', 'reg-username', 'reg-email', 'reg-password', 'reg-confirm-password']
      .forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });

    const loginTab = document.getElementById('auth-tab-login');
    const registerTab = document.getElementById('auth-tab-register');
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const errBox = document.getElementById('auth-error-msg');
    const successBox = document.getElementById('auth-success-msg');
    if (errBox) errBox.style.display = 'none';
    if (successBox) successBox.style.display = 'none';

    const isRegister = mode === 'register';
    if (loginTab) loginTab.classList.toggle('active', !isRegister);
    if (registerTab) registerTab.classList.toggle('active', isRegister);
    if (loginForm) loginForm.style.display = isRegister ? 'none' : 'block';
    if (registerForm) registerForm.style.display = isRegister ? 'block' : 'none';
  }

  function closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
  }

  function showGuestPrompt(actionName) {
    const modal = document.getElementById('guest-prompt-modal');
    const msg = document.getElementById('guest-prompt-message');
    if (msg && actionName) {
      msg.textContent = `You are currently browsing as a guest. To ${actionName}, please sign in or create a free account.`;
    }
    if (modal) modal.classList.add('open');
  }

  function closeGuestPrompt() {
    const modal = document.getElementById('guest-prompt-modal');
    if (modal) modal.classList.remove('open');
  }

  function requireAuth(actionName, callback) {
    if (currentUser && !currentUser.isGuest) {
      if (typeof callback === 'function') callback();
      return true;
    }
    showGuestPrompt(actionName);
    return false;
  }

  function bindEvents() {
    const signinBtn = document.getElementById('nav-signin-btn');
    const signupBtn = document.getElementById('nav-signup-btn');
    if (signinBtn) signinBtn.addEventListener('click', () => openModal('login'));
    if (signupBtn) signupBtn.addEventListener('click', () => openModal('register'));

    const closeBtn = document.getElementById('auth-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const loginTab = document.getElementById('auth-tab-login');
    const registerTab = document.getElementById('auth-tab-register');
    if (loginTab) loginTab.addEventListener('click', () => openModal('login'));
    if (registerTab) registerTab.addEventListener('click', () => openModal('register'));

    const guestButtons = [document.getElementById('auth-guest-btn-login'), document.getElementById('auth-guest-btn-register')];
    guestButtons.forEach(button => button?.addEventListener('click', () => continueAsGuest().catch(error => setAuthError(error.message))));

    const promptSigninBtn = document.getElementById('guest-prompt-signin-btn');
    const promptCancelBtn = document.getElementById('guest-prompt-cancel-btn');
    if (promptSigninBtn) promptSigninBtn.addEventListener('click', () => { closeGuestPrompt(); openModal('login'); });
    if (promptCancelBtn) promptCancelBtn.addEventListener('click', closeGuestPrompt);

    const openInboxBtn = document.getElementById('email-confirmation-open-inbox');
    const confirmationSigninBtn = document.getElementById('email-confirmation-signin');
    if (openInboxBtn) openInboxBtn.addEventListener('click', openEmailInbox);
    if (confirmationSigninBtn) confirmationSigninBtn.addEventListener('click', () => {
      closeEmailConfirmation();
      openModal('login');
    });

    const loginForm = document.getElementById('auth-login-form');
    if (loginForm) loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await login(document.getElementById('login-email').value, document.getElementById('login-password').value);
      } catch (error) {
        setAuthError(error.message);
      }
    });

    const registerForm = document.getElementById('auth-register-form');
    if (registerForm) registerForm.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const preferences = FableFlow.Accessibility?.getPreferences() || {};
        await register(
          document.getElementById('reg-username').value,
          document.getElementById('reg-email').value,
          document.getElementById('reg-password').value,
          document.getElementById('reg-confirm-password').value,
          preferences
        );
      } catch (error) {
        setAuthError(error.message);
      }
    });

    const fontSelect = document.getElementById('reg-pref-font');
    if (fontSelect) fontSelect.addEventListener('change', event => FableFlow.Accessibility?.setFontFamily(event.target.value));
    const sizeRange = document.getElementById('reg-pref-size');
    if (sizeRange) sizeRange.addEventListener('input', event => {
      FableFlow.Accessibility?.setFontSize(event.target.value);
      const display = document.getElementById('reg-pref-size-val');
      if (display) display.textContent = `${event.target.value}px`;
    });
    const lineRange = document.getElementById('reg-pref-line');
    if (lineRange) lineRange.addEventListener('input', event => {
      FableFlow.Accessibility?.setLineSpacing(event.target.value);
      const display = document.getElementById('reg-pref-line-val');
      if (display) display.textContent = `${event.target.value}x`;
    });
    const wordRange = document.getElementById('reg-pref-word');
    if (wordRange) wordRange.addEventListener('input', event => {
      FableFlow.Accessibility?.setWordSpacing(event.target.value);
      const display = document.getElementById('reg-pref-word-val');
      if (display) display.textContent = `${event.target.value}px`;
    });
  }

  return {
    init,
    getCurrentUser: () => currentUser,
    isAuthenticated: () => !!(currentUser && !currentUser.isGuest),
    isGuest: () => !!(currentUser && currentUser.isGuest),
    isRegisteredUser: () => !!(currentUser && !currentUser.isGuest),
    continueAsGuest,
    showGuestPrompt,
    closeGuestPrompt,
    requireAuth,
    login,
    register,
    logout,
    openModal,
    closeModal,
    updateUI
  };
})();

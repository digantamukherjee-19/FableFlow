/**
 * FableFlow Application Entrypoint (Vanilla JS)
 * Initializes accessibility, authentication, navigation, story catalogs, editor, community, learning hub, and AI assistant.
 */

window.FableFlow = window.FableFlow || {};

FableFlow.App = (function() {
  function showStartupError(message) {
    const banner = document.getElementById('backend-error-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.style.display = 'block';
  }

  async function init() {
    console.log('✨ Initializing FableFlow Vanilla Web App...');

    // 1. Supabase client and local accessibility styles.
    try {
      if (FableFlow.Backend) FableFlow.Backend.init();
    } catch (error) {
      console.error('Supabase startup failed', error);
      showStartupError('FableFlow could not connect to its backend. Check that the Supabase client script can load.');
    }
    if (FableFlow.Accessibility) FableFlow.Accessibility.init();

    // 2. Restore a Supabase Auth session before loading private records.
    if (FableFlow.Auth) {
      try {
        await FableFlow.Auth.init();
      } catch (error) {
        console.error('Authentication initialization failed', error);
        showStartupError('Authentication could not be initialized. Check the Supabase project settings and try refreshing.');
      }
    }

    // 3. Load public catalog data and the current user's protected records.
    if (FableFlow.Backend && FableFlow.Backend.isReady()) {
      try {
        await FableFlow.Backend.loadCatalog();
        await FableFlow.Backend.loadUserData();
      } catch (error) {
        console.error('FableFlow data startup failed', error);
      }
    }

    // 4. Stories Catalog & Reading Experience
    if (FableFlow.Stories) FableFlow.Stories.init();

    // 5. Writing Studio Editor
    if (FableFlow.Editor) FableFlow.Editor.init();

    // 6. Community Lounges & Chat
    if (FableFlow.Community) FableFlow.Community.init();

    // 7. Learning Hub (Focus, Vocab, Dictionary)
    if (FableFlow.Learning) FableFlow.Learning.init();

    // 8. Settings
    if (FableFlow.Settings) FableFlow.Settings.init();

    // 9. Floating AI Co-Pilot Assistant
    if (FableFlow.AIAssistant) FableFlow.AIAssistant.init();

    // 10. Client-side Navigation Router
    if (FableFlow.Navigation) FableFlow.Navigation.init();

    console.log('🚀 FableFlow Ready. Where stories flow and creativity grows.');
  }

  return { init };
})();

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  FableFlow.App.init();
});

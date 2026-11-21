/**
 * FableFlow Authentication Video Companion Controller
 * Ensures seamless, muted, loop playback of the studying video beside the login/signup form.
 */

window.FableFlow = window.FableFlow || {};

FableFlow.AuthVideo = (function() {
  'use strict';

  let videoEl = null;
  let modalEl = null;

  function init() {
    videoEl = document.getElementById('auth-studying-video');
    modalEl = document.getElementById('auth-modal');

    if (!videoEl) return;

    // Strictly enforce muted audio
    enforceMuted(videoEl);

    // Initial playback attempt
    playVideo();

    // Listen for modal visibility changes
    bindModalObserver();

    // Listen for seamless loop fallback
    videoEl.addEventListener('ended', function() {
      videoEl.currentTime = 0;
      playVideo();
    });

    // Page visibility handling
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        if (videoEl && !videoEl.paused) {
          videoEl.pause();
        }
      } else {
        if (modalEl && modalEl.classList.contains('open')) {
          playVideo();
        }
      }
    });

    // Fallback on first user gesture if browser blocked early autoplay
    const unblockAutoplay = function() {
      if (videoEl && videoEl.paused && modalEl && modalEl.classList.contains('open')) {
        playVideo();
      }
      document.removeEventListener('click', unblockAutoplay);
      document.removeEventListener('keydown', unblockAutoplay);
    };
    document.addEventListener('click', unblockAutoplay, { passive: true });
    document.addEventListener('keydown', unblockAutoplay, { passive: true });
  }

  function enforceMuted(video) {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
  }

  function playVideo() {
    if (!videoEl) return;
    enforceMuted(videoEl);

    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(function(err) {
        // Autoplay policy prevented playback until user interaction
        // Muted videos usually autoplay freely across all modern browsers
      });
    }
  }

  function pauseVideo() {
    if (!videoEl) return;
    try {
      videoEl.pause();
    } catch (e) {}
  }

  function bindModalObserver() {
    if (!modalEl) return;

    const observer = new MutationObserver(function() {
      if (modalEl.classList.contains('open')) {
        enforceMuted(videoEl);
        playVideo();
      } else {
        pauseVideo();
      }
    });

    observer.observe(modalEl, { attributes: true, attributeFilter: ['class'] });
  }

  return {
    init: init,
    play: playVideo,
    pause: pauseVideo
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FableFlow.AuthVideo.init);
} else {
  FableFlow.AuthVideo.init();
}

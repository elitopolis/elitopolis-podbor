(() => {
  'use strict';

  const counterId = 113665495;
  const storageKey = 'elitopolis.analytics.v1';
  let choice = '';
  let started = false;
  let formViewed = false;
  const form = document.getElementById('leadForm');

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'accepted' || saved === 'rejected') choice = saved;
  } catch (_) {
    // A storage restriction must not prevent the visitor from using the form.
  }

  const banner = document.createElement('section');
  banner.id = 'elpAnalyticsNotice';
  banner.className = 'elp-analytics';
  banner.setAttribute('aria-label', 'Статистика посещений');
  banner.hidden = true;
  banner.innerHTML =
    '<div class="elp-analytics__copy">' +
      '<strong>Статистика посещений</strong>' +
      '<p>Разрешить Яндекс Метрике собирать статистику посещений и действий на сайте с помощью cookie? ' +
      '<a href="/privacy.html" target="_blank" rel="noopener">Подробнее в политике</a>.</p>' +
    '</div>' +
    '<div class="elp-analytics__actions">' +
      '<button class="elp-analytics__button" type="button" data-analytics-choice="accepted">Разрешить</button>' +
      '<button class="elp-analytics__button" type="button" data-analytics-choice="rejected">Без аналитики</button>' +
    '</div>';
  document.body.appendChild(banner);

  const controls = document.createElement('div');
  controls.className = 'elp-analytics-controls';
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'elp-analytics-settings';
  settings.textContent = 'Настройки аналитики';
  controls.appendChild(settings);
  document.body.appendChild(controls);

  function updateSpace() {
    document.documentElement.style.setProperty(
      '--elp-analytics-space',
      banner.hidden ? '0px' : (banner.offsetHeight + 16) + 'px'
    );
  }

  function showNotice() {
    banner.hidden = false;
    document.body.classList.add('elp-analytics-pending');
    updateSpace();
  }

  function hideNotice() {
    banner.hidden = true;
    document.body.classList.remove('elp-analytics-pending');
    updateSpace();
  }

  function trackGoal(name) {
    if (choice !== 'accepted' || !started || typeof window.ym !== 'function') {
      return false;
    }
    try {
      // Goal names only: never pass names, phone numbers or form field values.
      window.ym(counterId, 'reachGoal', name);
      return true;
    } catch (_) {
      return false;
    }
  }

  function trackFormView() {
    if (formViewed || !form || form.hidden) return;
    const rect = form.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      formViewed = trackGoal('form_view');
    }
  }

  function startCounter() {
    if (started || choice !== 'accepted') return;
    try {
      window.ym = window.ym || function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
      window.ym.l = window.ym.l || Date.now();
      window.ym(counterId, 'init', {
        clickmap: false,
        trackLinks: false,
        accurateTrackBounce: true,
        webvisor: false,
        ecommerce: false,
        disableYtm: true
      });
      started = true;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + counterId;
      document.head.appendChild(script);
      trackFormView();
    } catch (_) {
      // Analytics failure must never interrupt the application.
    }
  }

  function choose(next) {
    const wasStarted = started;
    choice = next;
    try {
      localStorage.setItem(storageKey, choice);
    } catch (_) {}
    hideNotice();
    if (choice === 'accepted') {
      startCounter();
    } else if (wasStarted) {
      // Stop the existing tag and its timers by loading a page without analytics.
      window.location.reload();
    }
  }

  banner.querySelectorAll('[data-analytics-choice]').forEach(button => {
    button.addEventListener('click', () => {
      choose(button.getAttribute('data-analytics-choice'));
    });
  });

  settings.addEventListener('click', () => {
    showNotice();
    banner.querySelector('button').focus();
  });

  window.addEventListener('resize', updateSpace);
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(updateSpace).observe(banner);
  }

  if (form) {
    if (typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) trackFormView();
      }, { threshold: 0.15 });
      observer.observe(form);
    } else {
      window.addEventListener('scroll', trackFormView, { passive: true });
    }
    form.addEventListener('focusin', trackFormView);
    form.addEventListener('elitopolis:lead-submit', () => trackGoal('lead_submit'));
    form.addEventListener('elitopolis:lead-success', () => trackGoal('lead_success'));
    form.addEventListener('elitopolis:lead-error', () => trackGoal('lead_error'));
  }

  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => trackGoal('phone_click'));
  });

  if (choice === 'accepted') startCounter();
  else if (choice !== 'rejected') showNotice();
})();

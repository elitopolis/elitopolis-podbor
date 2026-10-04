(() => {
  'use strict';

  const cfg = window.ELITOPOLIS_CONFIG || {};

  // =========================================================
  // БОЕВЫЕ НАСТРОЙКИ
  // =========================================================

  const API_ENDPOINT =
    cfg.apiEndpoint ||
    'https://newapi.elitopolis.ru/webhook/elitopolis-lead';

  const CAMPAIGN =
    cfg.campaign ||
    'troitsky_01';


  // =========================================================
  // ЭЛЕМЕНТЫ СТРАНИЦЫ
  // =========================================================

  const form = document.getElementById('leadForm');
  const successBlock = document.getElementById('successBlock');
  const formStatus = document.getElementById('formStatus');
  const heroVisual = document.getElementById('heroVisual');
  const privacyLink = document.getElementById('privacyLink');

  if (!form) {
    console.error('Elitopolis: не найден #leadForm');
    return;
  }


  // =========================================================
  // КАРТИНКА HERO И ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ
  // =========================================================

  if (heroVisual && cfg.heroImage) {
    heroVisual.style.backgroundImage = `url("${cfg.heroImage}")`;
  }

  if (privacyLink && cfg.privacyUrl) {
    privacyLink.href = cfg.privacyUrl;
  }


  // =========================================================
  // UTM-МЕТКИ
  // =========================================================

  const params = new URLSearchParams(window.location.search);

  const utm = {
    source: params.get('utm_source') || '',
    campaign: params.get('utm_campaign') || '',
    medium: params.get('utm_medium') || '',
    content: params.get('utm_content') || ''
  };


  // =========================================================
  // КНОПКИ ПРОКРУТКИ К ФОРМЕ
  // =========================================================

  document.querySelectorAll('.elp-scroll-form').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();

      form.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    });
  });


  // =========================================================
  // КАРТОЧКИ ИНТЕРЕСОВ
  // =========================================================

  const updateChoiceState = () => {
    document.querySelectorAll('.elp-choice').forEach((choice) => {
      const checkbox = choice.querySelector(
        'input[type="checkbox"][name="interests"]'
      );

      if (!checkbox) return;

      choice.classList.toggle('is-selected', checkbox.checked);
    });
  };

  document
    .querySelectorAll('input[type="checkbox"][name="interests"]')
    .forEach((checkbox) => {
      checkbox.addEventListener('change', updateChoiceState);
    });

  updateChoiceState();


  // =========================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =========================================================

  const setStatus = (message, type = '') => {
    if (!formStatus) return;

    formStatus.textContent = message;

    formStatus.classList.remove(
      'is-error',
      'is-success',
      'is-loading'
    );

    if (type) {
      formStatus.classList.add(`is-${type}`);
    }
  };


  const getField = (name) => {
    const field = form.elements[name];

    if (!field) return '';

    return String(field.value || '').trim();
  };


  const getInterests = () => {
    return Array.from(
      form.querySelectorAll(
        'input[type="checkbox"][name="interests"]:checked'
      )
    ).map((item) => item.value);
  };


  const getSubmitButton = () => {
    return form.querySelector(
      '.elp-submit, button[type="submit"], input[type="submit"]'
    );
  };


  // =========================================================
  // ОТПРАВКА ФОРМЫ
  // =========================================================

  let submitting = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (submitting) return;


    // -------------------------------------------------------
    // Проверяем стандартные required-поля формы
    // -------------------------------------------------------

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }


    // -------------------------------------------------------
    // Получаем данные
    // -------------------------------------------------------

    const firstName = getField('first_name');
    const lastName = getField('last_name');
    const patronymic = getField('patronymic');
    const phone = getField('phone');

    const consent = form.elements.consent;

    if (consent && !consent.checked) {
      setStatus(
        'Необходимо согласие на обработку персональных данных.',
        'error'
      );
      return;
    }


    if (!firstName || !lastName || !phone) {
      setStatus(
        'Заполните имя, фамилию и телефон.',
        'error'
      );
      return;
    }


    const interests = getInterests();

    const payload = {
      first_name: firstName,
      last_name: lastName,
      patronymic: patronymic,
      phone: phone,

      campaign: CAMPAIGN,

      interests: interests,

      source:
        utm.source ||
        'go.elitopolis.ru',

      utm_campaign: utm.campaign,
      utm_medium: utm.medium,
      utm_content: utm.content,

      page_url: window.location.href,
      referrer: document.referrer || ''
    };


    // -------------------------------------------------------
    // Блокируем повторное нажатие
    // -------------------------------------------------------

    const submitButton = getSubmitButton();

    submitting = true;

    let oldButtonText = '';

    if (submitButton) {
      submitButton.disabled = true;

      if (submitButton.tagName === 'INPUT') {
        oldButtonText = submitButton.value;
        submitButton.value = 'Отправляем...';
      } else {
        oldButtonText = submitButton.textContent;
        submitButton.textContent = 'Отправляем...';
      }
    }

    setStatus('Отправляем заявку...', 'loading');


    // -------------------------------------------------------
    // Отправляем в n8n
    // -------------------------------------------------------

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(payload)
      });


      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }


      // -----------------------------------------------------
      // УСПЕХ
      // -----------------------------------------------------

      setStatus('', '');

      form.reset();
      updateChoiceState();

      if (successBlock) {
        form.style.display = 'none';
        successBlock.hidden = false;
        successBlock.style.display = '';

        successBlock.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      } else {
        setStatus(
          'Спасибо! Заявка отправлена.',
          'success'
        );
      }


    } catch (error) {
      console.error(
        'Elitopolis: ошибка отправки заявки',
        error
      );

      setStatus(
        'Не удалось отправить заявку. Попробуйте ещё раз.',
        'error'
      );

    } finally {
      submitting = false;

      if (submitButton) {
        submitButton.disabled = false;

        if (submitButton.tagName === 'INPUT') {
          submitButton.value =
            oldButtonText || 'Отправить';
        } else {
          submitButton.textContent =
            oldButtonText || 'Отправить';
        }
      }
    }
  });

})();

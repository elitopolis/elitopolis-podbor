(function(){

  const cfg =
    window.ELITOPOLIS_CONFIG || {};


  const $ =
    (selector, root = document) =>
      root.querySelector(selector);


  const $$ =
    (selector, root = document) =>
      Array.from(
        root.querySelectorAll(selector)
      );



  /* =========================
     HERO IMAGE
     ========================= */

  const hero =
    $("#heroVisual");


  if(
    cfg.heroImage &&
    hero
  ){

    const img =
      new Image();


    img.onload = () => {

      hero.style.backgroundImage =
        `url("${cfg.heroImage}")`;


      const placeholder =
        $(".elp-hero__placeholder", hero);


      if(placeholder){
        placeholder.remove();
      }

    };


    img.src =
      cfg.heroImage;

  }



  /* =========================
     PRIVACY POLICY
     ========================= */

  const privacy =
    $("#privacyLink");


  if(
    privacy &&
    cfg.privacyUrl
  ){

    privacy.href =
      cfg.privacyUrl;

  }



  /* =========================
     ELEMENTS
     ========================= */

  const formSection =
    $("#formSection");


  const form =
    $("#leadForm");


  const status =
    $("#formStatus");


  const success =
    $("#successBlock");



  /* =========================
     SCROLL TO FORM
     ========================= */

  function scrollToForm(){

    if(!formSection){
      return;
    }


    formSection.scrollIntoView({

      behavior:"smooth",

      block:"start"

    });

  }



  $$(".elp-scroll-form")
    .forEach(

      button => {

        button.addEventListener(
          "click",
          scrollToForm
        );

      }

    );



  /* =========================
     INTEREST BUTTONS
     ========================= */

  $$(".elp-choice")
    .forEach(

      button => {

        button.addEventListener(
          "click",
          () => {

            const interest =
              button.dataset.interest || "";


            $$(".elp-choice")
              .forEach(

                item => {

                  item.classList.remove(
                    "is-selected"
                  );

                }

              );


            button.classList.add(
              "is-selected"
            );


            $$("#interestChips input[type=checkbox]")
              .forEach(

                input => {

                  if(
                    input.value === interest
                  ){

                    input.checked = true;

                  }

                }

              );


            scrollToForm();

          }
        );

      }

    );



  /* =========================
     FORM
     ========================= */

  if(!form){
    return;
  }



  form.addEventListener(
    "submit",

    async event => {


      event.preventDefault();


      status.textContent =
        "";


      /* =====================
         ОБЯЗАТЕЛЬНЫЕ ПОЛЯ
         ===================== */

      const firstName =
        form.elements.first_name
          .value
          .trim();


      const lastName =
        form.elements.last_name
          .value
          .trim();


      const patronymic =
        form.elements.patronymic
          .value
          .trim();


      const phone =
        form.elements.phone
          .value
          .trim();



      /*
         Дополнительная проверка.

         Даже если браузер по какой-то
         причине пропустит required,
         без имени, фамилии и телефона
         форма дальше не пойдёт.
      */

      if(
        !firstName ||
        !lastName ||
        !phone
      ){

        status.textContent =
          "Заполните имя, фамилию и телефон.";


        return;

      }



      /*
         Проверяем стандартные
         обязательные поля,
         включая согласие
         на обработку данных.
      */

      if(
        !form.reportValidity()
      ){

        return;

      }



      /* =====================
         ПОКА BACKEND НЕ ПОДКЛЮЧЕН
         ===================== */

      if(
        !cfg.apiEndpoint
      ){

        status.textContent =
          "Форма пока в тестовом режиме. Следующим шагом подключим n8n.";


        return;

      }



      /* =====================
         БЛОКИРУЕМ КНОПКУ
         ===================== */

      const submit =
        $(".elp-submit", form);


      submit.disabled =
        true;



      /* =====================
         UTM
         ===================== */

      const params =
        new URLSearchParams(
          location.search
        );



      /* =====================
         ВЫБРАННЫЕ ИНТЕРЕСЫ
         ===================== */

      const interests =
        $$("#interestChips input[type=checkbox]:checked")
          .map(
            input => input.value
          );



      /* =====================
         ДАННЫЕ ЛИДА
         ===================== */

      const payload = {

        first_name:
          firstName,

        last_name:
          lastName,

        patronymic:
          patronymic,

        phone:
          phone,

        campaign:
          cfg.campaign ||
          "troitsky_01",

        interests:
          interests,

        source:
          params.get("utm_source") ||
          params.get("source") ||
          "",

        utm_campaign:
          params.get("utm_campaign") ||
          "",

        utm_medium:
          params.get("utm_medium") ||
          "",

        utm_content:
          params.get("utm_content") ||
          "",

        page_url:
          location.href,

        referrer:
          document.referrer ||
          ""

      };



      /* =====================
         ОТПРАВКА В N8N
         ===================== */

      try{


        const response =
          await fetch(

            cfg.apiEndpoint,

            {

              method:"POST",

              headers:{

                "Content-Type":
                  "application/json"

              },

              body:
                JSON.stringify(
                  payload
                )

            }

          );



        if(
          !response.ok
        ){

          throw new Error(
            "HTTP " +
            response.status
          );

        }



        /* =====================
           УСПЕШНАЯ ЗАЯВКА
           ===================== */

        form.hidden =
          true;


        success.hidden =
          false;



      }
      catch(error){


        status.textContent =
          "Не удалось отправить запрос. Попробуйте ещё раз.";


        submit.disabled =
          false;

      }


    }

  );


})();

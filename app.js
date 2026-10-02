
(function(){
  const cfg = window.ELITOPOLIS_CONFIG || {};
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  const hero = $("#heroVisual");
  if (cfg.heroImage && hero) {
    const img = new Image();
    img.onload = () => {
      hero.style.backgroundImage = `url("${cfg.heroImage}")`;
      const ph = $(".elp-hero__placeholder", hero);
      if (ph) ph.remove();
    };
    img.src = cfg.heroImage;
  }

  const privacy = $("#privacyLink");
  if (privacy && cfg.privacyUrl) privacy.href = cfg.privacyUrl;

  const formSection = $("#formSection");
  const form = $("#leadForm");
  const status = $("#formStatus");
  const success = $("#successBlock");

  function scrollToForm(){
    if(formSection) formSection.scrollIntoView({behavior:"smooth",block:"start"});
  }

  $$(".elp-scroll-form").forEach(btn=>btn.addEventListener("click",scrollToForm));

  $$(".elp-choice").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const interest = btn.dataset.interest || "";
      $$(".elp-choice").forEach(b=>b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      $$("#interestChips input[type=checkbox]").forEach(input=>{
        if(input.value===interest) input.checked = true;
      });
      scrollToForm();
    });
  });

  if(!form) return;

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    status.textContent = "";

    if(!form.reportValidity()) return;

    if(!cfg.apiEndpoint){
      status.textContent = "Форма пока в тестовом режиме. Следующим шагом подключим n8n.";
      return;
    }

    const submit = $(".elp-submit",form);
    submit.disabled = true;

    const params = new URLSearchParams(location.search);
    const interests = $$("#interestChips input[type=checkbox]:checked").map(i=>i.value);

    const payload = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      campaign: cfg.campaign || "troitsky_01",
      interests,
      source: params.get("utm_source") || params.get("source") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_content: params.get("utm_content") || "",
      page_url: location.href,
      referrer: document.referrer || ""
    };

    try{
      const res = await fetch(cfg.apiEndpoint,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      if(!res.ok) throw new Error("HTTP "+res.status);
      form.hidden = true;
      success.hidden = false;
    }catch(err){
      status.textContent = "Не удалось отправить запрос. Попробуйте ещё раз.";
      submit.disabled = false;
    }
  });
})();

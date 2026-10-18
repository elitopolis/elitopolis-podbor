const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const html = fs.readFileSync('index.html','utf8');
const core = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const analytics = fs.readFileSync('analytics.js','utf8');
class Element extends EventTarget {
  constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.hidden=false;this.children=[];this.style={};this.attributes={};this.offsetHeight=170;this.rect={top:1600,bottom:2400};this.textContent='';this.disabled=false;this.classList={add(){},remove(){},toggle(){}};}
  appendChild(el){this.children.push(el);return el;}
  setAttribute(k,v){this.attributes[k]=v;}
  getAttribute(k){return this.attributes[k];}
  focus(){}
  scrollIntoView(){}
  getBoundingClientRect(){return this.rect;}
  querySelectorAll(s){return s==='[data-analytics-choice]'?this.buttons||[]:[];}
  querySelector(s){if(s==='button') return this.buttons[0];if(s==='.elp-submit')return this.submit;return null;}
  set innerHTML(value){this.markup=value;if(value.includes('data-analytics-choice')){this.buttons=['accepted','rejected'].map(v=>{const b=new Element('button');b.setAttribute('data-analytics-choice',v);return b;});}}
}
function harness(saved='', storageBroken=false, outcome='ok'){
  const body=new Element('body'), head=new Element('head'), form=new Element('form');
  const status=new Element(), success=new Element(), section=new Element(), submit=new Element('button');
  success.hidden=true;form.submit=submit;
  form.elements={first_name:{value:'Test'},last_name:{value:'Lead'},patronymic:{value:''},phone:{value:'+70000000000'},consent:{checked:true}};
  const ids={leadForm:form,formStatus:status,successBlock:success,formSection:section};
  const location={href:'https://go.elitopolis.ru/?utm_source=rutube&utm_campaign=troitsky_short_01&utm_medium=profile',search:'?utm_source=rutube&utm_campaign=troitsky_short_01&utm_medium=profile',reload(){h.reloaded=true;}};
  const document={body,head,referrer:'https://rutube.ru/',documentElement:{style:{setProperty(){}}},getElementById:id=>ids[id],querySelector:s=>ids[s.slice(1)],querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
  const window=new EventTarget();window.innerHeight=800;window.location=location;
  const h={body,head,form,status,success,submit,window,saved,requests:[],reloaded:false};
  const context=vm.createContext({window,document,location,URLSearchParams,Event,Date,console:{error(){}},localStorage:{getItem(){if(storageBroken)throw Error('denied');return h.saved;},setItem(k,v){if(storageBroken)throw Error('denied');h.saved=v;}},IntersectionObserver:class{constructor(cb){h.intersection=cb;}observe(){}},ResizeObserver:class{observe(){}},fetch:async(url,opts)=>{h.requests.push({url,payload:JSON.parse(opts.body)});if(outcome==='network')throw Error('network');return{ok:outcome==='ok',status:outcome==='ok'?200:503};}});
  vm.runInContext(core,context);vm.runInContext(analytics,context);
  h.banner=body.children[0];h.settings=body.children[1].children[0];
  h.accept=()=>h.banner.buttons[0].dispatchEvent(new Event('click'));
  h.reject=()=>h.banner.buttons[1].dispatchEvent(new Event('click'));
  h.goals=()=>Array.from(window.ym?.a||[],args=>Array.from(args)).filter(args=>args[1]==='reachGoal').map(args=>args[2]);
  h.send=async()=>{form.dispatchEvent(new Event('submit',{cancelable:true}));await new Promise(resolve=>setImmediate(resolve));};
  return h;
}
test('no third-party script before consent or after rejection',()=>{
  for(const saved of ['', 'rejected']){const h=harness(saved);assert.equal(h.head.children.length,0);assert.equal(typeof h.window.ym,'undefined');}
  const h=harness();h.reject();assert.equal(h.saved,'rejected');assert.equal(h.head.children.length,0);assert.equal(h.banner.hidden,true);
});
test('acceptance initializes the specified counter once with session recording disabled',()=>{
  const h=harness();h.accept();h.accept();assert.equal(h.head.children.length,1);assert.match(h.head.children[0].src,/113665495$/);
  const init=Array.from(h.window.ym.a[0]);assert.equal(init[0],113665495);assert.equal(init[1],'init');assert.equal(init[2].webvisor,false);assert.equal(h.saved,'accepted');
});
test('remembered acceptance and storage restrictions work',()=>{
  assert.equal(harness('accepted').head.children.length,1);
  const h=harness('',true);h.accept();assert.equal(h.head.children.length,1);assert.equal(h.banner.hidden,true);
});
test('withdrawing consent reloads without the counter',()=>{
  const h=harness('accepted');h.reject();assert.equal(h.saved,'rejected');assert.equal(h.reloaded,true);
  assert.equal(harness('rejected').head.children.length,0);
});
test('view goal requires a visible form and is counted once',()=>{
  const h=harness('accepted');assert.deepEqual(h.goals(),[]);
  h.form.rect={top:100,bottom:700};h.intersection([{isIntersecting:true}]);h.intersection([{isIntersecting:true}]);
  assert.deepEqual(h.goals(),['form_view']);
});
test('no form events are transmitted without consent',async()=>{
  const h=harness('rejected');await h.send();assert.equal(h.requests.length,1);assert.equal(typeof h.window.ym,'undefined');
});
test('successful lead preserves the production payload and emits success after acceptance',async()=>{
  const h=harness('accepted');await h.send();
  assert.equal(h.requests.length,1);assert.equal(h.requests[0].url,'https://newapi.elitopolis.ru/webhook/elitopolis-lead');
  assert.equal(h.requests[0].payload.source,'rutube');assert.equal(h.requests[0].payload.utm_campaign,'troitsky_short_01');
  assert.equal(h.requests[0].payload.last_name,'Lead');assert.equal(h.form.hidden,true);assert.equal(h.success.hidden,false);
  assert.deepEqual(h.goals(),['lead_submit','lead_success']);
  const calls=Array.from(h.window.ym.a).filter(a=>a[1]==='reachGoal');
  assert.ok(calls.every(a=>a.length===3));
});
test('invalid form never posts or emits a successful conversion',async()=>{
  const h=harness('accepted');h.form.elements.last_name.value='';await h.send();
  assert.equal(h.requests.length,0);assert.deepEqual(h.goals(),[]);assert.match(h.status.textContent,/фамилию/);
});
test('missing personal-data consent never posts',async()=>{
  const h=harness('accepted');h.form.elements.consent.checked=false;await h.send();
  assert.equal(h.requests.length,0);assert.deepEqual(h.goals(),[]);
});
for(const outcome of ['http','network'])test(outcome+' failure produces no success and allows a retry',async()=>{
  const h=harness('accepted',false,outcome);await h.send();
  assert.deepEqual(h.goals(),['lead_submit','lead_error']);assert.equal(h.form.hidden,false);assert.equal(h.submit.disabled,false);
  assert.match(h.status.textContent,/Не удалось/);
});
test('blocked analytics cannot interrupt lead submission',async()=>{
  const h=harness('accepted');h.window.ym=()=>{throw Error('blocked');};await h.send();
  assert.equal(h.requests.length,1);assert.equal(h.form.hidden,true);assert.equal(h.success.hidden,false);
});
test('all three pages load analytics once and mask all four contact fields',()=>{
  for(const file of ['index.html','privacy.html','consent.html']){const page=fs.readFileSync(file,'utf8');assert.equal((page.match(/src="\/analytics.js"/g)||[]).length,1);}
  assert.equal((html.match(/class="ym-disable-keys"/g)||[]).length,4);
});


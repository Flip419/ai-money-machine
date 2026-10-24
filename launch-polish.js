(function(){
  function injectStyles(){
    if(document.getElementById('launchPolishStyles')) return;
    var style=document.createElement('style');
    style.id='launchPolishStyles';
    style.textContent=`
      .nav-actions.launch-nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .launch-nav>a,.launch-menu>summary{color:inherit;text-decoration:none;font-weight:700;cursor:pointer;list-style:none;padding:8px 10px;border-radius:8px}
      .launch-menu{position:relative}
      .launch-menu>summary::-webkit-details-marker{display:none}
      .launch-menu>summary::after{content:' ▾';font-size:.8em;opacity:.75}
      .launch-menu[open]>summary,.launch-nav>a:hover,.launch-menu>summary:hover{background:rgba(255,255,255,.07)}
      .launch-menu-panel{position:absolute;top:calc(100% + 8px);right:0;min-width:220px;background:#0b1627;border:1px solid #33435d;border-radius:12px;padding:8px;box-shadow:0 18px 45px rgba(0,0,0,.35);z-index:1000}
      .launch-menu-panel a{display:block;color:#e4ebf6;text-decoration:none;padding:10px 12px;border-radius:8px;line-height:1.2}
      .launch-menu-panel a:hover,.launch-menu-panel a:focus{background:#14233a;outline:none}
      .launch-menu-panel small{display:block;color:#93a4ba;font-weight:500;margin-top:3px}
      .launch-mobile-menu{display:none;position:relative;width:100%}
      .launch-mobile-menu>summary{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;color:#e4ebf6;border:1px solid #33435d;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;list-style:none;background:#0b1627}
      .launch-mobile-menu>summary::-webkit-details-marker{display:none}
      .launch-mobile-menu>summary::before{content:'☰';font-size:17px;line-height:1}
      .launch-mobile-panel{margin-top:8px;border:1px solid #33435d;border-radius:12px;padding:8px;background:#0b1627;box-shadow:0 18px 45px rgba(0,0,0,.35)}
      .launch-mobile-panel>a,.launch-mobile-group>summary{display:block;color:#e4ebf6;text-decoration:none;padding:11px 12px;border-radius:8px;font-weight:750;cursor:pointer;list-style:none}
      .launch-mobile-group>summary::-webkit-details-marker{display:none}
      .launch-mobile-group>summary::after{content:' ▾';font-size:.8em;opacity:.75}
      .launch-mobile-group[open]>summary,.launch-mobile-panel>a:hover,.launch-mobile-group>summary:hover{background:#14233a}
      .launch-mobile-sub{padding:2px 0 5px 12px}
      .launch-mobile-sub a{display:block;color:#cfd9e8;text-decoration:none;padding:9px 12px;border-radius:8px;font-size:14px}
      .launch-mobile-sub a:hover{background:#14233a}
      .launch-journey{max-width:1040px;margin:18px auto 34px;padding:16px 18px;border:1px solid #293b55;border-radius:14px;background:#0b1627}
      .launch-journey-title{font-weight:800;margin-bottom:10px}
      .launch-journey-steps{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
      .launch-journey-steps a{text-decoration:none;color:#e4ebf6;border:1px solid #33435d;border-radius:10px;padding:10px 8px;text-align:center;font-weight:800;font-size:12px;background:#0d192a}
      .launch-journey-steps a span{display:block;color:#63e6a7;font-size:11px;margin-bottom:4px}
      .launch-tool-note{max-width:1040px;margin:0 auto 42px;padding:18px;border:1px solid #33435d;border-radius:14px;background:#091422}
      .launch-tool-note h3{margin:0 0 8px}.launch-tool-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .launch-tool-links a{text-decoration:none;border:1px solid #33435d;border-radius:9px;padding:8px 10px;color:#e4ebf6;font-weight:700}
      #resume-rewriter-tool,#cover-letter-tool{scroll-margin-top:130px}
      @media(max-width:900px){.nav{align-items:flex-start}.nav-actions.launch-nav{width:100%;gap:6px}.launch-menu{position:static}.launch-menu-panel{left:0;right:auto;width:280px;max-width:90vw}.launch-journey-steps{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:620px){
        .nav-actions.launch-nav{display:none!important}
        .launch-mobile-menu{display:block}
        .launch-journey-steps{grid-template-columns:repeat(2,1fr)}
      }
    `;
    document.head.appendChild(style);
  }
  function menu(label,items){var details=document.createElement('details');details.className='launch-menu';var summary=document.createElement('summary');summary.textContent=label;details.appendChild(summary);var panel=document.createElement('div');panel.className='launch-menu-panel';items.forEach(function(item){var a=document.createElement('a');if(item.id)a.id=item.id;a.href=item.href;a.innerHTML=item.label+(item.note?'<small>'+item.note+'</small>':'');panel.appendChild(a);});details.appendChild(panel);return details;}
  var resumeItems=[{href:'#builder',label:'Analyze & Build',note:'Start, upload, or target a job'},{href:'#resume-rewriter-tool',label:'Improve & Rewrite',note:'Resume improvement and ATS rewriting tools'},{href:'#resume-fusion',label:'Resume Fusion',note:'Combine 2–5 resumes into one master resume',id:'fusionNavLink'},{href:'#career-suite',label:'Export Resume',note:'DOCX and print-ready PDF',id:'careerSuiteNavLink'}];
  var jobItems=[{href:'#job-tracker',label:'Job Tracker',note:'Save opportunities and follow-ups',id:'jobTrackerNavLink'},{href:'#career-suite',label:'Interview Coach',note:'Practice questions and STAR guidance'},{href:'#cover-letter-tool',label:'Cover Letter',note:'Cover-letter tool available on eligible plans'}];
  function navIsCorrect(nav){if(nav.dataset.launchPolished!=='1'||nav.children.length!==5)return false;if(!nav.children[0]||nav.children[0].id!=='studioHomeNavLink')return false;if(!nav.children[1]||!nav.children[1].classList.contains('launch-menu'))return false;if(!nav.children[2]||!nav.children[2].classList.contains('launch-menu'))return false;return true;}
  function buildNav(){var nav=document.querySelector('.nav-actions');if(!nav||navIsCorrect(nav))return;nav.dataset.launchPolished='1';nav.classList.add('launch-nav');nav.innerHTML='';var home=document.createElement('a');home.id='studioHomeNavLink';home.href='#top';home.textContent='Home';nav.appendChild(home);nav.appendChild(menu('Resume Tools',resumeItems));nav.appendChild(menu('Job Search',jobItems));var pricing=document.createElement('a');pricing.href='#pricing';pricing.textContent='Pricing';nav.appendChild(pricing);var account=document.createElement('a');account.href='#account';account.textContent='Account';nav.appendChild(account);}
  function mobileGroup(label,items){var group=document.createElement('details');group.className='launch-mobile-group';var summary=document.createElement('summary');summary.textContent=label;group.appendChild(summary);var sub=document.createElement('div');sub.className='launch-mobile-sub';items.forEach(function(item){var a=document.createElement('a');a.href=item.href;a.textContent=item.label;sub.appendChild(a);});group.appendChild(sub);return group;}
  function buildMobileNav(){if(document.getElementById('launchMobileMenu'))return;var nav=document.querySelector('.nav');if(!nav)return;var mobile=document.createElement('details');mobile.id='launchMobileMenu';mobile.className='launch-mobile-menu';var summary=document.createElement('summary');summary.textContent='Menu';mobile.appendChild(summary);var panel=document.createElement('div');panel.className='launch-mobile-panel';var home=document.createElement('a');home.href='#top';home.textContent='Home';panel.appendChild(home);panel.appendChild(mobileGroup('Resume Tools',resumeItems));panel.appendChild(mobileGroup('Job Search',jobItems));var pricing=document.createElement('a');pricing.href='#pricing';pricing.textContent='Pricing';panel.appendChild(pricing);var account=document.createElement('a');account.href='#account';account.textContent='Account';panel.appendChild(account);mobile.appendChild(panel);nav.appendChild(mobile);}
  function addJourney(){if(document.getElementById('launchJourney'))return;var hero=document.querySelector('.hero');if(!hero)return;var section=document.createElement('section');section.id='launchJourney';section.className='launch-journey';section.innerHTML='<div class="launch-journey-title">Your job-search path</div><div class="launch-journey-steps"><a href="#builder"><span>01</span>Analyze</a><a href="#resume-rewriter-tool"><span>02</span>Improve</a><a href="#builder"><span>03</span>Tailor</a><a href="#cover-letter-tool"><span>04</span>Apply</a><a href="#job-tracker"><span>05</span>Track</a><a href="#career-suite"><span>06</span>Interview</a></div>';hero.insertAdjacentElement('afterend',section);}
  function markFeatureTargets(){var grid=document.querySelector('#features .feature-grid');if(!grid)return;var items=grid.querySelectorAll('article');if(items[1])items[1].id='resume-rewriter-tool';if(items[3])items[3].id='cover-letter-tool';}
  function surfaceNewTools(){markFeatureTargets();var grid=document.querySelector('#features .feature-grid');if(grid&&!document.getElementById('launchNewTools')){var cards=[['Resume Fusion','Merge 2–5 resumes into one stronger Master Resume while preserving unique achievements and flagging conflicts.','⇄'],['Job Application Tracker','Save opportunities, status, follow-up dates, links, and notes in one pipeline.','▦'],['AI Interview Coach','Generate likely questions, STAR answer guidance, red flags, employer questions, and a prep checklist.','★'],['DOCX & PDF Export','Export the resume you plan to submit as Word DOCX or a print-ready PDF using ATS-safe layouts.','⇩']];cards.forEach(function(card,i){var article=document.createElement('article');if(i===0)article.id='launchNewTools';article.innerHTML='<div class="feature-icon">'+card[2]+'</div><h3>'+card[0]+'</h3><p>'+card[1]+'</p>';grid.appendChild(article);});}var pricing=document.getElementById('pricing');if(pricing&&!document.getElementById('launchPricingTools')){var note=document.createElement('div');note.id='launchPricingTools';note.className='launch-tool-note';note.innerHTML='<h3>New career tools are now live</h3><p class="muted">Job Tracker, Interview Coach, ATS-safe DOCX/PDF export, and Studio Premium Resume Fusion are part of the current product. Resume Fusion is exclusive to Studio Premium.</p><div class="launch-tool-links"><a href="#job-tracker">Job Tracker</a><a href="#career-suite">Interview & Export</a><a href="#resume-fusion">Resume Fusion</a></div>';pricing.insertAdjacentElement('beforebegin',note);}}
  function closestByClass(el,className){while(el&&el!==document){if(el.classList&&el.classList.contains(className))return el;el=el.parentNode;}return null;}
  function closeMenusAfterClick(){document.addEventListener('click',function(e){var panel=closestByClass(e.target,'launch-menu-panel');if(panel&&e.target.tagName==='A'){var parent=closestByClass(panel,'launch-menu');if(parent)parent.removeAttribute('open');}var mobilePanel=closestByClass(e.target,'launch-mobile-panel');if(mobilePanel&&e.target.tagName==='A'){var mobile=document.getElementById('launchMobileMenu');if(mobile)mobile.removeAttribute('open');}if(!closestByClass(e.target,'launch-menu')){var openMenus=document.querySelectorAll('.launch-menu[open]');for(var i=0;i<openMenus.length;i++)openMenus[i].removeAttribute('open');}});}
  injectStyles();buildNav();buildMobileNav();addJourney();surfaceNewTools();closeMenusAfterClick();
  if(window.MutationObserver){var scheduled=false;var observer=new MutationObserver(function(){if(scheduled)return;scheduled=true;window.setTimeout(function(){scheduled=false;buildNav();buildMobileNav();addJourney();surfaceNewTools();},0);});observer.observe(document.body,{childList:true,subtree:true});}
})();

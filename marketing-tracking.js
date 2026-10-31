(function(){
  const params=new URLSearchParams(location.search);
  const storedKey='aiResumeStudioAttribution';
  const sessionKey='aiResumeStudioSessionId';

  function clean(value,max=180){
    return String(value||'').trim().slice(0,max)||null;
  }

  function sessionId(){
    let id=sessionStorage.getItem(sessionKey);
    if(!id){
      id=(crypto?.randomUUID?.()||('s_'+Date.now()+'_'+Math.random().toString(36).slice(2)));
      sessionStorage.setItem(sessionKey,id);
    }
    return id;
  }

  function readAttribution(){
    const incoming={
      utm_source:clean(params.get('utm_source'),80),
      utm_medium:clean(params.get('utm_medium'),80),
      utm_campaign:clean(params.get('utm_campaign'),120),
      utm_content:clean(params.get('utm_content'),120)
    };
    if(incoming.utm_source||incoming.utm_medium||incoming.utm_campaign||incoming.utm_content){
      localStorage.setItem(storedKey,JSON.stringify(incoming));
      return incoming;
    }
    try{return JSON.parse(localStorage.getItem(storedKey)||'{}')||{};}catch{return {};}
  }

  const attribution=readAttribution();

  async function track(eventName){
    try{
      if(typeof supabaseClient==='undefined'||!supabaseClient)return;
      const userId=(typeof currentUser!=='undefined'&&currentUser?.id)?currentUser.id:null;
      await supabaseClient.from('marketing_events').insert({
        event_name:eventName,
        session_id:sessionId(),
        path:clean(location.pathname+location.search,400),
        referrer:clean(document.referrer,400),
        utm_source:attribution.utm_source||null,
        utm_medium:attribution.utm_medium||null,
        utm_campaign:attribution.utm_campaign||null,
        utm_content:attribution.utm_content||null,
        user_id:userId
      });
    }catch(error){console.warn('Marketing tracking skipped',error);}
  }

  function trackWhenReady(name,attempt=0){
    if(typeof supabaseClient!=='undefined'&&supabaseClient){track(name);return;}
    if(attempt<40)setTimeout(()=>trackWhenReady(name,attempt+1),250);
  }

  trackWhenReady('page_view');

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#analyzeBtn,#matchBtn,#scratchBtn'))track('analyze_click');
    if(event.target.closest?.('#authOpenBtn,#signUpTab'))track('signup_click');
    if(event.target.closest?.('a[href="#pricing"],.plan-button'))track('pricing_view');
  },true);

  window.aiResumeStudioTrack=track;
})();
var currentEntitlement=window.currentEntitlement||null;
var currentBillingState=window.currentBillingState||null;
var checkoutInProgress=false;
var rewriteInProgress=false;
var originalPremiumLockMarkup=null;

function injectPremiumRewriteStyles(){
  if(document.getElementById("premiumRewriteStyles"))return;
  const style=document.createElement("style");
  style.id="premiumRewriteStyles";
  style.textContent=`
    .premium-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px}
    .premium-rewrite-btn{border:0;cursor:pointer}
    .premium-rewrite-btn:disabled{opacity:.65;cursor:wait}
    .rewrite-result{margin-top:22px;padding:26px;border:1px solid #33435d;border-radius:14px;background:#0b1627}
    .rewrite-result-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap}
    .rewrite-result h3{margin:4px 0 0}
    .rewrite-output{white-space:pre-wrap;line-height:1.65;font-family:inherit;color:#e4ebf6;margin:0}
    .rewrite-copy{border:1px solid #51617a;background:#101d31;color:#e4ebf6;border-radius:9px;padding:9px 12px;font-weight:800;cursor:pointer}
  `;
  document.head.appendChild(style);
}

function planLabel(plan){
  if(plan==="studio_premium") return "Studio Premium";
  if(plan==="pro") return "Pro";
  if(plan==="starter") return "Starter";
  return "Free";
}
function checkoutPlan(plan){
  if(plan==="Studio Premium") return "studio_premium";
  if(plan==="Pro") return "pro";
  if(plan==="Starter") return "starter";
  return null;
}
function entitlementIsActive(entitlement){
  if(!entitlement||!entitlement.active) return false;
  if(!entitlement.valid_until) return true;
  return new Date(entitlement.valid_until).getTime()>Date.now();
}
function formatBillingDate(value){
  if(!value)return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(date);
}
function cancellationScheduled(){
  return !!currentBillingState?.cancel_at_period_end&&!!currentBillingState?.current_period_end;
}
function renderBillingStatusBadge(){
  const accountArea=document.querySelector(".account-area");
  let badge=document.getElementById("billingStatusBadge");
  const shouldShow=!!currentEntitlement&&currentEntitlement.source!=="owner_override";
  if(!shouldShow){
    if(badge)badge.remove();
    return;
  }
  if(!accountArea)return;
  if(!badge){
    badge=document.createElement("span");
    badge.id="billingStatusBadge";
    badge.className="billing-status-badge";
    const signOut=document.getElementById("signOutBtn");
    if(signOut)accountArea.insertBefore(badge,signOut);else accountArea.appendChild(badge);
  }
  if(cancellationScheduled()){
    badge.textContent=`${planLabel(currentEntitlement.plan)} • Ends ${formatBillingDate(currentBillingState.current_period_end)}`;
    badge.classList.add("ending");
    badge.title="Your paid access stays active until this date. You can reinstate the subscription from Billing & Subscription before then.";
  }else{
    badge.textContent=`${planLabel(currentEntitlement.plan)} • Active`;
    badge.classList.remove("ending");
    badge.title="Your paid subscription is active";
  }
}
function renderPlanButtons(){
  const hasCustomerSubscription=!!currentEntitlement&&currentEntitlement.source!=="owner_override";
  document.querySelectorAll(".plan-button[data-plan]").forEach(button=>{
    const plan=checkoutPlan(button.dataset.plan);
    const defaultText=`Choose ${button.dataset.plan}`;
    const comingSoon=button.dataset.comingSoon==="true";
    button.classList.add("buy");
    button.disabled=false;
    button.textContent=defaultText;
    button.removeAttribute("title");

    if(currentEntitlement?.plan===plan){
      if(cancellationScheduled()){
        const endDate=formatBillingDate(currentBillingState.current_period_end);
        button.textContent=endDate?`Active until ${endDate}`:"Current Plan — Ending";
        button.title="This plan remains active through the end of the paid period";
      }else{
        button.textContent="Current Plan — Active";
        button.title="This is your current paid plan";
      }
      button.disabled=true;
      button.classList.remove("buy");
      return;
    }

    if(comingSoon){
      button.textContent="Coming Soon";
      button.disabled=true;
      button.classList.remove("buy");
      button.title="This plan is not available for purchase yet";
      return;
    }

    if(hasCustomerSubscription){
      button.textContent="Manage current subscription first";
      button.disabled=true;
      button.classList.remove("buy");
      button.title="Use Billing & Subscription in the top navigation to manage your current plan";
    }
  });
}
function renderEntitlement(entitlement,billingState=null){
  currentEntitlement=entitlementIsActive(entitlement)?entitlement:null;
  currentBillingState=billingState||null;
  window.currentEntitlement=currentEntitlement;
  window.currentBillingState=currentBillingState;

  const accountUser=document.getElementById("accountUser");
  if(accountUser&&currentUser){
    accountUser.textContent=currentUser.email||"Signed in";
  }

  renderBillingStatusBadge();
  renderPlanButtons();

  const lock=document.querySelector(".premium-lock");
  if(lock&&originalPremiumLockMarkup===null)originalPremiumLockMarkup=lock.innerHTML;
  if(lock&&currentEntitlement){
    injectPremiumRewriteStyles();
    const endingCopy=cancellationScheduled()
      ? `Your paid access remains active through ${formatBillingDate(currentBillingState.current_period_end)}. You can reinstate the subscription from Billing & Subscription before then.`
      : "Your paid access is active. Generate an ATS-focused rewrite using the resume and target information above.";
    lock.innerHTML=`<div class="lock-icon">✓</div><div><div class="eyebrow">PREMIUM ACTIVE</div><h3>${planLabel(currentEntitlement.plan)} is active</h3><p>${endingCopy}</p><div class="premium-actions"><button id="generateRewriteBtn" class="primary compact premium-rewrite-btn" type="button">Generate Full Resume Rewrite</button></div></div>`;
  }else if(lock&&originalPremiumLockMarkup!==null){
    lock.innerHTML=originalPremiumLockMarkup;
  }

  document.dispatchEvent(new CustomEvent("entitlement-updated",{detail:{entitlement:currentEntitlement,billingState:currentBillingState}}));
}
async function loadEntitlement(){
  if(!supabaseClient||!currentUser){renderEntitlement(null,null);return;}

  const [entitlementResult,subscriptionResult]=await Promise.all([
    supabaseClient.from("account_entitlements").select("plan,source,active,valid_until").eq("user_id",currentUser.id).maybeSingle(),
    supabaseClient.from("stripe_subscriptions").select("plan,status,current_period_end,cancel_at_period_end,canceled_at,updated_at").eq("user_id",currentUser.id).order("updated_at",{ascending:false}).limit(1).maybeSingle()
  ]);

  if(entitlementResult.error){
    console.error("Could not load account entitlement",entitlementResult.error);
    renderEntitlement(null,null);
    return;
  }
  if(subscriptionResult.error){
    console.warn("Could not load Stripe subscription status",subscriptionResult.error);
  }

  renderEntitlement(entitlementResult.data||null,subscriptionResult.data||null);
}
async function getRewriteInputs(){
  const pastedResume=document.getElementById("resumeText")?.value?.trim()||"";const jobDescription=document.getElementById("jobDescription")?.value?.trim()||"";const targetRole=document.getElementById("targetRole")?.value?.trim()||"";
  if(pastedResume)return {resumeText:pastedResume,targetRole,jobDescription};
  const file=document.getElementById("resumeFile")?.files?.[0];if(file&&typeof extractResumeText==="function"){const resumeText=await extractResumeText(file);return {resumeText,targetRole,jobDescription:""};}
  return {resumeText:"",targetRole,jobDescription};
}
function renderRewriteResult(rewrite){
  const results=document.getElementById("analysisResults");if(!results)return;let box=document.getElementById("premiumRewriteResult");if(!box){box=document.createElement("div");box.id="premiumRewriteResult";box.className="rewrite-result";results.appendChild(box);}box.innerHTML=`<div class="rewrite-result-head"><div><div class="eyebrow">PREMIUM REWRITE</div><h3>Your Rewritten Resume</h3></div><button id="copyRewriteBtn" class="rewrite-copy" type="button">Copy Resume</button></div><pre id="rewriteOutput" class="rewrite-output"></pre>`;document.getElementById("rewriteOutput").textContent=rewrite;box.scrollIntoView({behavior:"smooth",block:"start"});
}
async function generatePremiumRewrite(){
  if(rewriteInProgress)return;if(!currentEntitlement){alert("An active paid plan is required for the full resume rewrite.");return;}if(!supabaseClient||!currentUser){showAuthModal("signin","Sign in to use your premium resume rewrite.");return;}
  const button=document.getElementById("generateRewriteBtn");const originalText=button?.textContent||"Generate Full Resume Rewrite";rewriteInProgress=true;if(button){button.disabled=true;button.textContent="Preparing rewrite...";}
  try{const inputs=await getRewriteInputs();if(inputs.resumeText.length<20)throw new Error("Use Upload Existing Resume or Target a Specific Job first, then run the analysis before generating the full rewrite.");if(button)button.textContent="Rewriting resume...";const {data,error}=await supabaseClient.functions.invoke("rewrite-resume",{body:inputs});if(error)throw error;if(!data?.success||!data?.rewrite)throw new Error(data?.message||"The premium rewrite request failed.");renderRewriteResult(data.rewrite);}catch(error){console.error("Could not generate premium resume rewrite",error);alert(error?.message||"Could not generate the premium resume rewrite.");}finally{rewriteInProgress=false;if(button){button.disabled=false;button.textContent=originalText;}}
}
async function startStripeCheckout(button){
  if(checkoutInProgress)return;if(!supabaseClient||!currentUser){showAuthModal("signup","Create or sign in to your account before choosing a paid plan. This keeps the Stripe purchase tied to the correct user.");return;}if(currentEntitlement&&currentEntitlement.source!=="owner_override"){alert(`Your account already has ${planLabel(currentEntitlement.plan)} access. Use Billing & Subscription at the top of the page to manage it.`);return;}
  const plan=checkoutPlan(button.dataset.plan);if(!plan){alert("That plan is not available for checkout yet.");return;}const originalText=button.textContent;checkoutInProgress=true;button.disabled=true;button.textContent="Opening secure Stripe test checkout...";
  try{const {data,error}=await supabaseClient.functions.invoke("create-stripe-checkout",{body:{plan}});if(error)throw error;if(data?.already_entitled){await loadEntitlement();alert(data.message||"Your account already has premium access.");return;}if(!data?.checkout_url)throw new Error(data?.error||"Stripe checkout is not configured yet.");window.location.assign(data.checkout_url);}catch(error){console.error("Could not start Stripe Sandbox checkout",error);alert(error?.message||"Could not start the Stripe Sandbox checkout.");}finally{checkoutInProgress=false;button.disabled=false;button.textContent=originalText;}
}
async function waitForAuth(){for(let i=0;i<100;i+=1){if(typeof supabaseClient!=="undefined"&&supabaseClient){await loadEntitlement();supabaseClient.auth.onAuthStateChange(async(_event,session)=>{currentUser=session?.user||null;await loadEntitlement();});return;}await new Promise(resolve=>setTimeout(resolve,100));}console.error("Entitlement reader could not find the Supabase client.");}

if(!window.__aiResumeEntitlementsInitialized){
  window.__aiResumeEntitlementsInitialized=true;
  document.addEventListener("click",async event=>{
    const rewriteButton=event.target.closest?.("#generateRewriteBtn");if(rewriteButton){event.preventDefault();await generatePremiumRewrite();return;}
    const copyButton=event.target.closest?.("#copyRewriteBtn");if(copyButton){event.preventDefault();const text=document.getElementById("rewriteOutput")?.textContent||"";if(!text)return;try{await navigator.clipboard.writeText(text);const original=copyButton.textContent;copyButton.textContent="Copied";setTimeout(()=>{copyButton.textContent=original;},1200);}catch{alert("Copy failed. Select the rewritten resume text and copy it manually.");}return;}
    const button=event.target.closest?.(".plan-button.buy");if(!button)return;event.preventDefault();event.stopImmediatePropagation();startStripeCheckout(button);
  },true);
  waitForAuth();
}

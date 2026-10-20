let currentEntitlement=null;
let checkoutInProgress=false;
let rewriteInProgress=false;

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
function renderEntitlement(entitlement){
  currentEntitlement=entitlementIsActive(entitlement)?entitlement:null;
  const accountUser=document.getElementById("accountUser");
  if(accountUser&&currentUser){const suffix=currentEntitlement?` • ${planLabel(currentEntitlement.plan)}`:"";accountUser.textContent=`${currentUser.email||"Signed in"}${suffix}`;}
  const studioButton=document.querySelector('.plan-button[data-plan="Studio Premium"]');
  if(studioButton){if(currentEntitlement?.plan==="studio_premium"){studioButton.textContent="Your Plan — Active";studioButton.disabled=true;studioButton.classList.remove("buy");}else{studioButton.disabled=false;}}
  const lock=document.querySelector(".premium-lock");
  if(lock&&currentEntitlement){injectPremiumRewriteStyles();lock.innerHTML=`<div class="lock-icon">✓</div><div><div class="eyebrow">PREMIUM ACTIVE</div><h3>${planLabel(currentEntitlement.plan)} is active</h3><p>Your paid access is active. Generate an ATS-focused rewrite using the resume and target information above.</p><div class="premium-actions"><button id="generateRewriteBtn" class="primary compact premium-rewrite-btn" type="button">Generate Full Resume Rewrite</button></div></div>`;}
}
async function loadEntitlement(){
  if(!supabaseClient||!currentUser){renderEntitlement(null);return;}
  const {data,error}=await supabaseClient.from("account_entitlements").select("plan,source,active,valid_until").eq("user_id",currentUser.id).maybeSingle();
  if(error){console.error("Could not load account entitlement",error);renderEntitlement(null);return;}renderEntitlement(data||null);
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
  if(checkoutInProgress)return;if(!supabaseClient||!currentUser){showAuthModal("signup","Create or sign in to your account before choosing a paid plan. This keeps the Stripe purchase tied to the correct user.");return;}if(currentEntitlement&&currentEntitlement.source!=="owner_override"){alert(`Your account already has ${planLabel(currentEntitlement.plan)} access.`);return;}
  const plan=checkoutPlan(button.dataset.plan);if(!plan){alert("That plan is not available for checkout yet.");return;}const originalText=button.textContent;checkoutInProgress=true;button.disabled=true;button.textContent="Opening secure Stripe test checkout...";
  try{const {data,error}=await supabaseClient.functions.invoke("create-stripe-checkout",{body:{plan}});if(error)throw error;if(data?.already_entitled){await loadEntitlement();alert(data.message||"Your account already has premium access.");return;}if(!data?.checkout_url)throw new Error(data?.error||"Stripe checkout is not configured yet.");window.location.assign(data.checkout_url);}catch(error){console.error("Could not start Stripe Sandbox checkout",error);alert(error?.message||"Could not start the Stripe Sandbox checkout.");}finally{checkoutInProgress=false;button.disabled=false;button.textContent=originalText;}
}
document.addEventListener("click",async event=>{
  const rewriteButton=event.target.closest?.("#generateRewriteBtn");if(rewriteButton){event.preventDefault();await generatePremiumRewrite();return;}
  const copyButton=event.target.closest?.("#copyRewriteBtn");if(copyButton){event.preventDefault();const text=document.getElementById("rewriteOutput")?.textContent||"";if(!text)return;try{await navigator.clipboard.writeText(text);const original=copyButton.textContent;copyButton.textContent="Copied";setTimeout(()=>{copyButton.textContent=original;},1200);}catch{alert("Copy failed. Select the rewritten resume text and copy it manually.");}return;}
  const button=event.target.closest?.(".plan-button.buy");if(!button)return;event.preventDefault();event.stopImmediatePropagation();startStripeCheckout(button);
},true);
async function waitForAuth(){for(let i=0;i<100;i+=1){if(typeof supabaseClient!=="undefined"&&supabaseClient){await loadEntitlement();supabaseClient.auth.onAuthStateChange(async(_event,session)=>{currentUser=session?.user||null;await loadEntitlement();});return;}await new Promise(resolve=>setTimeout(resolve,100));}console.error("Entitlement reader could not find the Supabase client.");}
waitForAuth();
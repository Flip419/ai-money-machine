let currentEntitlement=null;
let checkoutInProgress=false;

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
  if(accountUser&&currentUser){
    const suffix=currentEntitlement?` • ${planLabel(currentEntitlement.plan)}`:"";
    accountUser.textContent=`${currentUser.email||"Signed in"}${suffix}`;
  }

  const studioButton=document.querySelector('.plan-button[data-plan="Studio Premium"]');
  if(studioButton){
    if(currentEntitlement?.plan==="studio_premium"){
      studioButton.textContent="Your Plan — Active";
      studioButton.disabled=true;
      studioButton.classList.remove("buy");
    }else{
      studioButton.disabled=false;
    }
  }

  const lock=document.querySelector(".premium-lock");
  if(lock&&currentEntitlement){
    lock.innerHTML=`
      <div class="lock-icon">✓</div>
      <div>
        <div class="eyebrow">PREMIUM ACTIVE</div>
        <h3>${planLabel(currentEntitlement.plan)} is active</h3>
        <p>Your signed-in account has premium access. No checkout is required for this account.</p>
      </div>
    `;
  }
}

async function loadEntitlement(){
  if(!supabaseClient||!currentUser){
    renderEntitlement(null);
    return;
  }
  const {data,error}=await supabaseClient
    .from("account_entitlements")
    .select("plan,source,active,valid_until")
    .eq("user_id",currentUser.id)
    .maybeSingle();

  if(error){
    console.error("Could not load account entitlement",error);
    renderEntitlement(null);
    return;
  }
  renderEntitlement(data||null);
}

async function startSandboxCheckout(button){
  if(checkoutInProgress)return;
  if(!supabaseClient||!currentUser){
    showAuthModal("signup","Create or sign in to your account before choosing a paid plan. This keeps the Paddle purchase tied to the correct user.");
    return;
  }
  if(currentEntitlement){
    alert(`Your account already has ${planLabel(currentEntitlement.plan)} access.`);
    return;
  }

  const plan=checkoutPlan(button.dataset.plan);
  if(!plan){
    alert("That plan is not available for checkout yet.");
    return;
  }

  const originalText=button.textContent;
  checkoutInProgress=true;
  button.disabled=true;
  button.textContent="Opening secure test checkout...";

  try{
    const {data,error}=await supabaseClient.functions.invoke("create-checkout",{
      body:{plan}
    });
    if(error)throw error;
    if(data?.already_entitled){
      await loadEntitlement();
      alert(data.message||"Your account already has premium access.");
      return;
    }
    if(!data?.checkout_url){
      throw new Error(data?.error||"Checkout is not configured yet.");
    }
    window.location.assign(data.checkout_url);
  }catch(error){
    console.error("Could not start Paddle Sandbox checkout",error);
    alert(error?.message||"Could not start the Paddle Sandbox checkout.");
  }finally{
    checkoutInProgress=false;
    button.disabled=false;
    button.textContent=originalText;
  }
}

document.addEventListener("click",event=>{
  const button=event.target.closest?.(".plan-button.buy");
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  startSandboxCheckout(button);
},true);

async function waitForAuth(){
  for(let i=0;i<100;i+=1){
    if(typeof supabaseClient!=="undefined"&&supabaseClient){
      await loadEntitlement();
      supabaseClient.auth.onAuthStateChange(async(_event,session)=>{
        currentUser=session?.user||null;
        await loadEntitlement();
      });
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  console.error("Entitlement reader could not find the Supabase client.");
}

waitForAuth();

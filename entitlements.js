let currentEntitlement=null;

function planLabel(plan){
  if(plan==="studio_premium") return "Studio Premium";
  if(plan==="pro") return "Pro";
  if(plan==="starter") return "Starter";
  return "Free";
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

  const studioButton=document.querySelector('.buy[data-plan="Studio Premium"]');
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

let billingPortalInProgress=false;
function billingPlanActive(){try{return typeof currentEntitlement!=="undefined"&&!!currentEntitlement;}catch{return false;}}
function addManagePlanButton(){
  const accountArea=document.querySelector(".account-area");
  const existing=document.getElementById("managePlanBtn");
  if(!billingPlanActive()){
    if(existing)existing.remove();
    return;
  }
  if(!accountArea||existing)return;
  const button=document.createElement("button");
  button.id="managePlanBtn";
  button.className="account-btn";
  button.type="button";
  button.textContent="Manage Subscription";
  const signOut=document.getElementById("signOutBtn");
  if(signOut)accountArea.insertBefore(button,signOut);else accountArea.appendChild(button);
}
async function openBillingPortal(){
  if(billingPortalInProgress)return;
  if(typeof supabaseClient==="undefined"||!supabaseClient||typeof currentUser==="undefined"||!currentUser){
    if(typeof showAuthModal==="function")showAuthModal("signin","Sign in to manage your subscription.");
    return;
  }
  const button=document.getElementById("managePlanBtn");
  const original=button?.textContent||"Manage Subscription";
  billingPortalInProgress=true;
  if(button){button.disabled=true;button.textContent="Opening Stripe...";}
  try{
    const {data,error}=await supabaseClient.functions.invoke("stripe-billing-portal",{body:{}});
    if(error)throw error;
    if(!data?.success)throw new Error(data?.message||"Could not open subscription management.");
    if(!data?.manage_url)throw new Error("Stripe did not return a subscription-management link.");
    window.location.assign(data.manage_url);
  }catch(error){
    console.error("Could not open billing portal",error);
    alert(error?.message||"Could not open subscription management.");
  }finally{
    billingPortalInProgress=false;
    if(button){button.disabled=false;button.textContent=original;}
  }
}
document.addEventListener("click",async event=>{
  const button=event.target.closest?.("#managePlanBtn");
  if(!button)return;
  event.preventDefault();
  await openBillingPortal();
});
const managePlanObserver=new MutationObserver(()=>addManagePlanButton());
managePlanObserver.observe(document.body,{childList:true,subtree:true});
addManagePlanButton();
let managePlanAttempts=0;
const managePlanTimer=setInterval(()=>{
  managePlanAttempts+=1;
  addManagePlanButton();
  if(managePlanAttempts>=120)clearInterval(managePlanTimer);
},250);

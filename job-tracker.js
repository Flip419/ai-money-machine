let jobTrackerRows=[];
let jobTrackerEditingId=null;

function injectJobTrackerStyles(){
  if(document.getElementById("jobTrackerStyles"))return;
  const style=document.createElement("style");
  style.id="jobTrackerStyles";
  style.textContent=`
    .job-tracker{max-width:1040px;margin:0 auto 64px;scroll-margin-top:110px}
    .job-tracker-grid{display:grid;grid-template-columns:340px 1fr;gap:18px}
    .job-tracker-form,.job-tracker-list{background:#091422;border:1px solid #293b55;border-radius:12px;padding:18px}
    .job-tracker-form h3,.job-tracker-list h3{margin:0 0 14px}
    .job-tracker-form .form-grid{grid-template-columns:1fr 1fr}
    .tracker-actions{display:flex;gap:9px;flex-wrap:wrap}
    .tracker-row{display:grid;grid-template-columns:1.25fr 1fr auto;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid #23344c}
    .tracker-row:last-child{border-bottom:0}
    .tracker-company{font-weight:900;color:#eef4fb}
    .tracker-role{color:#9eacc0;font-size:12px;margin-top:2px}
    .tracker-meta{display:flex;gap:8px;flex-wrap:wrap;color:#8392a7;font-size:11px}
    .tracker-status{display:inline-flex;align-items:center;border:1px solid #36506d;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900;color:#c9d6e8;background:#0c1725;text-transform:capitalize}
    .tracker-row-actions{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap}
    .tracker-small{border:1px solid #33435d;background:#0d192a;color:#dbe6f3;border-radius:8px;padding:7px 9px;font-weight:800;cursor:pointer;font-size:11px}
    .tracker-empty{padding:22px;text-align:center;color:#8290a5;border:1px dashed #30445f;border-radius:10px}
    .tracker-signin{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px;border:1px solid #2b3a53;border-radius:11px;background:#091422}
    .tracker-signin p{margin:3px 0 0;color:#8f9eb2}
    .tracker-count{font-size:11px;color:#8190a4}
    @media(max-width:850px){.job-tracker-grid{grid-template-columns:1fr}.tracker-row{grid-template-columns:1fr}.tracker-row-actions{justify-content:flex-start}}
  `;
  document.head.appendChild(style);
}

function ensureJobTrackerNav(){
  const nav=document.querySelector(".nav-actions");
  if(!nav||document.getElementById("jobTrackerNavLink"))return;
  const link=document.createElement("a");
  link.id="jobTrackerNavLink";
  link.href="#job-tracker";
  link.textContent="Job Tracker";
  const accountLink=[...nav.querySelectorAll("a")].find(a=>a.getAttribute("href")==="#account");
  if(accountLink)nav.insertBefore(link,accountLink);else nav.appendChild(link);
}

function buildJobTracker(){
  if(document.getElementById("job-tracker"))return;
  injectJobTrackerStyles();
  ensureJobTrackerNav();
  const account=document.getElementById("account");
  const section=document.createElement("section");
  section.id="job-tracker";
  section.className="card job-tracker";
  section.innerHTML=`
    <div class="section-head"><div><div class="eyebrow">APPLICATION PIPELINE</div><h2>Job Application Tracker</h2><p class="muted">Keep every opportunity, interview, follow-up, and outcome in one place.</p></div><span id="jobTrackerCount" class="free-badge">0 JOBS</span></div>
    <div id="jobTrackerSignedOut" class="tracker-signin"><div><h3>Sign in to use your tracker</h3><p>Your saved jobs are private to your account.</p></div><button id="jobTrackerSignIn" class="primary" type="button">Sign In</button></div>
    <div id="jobTrackerSignedIn" class="job-tracker-grid hidden">
      <form id="jobTrackerForm" class="job-tracker-form">
        <h3 id="jobTrackerFormTitle">Add an opportunity</h3>
        <label>Company<input id="jobCompany" required maxlength="160" placeholder="Example: Acme Corp"></label>
        <label>Role<input id="jobRole" required maxlength="180" placeholder="Example: Customer Service Supervisor"></label>
        <div class="form-grid"><label>Status<select id="jobStatus"><option value="saved">Saved</option><option value="applied">Applied</option><option value="interview">Interview</option><option value="offer">Offer</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option></select></label><label>Applied date<input id="jobAppliedAt" type="date"></label></div>
        <label>Job posting URL<input id="jobUrl" type="url" placeholder="https://..."></label>
        <label>Follow-up date<input id="jobFollowUpAt" type="date"></label>
        <label>Notes<textarea id="jobNotes" placeholder="Recruiter name, interview notes, salary range, next steps..."></textarea></label>
        <div class="tracker-actions"><button id="jobTrackerSave" class="primary" type="submit">Save Job</button><button id="jobTrackerCancel" class="secondary hidden" type="button">Cancel Edit</button></div>
      </form>
      <div class="job-tracker-list"><div class="section-head" style="margin-bottom:14px"><div><h3>Your pipeline</h3><div id="jobTrackerSummary" class="tracker-count">No opportunities yet.</div></div></div><div id="jobTrackerRows"></div></div>
    </div>`;
  if(account)account.insertAdjacentElement("beforebegin",section);else document.querySelector("main")?.appendChild(section);

  document.getElementById("jobTrackerSignIn")?.addEventListener("click",()=>{ if(typeof showAuthModal==="function")showAuthModal("signin","Sign in to save and track your job applications."); });
  document.getElementById("jobTrackerCancel")?.addEventListener("click",resetJobTrackerForm);
  document.getElementById("jobTrackerForm")?.addEventListener("submit",saveTrackedJob);
  document.getElementById("jobTrackerRows")?.addEventListener("click",handleTrackerRowAction);
}

function trackerUser(){
  try{return typeof currentUser!=="undefined"?currentUser:null;}catch{return null;}
}
function trackerClient(){
  try{return typeof supabaseClient!=="undefined"?supabaseClient:null;}catch{return null;}
}

function syncTrackerAuth(){
  const signedIn=!!trackerUser();
  document.getElementById("jobTrackerSignedOut")?.classList.toggle("hidden",signedIn);
  document.getElementById("jobTrackerSignedIn")?.classList.toggle("hidden",!signedIn);
  if(signedIn)loadTrackedJobs();else{jobTrackerRows=[];renderTrackedJobs();}
}

function trackerStatusLabel(status){
  const labels={saved:"Saved",applied:"Applied",interview:"Interview",offer:"Offer",rejected:"Rejected",withdrawn:"Withdrawn"};
  return labels[status]||status;
}
function formatTrackerDate(value){
  if(!value)return "";
  const d=new Date(`${value}T00:00:00`);
  if(Number.isNaN(d.getTime()))return value;
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(d);
}
function escapeTrackerHtml(value=""){
  return String(value).replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
}

async function loadTrackedJobs(){
  const client=trackerClient();
  const user=trackerUser();
  if(!client||!user)return;
  const {data,error}=await client.from("job_applications").select("id,company,role,status,job_url,applied_at,follow_up_at,notes,created_at,updated_at").order("updated_at",{ascending:false});
  if(error){console.error("Could not load job tracker",error);return;}
  jobTrackerRows=data||[];
  renderTrackedJobs();
}

function renderTrackedJobs(){
  const rows=document.getElementById("jobTrackerRows");
  const count=document.getElementById("jobTrackerCount");
  const summary=document.getElementById("jobTrackerSummary");
  if(!rows||!count||!summary)return;
  count.textContent=`${jobTrackerRows.length} ${jobTrackerRows.length===1?"JOB":"JOBS"}`;
  const interview=jobTrackerRows.filter(j=>j.status==="interview").length;
  const offers=jobTrackerRows.filter(j=>j.status==="offer").length;
  const followUps=jobTrackerRows.filter(j=>j.follow_up_at).length;
  summary.textContent=jobTrackerRows.length?`${interview} interview${interview===1?"":"s"} • ${offers} offer${offers===1?"":"s"} • ${followUps} follow-up${followUps===1?"":"s"} scheduled`:"No opportunities yet.";
  if(!jobTrackerRows.length){rows.innerHTML='<div class="tracker-empty">Add your first job on the left. Your pipeline will appear here.</div>';return;}
  rows.innerHTML=jobTrackerRows.map(job=>{
    const meta=[];
    if(job.applied_at)meta.push(`Applied ${formatTrackerDate(job.applied_at)}`);
    if(job.follow_up_at)meta.push(`Follow up ${formatTrackerDate(job.follow_up_at)}`);
    return `<div class="tracker-row" data-id="${job.id}"><div><div class="tracker-company">${escapeTrackerHtml(job.company)}</div><div class="tracker-role">${escapeTrackerHtml(job.role)}</div>${job.notes?`<div class="tracker-role">${escapeTrackerHtml(job.notes)}</div>`:""}</div><div><span class="tracker-status">${trackerStatusLabel(job.status)}</span><div class="tracker-meta">${meta.map(item=>`<span>${escapeTrackerHtml(item)}</span>`).join("")}</div></div><div class="tracker-row-actions">${job.job_url?`<a class="tracker-small" href="${escapeTrackerHtml(job.job_url)}" target="_blank" rel="noopener">Open Job</a>`:""}<button class="tracker-small" type="button" data-action="edit">Edit</button><button class="tracker-small" type="button" data-action="delete">Delete</button></div></div>`;
  }).join("");
}

function resetJobTrackerForm(){
  jobTrackerEditingId=null;
  const form=document.getElementById("jobTrackerForm");
  form?.reset();
  const title=document.getElementById("jobTrackerFormTitle");
  const save=document.getElementById("jobTrackerSave");
  const cancel=document.getElementById("jobTrackerCancel");
  if(title)title.textContent="Add an opportunity";
  if(save)save.textContent="Save Job";
  cancel?.classList.add("hidden");
}

function editTrackedJob(id){
  const job=jobTrackerRows.find(row=>row.id===id);
  if(!job)return;
  jobTrackerEditingId=id;
  document.getElementById("jobCompany").value=job.company||"";
  document.getElementById("jobRole").value=job.role||"";
  document.getElementById("jobStatus").value=job.status||"saved";
  document.getElementById("jobUrl").value=job.job_url||"";
  document.getElementById("jobAppliedAt").value=job.applied_at||"";
  document.getElementById("jobFollowUpAt").value=job.follow_up_at||"";
  document.getElementById("jobNotes").value=job.notes||"";
  document.getElementById("jobTrackerFormTitle").textContent="Edit opportunity";
  document.getElementById("jobTrackerSave").textContent="Save Changes";
  document.getElementById("jobTrackerCancel").classList.remove("hidden");
  document.getElementById("job-tracker")?.scrollIntoView({behavior:"smooth",block:"start"});
}

async function saveTrackedJob(event){
  event.preventDefault();
  const client=trackerClient();
  const user=trackerUser();
  if(!client||!user){ if(typeof showAuthModal==="function")showAuthModal("signin","Sign in to save job applications."); return; }
  const button=document.getElementById("jobTrackerSave");
  const original=button.textContent;
  const payload={
    user_id:user.id,
    company:document.getElementById("jobCompany").value.trim(),
    role:document.getElementById("jobRole").value.trim(),
    status:document.getElementById("jobStatus").value,
    job_url:document.getElementById("jobUrl").value.trim()||null,
    applied_at:document.getElementById("jobAppliedAt").value||null,
    follow_up_at:document.getElementById("jobFollowUpAt").value||null,
    notes:document.getElementById("jobNotes").value.trim()||null,
    updated_at:new Date().toISOString()
  };
  if(!payload.company||!payload.role)return;
  button.disabled=true;
  button.textContent=jobTrackerEditingId?"Saving...":"Adding...";
  try{
    let result;
    if(jobTrackerEditingId){result=await client.from("job_applications").update(payload).eq("id",jobTrackerEditingId).select().single();}
    else{result=await client.from("job_applications").insert(payload).select().single();}
    if(result.error)throw result.error;
    resetJobTrackerForm();
    await loadTrackedJobs();
  }catch(error){console.error("Could not save tracked job",error);alert(error?.message||"Could not save this job.");}
  finally{button.disabled=false;button.textContent=original;}
}

async function deleteTrackedJob(id){
  const client=trackerClient();
  if(!client)return;
  const {error}=await client.from("job_applications").delete().eq("id",id);
  if(error){console.error("Could not delete tracked job",error);alert(error.message||"Could not delete this job.");return;}
  if(jobTrackerEditingId===id)resetJobTrackerForm();
  await loadTrackedJobs();
}

function handleTrackerRowAction(event){
  const button=event.target.closest?.("button[data-action]");
  if(!button)return;
  const row=button.closest(".tracker-row");
  const id=row?.dataset.id;
  if(!id)return;
  if(button.dataset.action==="edit")editTrackedJob(id);
  if(button.dataset.action==="delete")deleteTrackedJob(id);
}

function waitForJobTrackerAuth(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(trackerClient()){
      clearInterval(timer);
      syncTrackerAuth();
      trackerClient().auth.onAuthStateChange(()=>setTimeout(syncTrackerAuth,0));
    }else if(attempts>100){clearInterval(timer);}
  },100);
}

if(!window.__aiResumeJobTrackerInitialized){
  window.__aiResumeJobTrackerInitialized=true;
  buildJobTracker();
  waitForJobTrackerAuth();
}

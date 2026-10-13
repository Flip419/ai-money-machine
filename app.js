const SUPABASE_URL = "https://guvywdjhgsnufjwsrurq.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q423UjYkLcUQT6NBrSq5UQ_7jn4qiti";

let supabaseClient = null;
let currentUser = null;

function injectAuthStyles(){
  const style=document.createElement("style");
  style.textContent=`
    .account-area{display:flex;align-items:center;gap:10px}.account-user{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#a9b6ca;font-size:13px}.account-btn{border:1px solid #33435d;background:transparent;color:#e3ebf8;border-radius:10px;padding:9px 12px;font-weight:800;cursor:pointer}.account-btn.primary-account{background:#62e6a7;color:#06120c;border-color:#62e6a7}.auth-modal{position:fixed;inset:0;background:#000b;display:grid;place-items:center;z-index:30;padding:20px}.auth-card{position:relative;width:min(460px,100%);background:#0e192b;border:1px solid #2c3a53;border-radius:18px;padding:30px;box-shadow:0 28px 80px #0008}.auth-card h2{margin:6px 0 8px}.auth-card p{color:#9eacc0}.auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.auth-tab{border:1px solid #33435d;background:#08111f;color:#c9d4e5;border-radius:10px;padding:10px;font-weight:900;cursor:pointer}.auth-tab.active{border-color:#62e6a7;color:#62e6a7}.auth-message{min-height:22px;margin-top:10px;font-size:14px}.auth-message.error{color:#ff9c9c}.auth-message.success{color:#62e6a7}.auth-close{position:absolute;right:12px;top:8px;border:0;background:transparent;color:#fff;font-size:30px;cursor:pointer}.auth-submit{width:100%}.auth-note{font-size:12px;color:#738198!important;margin-bottom:0!important}@media(max-width:700px){.account-user{display:none}.account-area{margin-left:auto}.nav{padding-left:4%;padding-right:4%}}
  `;
  document.head.appendChild(style);
}

function buildAuthUi(){
  injectAuthStyles();

  const nav=document.querySelector(".nav");
  const navLinks=document.querySelector(".nav-actions");
  const account=document.createElement("div");
  account.className="account-area";
  account.innerHTML=`
    <span id="accountUser" class="account-user"></span>
    <button id="authOpenBtn" class="account-btn primary-account">Sign In</button>
    <button id="signOutBtn" class="account-btn hidden">Sign Out</button>
  `;
  if(navLinks){navLinks.insertAdjacentElement("afterend",account);}else{nav.appendChild(account);}

  const authModal=document.createElement("div");
  authModal.id="authModal";
  authModal.className="auth-modal hidden";
  authModal.innerHTML=`
    <div class="auth-card">
      <button id="authClose" class="auth-close" aria-label="Close">×</button>
      <div class="eyebrow">YOUR ACCOUNT</div>
      <h2 id="authTitle">Sign in to AI Resume Studio</h2>
      <p id="authIntro">Use your account to connect purchases and premium access to the right person.</p>
      <div class="auth-tabs">
        <button id="signInTab" class="auth-tab active" type="button">Sign In</button>
        <button id="signUpTab" class="auth-tab" type="button">Create Account</button>
      </div>
      <form id="authForm">
        <label>Email
          <input id="authEmail" type="email" autocomplete="email" required placeholder="you@example.com">
        </label>
        <label>Password
          <input id="authPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="At least 6 characters">
        </label>
        <button id="authSubmit" class="primary auth-submit" type="submit">Sign In</button>
        <div id="authMessage" class="auth-message"></div>
      </form>
      <p class="auth-note">Your password is handled by Supabase Auth and is never stored in this page's code.</p>
    </div>
  `;
  document.body.appendChild(authModal);

  let authMode="signin";
  const signInTab=document.getElementById("signInTab");
  const signUpTab=document.getElementById("signUpTab");
  const authSubmit=document.getElementById("authSubmit");
  const password=document.getElementById("authPassword");

  function setMode(mode){
    authMode=mode;
    const isSignUp=mode==="signup";
    signInTab.classList.toggle("active",!isSignUp);
    signUpTab.classList.toggle("active",isSignUp);
    authSubmit.textContent=isSignUp?"Create Account":"Sign In";
    password.autocomplete=isSignUp?"new-password":"current-password";
    document.getElementById("authMessage").textContent="";
    document.getElementById("authMessage").className="auth-message";
  }

  signInTab.addEventListener("click",()=>setMode("signin"));
  signUpTab.addEventListener("click",()=>setMode("signup"));
  document.getElementById("authClose").addEventListener("click",hideAuthModal);
  authModal.addEventListener("click",e=>{if(e.target===authModal)hideAuthModal();});
  document.getElementById("authOpenBtn").addEventListener("click",()=>showAuthModal("signin"));
  document.getElementById("signOutBtn").addEventListener("click",async()=>{
    if(!supabaseClient)return;
    await supabaseClient.auth.signOut();
  });

  document.getElementById("authForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!supabaseClient)return;
    const email=document.getElementById("authEmail").value.trim();
    const passwordValue=password.value;
    const message=document.getElementById("authMessage");
    const original=authSubmit.textContent;
    authSubmit.disabled=true;
    authSubmit.textContent=authMode==="signup"?"Creating account...":"Signing in...";
    message.textContent="";
    message.className="auth-message";

    try{
      if(authMode==="signup"){
        const {data,error}=await supabaseClient.auth.signUp({email,password:passwordValue});
        if(error)throw error;
        if(data.session){
          message.textContent="Account created and signed in.";
          message.className="auth-message success";
          setTimeout(hideAuthModal,500);
        }else{
          message.textContent="Account created. Check your email to confirm it, then sign in.";
          message.className="auth-message success";
        }
      }else{
        const {error}=await supabaseClient.auth.signInWithPassword({email,password:passwordValue});
        if(error)throw error;
        message.textContent="Signed in successfully.";
        message.className="auth-message success";
        setTimeout(hideAuthModal,400);
      }
    }catch(error){
      message.textContent=error.message||"Authentication failed.";
      message.className="auth-message error";
    }finally{
      authSubmit.disabled=false;
      authSubmit.textContent=original;
    }
  });

  window.__setAuthMode=setMode;
}

function showAuthModal(mode="signin",message=""){
  const modal=document.getElementById("authModal");
  if(!modal)return;
  if(window.__setAuthMode)window.__setAuthMode(mode);
  const msg=document.getElementById("authMessage");
  if(message){msg.textContent=message;msg.className="auth-message";}
  modal.classList.remove("hidden");
  document.getElementById("authEmail").focus();
}

function hideAuthModal(){
  document.getElementById("authModal")?.classList.add("hidden");
}

function renderAccount(user){
  currentUser=user||null;
  const userLabel=document.getElementById("accountUser");
  const open=document.getElementById("authOpenBtn");
  const signOut=document.getElementById("signOutBtn");
  if(!userLabel||!open||!signOut)return;

  if(currentUser){
    userLabel.textContent=currentUser.email||"Signed in";
    open.classList.add("hidden");
    signOut.classList.remove("hidden");
  }else{
    userLabel.textContent="";
    open.classList.remove("hidden");
    signOut.classList.add("hidden");
  }
}

async function initAuth(){
  buildAuthUi();
  try{
    const supabaseModule=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    supabaseClient=supabaseModule.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data}=await supabaseClient.auth.getSession();
    renderAccount(data.session?.user||null);
    supabaseClient.auth.onAuthStateChange((_event,session)=>renderAccount(session?.user||null));
  }catch(error){
    console.error("Could not initialize Supabase Auth",error);
  }
}

initAuth();

const modeButtons=document.querySelectorAll(".start-card");
const panels={upload:document.getElementById("uploadPanel"),scratch:document.getElementById("scratchPanel"),target:document.getElementById("targetPanel")};
modeButtons.forEach(btn=>btn.addEventListener("click",()=>{
  modeButtons.forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  Object.values(panels).forEach(p=>p.classList.add("hidden"));
  panels[btn.dataset.mode].classList.remove("hidden");
}));

const resumeFile=document.getElementById("resumeFile");
resumeFile.addEventListener("change",()=>{
  document.getElementById("fileName").textContent=resumeFile.files[0]?resumeFile.files[0].name:"No file selected";
});

const results=document.getElementById("analysisResults");

if(window.pdfjsLib){
  window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function parseListSection(analysis,startLabel,endLabel){
  const pattern=new RegExp(`${startLabel}:\\s*([\\s\\S]*?)\\n\\s*${endLabel}:`,`i`);
  const match=analysis.match(pattern);
  return match
    ? match[1]
        .split("\n")
        .map(line=>line.replace(/^[-•]\s*/,"").trim())
        .filter(Boolean)
    : [];
}

function renderAnalysis(analysis){
  const overall=analysis.match(/OVERALL SCORE:\s*(\d+)/i);
  const ats=analysis.match(/ATS READABILITY:\s*(\d+)/i);
  const keyword=analysis.match(/KEYWORD MATCH:\s*(\d+)/i);
  const impact=analysis.match(/IMPACT STRENGTH:\s*(\d+)/i);
  const strengths=parseListSection(analysis,"STRENGTHS","IMPROVEMENTS");
  const improvements=parseListSection(analysis,"IMPROVEMENTS","MISSING KEYWORDS");
  const keywords=parseListSection(analysis,"MISSING KEYWORDS","TOP RECOMMENDATION");

  document.getElementById("keywordsList").innerHTML=keywords.map(item=>`<li>${item}</li>`).join("");
  document.getElementById("strengthsList").innerHTML=strengths.map(item=>`<li>${item}</li>`).join("");
  document.getElementById("improvementsList").innerHTML=improvements.map(item=>`<li>${item}</li>`).join("");
  document.getElementById("scoreBadge").textContent=`${overall?overall[1]:0} / 100`;
  document.getElementById("atsScore").textContent=`${ats?ats[1]:0}%`;
  document.getElementById("keywordScore").textContent=`${keyword?keyword[1]:0}%`;
  document.getElementById("impactScore").textContent=`${impact?impact[1]:0}%`;

  results.classList.remove("hidden");
  results.scrollIntoView({behavior:"smooth"});
}

async function requestAnalysis({resumeText,targetRole="",jobDescription=""}){
  const response=await fetch(`${SUPABASE_URL}/functions/v1/analyze-resume`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "apikey":SUPABASE_KEY
    },
    body:JSON.stringify({resumeText,targetRole,jobDescription})
  });

  const data=await response.json();
  if(!response.ok||!data.success){
    throw new Error(data.message||"The AI analysis request failed.");
  }
  return data;
}

async function extractPdfText(file){
  if(!window.pdfjsLib){
    throw new Error("The PDF reader did not load. Refresh the page and try again.");
  }

  const bytes=new Uint8Array(await file.arrayBuffer());
  const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
  const pages=[];

  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber+=1){
    const page=await pdf.getPage(pageNumber);
    const content=await page.getTextContent();
    const text=content.items
      .map(item=>item.str)
      .join(" ")
      .replace(/\s+/g," ")
      .trim();
    if(text){pages.push(text);}
  }

  return pages.join("\n\n").trim();
}

async function extractDocxText(file){
  if(!window.mammoth){
    throw new Error("The Word document reader did not load. Refresh the page and try again.");
  }

  const arrayBuffer=await file.arrayBuffer();
  const result=await window.mammoth.extractRawText({arrayBuffer});
  return (result.value||"").trim();
}

async function extractResumeText(file){
  const fileName=file.name.toLowerCase();

  if(file.type==="text/plain"||fileName.endsWith(".txt")){
    return (await file.text()).trim();
  }

  if(file.type==="application/pdf"||fileName.endsWith(".pdf")){
    return extractPdfText(file);
  }

  if(fileName.endsWith(".docx")||file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
    return extractDocxText(file);
  }

  if(fileName.endsWith(".doc")){
    throw new Error("Legacy .doc files are not supported yet. Please save the resume as .docx, PDF, or TXT and upload it again.");
  }

  throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT resume.");
}

document.getElementById("analyzeBtn").addEventListener("click",async()=>{
  const role=document.getElementById("targetRole").value.trim();
  const file=resumeFile.files[0];

  if(!file){
    alert("Choose a resume file first.");
    return;
  }

  const button=document.getElementById("analyzeBtn");
  const originalText=button.textContent;
  button.disabled=true;
  button.textContent="Reading resume...";

  try{
    const resumeText=await extractResumeText(file);
    if(resumeText.length<20){
      throw new Error("The resume does not contain enough readable text to analyze. If this is a scanned PDF, export it with selectable text and try again.");
    }

    button.textContent="Analyzing...";
    const data=await requestAnalysis({
      resumeText,
      targetRole:role,
      jobDescription:""
    });

    renderAnalysis(data.analysis);
  }catch(error){
    console.error(error);
    alert(error.message||"Could not read or analyze the resume.");
  }finally{
    button.disabled=false;
    button.textContent=originalText;
  }
});

document.getElementById("scratchBtn").addEventListener("click",async()=>{
  const title=document.getElementById("scratchTitle").value.trim();
  const years=document.getElementById("scratchYears").value;
  const skills=document.getElementById("scratchSkills").value.trim();

  if(!title||!skills){
    alert("Enter your current or most recent job title and strongest skills first.");
    return;
  }

  try{
    const data=await requestAnalysis({
      resumeText:`Job Title: ${title}\nYears of Experience: ${years}\nSkills: ${skills}`,
      targetRole:title,
      jobDescription:`Create a strong professional resume outline for a ${title} with ${years} of experience. Focus on these skills: ${skills}.`
    });

    let outlineBox=document.getElementById("resumeOutlineResult");
    if(!outlineBox){
      outlineBox=document.createElement("div");
      outlineBox.id="resumeOutlineResult";
      outlineBox.style.whiteSpace="pre-wrap";
      outlineBox.style.marginTop="24px";
      outlineBox.style.padding="28px";
      outlineBox.style.border="1px solid #2d3748";
      outlineBox.style.borderRadius="12px";
      outlineBox.style.lineHeight="1.65";
      outlineBox.style.fontSize="16px";
      outlineBox.style.background="#0f1b2d";
      document.getElementById("scratchBtn").insertAdjacentElement("afterend",outlineBox);
    }

    const cleanOutline=data.analysis
      .replace(/\*\*/g,"")
      .replace(/^###\s*/gm,"")
      .replace(/^##\s*/gm,"")
      .replace(/^#\s*/gm,"");

    outlineBox.textContent=cleanOutline;
    outlineBox.scrollIntoView({behavior:"smooth",block:"start"});
  }catch(error){
    console.error(error);
    alert(error.message||"Could not connect to the AI analyzer.");
  }
});

document.getElementById("matchBtn").addEventListener("click",async()=>{
  const job=document.getElementById("jobDescription").value.trim();
  const resume=document.getElementById("resumeText").value.trim();

  if(!job||!resume){
    alert("Paste both the job description and your resume text first.");
    return;
  }

  try{
    const data=await requestAnalysis({
      resumeText:resume,
      targetRole:"",
      jobDescription:job
    });
    renderAnalysis(data.analysis);
  }catch(error){
    console.error(error);
    alert(error.message||"Could not connect to the AI analyzer.");
  }
});

const modal=document.getElementById("modal");
document.querySelectorAll(".buy").forEach(btn=>btn.addEventListener("click",()=>{
  if(!currentUser){
    showAuthModal("signup","Create or sign in to your account before choosing a paid plan. This keeps the Paddle purchase tied to the correct user.");
    return;
  }
  document.getElementById("modalTitle").textContent=`${btn.dataset.plan} checkout is next`;
  modal.classList.remove("hidden");
}));
function hideModal(){modal.classList.add("hidden")}
document.getElementById("closeModal").addEventListener("click",hideModal);
document.getElementById("modalOk").addEventListener("click",hideModal);
modal.addEventListener("click",e=>{if(e.target===modal)hideModal()});

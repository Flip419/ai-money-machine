let coverLetterInProgress=false;

function coverLetterPlanEligible(){
  try{
    if(typeof currentEntitlement!=="undefined" && currentEntitlement && ["pro","studio_premium"].includes(currentEntitlement.plan)){
      return true;
    }
  }catch{}

  const activeHeading=document.querySelector(".premium-lock h3")?.textContent?.toLowerCase()||"";
  return activeHeading.includes("pro is active")||activeHeading.includes("studio premium is active");
}

function addCoverLetterButton(){
  const actions=document.querySelector(".premium-actions");
  if(!actions||document.getElementById("generateCoverLetterBtn")||!coverLetterPlanEligible())return;

  const button=document.createElement("button");
  button.id="generateCoverLetterBtn";
  button.className="primary compact premium-rewrite-btn";
  button.type="button";
  button.textContent="Generate Cover Letter";
  actions.appendChild(button);
}

function coverLetterSourceFromPage(){
  const pasted=document.getElementById("resumeText")?.value?.trim()||"";
  if(pasted)return pasted;

  const rewritten=document.getElementById("rewriteOutput")?.textContent?.trim()||"";
  if(rewritten)return rewritten;

  const canonical=String(window.__canonicalResumeExport||"").trim();
  if(canonical)return canonical;

  const cached=String(window.__activeResumeText||"").trim();
  if(cached)return cached;

  return "";
}

async function getCoverLetterInputs(){
  const jobDescription=document.getElementById("jobDescription")?.value?.trim()||"";
  const targetRole=document.getElementById("targetRole")?.value?.trim()||"";
  const existingResume=coverLetterSourceFromPage();

  if(existingResume){
    return {resumeText:existingResume,targetRole,jobDescription};
  }

  const file=document.getElementById("resumeFile")?.files?.[0];
  if(file&&typeof extractResumeText==="function"){
    try{
      const resumeText=await extractResumeText(file);
      if(resumeText){
        window.__activeResumeText=resumeText;
        return {resumeText,targetRole,jobDescription:""};
      }
    }catch(error){
      console.warn("Resume file reference is no longer readable",error);
      throw new Error("Your browser lost access to the original resume file. Please choose the resume file again, then retry the cover letter.");
    }
  }

  return {resumeText:"",targetRole,jobDescription};
}

function renderCoverLetterResult(coverLetter){
  const results=document.getElementById("analysisResults");
  if(!results)return;

  let box=document.getElementById("coverLetterResult");
  if(!box){
    box=document.createElement("div");
    box.id="coverLetterResult";
    box.className="rewrite-result";
    results.appendChild(box);
  }

  box.innerHTML=`
    <div class="rewrite-result-head">
      <div>
        <div class="eyebrow">PRO COVER LETTER</div>
        <h3>Your Tailored Cover Letter</h3>
      </div>
      <button id="copyCoverLetterBtn" class="rewrite-copy" type="button">Copy Cover Letter</button>
    </div>
    <pre id="coverLetterOutput" class="rewrite-output"></pre>
  `;
  document.getElementById("coverLetterOutput").textContent=coverLetter;
  box.scrollIntoView({behavior:"smooth",block:"start"});
}

function withCoverLetterTimeout(promise,ms=60000){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error("The cover-letter request took too long. Please try again.")),ms))
  ]);
}

async function generateCoverLetter(){
  if(coverLetterInProgress)return;
  if(!coverLetterPlanEligible()){
    alert("Pro or Studio Premium is required for cover-letter generation.");
    return;
  }
  if(typeof supabaseClient==="undefined"||!supabaseClient||typeof currentUser==="undefined"||!currentUser){
    if(typeof showAuthModal==="function")showAuthModal("signin","Sign in to use your cover-letter generator.");
    return;
  }

  const button=document.getElementById("generateCoverLetterBtn");
  const originalText=button?.textContent||"Generate Cover Letter";
  coverLetterInProgress=true;
  if(button){button.disabled=true;button.textContent="Preparing cover letter...";}

  try{
    const inputs=await getCoverLetterInputs();
    if(inputs.resumeText.length<20){
      throw new Error("Upload or paste your resume first, then run the analysis before generating the cover letter.");
    }

    if(button)button.textContent="Writing cover letter...";
    const {data,error}=await withCoverLetterTimeout(supabaseClient.functions.invoke("generate-cover-letter",{body:inputs}));
    if(error)throw error;
    if(!data?.success||!data?.coverLetter){
      throw new Error(data?.message||"The cover-letter request failed.");
    }
    renderCoverLetterResult(data.coverLetter);
  }catch(error){
    console.error("Could not generate cover letter",error);
    alert(error?.message||"Could not generate the cover letter.");
  }finally{
    coverLetterInProgress=false;
    if(button){button.disabled=false;button.textContent=originalText;}
  }
}

document.addEventListener("click",async event=>{
  const generateButton=event.target.closest?.("#generateCoverLetterBtn");
  if(generateButton){
    event.preventDefault();
    await generateCoverLetter();
    return;
  }

  const copyButton=event.target.closest?.("#copyCoverLetterBtn");
  if(copyButton){
    event.preventDefault();
    const text=document.getElementById("coverLetterOutput")?.textContent||"";
    if(!text)return;
    try{
      await navigator.clipboard.writeText(text);
      const original=copyButton.textContent;
      copyButton.textContent="Copied";
      setTimeout(()=>{copyButton.textContent=original;},1200);
    }catch{
      alert("Copy failed. Select the cover letter text and copy it manually.");
    }
  }
});

const coverLetterObserver=new MutationObserver(()=>addCoverLetterButton());
coverLetterObserver.observe(document.body,{childList:true,subtree:true});
addCoverLetterButton();

let coverLetterButtonAttempts=0;
const coverLetterButtonTimer=setInterval(()=>{
  coverLetterButtonAttempts+=1;
  addCoverLetterButton();
  if(document.getElementById("generateCoverLetterBtn")||coverLetterButtonAttempts>=80){
    clearInterval(coverLetterButtonTimer);
  }
},250);

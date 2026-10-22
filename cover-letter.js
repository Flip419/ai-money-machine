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

async function getCoverLetterInputs(){
  const pastedResume=document.getElementById("resumeText")?.value?.trim()||"";
  const jobDescription=document.getElementById("jobDescription")?.value?.trim()||"";
  const targetRole=document.getElementById("targetRole")?.value?.trim()||"";

  if(pastedResume){
    return {resumeText:pastedResume,targetRole,jobDescription};
  }

  const file=document.getElementById("resumeFile")?.files?.[0];
  if(file&&typeof extractResumeText==="function"){
    const resumeText=await extractResumeText(file);
    return {resumeText,targetRole,jobDescription:""};
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
    const {data,error}=await supabaseClient.functions.invoke("generate-cover-letter",{body:inputs});
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

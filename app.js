const SUPABASE_URL = "https://guvywdjhgsnufjwsrurq.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q423UjYkLcUQT6NBrSq5UQ_7jn4qiti";
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

document.getElementById("analyzeBtn").addEventListener("click",async()=>{
  const role=document.getElementById("targetRole").value.trim();
  const file=resumeFile.files[0];

  if(!file){
    alert("Choose a resume file first.");
    return;
  }

  const fileName=file.name.toLowerCase();
  const isTextFile=file.type==="text/plain"||fileName.endsWith(".txt");
  if(!isTextFile){
    alert("Real AI analysis is connected. For this first working pass, upload a .txt resume. PDF and Word extraction will be added next so those formats can be analyzed reliably.");
    return;
  }

  const button=document.getElementById("analyzeBtn");
  const originalText=button.textContent;
  button.disabled=true;
  button.textContent="Analyzing...";

  try{
    const resumeText=(await file.text()).trim();
    if(resumeText.length<20){
      alert("The resume file does not contain enough readable text to analyze.");
      return;
    }

    const data=await requestAnalysis({
      resumeText,
      targetRole:role,
      jobDescription:""
    });

    renderAnalysis(data.analysis);
  }catch(error){
    console.error(error);
    alert(error.message||"Could not connect to the AI analyzer.");
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
  document.getElementById("modalTitle").textContent=`${btn.dataset.plan} checkout is next`;
  modal.classList.remove("hidden");
}));
function hideModal(){modal.classList.add("hidden")}
document.getElementById("closeModal").addEventListener("click",hideModal);
document.getElementById("modalOk").addEventListener("click",hideModal);
modal.addEventListener("click",e=>{if(e.target===modal)hideModal()});

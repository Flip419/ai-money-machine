const SUPABASE_URL = "https://guvywdjhgsnufjwsrurq.supabase.co";
sb_publishable_Q423UjYkLcUQT6NBrSq5UQ_7jn4qiti
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
function showResults(base=72){
  const ats=Math.min(94,base+6), keyword=Math.max(52,base-8), impact=Math.min(90,base-2);
  document.getElementById("scoreBadge").textContent=`${base} / 100`;
  document.getElementById("atsScore").textContent=`${ats}%`;
  document.getElementById("keywordScore").textContent=`${keyword}%`;
  document.getElementById("impactScore").textContent=`${impact}%`;
  results.classList.remove("hidden");
  results.scrollIntoView({behavior:"smooth"});
}

document.getElementById("analyzeBtn").addEventListener("click",()=>{
  const role=document.getElementById("targetRole").value.trim();
  const file=resumeFile.files[0];
  if(!file){alert("Choose a resume file first.");return;}
  showResults(role?76:71);
});

document.getElementById("scratchBtn").addEventListener("click",()=>{
  const title=document.getElementById("scratchTitle").value.trim();
  if(!title){alert("Enter your current or most recent job title first.");return;}
  showResults(68);
});

document.getElementById("matchBtn").addEventListener("click", async ()=>{
  const job=document.getElementById("jobDescription").value.trim();
  const resume=document.getElementById("resumeText").value.trim();

  if(!job||!resume){
    alert("Paste both the job description and your resume text first.");
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({
        resumeText: resume,
        targetRole: "",
        jobDescription: job
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      alert(data.message || "The AI analysis request failed.");
      return;
    }

    alert(data.analysis);

  } catch (error) {
    console.error(error);
    alert("Could not connect to the AI analyzer.");
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

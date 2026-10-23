let interviewInProgress=false;

function injectCareerSuiteStyles(){
  if(document.getElementById("careerSuiteStyles"))return;
  const style=document.createElement("style");
  style.id="careerSuiteStyles";
  style.textContent=`
    .career-suite{max-width:1040px;margin:0 auto 64px;scroll-margin-top:110px}
    .career-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .career-panel{background:#091422;border:1px solid #293b55;border-radius:12px;padding:20px}
    .career-panel h3{margin:0 0 12px}.career-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
    .template-picker{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.template-choice{border:1px solid #33435d;background:#0d192a;color:#dce6f3;border-radius:9px;padding:10px 8px;font-weight:800;cursor:pointer;font-size:11px}.template-choice.active{border-color:#63e6a7;color:#63e6a7}
    .career-output{margin-top:16px;padding:18px;border:1px solid #33435d;border-radius:11px;background:#0b1627;white-space:pre-wrap;line-height:1.6}
    @media(max-width:850px){.career-grid{grid-template-columns:1fr}.template-picker{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}

function ensureCareerNav(){
  const nav=document.querySelector(".nav-actions");
  if(!nav||document.getElementById("careerSuiteNavLink"))return;
  const link=document.createElement("a");
  link.id="careerSuiteNavLink";
  link.href="#career-suite";
  link.textContent="Interview & Export";
  const accountLink=[...nav.querySelectorAll("a")].find(a=>a.getAttribute("href")==="#account");
  if(accountLink)nav.insertBefore(link,accountLink);else nav.appendChild(link);
}

function buildCareerSuite(){
  if(document.getElementById("career-suite"))return;
  injectCareerSuiteStyles();
  ensureCareerNav();
  const anchor=document.getElementById("account");
  const section=document.createElement("section");
  section.id="career-suite";
  section.className="card career-suite";
  section.innerHTML=`
    <div class="section-head"><div><div class="eyebrow">FINISH STRONG</div><h2>Interview Coach & Resume Export</h2><p class="muted">Turn the resume work into a ready-to-send application and sharper interview answers.</p></div><span class="free-badge">CAREER TOOLS</span></div>
    <div class="career-grid">
      <div class="career-panel">
        <h3>Professional resume export</h3>
        <p class="muted">Choose an ATS-safe layout, then export the latest generated resume as a true Word DOCX file or print-ready PDF.</p>
        <div class="template-picker" id="templatePicker">
          <button class="template-choice active" data-template="classic">Classic</button>
          <button class="template-choice" data-template="modern">Modern</button>
          <button class="template-choice" data-template="executive">Executive</button>
          <button class="template-choice" data-template="technical">Technical</button>
          <button class="template-choice" data-template="entry">Entry Level</button>
        </div>
        <div class="career-actions"><button id="exportDocxBtn" class="primary" type="button">Export DOCX</button><button id="exportPdfBtn" class="secondary" type="button">Print / Save PDF</button></div>
      </div>
      <div class="career-panel">
        <h3>AI Interview Coach</h3>
        <label>Target role<input id="interviewRole" placeholder="Example: Operations Manager"></label>
        <label>Job description<textarea id="interviewJob" class="large" placeholder="Paste the job posting here..."></textarea></label>
        <label>Your resume or Master Resume<textarea id="interviewResume" class="large" placeholder="Paste the resume you plan to submit..."></textarea></label>
        <div class="career-actions"><button id="interviewGenerateBtn" class="primary" type="button">Generate Interview Practice</button></div>
      </div>
    </div>
    <div id="interviewOutput" class="career-output hidden"></div>`;
  if(anchor)anchor.insertAdjacentElement("beforebegin",section);else document.querySelector("main")?.appendChild(section);

  document.getElementById("templatePicker")?.addEventListener("click",e=>{
    const btn=e.target.closest?.(".template-choice");if(!btn)return;
    document.querySelectorAll(".template-choice").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  });
  document.getElementById("exportDocxBtn")?.addEventListener("click",exportResumeDocx);
  document.getElementById("exportPdfBtn")?.addEventListener("click",exportResumePdf);
  document.getElementById("interviewGenerateBtn")?.addEventListener("click",generateInterviewPractice);
}

function latestResumeText(){
  const candidates=[
    document.getElementById("interviewResume")?.value,
    document.getElementById("fusionOutput")?.textContent,
    document.getElementById("rewriteOutput")?.textContent,
    document.getElementById("resumeText")?.value
  ].map(v=>(v||"").trim()).filter(Boolean);
  return candidates[0]||"";
}
function selectedTemplate(){return document.querySelector(".template-choice.active")?.dataset.template||"classic";}
function resumeHtml(text,template){
  const safe=text.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const heading={classic:"Georgia,serif",modern:"Arial,sans-serif",executive:"Times New Roman,serif",technical:"Courier New,monospace",entry:"Arial,sans-serif"}[template]||"Arial,sans-serif";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Resume</title><style>body{font-family:${heading};max-width:820px;margin:40px auto;padding:0 28px;line-height:1.45;color:#111}pre{white-space:pre-wrap;font:inherit}</style></head><body><pre>${safe}</pre></body></html>`;
}
function docxFont(template){
  return {classic:"Georgia",modern:"Arial",executive:"Times New Roman",technical:"Courier New",entry:"Arial"}[template]||"Arial";
}
async function exportResumeDocx(){
  const text=latestResumeText();if(!text){alert("Generate or paste a resume first.");return;}
  const button=document.getElementById("exportDocxBtn");const original=button?.textContent||"Export DOCX";if(button){button.disabled=true;button.textContent="Building DOCX...";}
  try{
    const {Document,Packer,Paragraph,TextRun}=await import("https://cdn.jsdelivr.net/npm/docx@9.11.0/+esm");
    const font=docxFont(selectedTemplate());
    const children=text.split(/\r?\n/).map(line=>new Paragraph({children:[new TextRun({text:line||" ",font,size:22})],spacing:{after:line.trim()?80:20}}));
    const doc=new Document({sections:[{properties:{page:{margin:{top:720,right:720,bottom:720,left:720}}},children}]});
    const blob=await Packer.toBlob(doc);
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="AI-Resume-Studio-Resume.docx";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){console.error("DOCX export failed",error);alert("Could not create the DOCX file. Please try again.");}
  finally{if(button){button.disabled=false;button.textContent=original;}}
}
function exportResumePdf(){
  const text=latestResumeText();if(!text){alert("Generate or paste a resume first.");return;}
  const win=window.open("","_blank");if(!win){alert("Pop-up blocked. Allow pop-ups and try again.");return;}
  win.document.write(resumeHtml(text,selectedTemplate()));win.document.close();win.focus();setTimeout(()=>win.print(),250);
}

async function generateInterviewPractice(){
  if(interviewInProgress)return;
  if(typeof supabaseClient==="undefined"||!supabaseClient||typeof currentUser==="undefined"||!currentUser){if(typeof showAuthModal==="function")showAuthModal("signin","Sign in to use the interview coach.");return;}
  const role=document.getElementById("interviewRole").value.trim();
  const job=document.getElementById("interviewJob").value.trim();
  const resume=document.getElementById("interviewResume").value.trim()||latestResumeText();
  if(!resume||resume.length<20){alert("Add the resume you plan to submit first.");return;}
  const btn=document.getElementById("interviewGenerateBtn");const original=btn.textContent;btn.disabled=true;btn.textContent="Generating practice...";interviewInProgress=true;
  try{
    const {data,error}=await supabaseClient.functions.invoke("interview-coach",{body:{role,jobDescription:job,resumeText:resume}});
    if(error)throw error;if(!data?.success||!data?.practice)throw new Error(data?.message||"Could not generate interview practice.");
    const out=document.getElementById("interviewOutput");out.textContent=data.practice;out.classList.remove("hidden");out.scrollIntoView({behavior:"smooth",block:"start"});
  }catch(error){console.error(error);alert(error?.message||"Could not generate interview practice.");}
  finally{interviewInProgress=false;btn.disabled=false;btn.textContent=original;}
}

buildCareerSuite();

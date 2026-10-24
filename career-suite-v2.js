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
    .template-note{font-size:12px;margin:8px 0 0;color:#9fb0c5}
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

const TEMPLATE_PROFILES={
  classic:{label:"Classic",note:"Traditional, balanced spacing and serif typography.",font:"Georgia",cssFont:"Georgia,serif",margin:720,bodySize:22,headingSize:25,lineAfter:80,headingAfter:120,headingBefore:120,headingCase:"none"},
  modern:{label:"Modern",note:"Clean sans-serif layout with tighter spacing and stronger section breaks.",font:"Arial",cssFont:"Arial,sans-serif",margin:650,bodySize:21,headingSize:25,lineAfter:65,headingAfter:95,headingBefore:135,headingCase:"uppercase"},
  executive:{label:"Executive",note:"Roomier margins, formal serif typography and prominent section headings.",font:"Times New Roman",cssFont:"'Times New Roman',serif",margin:850,bodySize:22,headingSize:27,lineAfter:85,headingAfter:120,headingBefore:155,headingCase:"uppercase"},
  technical:{label:"Technical",note:"Compact, information-dense layout with crisp monospace styling.",font:"Courier New",cssFont:"'Courier New',monospace",margin:600,bodySize:20,headingSize:23,lineAfter:55,headingAfter:80,headingBefore:100,headingCase:"uppercase"},
  entry:{label:"Entry Level",note:"Open, readable spacing designed for shorter early-career resumes.",font:"Arial",cssFont:"Arial,sans-serif",margin:760,bodySize:22,headingSize:24,lineAfter:95,headingAfter:110,headingBefore:125,headingCase:"none"}
};

function buildCareerSuite(){
  if(document.getElementById("career-suite"))return;
  injectCareerSuiteStyles();ensureCareerNav();
  const anchor=document.getElementById("account");const section=document.createElement("section");section.id="career-suite";section.className="card career-suite";
  section.innerHTML=`<div class="section-head"><div><div class="eyebrow">FINISH STRONG</div><h2>Interview Coach & Resume Export</h2><p class="muted">Turn the resume work into a ready-to-send application and sharper interview answers.</p></div><span class="free-badge">CAREER TOOLS</span></div><div class="career-grid"><div class="career-panel"><h3>Professional resume export</h3><p class="muted">Choose a single-column ATS-safe layout, then export the latest resume as a Word DOCX file or print-ready PDF.</p><div class="template-picker" id="templatePicker"><button class="template-choice active" data-template="classic">Classic</button><button class="template-choice" data-template="modern">Modern</button><button class="template-choice" data-template="executive">Executive</button><button class="template-choice" data-template="technical">Technical</button><button class="template-choice" data-template="entry">Entry Level</button></div><p id="templateNote" class="template-note">${TEMPLATE_PROFILES.classic.note}</p><div class="career-actions"><button id="exportDocxBtn" class="primary" type="button">Export DOCX</button><button id="exportPdfBtn" class="secondary" type="button">Print / Save PDF</button></div></div><div class="career-panel"><h3>AI Interview Coach</h3><label>Target role<input id="interviewRole" placeholder="Example: Operations Manager"></label><label>Job description<textarea id="interviewJob" class="large" placeholder="Paste the job posting here..."></textarea></label><label>Your resume or Master Resume<textarea id="interviewResume" class="large" placeholder="Paste the resume you plan to submit..."></textarea></label><div class="career-actions"><button id="interviewGenerateBtn" class="primary" type="button">Generate Interview Practice</button></div></div></div><div id="interviewOutput" class="career-output hidden"></div>`;
  if(anchor)anchor.insertAdjacentElement("beforebegin",section);else document.querySelector("main")?.appendChild(section);
  document.getElementById("templatePicker")?.addEventListener("click",e=>{const btn=e.target.closest?.(".template-choice");if(!btn)return;document.querySelectorAll(".template-choice").forEach(b=>b.classList.remove("active"));btn.classList.add("active");const profile=TEMPLATE_PROFILES[btn.dataset.template]||TEMPLATE_PROFILES.classic;const note=document.getElementById("templateNote");if(note)note.textContent=profile.note;});
  document.getElementById("exportDocxBtn")?.addEventListener("click",exportResumeDocx);document.getElementById("exportPdfBtn")?.addEventListener("click",exportResumePdf);document.getElementById("interviewGenerateBtn")?.addEventListener("click",generateInterviewPractice);
}

function latestResumeText(){
  const candidates=[document.getElementById("aiResumeOutput")?.textContent,document.getElementById("interviewResume")?.value,document.getElementById("fusionOutput")?.textContent,document.getElementById("rewriteOutput")?.textContent,document.getElementById("resumeText")?.value,window.__aiResumeSource].map(v=>(v||"").trim()).filter(v=>v.length>20);
  return candidates[0]||"";
}
async function resumeTextForExport(){
  let text=latestResumeText();if(text)return text;
  try{const input=document.getElementById("resumeFile");const file=input?.files?.[0];if(file&&typeof extractResumeText==="function"){text=(await extractResumeText(file)||"").trim();if(text.length>20){window.__aiResumeSource=text;return text;}}}catch(error){console.error("Could not read uploaded resume for export",error);}return "";
}
function selectedTemplate(){return document.querySelector(".template-choice.active")?.dataset.template||"classic";}
function selectedProfile(){return TEMPLATE_PROFILES[selectedTemplate()]||TEMPLATE_PROFILES.classic;}
function isSectionHeading(line){const s=(line||"").trim();if(!s||s.length>48)return false;const normalized=s.replace(/[:\-–—]+$/g,"").trim();const known=/^(summary|professional summary|profile|objective|experience|work experience|professional experience|employment|education|skills|core skills|technical skills|certifications|licenses|projects|achievements|awards|volunteer experience|leadership|training|publications|languages)$/i;return known.test(normalized)||(/^[A-Z0-9 &/]+$/.test(normalized)&&normalized.length>=4);}
function displayHeading(line,profile){const clean=line.trim().replace(/[:\-–—]+$/g,"");return profile.headingCase==="uppercase"?clean.toUpperCase():clean;}
function resumeHtml(text,template){const p=TEMPLATE_PROFILES[template]||TEMPLATE_PROFILES.classic;const lines=text.split(/\r?\n/);const body=lines.map(line=>{const trimmed=line.trim();if(!trimmed)return '<div class="blank"></div>';const safe=trimmed.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));if(isSectionHeading(trimmed))return `<div class="section-heading">${displayHeading(safe,p)}</div>`;if(/^[-•*]\s+/.test(trimmed))return `<div class="bullet">• ${safe.replace(/^[-•*]\s+/,"")}</div>`;return `<div class="line">${safe}</div>`;}).join("");const border=template==="modern"?"border-bottom:1px solid #222;padding-bottom:3px;":template==="executive"?"border-bottom:2px solid #111;padding-bottom:4px;":"";const letter=template==="technical"?"letter-spacing:-0.1px;":template==="modern"?"letter-spacing:.2px;":"";const pagePad=Math.round(p.margin/20);return `<!doctype html><html><head><meta charset="utf-8"><title>Resume</title><style>@page{margin:${pagePad}px}body{font-family:${p.cssFont};max-width:820px;margin:0 auto;color:#111;font-size:${p.bodySize/2}pt;line-height:1.42;${letter}}.line,.bullet{margin:0 0 ${Math.round(p.lineAfter/20)}px}.bullet{padding-left:14px;text-indent:-10px}.section-heading{font-weight:700;font-size:${p.headingSize/2}pt;margin:${Math.round(p.headingBefore/20)}px 0 ${Math.round(p.headingAfter/20)}px;${border}}.blank{height:5px}</style></head><body>${body}</body></html>`;}

async function exportResumeDocx(){const text=await resumeTextForExport();if(!text){alert("Analyze, generate, paste, or upload a resume first.");return;}const button=document.getElementById("exportDocxBtn");const original=button?.textContent||"Export DOCX";if(button){button.disabled=true;button.textContent="Building DOCX...";}try{const {Document,Packer,Paragraph,TextRun}=await import("https://cdn.jsdelivr.net/npm/docx@9.11.0/+esm");const p=selectedProfile();const children=text.split(/\r?\n/).map(line=>{const trimmed=line.trim();if(!trimmed)return new Paragraph({children:[new TextRun({text:" ",font:p.font,size:p.bodySize})],spacing:{after:20}});const heading=isSectionHeading(trimmed);const bullet=/^[-•*]\s+/.test(trimmed);const display=heading?displayHeading(trimmed,p):trimmed.replace(/^[-•*]\s+/,"");return new Paragraph({children:[new TextRun({text:display,font:p.font,size:heading?p.headingSize:p.bodySize,bold:heading})],bullet:bullet?{level:0}:undefined,spacing:{before:heading?p.headingBefore:0,after:heading?p.headingAfter:p.lineAfter,line:276}});});const doc=new Document({sections:[{properties:{page:{margin:{top:p.margin,right:p.margin,bottom:p.margin,left:p.margin}}},children}]});const blob=await Packer.toBlob(doc);const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`AI-Resume-Studio-${p.label.replace(/\s+/g,"-")}.docx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}catch(error){console.error("DOCX export failed",error);alert("Could not create the DOCX file. Please try again.");}finally{if(button){button.disabled=false;button.textContent=original;}}}
async function exportResumePdf(){const text=await resumeTextForExport();if(!text){alert("Analyze, generate, paste, or upload a resume first.");return;}const win=window.open("","_blank");if(!win){alert("Pop-up blocked. Allow pop-ups and try again.");return;}win.document.write(resumeHtml(text,selectedTemplate()));win.document.close();win.focus();setTimeout(()=>win.print(),250);}

async function generateInterviewPractice(){if(interviewInProgress)return;if(typeof supabaseClient==="undefined"||!supabaseClient||typeof currentUser==="undefined"||!currentUser){if(typeof showAuthModal==="function")showAuthModal("signin","Sign in to use the interview coach.");return;}const role=document.getElementById("interviewRole").value.trim();const job=document.getElementById("interviewJob").value.trim();const resume=document.getElementById("interviewResume").value.trim()||latestResumeText();if(!resume||resume.length<20){alert("Add the resume you plan to submit first.");return;}const btn=document.getElementById("interviewGenerateBtn");const original=btn.textContent;btn.disabled=true;btn.textContent="Generating practice...";interviewInProgress=true;try{const {data,error}=await supabaseClient.functions.invoke("interview-coach",{body:{role,jobDescription:job,resumeText:resume}});if(error)throw error;if(!data?.success||!data?.practice)throw new Error(data?.message||"Could not generate interview practice.");const out=document.getElementById("interviewOutput");out.textContent=data.practice;out.classList.remove("hidden");out.scrollIntoView({behavior:"smooth",block:"start"});}catch(error){console.error(error);alert(error?.message||"Could not generate interview practice.");}finally{interviewInProgress=false;btn.disabled=false;btn.textContent=original;}}

buildCareerSuite();

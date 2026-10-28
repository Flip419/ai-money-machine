let coverLetterInProgress=false;
let coverLetterPdfPromise=null;

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
      <div class="rewrite-save-actions" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button id="copyCoverLetterBtn" class="rewrite-copy" type="button">Copy Cover Letter</button>
        <button id="saveCoverLetterDocxBtn" class="rewrite-copy" type="button">Save as DOCX</button>
        <button id="saveCoverLetterPdfBtn" class="rewrite-copy" type="button">Save as PDF</button>
      </div>
    </div>
    <pre id="coverLetterOutput" class="rewrite-output"></pre>
  `;
  document.getElementById("coverLetterOutput").textContent=coverLetter;
  box.scrollIntoView({behavior:"smooth",block:"start"});
}

function currentCoverLetterText(){
  return String(document.getElementById("coverLetterOutput")?.textContent||"").trim();
}

function coverLetterParagraphs(text){
  return String(text||"")
    .replace(/\r\n/g,"\n")
    .split(/\n{2,}/)
    .map(part=>part.trim())
    .filter(Boolean);
}

async function saveCoverLetterDocx(){
  const text=currentCoverLetterText();
  if(text.length<20){alert("Generate the tailored cover letter first.");return;}

  const button=document.getElementById("saveCoverLetterDocxBtn");
  const original=button?.textContent||"Save as DOCX";
  if(button){button.disabled=true;button.textContent="Building DOCX...";}

  try{
    if(typeof loadDocxLibrary!=="function")throw new Error("DOCX export tool is still loading");
    const {Document,Packer,Paragraph,TextRun}=await loadDocxLibrary();
    const children=[];
    coverLetterParagraphs(text).forEach(paragraph=>{
      const lines=paragraph.split("\n").map(line=>line.trim()).filter(Boolean);
      lines.forEach((line,index)=>{
        children.push(new Paragraph({
          children:[new TextRun({text:line,font:"Arial",size:22})],
          spacing:{after:index===lines.length-1?180:40,line:276}
        }));
      });
    });
    const doc=new Document({sections:[{properties:{page:{margin:{top:720,right:720,bottom:720,left:720}}},children}]});
    const blob=await Packer.toBlob(doc);
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="AI-Resume-Studio-Tailored-Cover-Letter.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){
    console.error("Cover letter DOCX export failed",error);
    alert("DOCX export could not load its document engine. Please try again in a moment.");
  }finally{
    if(button){button.disabled=false;button.textContent=original;}
  }
}

function loadCoverLetterScript(src,timeoutMs=10000){
  return new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=src;
    script.async=true;
    script.crossOrigin="anonymous";
    const timer=setTimeout(()=>{script.remove();reject(new Error("PDF engine load timed out"));},timeoutMs);
    script.onload=()=>{clearTimeout(timer);resolve();};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error("PDF engine could not load"));};
    document.head.appendChild(script);
  });
}

async function loadCoverLetterJsPdf(){
  if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
  if(coverLetterPdfPromise)return coverLetterPdfPromise;
  coverLetterPdfPromise=(async()=>{
    const sources=[
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"
    ];
    let lastError=null;
    for(const source of sources){
      try{
        await loadCoverLetterScript(source,10000);
        if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
      }catch(error){
        lastError=error;
        console.warn("Cover letter PDF engine source failed",source,error);
      }
    }
    throw lastError||new Error("PDF engine could not load");
  })().finally(()=>{coverLetterPdfPromise=null;});
  return coverLetterPdfPromise;
}

async function saveCoverLetterPdf(){
  const text=currentCoverLetterText();
  if(text.length<20){alert("Generate the tailored cover letter first.");return;}

  const button=document.getElementById("saveCoverLetterPdfBtn");
  const original=button?.textContent||"Save as PDF";
  if(button){button.disabled=true;button.textContent="Building PDF...";}

  try{
    const jsPDF=await loadCoverLetterJsPdf();
    const doc=new jsPDF({orientation:"portrait",unit:"pt",format:"letter"});
    const pageWidth=doc.internal.pageSize.getWidth();
    const pageHeight=doc.internal.pageSize.getHeight();
    const margin=54;
    const contentWidth=pageWidth-(margin*2);
    const fontSize=11;
    const lineHeight=15;
    let y=margin;

    doc.setFont("helvetica","normal");
    doc.setFontSize(fontSize);

    function addPageIfNeeded(height){
      if(y+height>pageHeight-margin){
        doc.addPage();
        y=margin;
        doc.setFont("helvetica","normal");
        doc.setFontSize(fontSize);
      }
    }

    coverLetterParagraphs(text).forEach(paragraph=>{
      const logicalLines=paragraph.split("\n").map(line=>line.trim()).filter(Boolean);
      logicalLines.forEach(line=>{
        const wrapped=doc.splitTextToSize(line,contentWidth);
        const height=wrapped.length*lineHeight;
        addPageIfNeeded(height+4);
        doc.text(wrapped,margin,y,{baseline:"top"});
        y+=height+2;
      });
      y+=10;
    });

    doc.save("AI-Resume-Studio-Tailored-Cover-Letter.pdf");
  }catch(error){
    console.error("Cover letter PDF export failed",error);
    alert("Direct PDF download could not load. Please try again in a moment.");
  }finally{
    if(button){button.disabled=false;button.textContent=original;}
  }
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
    const text=currentCoverLetterText();
    if(!text)return;
    try{
      await navigator.clipboard.writeText(text);
      const original=copyButton.textContent;
      copyButton.textContent="Copied";
      setTimeout(()=>{copyButton.textContent=original;},1200);
    }catch{
      alert("Copy failed. Select the cover letter text and copy it manually.");
    }
    return;
  }

  const docxButton=event.target.closest?.("#saveCoverLetterDocxBtn");
  if(docxButton){
    event.preventDefault();
    await saveCoverLetterDocx();
    return;
  }

  const pdfButton=event.target.closest?.("#saveCoverLetterPdfBtn");
  if(pdfButton){
    event.preventDefault();
    await saveCoverLetterPdf();
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

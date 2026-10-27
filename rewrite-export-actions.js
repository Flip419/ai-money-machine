(function(){
  function rewriteText(){
    return String(document.getElementById('rewriteOutput')?.textContent||window.__canonicalResumeExport||'').trim();
  }

  function ensureButtons(){
    const head=document.querySelector('#premiumRewriteResult .rewrite-result-head');
    if(!head||document.getElementById('saveRewriteDocxBtn'))return;
    const copy=document.getElementById('copyRewriteBtn');
    const actions=document.createElement('div');
    actions.className='rewrite-save-actions';
    actions.style.display='flex';
    actions.style.gap='8px';
    actions.style.flexWrap='wrap';
    if(copy)actions.appendChild(copy);
    const docx=document.createElement('button');
    docx.id='saveRewriteDocxBtn';docx.className='rewrite-copy';docx.type='button';docx.textContent='Save as DOCX';
    const pdf=document.createElement('button');
    pdf.id='saveRewritePdfBtn';pdf.className='rewrite-copy';pdf.type='button';pdf.textContent='Save as PDF';
    actions.appendChild(docx);actions.appendChild(pdf);head.appendChild(actions);
  }

  async function saveDocx(){
    const text=rewriteText();
    if(text.length<20){alert('Generate the rewritten resume first.');return;}
    window.__canonicalResumeExport=text;
    window.__canonicalResumeExportSource='premium_rewrite';
    const careerBtn=document.getElementById('exportDocxBtn');
    if(careerBtn){careerBtn.click();return;}
    alert('The DOCX export tool is still loading. Please try again in a moment.');
  }

  async function savePdf(){
    const text=rewriteText();
    if(text.length<20){alert('Generate the rewritten resume first.');return;}
    window.__canonicalResumeExport=text;
    window.__canonicalResumeExportSource='premium_rewrite';
    const pdfBtn=document.getElementById('exportPdfBtn');
    if(pdfBtn){pdfBtn.click();return;}
    alert('The PDF export tool is still loading. Please try again in a moment.');
  }

  document.addEventListener('click',function(event){
    const docx=event.target.closest?.('#saveRewriteDocxBtn');
    if(docx){event.preventDefault();saveDocx();return;}
    const pdf=event.target.closest?.('#saveRewritePdfBtn');
    if(pdf){event.preventDefault();savePdf();}
  });

  const observer=new MutationObserver(ensureButtons);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('canonical-resume-updated',ensureButtons);
  ensureButtons();
})();
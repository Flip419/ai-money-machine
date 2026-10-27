(function(){
  function rewriteText(){
    return String(document.getElementById('rewriteOutput')?.textContent||window.__canonicalResumeExport||'').trim();
  }

  function addButtons(){
    const head=document.querySelector('#premiumRewriteResult .rewrite-result-head');
    if(!head)return false;

    let actions=head.querySelector('.rewrite-save-actions');
    const copy=document.getElementById('copyRewriteBtn');

    if(!actions){
      actions=document.createElement('div');
      actions.className='rewrite-save-actions';
      actions.style.display='flex';
      actions.style.gap='8px';
      actions.style.flexWrap='wrap';
      actions.style.alignItems='center';
      if(copy)actions.appendChild(copy);
      head.appendChild(actions);
    }else if(copy&&copy.parentElement!==actions){
      actions.insertBefore(copy,actions.firstChild);
    }

    if(!document.getElementById('saveRewriteDocxBtn')){
      const docx=document.createElement('button');
      docx.id='saveRewriteDocxBtn';
      docx.className='rewrite-copy';
      docx.type='button';
      docx.textContent='Save as DOCX';
      actions.appendChild(docx);
    }

    if(!document.getElementById('saveRewritePdfBtn')){
      const pdf=document.createElement('button');
      pdf.id='saveRewritePdfBtn';
      pdf.className='rewrite-copy';
      pdf.type='button';
      pdf.textContent='Save as PDF';
      actions.appendChild(pdf);
    }

    return true;
  }

  async function saveDocx(){
    const text=rewriteText();
    if(text.length<20){alert('Generate the rewritten resume first.');return;}
    window.__canonicalResumeExport=text;
    window.__canonicalResumeExportSource='premium_rewrite';
    const btn=document.getElementById('exportDocxBtn');
    if(btn){btn.click();return;}
    alert('The DOCX export tool is still loading. Please try again in a moment.');
  }

  async function savePdf(){
    const text=rewriteText();
    if(text.length<20){alert('Generate the rewritten resume first.');return;}
    window.__canonicalResumeExport=text;
    window.__canonicalResumeExportSource='premium_rewrite';
    const btn=document.getElementById('exportPdfBtn');
    if(btn){btn.click();return;}
    alert('The PDF export tool is still loading. Please try again in a moment.');
  }

  document.addEventListener('click',function(event){
    const docx=event.target.closest?.('#saveRewriteDocxBtn');
    if(docx){event.preventDefault();event.stopPropagation();saveDocx();return;}
    const pdf=event.target.closest?.('#saveRewritePdfBtn');
    if(pdf){event.preventDefault();event.stopPropagation();savePdf();}
  },true);

  document.addEventListener('canonical-resume-updated',()=>setTimeout(addButtons,0));
  const observer=new MutationObserver(()=>addButtons());
  observer.observe(document.body,{childList:true,subtree:true});

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(addButtons()||attempts>=240)clearInterval(timer);
  },250);

  window.addEventListener('load',()=>setTimeout(addButtons,250));
  addButtons();
})();
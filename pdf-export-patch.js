(function(){
  let pdfInProgress=false;
  let jsPdfPromise=null;

  function loadJsPdf(){
    if(window.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
    if(jsPdfPromise)return jsPdfPromise;
    jsPdfPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
      script.async=true;
      const timer=setTimeout(()=>reject(new Error('PDF engine load timed out')),10000);
      script.onload=()=>{clearTimeout(timer);window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error('PDF engine did not initialize'));};
      script.onerror=()=>{clearTimeout(timer);reject(new Error('PDF engine could not load'));};
      document.head.appendChild(script);
    }).finally(()=>{jsPdfPromise=null;});
    return jsPdfPromise;
  }

  function updatePdfButton(){
    const button=document.getElementById('exportPdfBtn');
    if(button&&button.textContent!=='Export PDF'&&!pdfInProgress)button.textContent='Export PDF';
  }

  async function directPdfExport(){
    if(pdfInProgress)return;
    if(typeof hasProExport==='function'&&!hasProExport()){
      alert('Professional resume export is included with Pro and Studio Premium.');
      return;
    }
    const template=typeof selectedTemplate==='function'?selectedTemplate():'classic';
    if(typeof hasPremiumCoach==='function'&&typeof PRO_TEMPLATES!=='undefined'&&!hasPremiumCoach()&&!PRO_TEMPLATES.has(template)){
      alert('That template is included with Studio Premium. Choose Classic, Modern, or Entry Level on Pro.');
      return;
    }

    let text='';
    if(typeof resumeTextForExport==='function')text=await resumeTextForExport();
    if(!text)text=String(window.__canonicalResumeExport||window.__activeResumeText||'').trim();
    if(!text){alert('Analyze, generate, paste, or upload a resume first.');return;}

    const button=document.getElementById('exportPdfBtn');
    pdfInProgress=true;
    if(button){button.disabled=true;button.textContent='Building PDF...';}

    try{
      const jsPDF=await loadJsPdf();
      const doc=new jsPDF({orientation:'portrait',unit:'pt',format:'letter'});
      const pageWidth=doc.internal.pageSize.getWidth();
      const pageHeight=doc.internal.pageSize.getHeight();
      const profile=typeof selectedProfile==='function'?selectedProfile():{label:'Classic',font:'Georgia',bodySize:22,headingSize:25,margin:720};
      const margin=Math.max(32,Math.min(54,Math.round((profile.margin||720)/20)));
      const contentWidth=pageWidth-(margin*2);
      const lines=typeof normalizeExportLines==='function'?normalizeExportLines(text):String(text).split(/\r?\n/);
      let y=margin;

      function addPageIfNeeded(height){
        if(y+height>pageHeight-margin){doc.addPage();y=margin;}
      }
      function fontForProfile(){
        const f=String(profile.font||'Arial').toLowerCase();
        if(f.includes('times')||f.includes('georgia'))return 'times';
        if(f.includes('courier'))return 'courier';
        return 'helvetica';
      }

      const baseFont=fontForProfile();
      lines.forEach((raw,index)=>{
        const trimmed=String(raw||'').trim();
        if(!trimmed){y+=4;return;}
        const heading=typeof isSectionHeading==='function'?isSectionHeading(trimmed):false;
        const bullet=/^[-•*]\s+/.test(trimmed);
        let display=trimmed.replace(/^[-•*]\s+/,'');
        if(heading&&typeof displayHeading==='function')display=displayHeading(trimmed,profile);
        if(bullet)display='• '+display;

        const isName=index===0&&!heading;
        const fontSize=isName?15:heading?Math.max(11,(profile.headingSize||22)/2):Math.max(9,(profile.bodySize||20)/2);
        doc.setFont(baseFont,heading||isName?'bold':'normal');
        doc.setFontSize(fontSize);
        const wrapped=doc.splitTextToSize(display,contentWidth-(bullet?10:0));
        const lineHeight=fontSize*1.22;
        const blockHeight=wrapped.length*lineHeight+(heading?7:3);
        addPageIfNeeded(blockHeight);
        if(heading)y+=4;
        doc.text(wrapped,margin+(bullet?10:0),y,{baseline:'top'});
        y+=blockHeight;
      });

      const safeLabel=String(profile.label||'Resume').replace(/\s+/g,'-');
      doc.save(`AI-Resume-Studio-${safeLabel}.pdf`);
    }catch(error){
      console.error('Direct PDF export failed',error);
      alert('Direct PDF download could not load. The browser Print / Save PDF option will open as a fallback.');
      try{if(typeof exportResumePdf==='function')await exportResumePdf();}catch{}
    }finally{
      pdfInProgress=false;
      if(button){button.disabled=false;button.textContent='Export PDF';}
    }
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#exportPdfBtn');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    directPdfExport();
  },true);

  const observer=new MutationObserver(updatePdfButton);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  updatePdfButton();
  window.addEventListener('load',()=>setTimeout(updatePdfButton,100),{once:true});
})();
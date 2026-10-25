(function(){
  function isHeading(line){var s=(line||'').trim().replace(/[:\-–—]+$/g,'').trim();return /^(summary|professional summary|profile|objective|experience|work experience|professional experience|employment|education|skills|core skills|core competencies|technical skills|certifications|licenses|projects|achievements|awards|volunteer experience|training|publications|languages)$/i.test(s)||(/^[A-Z0-9 &/]+$/.test(s)&&s.length>=4&&s.length<=48);}
  function preferredResumeText(){var ids=['rewriteOutput','aiResumeOutput','fusionOutput'];for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]),v=String(el?.textContent||'').trim();if(v.length>20)return v;}var fields=['interviewResume','resumeText'];for(var j=0;j<fields.length;j++){var f=document.getElementById(fields[j]),x=String(f?.value||'').trim();if(x.length>20)return x;}return String(window.__aiResumeSource||'').trim();}
  function normalizeLines(text){
    var lines=String(text||'').split(/\r?\n/),out=[],i=0;
    while(i<lines.length){
      var line=lines[i].trim();
      if(/^CORE (COMPETENCIES|SKILLS):?$/i.test(line)){
        out.push('CORE COMPETENCIES');i++;var skills=[];
        while(i<lines.length){var s=lines[i].trim();if(!s){i++;continue;}if(/^(CERTIFICATIONS|LICENSES|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE|EDUCATION|PROJECTS|ACHIEVEMENTS|AWARDS|TRAINING|LANGUAGES):?$/i.test(s))break;if(!/^leadership$/i.test(s))skills.push(s.replace(/^[-•*]\s+/,''));i++;}
        if(skills.length)out.push(skills.join(' • '));out.push('');continue;
      }
      out.push(lines[i]);i++;
    }
    return out;
  }
  async function polishedClassicDocx(){
    var text=preferredResumeText();if(!text&&typeof resumeTextForExport==='function')text=await resumeTextForExport();if(!text){alert('Analyze, generate, paste, or upload a resume first.');return;}
    var button=document.getElementById('exportDocxBtn'),label=button?button.textContent:'Export DOCX';if(button){button.disabled=true;button.textContent='Building DOCX...';}
    try{
      var mod=await import('https://cdn.jsdelivr.net/npm/docx@9.11.0/+esm'),Document=mod.Document,Packer=mod.Packer,Paragraph=mod.Paragraph,TextRun=mod.TextRun;
      var lines=normalizeLines(text),children=[];
      lines.forEach(function(raw,index){var t=String(raw||'').trim();if(!t){children.push(new Paragraph({children:[new TextRun({text:' ',font:'Georgia',size:17})],spacing:{after:0}}));return;}if(index===0){children.push(new Paragraph({children:[new TextRun({text:t,font:'Georgia',size:30,bold:true})],spacing:{after:10,keepNext:true}}));return;}if(index===1&&!isHeading(t)){children.push(new Paragraph({children:[new TextRun({text:t,font:'Georgia',size:18})],spacing:{after:35}}));return;}var heading=isHeading(t),bullet=/^[-•*]\s+/.test(t),display=t.replace(/^[-•*]\s+/,'');children.push(new Paragraph({children:[new TextRun({text:display,font:'Georgia',size:heading?20:18,bold:heading})],bullet:bullet?{level:0}:undefined,spacing:{before:heading?35:0,after:heading?18:8,line:200},keepNext:heading}));});
      var doc=new Document({sections:[{properties:{page:{margin:{top:360,right:560,bottom:360,left:560}}},children:children}]});var blob=await Packer.toBlob(doc),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AI-Resume-Studio-Classic.docx';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);
    }catch(error){console.error('Polished DOCX export failed',error);alert('Could not create the DOCX file. Please try again.');}finally{if(button){button.disabled=false;button.textContent=label;}}
  }
  document.addEventListener('click',function(event){var btn=event.target&&event.target.closest?event.target.closest('#exportDocxBtn'):null;if(!btn)return;var template=typeof selectedTemplate==='function'?selectedTemplate():'classic';if(template!=='classic')return;event.preventDefault();event.stopImmediatePropagation();polishedClassicDocx();},true);
})();
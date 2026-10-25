(function(){
  var originalExport=null;
  function isHeading(line){var s=(line||'').trim().replace(/[:\-–—]+$/g,'').trim();return /^(summary|professional summary|profile|objective|experience|work experience|professional experience|employment|education|skills|core skills|core competencies|technical skills|certifications|licenses|projects|achievements|awards|volunteer experience|leadership|training|publications|languages)$/i.test(s)||(/^[A-Z0-9 &/]+$/.test(s)&&s.length>=4&&s.length<=48);}
  function compactClassicLines(text){
    var lines=String(text||'').split(/\r?\n/),out=[],i=0;
    while(i<lines.length){
      var line=lines[i].trim();
      if(/^CORE COMPETENCIES:?$/i.test(line)){
        out.push('CORE COMPETENCIES');i++;var skills=[];
        while(i<lines.length){var s=lines[i].trim();if(!s){i++;continue;}if(isHeading(s))break;skills.push(s.replace(/^[-•*]\s+/,''));i++;}
        if(skills.length)out.push(skills.join(' • '));out.push('');continue;
      }
      out.push(lines[i]);i++;
    }
    return out;
  }
  async function polishedClassicDocx(){
    var text=typeof resumeTextForExport==='function'?await resumeTextForExport():'';
    if(!text){alert('Analyze, generate, paste, or upload a resume first.');return;}
    var button=document.getElementById('exportDocxBtn'),label=button?button.textContent:'Export DOCX';
    if(button){button.disabled=true;button.textContent='Building DOCX...';}
    try{
      var mod=await import('https://cdn.jsdelivr.net/npm/docx@9.11.0/+esm');
      var Document=mod.Document,Packer=mod.Packer,Paragraph=mod.Paragraph,TextRun=mod.TextRun;
      var lines=compactClassicLines(text),children=[];
      lines.forEach(function(raw,index){
        var t=String(raw||'').trim();
        if(!t){children.push(new Paragraph({children:[new TextRun({text:' ',font:'Georgia',size:19})],spacing:{after:20}}));return;}
        if(index===0){children.push(new Paragraph({children:[new TextRun({text:t,font:'Georgia',size:32,bold:true})],spacing:{after:35,keepNext:true}}));return;}
        if(index===1&&!isHeading(t)){children.push(new Paragraph({children:[new TextRun({text:t,font:'Georgia',size:20})],spacing:{after:90}}));return;}
        var heading=isHeading(t),bullet=/^[-•*]\s+/.test(t),display=t.replace(/^[-•*]\s+/,'');
        children.push(new Paragraph({children:[new TextRun({text:display,font:'Georgia',size:heading?23:20,bold:heading})],bullet:bullet?{level:0}:undefined,spacing:{before:heading?90:0,after:heading?55:35,line:240},keepNext:heading}));
      });
      var doc=new Document({sections:[{properties:{page:{margin:{top:650,right:720,bottom:650,left:720}}},children:children}]});
      var blob=await Packer.toBlob(doc),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='AI-Resume-Studio-Classic.docx';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);
    }catch(error){console.error('Polished DOCX export failed',error);alert('Could not create the DOCX file. Please try again.');}
    finally{if(button){button.disabled=false;button.textContent=label;}}
  }
  function install(){
    var btn=document.getElementById('exportDocxBtn');if(!btn||btn.dataset.exportPolished==='1')return false;
    if(typeof exportResumeDocx==='function')originalExport=exportResumeDocx;
    var clone=btn.cloneNode(true);clone.dataset.exportPolished='1';btn.replaceWith(clone);
    clone.addEventListener('click',function(){var template=typeof selectedTemplate==='function'?selectedTemplate():'classic';if(template==='classic')polishedClassicDocx();else if(originalExport)originalExport();});
    return true;
  }
  if(!install()){var tries=0,t=setInterval(function(){tries++;if(install()||tries>80)clearInterval(t);},125);}
})();
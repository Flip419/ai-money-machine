(function(){
  const RESUME_TIMEOUT_MS=60000;
  let resumeReadPromise=null;

  function fileKey(file){
    if(!file)return "";
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  function cacheResumeText(file,text){
    const clean=String(text||"").trim();
    if(!clean)return clean;
    window.__activeResumeText=clean;
    window.__activeResumeFileKey=fileKey(file);
    return clean;
  }

  async function readAndCacheResume(file){
    if(!file)return "";
    const key=fileKey(file);
    if(window.__activeResumeFileKey===key&&String(window.__activeResumeText||"").trim()){
      return String(window.__activeResumeText).trim();
    }

    const original=window.__originalExtractResumeText||window.extractResumeText;
    if(typeof original!=="function")throw new Error("The resume reader is not available. Refresh the page and try again.");

    if(resumeReadPromise)return resumeReadPromise;
    resumeReadPromise=(async()=>{
      try{
        const text=await original(file);
        return cacheResumeText(file,text);
      }finally{
        resumeReadPromise=null;
      }
    })();
    return resumeReadPromise;
  }

  if(typeof window.extractResumeText==="function"){
    window.__originalExtractResumeText=window.extractResumeText;
    window.extractResumeText=readAndCacheResume;
  }

  const resumeFile=document.getElementById("resumeFile");
  if(resumeFile){
    resumeFile.addEventListener("change",()=>{
      const file=resumeFile.files?.[0];
      window.__activeResumeText="";
      window.__activeResumeFileKey="";
      resumeReadPromise=null;
      if(!file)return;
      readAndCacheResume(file).catch(error=>{
        console.warn("Could not pre-read the selected resume",error);
      });
    });
  }

  window.requestAnalysis=async function({resumeText,targetRole="",jobDescription=""}){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),RESUME_TIMEOUT_MS);
    try{
      const response=await fetch(`${SUPABASE_URL}/functions/v1/analyze-resume`,{
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},
        body:JSON.stringify({resumeText,targetRole,jobDescription}),
        signal:controller.signal
      });
      let data={};
      try{data=await response.json();}catch{}
      if(!response.ok||!data.success){
        throw new Error(data.message||"The AI analysis request failed.");
      }
      return data;
    }catch(error){
      if(error?.name==="AbortError"){
        throw new Error("The AI analysis took too long and was stopped. Please try again.");
      }
      throw error;
    }finally{
      clearTimeout(timeout);
    }
  };

  window.getRewriteInputs=async function(){
    const pastedResume=document.getElementById("resumeText")?.value?.trim()||"";
    const jobDescription=document.getElementById("jobDescription")?.value?.trim()||"";
    const targetRole=document.getElementById("targetRole")?.value?.trim()||"";

    if(pastedResume){
      window.__activeResumeText=pastedResume;
      return {resumeText:pastedResume,targetRole,jobDescription};
    }

    const cached=String(window.__activeResumeText||"").trim();
    if(cached)return {resumeText:cached,targetRole,jobDescription:""};

    const rewritten=document.getElementById("rewriteOutput")?.textContent?.trim()||"";
    if(rewritten)return {resumeText:rewritten,targetRole,jobDescription};

    const file=document.getElementById("resumeFile")?.files?.[0];
    if(file){
      try{
        const resumeText=await readAndCacheResume(file);
        return {resumeText,targetRole,jobDescription:""};
      }catch(error){
        console.warn("Resume file reference is no longer readable",error);
        throw new Error("Your browser lost access to the original resume file. Please choose the resume file again, then retry the full rewrite.");
      }
    }

    return {resumeText:"",targetRole,jobDescription};
  };

  const originalRenderAnalysis=window.renderAnalysis;
  if(typeof originalRenderAnalysis==="function"){
    window.renderAnalysis=function(analysis){
      try{return originalRenderAnalysis(analysis);}finally{
        const file=document.getElementById("resumeFile")?.files?.[0];
        if(file&&window.__activeResumeFileKey!==fileKey(file)){
          readAndCacheResume(file).catch(()=>{});
        }
      }
    };
  }

  window.addEventListener("unhandledrejection",event=>{
    const message=String(event?.reason?.message||event?.reason||"");
    if(/permission|could not be read|file.*reference/i.test(message)){
      console.warn("Recovered from a stale browser file reference",event.reason);
    }
  });
})();

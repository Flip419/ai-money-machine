(function(){
  var busy=false;
  var sourceResume="";
  var currentDraft="";

  function entitlement(){try{return typeof currentEntitlement!=="undefined"?currentEntitlement:(window.currentEntitlement||null);}catch(e){return window.currentEntitlement||null;}}
  function eligible(){var e=entitlement();return !!e&&!!e.active&&["pro","studio_premium"].indexOf(e.plan)>=0;}
  function textFrom(id){var el=document.getElementById(id);if(!el)return "";var value=typeof el.value==="string"?el.value:el.textContent;return (value||"").trim();}
  function latestText(){
    var ids=["rewriteOutput","fusionOutput","resumeText","targetResume","interviewResume"];
    for(var i=0;i<ids.length;i++){var value=textFrom(ids[i]);if(value.length>20)return value;}
    if(window.__aiResumeSource&&String(window.__aiResumeSource).trim().length>20)return String(window.__aiResumeSource).trim();
    return "";
  }
  function captureSource(text){text=String(text||"").trim();if(text.length>20){window.__aiResumeSource=text;sourceResume=text;currentDraft=text;showMessage("Resume ready. Enter an instruction below and click Improve With AI.");}}
  function ensureUi(){
    if(document.getElementById("aiResumeAssistant"))return;
    var host=document.getElementById("analysisResults")||document.getElementById("builder");
    if(!host)return;
    var box=document.createElement("section");box.id="aiResumeAssistant";box.className="card";
    box.innerHTML='<div class="section-head"><div><div class="eyebrow">AI RESUME ASSISTANT</div><h2>Tell AI how to improve your resume</h2><p class="muted">Ask for changes to wording, organization, emphasis, length, tone, or ATS readability. The original resume stays the factual source of truth.</p></div><span class="free-badge">TRUTH-GROUNDED</span></div><label>Your resume-improvement instruction<textarea id="aiResumeInstruction" class="large" maxlength="1200" placeholder="Example: Make my management experience stand out more and shorten the professional summary."></textarea></label><div class="ai-resume-suggestions"><button type="button" data-ai-prompt="Make the wording more professional and concise.">More professional</button><button type="button" data-ai-prompt="Emphasize my leadership and management experience without adding new facts.">Emphasize leadership</button><button type="button" data-ai-prompt="Improve ATS readability and keyword phrasing using only experience already supported by my resume.">Improve ATS wording</button><button type="button" data-ai-prompt="Shorten the resume while preserving the strongest supported experience.">Make it shorter</button></div><div class="ai-truth-note"><strong>Accuracy Protection:</strong> AI may improve presentation, but it must not invent employers, titles, dates, education, certifications, skills, accomplishments, responsibilities, metrics, or numbers.</div><button id="aiResumeApplyBtn" class="primary" type="button">Improve With AI</button><div id="aiResumeMessage" class="muted" aria-live="polite"></div><div id="aiResumeResult" class="rewrite-result hidden"><div class="rewrite-result-head"><div><div class="eyebrow">AI-REFINED RESUME</div><h3>Your revised resume</h3></div><button id="aiResumeCopyBtn" class="rewrite-copy" type="button">Copy Resume</button></div><pre id="aiResumeOutput" class="rewrite-output"></pre></div>';
    host.insertAdjacentElement("afterend",box);
    var style=document.createElement("style");style.textContent='.ai-resume-suggestions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}.ai-resume-suggestions button{border:1px solid #33435d;background:#08111f;color:#c9d4e5;border-radius:999px;padding:8px 11px;cursor:pointer;font-weight:700}.ai-resume-suggestions button:hover{border-color:#62e6a7;color:#62e6a7}.ai-truth-note{border:1px solid #2f6c55;background:#0a1d18;padding:12px 14px;border-radius:12px;margin:12px 0 16px;color:#cfe9dc}#aiResumeMessage{margin-top:10px}';document.head.appendChild(style);
  }
  function showMessage(text){var el=document.getElementById("aiResumeMessage");if(el)el.textContent=text||"";}
  async function readUploadedResume(){
    try{var input=document.getElementById("resumeFile");var file=input&&input.files&&input.files[0];if(file&&typeof extractResumeText==="function"){var text=await extractResumeText(file);captureSource(text);return text;}}catch(e){console.error("Could not read source resume",e);}return "";
  }
  async function findSource(){var text=latestText();if(text.length>20){captureSource(text);return text;}return await readUploadedResume();}
  async function applyPrompt(){
    if(busy)return;
    if(!eligible()){showMessage("AI Resume Assistant is available with Pro or Studio Premium.");return;}
    if(typeof supabaseClient==="undefined"||!supabaseClient||typeof currentUser==="undefined"||!currentUser){if(typeof showAuthModal==="function")showAuthModal("signin","Sign in to use the AI Resume Assistant.");return;}
    var instruction=(document.getElementById("aiResumeInstruction")||{}).value||"";instruction=instruction.trim();
    if(instruction.length<4){showMessage("Enter a resume-improvement instruction first.");return;}
    if(!sourceResume)await findSource();
    if(sourceResume.length<20){showMessage("Generate, paste, or upload a resume first so the assistant has a factual source to work from.");return;}
    var btn=document.getElementById("aiResumeApplyBtn");busy=true;if(btn){btn.disabled=true;btn.textContent="Improving resume...";}showMessage("Accuracy Protection is checking your request and improving the resume...");
    try{
      var result=await supabaseClient.functions.invoke("resume-prompt-assistant",{body:{sourceResume:sourceResume,currentDraft:currentDraft||sourceResume,instruction:instruction}});
      if(result.error)throw result.error;var data=result.data||{};
      if(!data.success){showMessage(data.message||"That request could not be applied.");return;}
      currentDraft=data.resume;var out=document.getElementById("aiResumeOutput");if(out)out.textContent=currentDraft;var resultBox=document.getElementById("aiResumeResult");if(resultBox)resultBox.classList.remove("hidden");showMessage("Done. The revision stayed grounded in the source resume.");
    }catch(e){console.error("AI Resume Assistant failed",e);showMessage((e&&e.message)||"The AI Resume Assistant could not complete that request.");}
    finally{busy=false;if(btn){btn.disabled=false;btn.textContent="Improve With AI";}}
  }
  document.addEventListener("click",function(event){var t=event.target;if(t&&t.matches&&t.matches("[data-ai-prompt]")){var input=document.getElementById("aiResumeInstruction");if(input)input.value=t.getAttribute("data-ai-prompt")||"";return;}if(t&&t.closest&&t.closest("#aiResumeApplyBtn")){event.preventDefault();applyPrompt();return;}if(t&&t.closest&&t.closest("#aiResumeCopyBtn")){event.preventDefault();var text=(document.getElementById("aiResumeOutput")||{}).textContent||"";if(!text)return;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).catch(function(){});}}});
  document.addEventListener("entitlement-updated",ensureUi);ensureUi();
})();
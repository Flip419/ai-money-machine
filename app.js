const SUPABASE_URL = "https://guvywdjhgsnufjwsrurq.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q423UjYkLcUQT6NBrSq5UQ_7jn4qiti";

const modeButtons = document.querySelectorAll(".start-card");
const panels = {
  upload: document.getElementById("uploadPanel"),
  scratch: document.getElementById("scratchPanel"),
  target: document.getElementById("targetPanel")
};
const results = document.getElementById("analysisResults");
const statusBox = document.getElementById("appStatus");
const resumeFile = document.getElementById("resumeFile");

modeButtons.forEach(btn => btn.addEventListener("click", () => {
  modeButtons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  Object.values(panels).forEach(p => p.classList.add("hidden"));
  panels[btn.dataset.mode].classList.remove("hidden");
  clearStatus();
}));

resumeFile.addEventListener("change", () => {
  const file = resumeFile.files[0];
  document.getElementById("fileName").textContent = file ? file.name : "No file selected";
  clearStatus();
});

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function setStatus(message, type = "info") {
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.className = `app-status ${type}`;
  statusBox.classList.remove("hidden");
}

function clearStatus() {
  if (!statusBox) return;
  statusBox.textContent = "";
  statusBox.className = "app-status hidden";
}

function setButtonLoading(button, loadingText) {
  button.dataset.originalText = button.dataset.originalText || button.textContent;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = loadingText;
}

function resetButton(button) {
  button.disabled = false;
  button.removeAttribute("aria-busy");
  button.textContent = button.dataset.originalText || button.textContent;
}

function populateList(elementId, items, fallback) {
  const list = document.getElementById(elementId);
  list.replaceChildren();
  const values = items.length ? items : [fallback];
  values.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

function parseListSection(analysis, startLabel, endLabel) {
  const pattern = new RegExp(`${startLabel}:\\s*([\\s\\S]*?)\\n\\s*${endLabel}:`, "i");
  const match = analysis.match(pattern);
  return match
    ? match[1]
        .split("\n")
        .map(line => line.replace(/^[-•]\s*/, "").trim())
        .filter(Boolean)
    : [];
}

function renderAnalysis(analysis) {
  const overall = analysis.match(/OVERALL SCORE:\s*(\d+)/i);
  const ats = analysis.match(/ATS READABILITY:\s*(\d+)/i);
  const keyword = analysis.match(/KEYWORD MATCH:\s*(\d+)/i);
  const impact = analysis.match(/IMPACT STRENGTH:\s*(\d+)/i);
  const strengths = parseListSection(analysis, "STRENGTHS", "IMPROVEMENTS");
  const improvements = parseListSection(analysis, "IMPROVEMENTS", "MISSING KEYWORDS");
  const keywords = parseListSection(analysis, "MISSING KEYWORDS", "TOP RECOMMENDATION");

  populateList("strengthsList", strengths, "No specific strengths were returned.");
  populateList("improvementsList", improvements, "No specific improvements were returned.");
  populateList("keywordsList", keywords, "No missing keywords were identified.");

  document.getElementById("scoreBadge").textContent = `${overall ? overall[1] : 0} / 100`;
  document.getElementById("atsScore").textContent = `${ats ? ats[1] : 0}%`;
  document.getElementById("keywordScore").textContent = `${keyword ? keyword[1] : 0}%`;
  document.getElementById("impactScore").textContent = `${impact ? impact[1] : 0}%`;

  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function requestAnalysis({ resumeText, targetRole = "", jobDescription = "" }) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY
    },
    body: JSON.stringify({ resumeText, targetRole, jobDescription })
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The AI service returned an unreadable response. Please try again.");
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || "The AI analysis request failed.");
  }

  return data;
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error("The PDF reader did not load. Refresh the page and try again.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map(item => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(text);
  }

  return pages.join("\n\n").trim();
}

async function extractDocxText(file) {
  if (!window.mammoth) {
    throw new Error("The Word document reader did not load. Refresh the page and try again.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return (result.value || "").trim();
}

async function extractResumeText(file) {
  const fileName = file.name.toLowerCase();

  if (file.type === "text/plain" || fileName.endsWith(".txt")) {
    return (await file.text()).trim();
  }

  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (fileName.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractDocxText(file);
  }

  if (fileName.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported yet. Save the resume as DOCX, PDF, or TXT and try again.");
  }

  throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT resume.");
}

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const role = document.getElementById("targetRole").value.trim();
  const file = resumeFile.files[0];
  const button = document.getElementById("analyzeBtn");

  if (!file) {
    setStatus("Choose a resume file first.", "error");
    return;
  }

  clearStatus();
  setButtonLoading(button, "Reading resume...");

  try {
    const resumeText = await extractResumeText(file);
    if (resumeText.length < 20) {
      throw new Error("The resume does not contain enough readable text to analyze. If this is a scanned PDF, export it with selectable text and try again.");
    }

    button.textContent = "Analyzing...";
    setStatus("Your resume is being analyzed. This usually takes only a few seconds.", "info");

    const data = await requestAnalysis({
      resumeText,
      targetRole: role,
      jobDescription: ""
    });

    renderAnalysis(data.analysis);
    setStatus("Analysis complete. Your resume snapshot is ready below.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not read or analyze the resume.", "error");
  } finally {
    resetButton(button);
  }
});

document.getElementById("scratchBtn").addEventListener("click", async () => {
  const title = document.getElementById("scratchTitle").value.trim();
  const years = document.getElementById("scratchYears").value;
  const skills = document.getElementById("scratchSkills").value.trim();
  const button = document.getElementById("scratchBtn");

  if (!title || !skills) {
    setStatus("Enter your current or most recent job title and strongest skills first.", "error");
    return;
  }

  clearStatus();
  setButtonLoading(button, "Building outline...");
  setStatus("Building your resume outline now.", "info");

  try {
    const data = await requestAnalysis({
      resumeText: `Job Title: ${title}\nYears of Experience: ${years}\nSkills: ${skills}`,
      targetRole: title,
      jobDescription: `Create a strong professional resume outline for a ${title} with ${years} of experience. Focus on these skills: ${skills}.`
    });

    let outlineBox = document.getElementById("resumeOutlineResult");
    if (!outlineBox) {
      outlineBox = document.createElement("div");
      outlineBox.id = "resumeOutlineResult";
      outlineBox.className = "resume-outline-result";
      document.getElementById("scratchBtn").insertAdjacentElement("afterend", outlineBox);
    }

    const cleanOutline = data.analysis
      .replace(/\*\*/g, "")
      .replace(/^###\s*/gm, "")
      .replace(/^##\s*/gm, "")
      .replace(/^#\s*/gm, "");

    outlineBox.textContent = cleanOutline;
    outlineBox.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus("Your resume outline is ready.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not build the resume outline.", "error");
  } finally {
    resetButton(button);
  }
});

document.getElementById("matchBtn").addEventListener("click", async () => {
  const job = document.getElementById("jobDescription").value.trim();
  const resume = document.getElementById("resumeText").value.trim();
  const button = document.getElementById("matchBtn");

  if (!job || !resume) {
    setStatus("Paste both the job description and your resume text first.", "error");
    return;
  }

  clearStatus();
  setButtonLoading(button, "Checking match...");
  setStatus("Comparing your resume with the target job now.", "info");

  try {
    const data = await requestAnalysis({
      resumeText: resume,
      targetRole: "",
      jobDescription: job
    });

    renderAnalysis(data.analysis);
    setStatus("Match analysis complete. Your results are ready below.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not complete the job match analysis.", "error");
  } finally {
    resetButton(button);
  }
});

const modal = document.getElementById("modal");
document.querySelectorAll(".buy").forEach(btn => btn.addEventListener("click", () => {
  document.getElementById("modalTitle").textContent = `${btn.dataset.plan} checkout is next`;
  modal.classList.remove("hidden");
}));
function hideModal() { modal.classList.add("hidden"); }
document.getElementById("closeModal").addEventListener("click", hideModal);
document.getElementById("modalOk").addEventListener("click", hideModal);
modal.addEventListener("click", e => { if (e.target === modal) hideModal(); });

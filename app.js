const form=document.getElementById("hustleForm");
const results=document.getElementById("results");
const resultGrid=document.getElementById("resultGrid");
const startOver=document.getElementById("startOver");

const ideas=[
 {name:"AI-Powered Resume & Job Application Service",tags:["writing","customer service","computers","ai","career"],model:"service",minBudget:0,automation:5,base:86,range:"$500–$5,000/mo",why:"Businesses and job seekers pay for outcomes, while AI can handle much of the drafting and customization.",steps:["Create 3 fixed-price packages","Build a simple intake form","Automate document generation","Market in local job groups and professional communities"]},
 {name:"Local Business Review & Reputation Service",tags:["customer service","sales","local","marketing","social media"],model:"local",minBudget:0,automation:4,base:83,range:"$750–$6,000/mo",why:"Small businesses care about reviews but often lack a consistent follow-up system.",steps:["Pick one local niche","Create an automated review-request workflow","Offer a monthly management package","Track review volume and response rate"]},
 {name:"Niche Digital Template Store",tags:["writing","design","computers","organization","ai"],model:"digital",minBudget:0,automation:5,base:80,range:"$200–$5,000+/mo",why:"Templates can be created once and sold repeatedly with automated checkout and delivery.",steps:["Choose one painful recurring task","Create 10–20 templates","List them in a storefront","Use short-form content to drive traffic"]},
 {name:"AI Content Engine for One Local Niche",tags:["social media","writing","marketing","ai","sales"],model:"service",minBudget:0,automation:5,base:82,range:"$1,000–$8,000/mo",why:"A narrow offer is easier to sell and automate than a generic marketing agency.",steps:["Choose one niche such as dentists or contractors","Create a monthly content package","Automate intake and drafts","Sell recurring subscriptions"]},
 {name:"Affiliate Deal & Price Alert Newsletter",tags:["shopping","gaming","cars","technology","writing"],model:"affiliate",minBudget:0,automation:5,base:75,range:"$100–$10,000+/mo",why:"A focused audience can generate recurring affiliate commissions without selling a product yourself.",steps:["Pick a narrow product category","Build an email list","Automate deal monitoring and alerts","Add affiliate links and measure conversions"]},
 {name:"AI Micro-SaaS for a Boring Business Task",tags:["computers","ai","software","sales"],model:"saas",minBudget:0,automation:5,base:88,range:"$500–$20,000+/mo",why:"Small businesses will pay recurring fees when software removes a repetitive task.",steps:["Interview 10 potential users","Find one repetitive task","Build the smallest useful workflow","Charge monthly before adding features"]},
 {name:"Marketplace Listing Optimization Service",tags:["sales","writing","shopping","cars","customer service"],model:"service",minBudget:0,automation:4,base:78,range:"$500–$4,000/mo",why:"Better titles, descriptions and pricing can improve seller outcomes and can be heavily AI-assisted.",steps:["Pick one marketplace and category","Create before/after examples","Offer per-listing and monthly packages","Automate intake and delivery"]},
 {name:"Local Lead-Generation Website",tags:["sales","writing","computers","local","marketing"],model:"local",minBudget:50,automation:5,base:87,range:"$1,000–$15,000+/mo",why:"A ranked or well-promoted niche site can generate leads that local businesses pay for.",steps:["Choose a high-value service","Build a focused landing page","Capture and qualify leads","Sell exclusive or shared leads to providers"]}
];

function norm(s){return s.toLowerCase().replace(/[^a-z0-9\s]/g," ")}
function scoreIdea(idea,profile){
 let score=idea.base;
 const text=norm(profile.skills+" "+profile.interests);
 idea.tags.forEach(t=>{if(text.includes(t)) score+=8});
 if(profile.model==="any"||profile.model===idea.model) score+=10;
 if(profile.budget>=idea.minBudget) score+=5; else score-=15;
 if(profile.lowTouch) score+=idea.automation*2;
 const goal=Number(profile.goal);
 if(goal>=5000 && /service|saas|local/.test(idea.model)) score+=8;
 if(Number(profile.time)<7 && idea.automation>=5) score+=7;
 return Math.min(99,Math.max(45,Math.round(score)));
}
form.addEventListener("submit",e=>{
 e.preventDefault();
 const profile={
  skills:document.getElementById("skills").value,
  interests:document.getElementById("interests").value,
  budget:Number(document.getElementById("budget").value),
  time:Number(document.getElementById("time").value),
  goal:Number(document.getElementById("goal").value),
  model:document.getElementById("model").value,
  lowTouch:document.getElementById("lowTouch").checked
 };
 const ranked=ideas.map(i=>({...i,score:scoreIdea(i,profile)})).sort((a,b)=>b.score-a.score).slice(0,5);
 resultGrid.innerHTML=ranked.map((i,n)=>`
  <article class="opportunity">
   <span class="score">MATCH #${n+1} • ${i.score}% FIT</span>
   <h3>${i.name}</h3>
   <p>${i.why}</p>
   <div class="metrics">
    <div class="metric"><small>Potential range</small><strong>${i.range}</strong></div>
    <div class="metric"><small>Automation</small><strong>${"★".repeat(i.automation)}${"☆".repeat(5-i.automation)}</strong></div>
    <div class="metric"><small>Startup</small><strong>${i.minBudget===0?"$0–low":"Low–moderate"}</strong></div>
   </div>
   <div class="launch"><strong>First moves:</strong><ul>${i.steps.map(s=>`<li>${s}</li>`).join("")}</ul></div>
  </article>`).join("");
 results.classList.remove("hidden");
 results.scrollIntoView({behavior:"smooth"});
});
startOver.addEventListener("click",()=>{results.classList.add("hidden");document.getElementById("finder").scrollIntoView({behavior:"smooth"})});
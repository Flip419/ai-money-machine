const form=document.getElementById('hustleForm'),results=document.getElementById('results'),grid=document.getElementById('resultGrid');
const ideas=[
['AI-Powered Resume & Job Application Service','service',0,5,'$500–$5,000/mo'],
['Local Business Review & Reputation Service','local',0,4,'$750–$6,000/mo'],
['Niche Digital Template Store','digital',0,5,'$200–$5,000+/mo'],
['AI Content Engine for One Local Niche','service',0,5,'$1,000–$8,000/mo'],
['Affiliate Deal & Price Alert Newsletter','affiliate',0,5,'$100–$10,000+/mo'],
['AI Micro-SaaS for a Boring Business Task','saas',0,5,'$500–$20,000+/mo'],
['Marketplace Listing Optimization Service','service',0,4,'$500–$4,000/mo'],
['Local Lead-Generation Website','local',50,5,'$1,000–$15,000+/mo']];
form.addEventListener('submit',e=>{e.preventDefault();const model=document.getElementById('model').value,budget=+document.getElementById('budget').value,auto=document.getElementById('lowTouch').checked;
const ranked=ideas.map((i,n)=>({i,score:75+(model==='any'||model===i[1]?10:0)+(budget>=i[2]?5:-10)+(auto?i[3]*2:0)-n})).sort((a,b)=>b.score-a.score).slice(0,5);
grid.innerHTML=ranked.map((x,n)=>`<article class="opportunity"><div class="score">MATCH #${n+1} • ${Math.min(99,x.score)}% FIT</div><h3>${x.i[0]}</h3><div class="metrics"><div class="metric">Potential<br><strong>${x.i[4]}</strong></div><div class="metric">Automation<br><strong>${'★'.repeat(x.i[3])}</strong></div><div class="metric">Startup<br><strong>${x.i[2]===0?'$0–low':'Low–moderate'}</strong></div></div><p>Use the free version to validate demand before spending heavily. The premium blueprint will later generate a personalized launch plan for this idea.</p></article>`).join('');
results.classList.remove('hidden');results.scrollIntoView({behavior:'smooth'});});
document.getElementById('startOver').onclick=()=>{results.classList.add('hidden');document.getElementById('finder').scrollIntoView({behavior:'smooth'})};
const modal=document.getElementById('modal');document.querySelectorAll('.buy').forEach(b=>b.onclick=()=>{document.getElementById('modalTitle').textContent=b.dataset.plan+' checkout is next';modal.classList.remove('hidden')});
document.getElementById('close').onclick=document.getElementById('ok').onclick=()=>modal.classList.add('hidden');
(function(){
  function injectReviewStyles(){
    if(document.getElementById('reviewStyles'))return;
    const style=document.createElement('style');
    style.id='reviewStyles';
    style.textContent=`
      .reviews-section{max-width:1040px;margin:0 auto 64px}.reviews-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:18px}.review-list,.review-form-card{background:#091422;border:1px solid #293b55;border-radius:12px;padding:20px}.review-list{display:grid;gap:12px}.review-card{border:1px solid #33435d;border-radius:10px;padding:14px;background:#0b1627}.review-stars{color:#ffd85a;letter-spacing:2px;font-size:18px}.review-name{font-weight:800;margin-top:6px}.review-text{margin:6px 0 0;color:#d7e1ee;line-height:1.5}.review-empty{color:#9fb0c5}.review-form-card textarea{min-height:120px}.review-form-card select,.review-form-card input,.review-form-card textarea{width:100%}.review-status{min-height:20px;margin-top:10px;font-size:13px}.review-status.success{color:#62e6a7}.review-status.error{color:#ff9c9c}@media(max-width:850px){.reviews-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function buildReviewSection(){
    if(document.getElementById('reviews'))return;
    injectReviewStyles();
    const section=document.createElement('section');
    section.id='reviews';
    section.className='card reviews-section';
    section.innerHTML=`
      <div class="section-head"><div><div class="eyebrow">CUSTOMER FEEDBACK</div><h2>Reviews</h2><p class="muted">See what users say about AI Resume Studio, or share your own experience.</p></div><span class="free-badge">REAL FEEDBACK</span></div>
      <div class="reviews-grid">
        <div class="review-list" id="reviewList"><div class="review-empty">No approved reviews yet. Be the first to share your experience.</div></div>
        <div class="review-form-card">
          <h3>Leave a review</h3>
          <p class="muted">Reviews are checked before they appear publicly. You must be signed in to submit one.</p>
          <label>Display name<input id="reviewName" maxlength="60" placeholder="First name or preferred display name"></label>
          <label>Rating<select id="reviewRating"><option value="5">5 — Excellent</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label>
          <label>Your review<textarea id="reviewText" maxlength="1200" placeholder="What did AI Resume Studio help you with?"></textarea></label>
          <button id="submitReviewBtn" class="primary" type="button">Submit Review</button>
          <div id="reviewStatus" class="review-status" aria-live="polite"></div>
        </div>
      </div>`;
    const account=document.getElementById('account');
    if(account)account.insertAdjacentElement('beforebegin',section);else document.querySelector('main')?.appendChild(section);
  }

  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

  async function loadReviews(){
    const list=document.getElementById('reviewList');
    if(!list||typeof supabaseClient==='undefined'||!supabaseClient)return;
    try{
      const {data,error}=await supabaseClient.from('customer_reviews').select('display_name,rating,review_text,created_at').eq('status','approved').order('created_at',{ascending:false}).limit(12);
      if(error)throw error;
      if(!data?.length){list.innerHTML='<div class="review-empty">No approved reviews yet. Be the first to share your experience.</div>';return;}
      list.innerHTML=data.map(r=>`<article class="review-card"><div class="review-stars" aria-label="${r.rating} out of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><div class="review-name">${escapeHtml(r.display_name)}</div><p class="review-text">${escapeHtml(r.review_text)}</p></article>`).join('');
    }catch(error){console.warn('Could not load reviews',error);}
  }

  async function submitReview(){
    const status=document.getElementById('reviewStatus');
    const btn=document.getElementById('submitReviewBtn');
    if(typeof supabaseClient==='undefined'||!supabaseClient||typeof currentUser==='undefined'||!currentUser){
      status.textContent='Please sign in before leaving a review.';status.className='review-status error';
      if(typeof showAuthModal==='function')showAuthModal('signin','Sign in to leave a review.');
      return;
    }
    const displayName=document.getElementById('reviewName').value.trim();
    const rating=Number(document.getElementById('reviewRating').value);
    const reviewText=document.getElementById('reviewText').value.trim();
    if(displayName.length<2||reviewText.length<10){status.textContent='Add a display name and at least 10 characters of review text.';status.className='review-status error';return;}
    const original=btn.textContent;btn.disabled=true;btn.textContent='Submitting...';
    try{
      const {error}=await supabaseClient.from('customer_reviews').insert({user_id:currentUser.id,display_name:displayName,rating,review_text:reviewText,status:'pending'});
      if(error)throw error;
      status.textContent='Thank you. Your review was submitted and will appear after approval.';status.className='review-status success';
      document.getElementById('reviewText').value='';
      if(typeof window.aiResumeStudioTrack==='function')window.aiResumeStudioTrack('review_submit');
    }catch(error){console.error('Review submission failed',error);status.textContent='Could not submit your review. Please try again.';status.className='review-status error';}
    finally{btn.disabled=false;btn.textContent=original;}
  }

  function start(){
    buildReviewSection();
    document.getElementById('submitReviewBtn')?.addEventListener('click',submitReview);
    let tries=0;
    const timer=setInterval(()=>{tries++;if(typeof supabaseClient!=='undefined'&&supabaseClient){clearInterval(timer);loadReviews();}else if(tries>40)clearInterval(timer);},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
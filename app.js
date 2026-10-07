const CONFIG = window.MOSTRA_CONFIG || {};
const API_URL = String(CONFIG.apiUrl || "").replace(/\/$/,"");
const HAS_SUPABASE = false;
let supabase = null;

const DEMO_PROJECTS = [
  {id:"demo-1",title:"Cidade Sustentável",class_name:"3º Ano",description:"Uma cidade pensada para cuidar das pessoas e do planeta.",image_url:null},
  {id:"demo-2",title:"Energia que Transforma",class_name:"4º Ano",description:"Uma maquete para descobrir diferentes formas de produzir energia.",image_url:null},
  {id:"demo-3",title:"O Futuro da Mobilidade",class_name:"5º Ano",description:"Ideias criativas para transformar a forma como nos movimentamos.",image_url:null}
];

const SUGGESTIONS = {
  1:["Parabéns pelo esforço","Continuem criando","Foi legal conhecer a ideia"],
  2:["Boa tentativa","Tem potencial","Parabéns pelo empenho"],
  3:["Bom trabalho","Ideia interessante","Gostei do projeto","Muito legal"],
  4:["Muito bom","Muito criativo","Bem feito","Ótima explicação"],
  5:["Incrível!","Adorei a ideia","Excelente trabalho","Muito criativo","Sensacional!"]
};
const RATING_LABELS={1:"Obrigado por compartilhar 💙",2:"Boa ideia! 🌱",3:"Gostei! 😊",4:"Adorei! ✨",5:"Incrível! 🌟"};

const $=s=>document.querySelector(s);
const screens={
  welcome:$("#welcome"),
  notices:$("#notices"),
  tutorial:$("#tutorial"),
  review:$("#review"),
  summary:$("#summary"),
  done:$("#done")
};

let projects=[],queue=[],index=0,rating=0,selectedSuggestions=[];
let projectImages=[],projectImageIndex=0;
let myReviews=new Map();
let editingFromSummary=false;
let transitionSplashRunning=false;

const STORAGE={
  visitor:"mostra_visitor_id",
  completed:"mostra_completed",
  intro:"mostra_intro_seen",
  queue:"mostra_visit_queue",
  current:"mostra_current_project"
};

function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

async function showTransitionSplash(message="",onMidpoint=null){
  const splash=$("#transitionSplash");
  const text=$("#transitionSplashText");
  if(!splash){
    if(typeof onMidpoint==="function")onMidpoint();
    return;
  }
  if(transitionSplashRunning)return;

  transitionSplashRunning=true;
  text.textContent=message;
  text.classList.toggle("hidden",!message);
  splash.classList.remove("is-leaving");
  splash.classList.add("is-active");
  splash.setAttribute("aria-hidden","false");
  document.body.classList.add("transition-lock");

  const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  await wait(reducedMotion?80:220);
  if(typeof onMidpoint==="function")onMidpoint();
  await wait(reducedMotion?80:210);
  splash.classList.add("is-leaving");
  await wait(reducedMotion?80:220);

  splash.classList.remove("is-active","is-leaving");
  splash.setAttribute("aria-hidden","true");
  document.body.classList.remove("transition-lock");
  transitionSplashRunning=false;
}

function show(name){
  Object.values(screens).forEach(screen=>screen?.classList.remove("screen--active"));
  screens[name]?.classList.add("screen--active");
  document.body.classList.toggle("review-mode",name==="review");
  document.body.classList.toggle("visit-mode",["notices","tutorial","review","summary"].includes(name));
  window.scrollTo({top:0,behavior:"instant"});
}

function shuffle(items){return [...items].sort(()=>Math.random()-.5)}

function visitorId(){
  let id=localStorage.getItem(STORAGE.visitor);
  if(!id){
    id=crypto.randomUUID();
    localStorage.setItem(STORAGE.visitor,id);
  }
  return id;
}

function completedIds(){
  try{return JSON.parse(localStorage.getItem(STORAGE.completed)||"[]")}
  catch{return[]}
}

function setCompletedIds(ids){
  localStorage.setItem(STORAGE.completed,JSON.stringify([...new Set(ids)]));
}

function markCompleted(id){
  const ids=new Set(completedIds());
  ids.add(id);
  setCompletedIds([...ids]);
}

function saveVisitState(){
  if(queue.length)localStorage.setItem(STORAGE.queue,JSON.stringify(queue.map(project=>project.id)));
  const current=queue[index];
  if(current)localStorage.setItem(STORAGE.current,current.id);
}

function clearVisitState({newVisitor=false}={}){
  [
    STORAGE.completed,
    STORAGE.intro,
    STORAGE.queue,
    STORAGE.current
  ].forEach(key=>localStorage.removeItem(key));

  if(newVisitor)localStorage.removeItem(STORAGE.visitor);
  myReviews=new Map();
  queue=[];
  index=0;
  rating=0;
  selectedSuggestions=[];
  editingFromSummary=false;
}

async function loadProjects(){
  if(!API_URL)throw new Error("API não configurada.");
  const response=await fetch(`${API_URL}/projects`);
  if(!response.ok)throw new Error("Não foi possível carregar os projetos.");
  const data=await response.json();
  return Array.isArray(data)?data:[];
}

async function loadMyReviews(){
  if(!API_URL)return [];
  const response=await fetch(`${API_URL}/reviews?visitor_id=${encodeURIComponent(visitorId())}`);
  if(!response.ok)throw new Error("Não foi possível recuperar seu progresso.");
  const data=await response.json();
  return Array.isArray(data)?data:[];
}

function syncReviewState(reviews){
  myReviews=new Map(reviews.map(review=>[review.project_id,review]));
  setCompletedIds([...myReviews.keys()]);
}

function buildQueue(){
  const byId=new Map(projects.map(project=>[project.id,project]));
  let saved=[];
  try{saved=JSON.parse(localStorage.getItem(STORAGE.queue)||"[]")}catch{}

  const ordered=[];
  const used=new Set();
  for(const id of Array.isArray(saved)?saved:[]){
    if(byId.has(id)&&!used.has(id)){
      ordered.push(byId.get(id));
      used.add(id);
    }
  }

  const missing=shuffle(projects.filter(project=>!used.has(project.id)));
  queue=[...ordered,...missing];
  localStorage.setItem(STORAGE.queue,JSON.stringify(queue.map(project=>project.id)));
}

async function refreshProjectQueue(){
  const latest=await loadProjects();
  if(!latest.length)return {added:0,pending:0};

  const currentIds=new Set(queue.map(project=>project.id));
  const latestMap=new Map(latest.map(project=>[project.id,project]));

  // Atualiza metadados/fotos de projetos já conhecidos.
  queue=queue
    .filter(project=>latestMap.has(project.id))
    .map(project=>latestMap.get(project.id));

  // Acrescenta projetos novos sem bagunçar a ordem já percorrida.
  const newProjects=shuffle(latest.filter(project=>!currentIds.has(project.id)));
  if(newProjects.length)queue.push(...newProjects);

  projects=latest;
  localStorage.setItem(STORAGE.queue,JSON.stringify(queue.map(project=>project.id)));

  const pending=queue.filter(project=>!myReviews.has(project.id)).length;
  return {added:newProjects.length,pending};
}

async function checkForNewProjects({announce=false}={}){
  try{
    const result=await refreshProjectQueue();
    if(result.added>0&&announce){
      const currentScreen=Object.entries(screens).find(([,el])=>el?.classList.contains("screen--active"))?.[0];
      if(["summary","done"].includes(currentScreen)){
        const next=firstPendingIndex(0);
        if(next>=0){
          index=next;
          await showTransitionSplash("Novo projeto disponível ✨",()=>{
            show("review");
            render();
          });
        }
      }
    }
    return result;
  }catch(error){
    console.warn("Não foi possível verificar novos projetos agora.",error);
    return {added:0,pending:0};
  }
}

function firstPendingIndex(start=0){
  if(!queue.length)return -1;
  for(let i=Math.max(0,start);i<queue.length;i++){
    if(!myReviews.has(queue[i].id))return i;
  }
  for(let i=0;i<Math.max(0,start);i++){
    if(!myReviews.has(queue[i].id))return i;
  }
  return -1;
}

function resumeIndex(){
  const currentId=localStorage.getItem(STORAGE.current);
  if(currentId&&!myReviews.has(currentId)){
    const savedIndex=queue.findIndex(project=>project.id===currentId);
    if(savedIndex>=0)return savedIndex;
  }
  return firstPendingIndex(0);
}

async function prepareVisit(){
  projects=await loadProjects();
  if(!projects.length)throw new Error("Nenhum projeto cadastrado ainda.");
  const reviews=await loadMyReviews();
  syncReviewState(reviews);
  buildQueue();
  index=resumeIndex();
}

function resetRating(){
  rating=0;
  selectedSuggestions=[];
  $("#comment").value="";
  $("#charCount").textContent="0/240";
  document.querySelectorAll("#stars button").forEach(button=>button.classList.remove("active"));
  $("#ratingLabel").textContent="Escolha de 1 a 5 estrelas";
  $("#suggestionsWrap").classList.add("hidden");
  $("#suggestions").innerHTML="";
  $("#submitBtn").disabled=true;
}

function renderProjectPhoto(title=""){
  const img=$("#projectPhoto");
  const ph=$("#projectPlaceholder");
  const prev=$("#projectPhotoPrev");
  const next=$("#projectPhotoNext");
  const dots=$("#projectPhotoDots");
  const count=$("#projectPhotoCount");

  if(!projectImages.length){
    img.removeAttribute("src");
    img.style.display="none";
    ph.style.display="block";
    prev.classList.add("hidden");
    next.classList.add("hidden");
    dots.classList.add("hidden");
    count.classList.add("hidden");
    dots.innerHTML="";
    return;
  }

  projectImageIndex=Math.max(0,Math.min(projectImageIndex,projectImages.length-1));
  img.src=projectImages[projectImageIndex];
  img.alt=`Foto ${projectImageIndex+1} do projeto ${title}`;
  img.style.display="block";
  ph.style.display="none";

  const multiple=projectImages.length>1;
  prev.classList.toggle("hidden",!multiple);
  next.classList.toggle("hidden",!multiple);
  dots.classList.toggle("hidden",!multiple);
  count.classList.toggle("hidden",!multiple);
  count.textContent=`${projectImageIndex+1}/${projectImages.length}`;
  dots.innerHTML="";

  if(multiple){
    projectImages.forEach((_,i)=>{
      const dot=document.createElement("button");
      dot.type="button";
      dot.className="project-photo-dot";
      dot.classList.toggle("active",i===projectImageIndex);
      dot.setAttribute("aria-label",`Ver foto ${i+1}`);
      dot.onclick=()=>{
        projectImageIndex=i;
        renderProjectPhoto(title);
      };
      dots.appendChild(dot);
    });
  }
}

function changeProjectPhoto(direction){
  if(projectImages.length<2)return;
  projectImageIndex=(projectImageIndex+direction+projectImages.length)%projectImages.length;
  renderProjectPhoto(queue[index]?.title||"");
}

function renderSuggestionSelection(){
  document.querySelectorAll("#suggestions .chip").forEach(chip=>
    chip.classList.toggle("selected",selectedSuggestions.includes(chip.textContent))
  );
}

function setRating(value){
  const ratingChanged=rating!==value;
  rating=value;
  if(ratingChanged) selectedSuggestions=[];

  document.querySelectorAll("#stars button").forEach(button=>
    button.classList.toggle("active",Number(button.dataset.value)<=value)
  );
  $("#ratingLabel").textContent=RATING_LABELS[value];
  $("#suggestionsWrap").classList.remove("hidden");
  $("#suggestions").innerHTML="";

  SUGGESTIONS[value].forEach(text=>{
    const button=document.createElement("button");
    button.className="chip";
    button.type="button";
    button.textContent=text;
    button.onclick=()=>{
      if(selectedSuggestions.includes(text)){
        selectedSuggestions=selectedSuggestions.filter(item=>item!==text);
      }else{
        selectedSuggestions=[...selectedSuggestions,text];
      }
      renderSuggestionSelection();
    };
    $("#suggestions").appendChild(button);
  });

  renderSuggestionSelection();
  $("#submitBtn").disabled=false;
}

function parseSavedSuggestions(value){
  if(!value)return [];
  if(Array.isArray(value))return value.filter(Boolean);
  return String(value)
    .split(" • ")
    .map(item=>item.trim())
    .filter(Boolean);
}

function applyExistingReview(review){
  if(!review)return;
  setRating(Number(review.stars));
  selectedSuggestions=parseSavedSuggestions(review.suggestion);
  renderSuggestionSelection();
  $("#comment").value=review.comment||"";
  $("#charCount").textContent=`${$("#comment").value.length}/240`;
}

function render(){
  if(index<0||index>=queue.length){
    showReviewSummary();
    return;
  }

  resetRating();
  const project=queue[index];
  const completedCount=myReviews.size;
  const pct=Math.round((completedCount/Math.max(1,queue.length))*100);

  $("#progressText").textContent=`Projeto ${index+1} de ${queue.length}`;
  $("#progressPct").textContent=`${pct}%`;
  $("#progressBar").style.width=`${pct}%`;
  $("#projectTitle").textContent=project.title;
  $("#projectDescription").textContent=project.description||"Conheça esta ideia e deixe sua avaliação.";
  $("#projectClass").textContent=project.class_name||"Mostra Pedagógica";
  $("#reviewBackBtn").classList.toggle("hidden",index<=0);

  projectImages=Array.isArray(project.image_urls)&&project.image_urls.length
    ? project.image_urls.filter(Boolean)
    : (project.image_url?[project.image_url]:[]);
  projectImageIndex=0;
  renderProjectPhoto(project.title);

  const existing=myReviews.get(project.id);
  applyExistingReview(existing);
  $("#submitBtn").textContent=existing?"Salvar e continuar →":"Avaliar e ver próxima →";
  saveVisitState();
}

async function submitReview(){
  if(!rating)return;
  const project=queue[index];
  if(!project)return;

  const payload={
    project_id:project.id,
    visitor_id:visitorId(),
    stars:rating,
    suggestion:selectedSuggestions.length?selectedSuggestions.join(" • "):null,
    comment:$("#comment").value.trim()||null
  };

  $("#submitBtn").disabled=true;
  $("#submitBtn").textContent="Salvando...";

  try{
    const response=await fetch(`${API_URL}/reviews`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error("Falha ao salvar avaliação");

    myReviews.set(project.id,{
      ...(myReviews.get(project.id)||{}),
      ...payload,
      project_title:project.title,
      project_class:project.class_name,
      created_at:new Date().toISOString()
    });
    markCompleted(project.id);

    if(editingFromSummary){
      editingFromSummary=false;
      await showTransitionSplash("Alteração salva ✓",()=>showReviewSummary());
      return;
    }

    await refreshProjectQueue().catch(error=>
      console.warn("Falha ao atualizar projetos antes de continuar.",error)
    );

    const next=firstPendingIndex(index+1);
    if(next===-1){
      await finish();
      return;
    }

    index=next;
    render();
  }catch(error){
    console.error(error);
    alert("Não foi possível enviar agora. Tente novamente.");
    $("#submitBtn").disabled=false;
    $("#submitBtn").textContent=myReviews.has(project.id)?"Salvar e continuar →":"Avaliar e ver próxima →";
  }
}

function renderFamilyReviewGrid(){
  const grid=$("#familyReviewGrid");
  grid.innerHTML="";

  const ordered=queue.length?queue:projects;
  ordered.forEach(project=>{
    const review=myReviews.get(project.id);
    if(!review)return;

    const card=document.createElement("button");
    card.type="button";
    card.className="family-review-item";

    const photoWrap=document.createElement("div");
    photoWrap.className="family-review-photo-wrap";

    const photoFrame=document.createElement("div");
    photoFrame.className="family-review-photo-frame";

    const images=Array.isArray(project.image_urls)&&project.image_urls.length
      ? project.image_urls.filter(Boolean)
      : (project.image_url?[project.image_url]:[]);

    if(images.length){
      const img=document.createElement("img");
      img.className="family-review-photo";
      img.src=images[0];
      img.alt=`Miniatura do projeto ${project.title}`;
      photoFrame.appendChild(img);

      if(images.length>1){
        const more=document.createElement("span");
        more.className="family-review-photo-more";
        more.textContent=`+${images.length-1}`;
        photoFrame.appendChild(more);
      }
    }else{
      const placeholder=document.createElement("div");
      placeholder.className="family-review-photo-placeholder";
      placeholder.textContent="💡";
      photoFrame.appendChild(placeholder);
    }

    photoWrap.appendChild(photoFrame);

    const title=document.createElement("strong");
    title.textContent=project.title;

    const stars=document.createElement("span");
    stars.className="family-review-stars";
    stars.textContent=`${review.stars} ★`;

    const edit=document.createElement("small");
    edit.className="family-review-edit";
    edit.innerHTML=`
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20l4.2-1 9.9-9.9a2.1 2.1 0 0 0 0-3L17.9 6a2.1 2.1 0 0 0-3 0L5 15.9 4 20Z"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="m13.8 7.1 3.1 3.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <span>Toque para editar</span>
    `;

    card.append(photoWrap,title,stars,edit);

    card.onclick=()=>{
      const projectIndex=queue.findIndex(item=>item.id===project.id);
      if(projectIndex<0)return;
      editingFromSummary=true;
      index=projectIndex;
      show("review");
      render();
    };

    grid.appendChild(card);
  });
}

function showReviewSummary(){
  editingFromSummary=false;
  renderFamilyReviewGrid();
  show("summary");
}

async function finish(){
  $("#progressBar").style.width="100%";
  localStorage.removeItem(STORAGE.current);

  try{
    const result=await refreshProjectQueue();
    const next=firstPendingIndex(0);

    if(result.added>0&&next>=0){
      index=next;
      await showTransitionSplash("Novo projeto disponível ✨",()=>{
        show("review");
        render();
      });
      return;
    }
  }catch(error){
    console.warn("Não foi possível conferir novos projetos antes da revisão.",error);
  }

  await showTransitionSplash("Hora de conferir 💙",()=>showReviewSummary());
}

async function startOrResumeVisit(){
  try{
    await prepareVisit();

    if(myReviews.size>=projects.length){
      await showTransitionSplash("Suas avaliações ✨",()=>showReviewSummary());
      return;
    }

    if(index<0)index=firstPendingIndex(0);
    await showTransitionSplash(myReviews.size?"Continuando sua visita 💙":"Vamos começar ✨",()=>{
      show("review");
      render();
    });
  }catch(error){
    console.error(error);
    alert(error.message==="Nenhum projeto cadastrado ainda."
      ? error.message
      : "Não foi possível carregar os projetos agora.");
  }
}

$("#startBtn").onclick=async()=>{
  const button=$("#startBtn");
  button.disabled=true;
  button.textContent="Preparando...";

  try{
    visitorId();
    const introSeen=localStorage.getItem(STORAGE.intro)==="1";
    if(!introSeen){
      await showTransitionSplash("Antes de começar 💙",()=>show("notices"));
    }else{
      await startOrResumeVisit();
    }
  }finally{
    button.disabled=false;
    button.textContent=completedIds().length?"Continuar visita →":"Começar a visita →";
  }
};

$("#noticesNextBtn").onclick=async()=>{
  await showTransitionSplash("Como funciona ✨",()=>show("tutorial"));
};

$("#tutorialStartBtn").onclick=async()=>{
  localStorage.setItem(STORAGE.intro,"1");
  await startOrResumeVisit();
};

$("#reviewBackBtn").onclick=()=>{
  if(index<=0)return;
  index--;
  editingFromSummary=false;
  render();
};

$("#finishVisitBtn").onclick=async()=>{
  const result=await checkForNewProjects();
  const next=firstPendingIndex(0);

  if(result.added>0&&next>=0){
    index=next;
    await showTransitionSplash("Novo projeto disponível ✨",()=>{
      show("review");
      render();
    });
    return;
  }

  $("#doneCount").textContent=`${myReviews.size} avaliações enviadas 💙`;
  await showTransitionSplash("Obrigado por participar 💙",()=>show("done"));
};

$("#restartBtn").onclick=async()=>{
  if(!projects.length){
    try{
      projects=await loadProjects();
      syncReviewState(await loadMyReviews());
      buildQueue();
    }catch(error){
      alert("Não foi possível recuperar suas avaliações agora.");
      return;
    }
  }
  await showTransitionSplash("Suas avaliações ✨",()=>showReviewSummary());
};

const reviewTutorialModal=$("#reviewTutorialModal");

function openReviewTutorialModal(){
  reviewTutorialModal.classList.add("open");
  reviewTutorialModal.setAttribute("aria-hidden","false");
  document.body.classList.add("review-tutorial-open");
}

function closeReviewTutorialModal(){
  reviewTutorialModal.classList.remove("open");
  reviewTutorialModal.setAttribute("aria-hidden","true");
  document.body.classList.remove("review-tutorial-open");
}

$("#reviewHelpBtn")?.addEventListener("click",openReviewTutorialModal);
$("#reviewTutorialBackBtn")?.addEventListener("click",closeReviewTutorialModal);
document.querySelectorAll("[data-close-review-tutorial]").forEach(element=>
  element.addEventListener("click",closeReviewTutorialModal)
);

const newVisitModal=$("#newVisitModal");

function openNewVisitModal(){
  newVisitModal.classList.add("open");
  newVisitModal.setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
}

function closeNewVisitModal(){
  newVisitModal.classList.remove("open");
  newVisitModal.setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
}

$("#newVisitBtn").onclick=openNewVisitModal;

document.querySelectorAll("[data-close-new-visit]").forEach(element=>
  element.addEventListener("click",closeNewVisitModal)
);

$("#confirmNewVisitBtn").onclick=async()=>{
  closeNewVisitModal();
  clearVisitState({newVisitor:true});
  await showTransitionSplash("Nova visita ✨",()=>show("welcome"));
  $("#startBtn").textContent="Começar a visita →";
};

document.querySelectorAll("#stars button").forEach(button=>
  button.onclick=()=>setRating(Number(button.dataset.value))
);
$("#comment").addEventListener("input",event=>
  $("#charCount").textContent=`${event.target.value.length}/240`
);
$("#submitBtn").onclick=submitReview;

if(completedIds().length){
  $("#startBtn").textContent="Continuar visita →";
}

const NEW_PROJECT_CHECK_INTERVAL=90000;
let newProjectCheckTimer=null;

function startNewProjectWatch(){
  if(newProjectCheckTimer)return;
  newProjectCheckTimer=setInterval(()=>{
    if(document.visibilityState==="visible"){
      checkForNewProjects({announce:true});
    }
  },NEW_PROJECT_CHECK_INTERVAL);
}

window.addEventListener("focus",()=>{
  checkForNewProjects({announce:true});
});

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"){
    checkForNewProjects({announce:true});
  }
});

startNewProjectWatch();

const teacherAccessBtn = document.querySelector("#teacherAccessBtn");
const loginModal = document.querySelector("#loginModal");
const staffLoginForm = document.querySelector("#staffLoginForm");
const loginError = document.querySelector("#loginError");

function openLoginModal(){
  loginModal.classList.add("open");
  loginModal.setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
  setTimeout(()=>document.querySelector("#staffUser")?.focus(),50);
}
function closeLoginModal(){
  loginModal.classList.remove("open");
  loginModal.setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
  loginError.textContent="";
}
teacherAccessBtn?.addEventListener("click",openLoginModal);
document.querySelectorAll("[data-close-login]").forEach(el=>el.addEventListener("click",closeLoginModal));
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  if(loginModal?.classList.contains("open"))closeLoginModal();
  if(newVisitModal?.classList.contains("open"))closeNewVisitModal();
  if(reviewTutorialModal?.classList.contains("open"))closeReviewTutorialModal();
});

staffLoginForm?.addEventListener("submit",async e=>{
  e.preventDefault();
  const username=document.querySelector("#staffUser").value.trim().toLowerCase();
  const password=document.querySelector("#staffPassword").value;
  const submit=staffLoginForm.querySelector('button[type="submit"]');

  loginError.textContent="";
  submit.disabled=true;
  submit.textContent="Entrando...";

  try{
    const response=await fetch(`${API_URL}/login`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username,password})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok || !data.ok) throw new Error(data.error||"Usuário ou senha incorretos.");

    sessionStorage.setItem("mostra_staff_user",JSON.stringify({
      username:data.username,
      role:data.role
    }));
    window.location.href="./admin.html";
  }catch(error){
    loginError.textContent=error.message||"Não foi possível entrar.";
    submit.disabled=false;
    submit.textContent="Entrar";
  }
});


$("#projectPhotoPrev").onclick=()=>changeProjectPhoto(-1);
$("#projectPhotoNext").onclick=()=>changeProjectPhoto(1);

let projectPhotoTouchStartX=0;
const projectPhotoWrap=$("#projectPhotoWrap");
projectPhotoWrap?.addEventListener("touchstart",event=>{
  if(event.touches.length===1) projectPhotoTouchStartX=event.touches[0].clientX;
},{passive:true});
projectPhotoWrap?.addEventListener("touchend",event=>{
  if(!projectPhotoTouchStartX||!event.changedTouches.length)return;
  const delta=event.changedTouches[0].clientX-projectPhotoTouchStartX;
  projectPhotoTouchStartX=0;
  if(Math.abs(delta)<45)return;
  changeProjectPhoto(delta>0?-1:1);
},{passive:true});

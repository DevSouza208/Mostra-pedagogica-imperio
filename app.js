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
const screens={welcome:$("#welcome"),review:$("#review"),done:$("#done")};
let projects=[], queue=[], index=0, rating=0, selectedSuggestion="";
let projectImages=[], projectImageIndex=0;

function show(name){
  Object.values(screens).forEach(s=>s.classList.remove("screen--active"));
  screens[name].classList.add("screen--active");
  document.body.classList.toggle("review-mode",name==="review");
}
function shuffle(items){return [...items].sort(()=>Math.random()-.5)}
function visitorId(){
  let id=localStorage.getItem("mostra_visitor_id");
  if(!id){id=crypto.randomUUID();localStorage.setItem("mostra_visitor_id",id)}
  return id;
}
function completedIds(){try{return JSON.parse(localStorage.getItem("mostra_completed")||"[]")}catch{return[]}}
function markCompleted(id){
  const ids=new Set(completedIds());ids.add(id);
  localStorage.setItem("mostra_completed",JSON.stringify([...ids]));
}
async function loadProjects(){
  if(!API_URL) throw new Error("API não configurada.");

  const response=await fetch(`${API_URL}/projects`);
  if(!response.ok) throw new Error("Não foi possível carregar os projetos.");

  const data=await response.json();
  return Array.isArray(data)?data:[];
}
function resetRating(){
  rating=0;selectedSuggestion="";$("#comment").value="";$("#charCount").textContent="0/240";
  document.querySelectorAll("#stars button").forEach(b=>b.classList.remove("active"));
  $("#ratingLabel").textContent="Escolha de 1 a 5 estrelas";
  $("#suggestionsWrap").classList.add("hidden");$("#suggestions").innerHTML="";
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
  const current=queue[index];
  renderProjectPhoto(current?.title||"");
}
function render(){
  if(index>=queue.length){finish();return}
  resetRating();
  const p=queue[index], pct=Math.round((index/queue.length)*100);
  $("#progressText").textContent=`Projeto ${index+1} de ${queue.length}`;
  $("#progressPct").textContent=`${pct}%`;
  $("#progressBar").style.width=`${pct}%`;
  $("#projectTitle").textContent=p.title;
  $("#projectDescription").textContent=p.description||"Conheça esta ideia e deixe sua avaliação.";
  $("#projectClass").textContent=p.class_name||"Mostra Pedagógica";
  projectImages=Array.isArray(p.image_urls)&&p.image_urls.length
    ? p.image_urls.filter(Boolean)
    : (p.image_url?[p.image_url]:[]);
  projectImageIndex=0;
  renderProjectPhoto(p.title);
}
function setRating(value){
  rating=value;
  document.querySelectorAll("#stars button").forEach(b=>b.classList.toggle("active",Number(b.dataset.value)<=value));
  $("#ratingLabel").textContent=RATING_LABELS[value];
  $("#suggestionsWrap").classList.remove("hidden");
  $("#suggestions").innerHTML="";
  SUGGESTIONS[value].forEach(text=>{
    const b=document.createElement("button");b.className="chip";b.textContent=text;
    b.onclick=()=>{selectedSuggestion=selectedSuggestion===text?"":text;document.querySelectorAll(".chip").forEach(c=>c.classList.toggle("selected",c.textContent===selectedSuggestion))};
    $("#suggestions").appendChild(b);
  });
  $("#submitBtn").disabled=false;
}
async function submitReview(){
  if(!rating)return;
  const project=queue[index];
  const payload={
    project_id:project.id,
    visitor_id:visitorId(),
    stars:rating,
    suggestion:selectedSuggestion||null,
    comment:$("#comment").value.trim()||null
  };
  $("#submitBtn").disabled=true;$("#submitBtn").textContent="Enviando...";
  if(API_URL){
    try{
      const response=await fetch(`${API_URL}/reviews`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      if(!response.ok) throw new Error("Falha ao salvar avaliação");
    }catch(error){
      alert("Não foi possível enviar agora. Tente novamente.");
      $("#submitBtn").disabled=false;
      $("#submitBtn").textContent="Avaliar e ver próxima →";
      return;
    }
  }else{
    const reviews=JSON.parse(localStorage.getItem("mostra_reviews")||"[]");
    reviews.push({...payload,id:crypto.randomUUID(),created_at:new Date().toISOString()});
    localStorage.setItem("mostra_reviews",JSON.stringify(reviews));
  }
  markCompleted(project.id); index++; $("#submitBtn").textContent="Avaliar e ver próxima →";render();
}
function finish(){
  $("#progressBar").style.width="100%";
  $("#doneCount").textContent=`${queue.length} projetos conhecidos 💙`;
  show("done");
}
$("#startBtn").onclick=async()=>{
  const startBtn=$("#startBtn");
  startBtn.disabled=true;
  startBtn.textContent="Carregando...";

  try{
    projects=await loadProjects();

    if(!projects.length){
      alert("Nenhum projeto cadastrado ainda.");
      return;
    }

    const done=new Set(completedIds());
    const pending=projects.filter(p=>!done.has(p.id));
    queue=shuffle(pending.length?pending:projects);
    index=0;
    show("review");
    render();
  }catch(error){
    console.error(error);
    alert("Não foi possível carregar os projetos agora.");
  }finally{
    startBtn.disabled=false;
    startBtn.textContent="Começar a visita →";
  }
};
$("#restartBtn").onclick=()=>{localStorage.removeItem("mostra_completed");show("welcome")};
document.querySelectorAll("#stars button").forEach(b=>b.onclick=()=>setRating(Number(b.dataset.value)));
$("#comment").addEventListener("input",e=>$("#charCount").textContent=`${e.target.value.length}/240`);
$("#submitBtn").onclick=submitReview;

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
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&loginModal?.classList.contains("open"))closeLoginModal()});

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

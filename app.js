const CONFIG = window.MOSTRA_CONFIG || {};
const HAS_SUPABASE = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

let supabase = null;
if (HAS_SUPABASE) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
}

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

function show(name){Object.values(screens).forEach(s=>s.classList.remove("screen--active"));screens[name].classList.add("screen--active")}
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
  if(HAS_SUPABASE){
    const {data,error}=await supabase.from("projects").select("*").eq("active",true).order("created_at");
    if(!error && data?.length) return data;
  }
  const local=JSON.parse(localStorage.getItem("mostra_projects")||"[]");
  return local.length?local:DEMO_PROJECTS;
}
function resetRating(){
  rating=0;selectedSuggestion="";$("#comment").value="";$("#charCount").textContent="0/240";
  document.querySelectorAll("#stars button").forEach(b=>b.classList.remove("active"));
  $("#ratingLabel").textContent="Escolha de 1 a 5 estrelas";
  $("#suggestionsWrap").classList.add("hidden");$("#suggestions").innerHTML="";
  $("#submitBtn").disabled=true;
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
  const img=$("#projectPhoto"), ph=$("#projectPlaceholder");
  if(p.image_url){img.src=p.image_url;img.alt=`Foto do projeto ${p.title}`;img.style.display="block";ph.style.display="none"}
  else{img.removeAttribute("src");img.style.display="none";ph.style.display="block"}
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
  if(HAS_SUPABASE){
    const {error}=await supabase.from("reviews").insert(payload);
    if(error){alert("Não foi possível enviar agora. Tente novamente.");$("#submitBtn").disabled=false;$("#submitBtn").textContent="Avaliar e ver próxima →";return}
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
  projects=await loadProjects();
  const done=new Set(completedIds());
  const pending=projects.filter(p=>!done.has(p.id));
  queue=shuffle(pending.length?pending:projects);
  index=0;show("review");render();
};
$("#restartBtn").onclick=()=>{localStorage.removeItem("mostra_completed");show("welcome")};
document.querySelectorAll("#stars button").forEach(b=>b.onclick=()=>setRating(Number(b.dataset.value)));
$("#comment").addEventListener("input",e=>$("#charCount").textContent=`${e.target.value.length}/240`);
$("#submitBtn").onclick=submitReview;

const STAFF_USERS = {
  prof: { password: "prof2026", role: "Professor" },
  admin: { password: "7334", role: "Administrador" },
  moderador: { password: "mod2026", role: "Moderador" }
};

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

staffLoginForm?.addEventListener("submit",e=>{
  e.preventDefault();
  const username=document.querySelector("#staffUser").value.trim().toLowerCase();
  const password=document.querySelector("#staffPassword").value;
  const account=STAFF_USERS[username];

  if(!account || account.password!==password){
    loginError.textContent="Usuário ou senha incorretos.";
    return;
  }

  sessionStorage.setItem("mostra_staff_session",JSON.stringify({
    username,
    role:account.role,
    loggedAt:Date.now()
  }));
  window.location.href="./admin.html";
});

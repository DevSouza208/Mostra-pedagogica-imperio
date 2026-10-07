const CONFIG=window.MOSTRA_CONFIG||{};
const API_URL=String(CONFIG.apiUrl||"").replace(/\/$/,"");
const HAS_SUPABASE=false;
let supabase=null;

let staffSession=null;
try{staffSession=JSON.parse(sessionStorage.getItem("mostra_staff_user")||"null")}catch{}
if(!staffSession?.username){
  window.location.replace("./");
  throw new Error("Sessão de equipe ausente.");
}

const $=s=>document.querySelector(s);
$("#staffBadge").textContent=`${staffSession.role} · ${staffSession.username}`;
$("#logoutBtn").onclick=()=>{
  sessionStorage.removeItem("mostra_staff_user");
  window.location.replace("./");
};

$("#modeNote").textContent="Cloudflare conectado: acesso validado pela tabela D1.";

let selectedPhotoFile=null;

const cameraInput=$("#cameraInput");
const uploadInput=$("#uploadInput");
const photoPreviewWrap=$("#photoPreviewWrap");
const photoPreview=$("#photoPreview");
const photoFileName=$("#photoFileName");

function setSelectedPhoto(file){
  selectedPhotoFile=file||null;
  if(!selectedPhotoFile){
    photoPreview.removeAttribute("src");
    photoPreviewWrap.classList.add("hidden");
    photoFileName.textContent="Imagem selecionada";
    cameraInput.value="";
    uploadInput.value="";
    return;
  }
  const url=URL.createObjectURL(selectedPhotoFile);
  photoPreview.src=url;
  photoFileName.textContent=selectedPhotoFile.name||"Foto da maquete";
  photoPreviewWrap.classList.remove("hidden");
}
$("#cameraBtn").onclick=()=>cameraInput.click();
$("#uploadBtn").onclick=()=>uploadInput.click();
cameraInput.onchange=e=>setSelectedPhoto(e.target.files?.[0]);
uploadInput.onchange=e=>setSelectedPhoto(e.target.files?.[0]);
$("#removePhotoBtn").onclick=()=>setSelectedPhoto(null);

async function fileToDataUrl(file){
  if(!file)return null;
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
}
async function load(){
  if(HAS_SUPABASE){
    const {data}=await supabase.from("projects").select("*").order("created_at",{ascending:false});
    render(data||[]);return;
  }
  render(JSON.parse(localStorage.getItem("mostra_projects")||"[]"));
}
function render(items){
  const list=$("#projectList");list.innerHTML="";
  if(!items.length){list.innerHTML='<p style="color:#7d909d">Nenhum projeto cadastrado ainda.</p>';return}
  items.forEach(p=>{
    const el=document.createElement("div");el.className="admin-item";
    el.innerHTML=`${p.image_url?`<img class="admin-thumb" src="${p.image_url}" alt="">`:'<div class="admin-thumb" style="display:grid;place-items:center;font-size:1.6rem">💡</div>'}
      <div class="admin-meta"><strong></strong><span></span></div><button class="danger-btn">Excluir</button>`;
    el.querySelector("strong").textContent=p.title;el.querySelector("span").textContent=p.class_name||"Sem turma";
    el.querySelector("button").onclick=()=>remove(p.id,p.image_path);
    list.appendChild(el);
  });
}
async function remove(id,imagePath){
  if(!confirm("Excluir este projeto?"))return;
  if(HAS_SUPABASE){
    if(imagePath) await supabase.storage.from("project-images").remove([imagePath]);
    await supabase.from("projects").delete().eq("id",id);
  }else{
    const items=JSON.parse(localStorage.getItem("mostra_projects")||"[]").filter(p=>p.id!==id);
    localStorage.setItem("mostra_projects",JSON.stringify(items));
  }
  load();
}
$("#projectForm").onsubmit=async e=>{
  e.preventDefault();
  const btn=e.submitter;btn.disabled=true;btn.textContent="Salvando...";
  const file=selectedPhotoFile;
  let image_url=null,image_path=null;
  if(HAS_SUPABASE&&file){
    image_path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const {error}=await supabase.storage.from("project-images").upload(image_path,file,{upsert:false});
    if(error){alert("Erro no upload da imagem.");btn.disabled=false;btn.textContent="Cadastrar projeto";return}
    image_url=supabase.storage.from("project-images").getPublicUrl(image_path).data.publicUrl;
  }else if(file){image_url=await fileToDataUrl(file)}
  const project={id:crypto.randomUUID(),title:$("#title").value.trim(),class_name:$("#className").value.trim(),description:$("#description").value.trim(),image_url,image_path,active:true,created_at:new Date().toISOString()};
  if(HAS_SUPABASE){
    const {id,...dbProject}=project;
    const {error}=await supabase.from("projects").insert(dbProject);
    if(error){alert("Erro ao cadastrar projeto.");btn.disabled=false;btn.textContent="Cadastrar projeto";return}
  }else{
    const items=JSON.parse(localStorage.getItem("mostra_projects")||"[]");items.unshift(project);localStorage.setItem("mostra_projects",JSON.stringify(items));
  }
  e.target.reset();setSelectedPhoto(null);btn.disabled=false;btn.textContent="Cadastrar projeto";load();
};
load();
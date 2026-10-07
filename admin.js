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
const $$=s=>[...document.querySelectorAll(s)];

$("#logoutBtn").onclick=()=>{
  sessionStorage.removeItem("mostra_staff_user");
  window.location.replace("./");
};


function showAdminView(view){
  $$(".admin-menu-card").forEach(card=>{
    const active=card.dataset.adminView===view;
    card.classList.toggle("active",active);
    card.setAttribute("aria-pressed",String(active));
  });

  $$(".admin-view").forEach(section=>{
    section.classList.toggle("active",section.dataset.view===view);
  });

  if(view==="projects") load();
  if(view==="reviews") loadReviews();
}

$$(".admin-menu-card").forEach(card=>{
  card.addEventListener("click",()=>{
    if(cameraModal?.classList.contains("open")) closeCamera();
    showAdminView(card.dataset.adminView);
  });
});

let selectedPhotoFiles=[];

const cameraInput=$("#cameraInput");
const uploadInput=$("#uploadInput");
const photoPreviewWrap=$("#photoPreviewWrap");
const photoPreviewGrid=$("#photoPreviewGrid");
const photoCount=$("#photoCount");

function updatePhotoPreview(){
  photoPreviewGrid.innerHTML="";

  if(!selectedPhotoFiles.length){
    photoPreviewWrap.classList.add("hidden");
    photoCount.textContent="0 fotos";
    cameraInput.value="";
    uploadInput.value="";
    return;
  }

  photoPreviewWrap.classList.remove("hidden");
  photoCount.textContent=`${selectedPhotoFiles.length} ${selectedPhotoFiles.length===1?"foto":"fotos"}`;

  selectedPhotoFiles.forEach((file,index)=>{
    const item=document.createElement("div");
    item.className="photo-thumb-item";

    const img=document.createElement("img");
    img.className="photo-thumb";
    img.alt=`Foto ${index+1}`;
    const objectUrl=URL.createObjectURL(file);
    img.src=objectUrl;
    img.onload=()=>URL.revokeObjectURL(objectUrl);

    const removeBtn=document.createElement("button");
    removeBtn.type="button";
    removeBtn.className="photo-thumb-remove";
    removeBtn.setAttribute("aria-label","Remover foto");
    removeBtn.innerHTML=`
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 10v6M15 10v6M5 7h14M10 4h4l1 2H9l1-2ZM8 20h8a1.5 1.5 0 0 0 1.5-1.5V7h-11v11.5A1.5 1.5 0 0 0 8 20Z"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    removeBtn.onclick=()=>{
      selectedPhotoFiles.splice(index,1);
      updatePhotoPreview();
    };

    item.appendChild(img);
    item.appendChild(removeBtn);
    photoPreviewGrid.appendChild(item);
  });
}

function addSelectedPhotos(fileList){
  const files=[...(fileList||[])].filter(file=>file && file.type?.startsWith("image/"));
  if(!files.length)return;

  selectedPhotoFiles.push(...files);
  updatePhotoPreview();
}

const cameraModal=$("#cameraModal");
const cameraVideo=$("#cameraVideo");
const cameraCanvas=$("#cameraCanvas");
const cameraLoading=$("#cameraLoading");
const cameraError=$("#cameraError");
const captureCameraBtn=$("#captureCameraBtn");
let cameraStream=null;

function stopCamera(){
  cameraStream?.getTracks().forEach(track=>track.stop());
  cameraStream=null;
  cameraVideo.srcObject=null;
  captureCameraBtn.disabled=true;
}

function closeCamera(){
  stopCamera();
  cameraModal.classList.remove("open");
  cameraModal.setAttribute("aria-hidden","true");
  document.body.classList.remove("camera-open");
}

async function openCamera(){
  cameraError.classList.add("hidden");
  cameraError.textContent="";
  cameraLoading.classList.remove("hidden");
  captureCameraBtn.disabled=true;
  cameraModal.classList.add("open");
  cameraModal.setAttribute("aria-hidden","false");
  document.body.classList.add("camera-open");

  if(!navigator.mediaDevices?.getUserMedia){
    closeCamera();
    cameraInput.click();
    return;
  }

  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:"environment"},
        width:{ideal:1920},
        height:{ideal:1080}
      },
      audio:false
    });

    cameraVideo.srcObject=cameraStream;
    await cameraVideo.play();
    cameraLoading.classList.add("hidden");
    captureCameraBtn.disabled=false;
  }catch(error){
    console.warn("Não foi possível abrir a câmera diretamente.",error);
    closeCamera();
    cameraInput.click();
  }
}

$("#cameraBtn").onclick=openCamera;
$("#uploadBtn").onclick=()=>uploadInput.click();
cameraInput.onchange=e=>addSelectedPhotos(e.target.files);
uploadInput.onchange=e=>addSelectedPhotos(e.target.files);

$("#closeCameraBtn").onclick=closeCamera;
$("#cancelCameraBtn").onclick=closeCamera;
document.querySelectorAll("[data-close-camera]").forEach(el=>el.addEventListener("click",closeCamera));

captureCameraBtn.onclick=()=>{
  const width=cameraVideo.videoWidth;
  const height=cameraVideo.videoHeight;
  if(!width||!height)return;

  cameraCanvas.width=width;
  cameraCanvas.height=height;
  const ctx=cameraCanvas.getContext("2d");
  ctx.drawImage(cameraVideo,0,0,width,height);

  cameraCanvas.toBlob(blob=>{
    if(!blob)return;
    const file=new File([blob],`foto-maquete-${Date.now()}.jpg`,{type:"image/jpeg"});
    selectedPhotoFiles.push(file);
    updatePhotoPreview();
    closeCamera();
  },"image/jpeg",0.9);
};

async function fileToDataUrl(file){
  if(!file)return null;
  return await new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}

async function load(){
  if(HAS_SUPABASE){
    const {data}=await supabase.from("projects").select("*").order("created_at",{ascending:false});
    render(data||[]);
    return;
  }

  render(JSON.parse(localStorage.getItem("mostra_projects")||"[]"));
}

function render(items){
  const list=$("#projectList");
  const count=$("#projectCount");

  count.textContent=`${items.length} ${items.length===1?"projeto":"projetos"}`;
  list.innerHTML="";

  if(!items.length){
    list.innerHTML=`
      <div class="admin-empty-state">
        <span>📚</span>
        <strong>Nenhum projeto cadastrado.</strong>
      </div>
    `;
    return;
  }

  items.forEach(p=>{
    const el=document.createElement("div");
    el.className="admin-item";
    el.innerHTML=`
      ${p.image_url
        ? `<img class="admin-thumb" src="${p.image_url}" alt="">`
        : '<div class="admin-thumb admin-thumb--placeholder">💡</div>'}
      <div class="admin-meta">
        <strong></strong>
        <span></span>
      </div>
      <button class="danger-btn" type="button">Excluir</button>
    `;

    el.querySelector("strong").textContent=p.title;
    el.querySelector("span").textContent=p.class_name||"Sem turma";
    el.querySelector("button").onclick=()=>remove(
      p.id,
      Array.isArray(p.image_paths)&&p.image_paths.length
        ? p.image_paths
        : (p.image_path?[p.image_path]:[])
    );
    list.appendChild(el);
  });
}

async function remove(id,imagePaths=[]){
  if(!confirm("Excluir este projeto?"))return;

  if(HAS_SUPABASE){
    if(imagePaths.length) await supabase.storage.from("project-images").remove(imagePaths);
    await supabase.from("projects").delete().eq("id",id);
  }else{
    const items=JSON.parse(localStorage.getItem("mostra_projects")||"[]").filter(p=>p.id!==id);
    localStorage.setItem("mostra_projects",JSON.stringify(items));
  }

  load();
}

function loadReviews(){
  let reviews=[];
  try{reviews=JSON.parse(localStorage.getItem("mostra_reviews")||"[]")}catch{}

  const total=reviews.length;
  const comments=reviews.filter(r=>r.comment?.trim()).length;
  const average=total
    ? (reviews.reduce((sum,r)=>sum+Number(r.stars||0),0)/total).toFixed(1)
    : "—";

  $("#reviewTotal").textContent=String(total);
  $("#reviewAverage").textContent=total?`${average} ★`:"—";
  $("#reviewComments").textContent=String(comments);

  const list=$("#reviewsList");
  list.innerHTML="";

  if(!reviews.length){
    list.innerHTML=`
      <div class="admin-empty-state">
        <span>⭐</span>
        <strong>Nenhuma avaliação.</strong>
      </div>
    `;
    return;
  }

  reviews
    .slice()
    .reverse()
    .forEach(review=>{
      const item=document.createElement("div");
      item.className="review-admin-item";
      const stars="★".repeat(Number(review.stars||0))+"☆".repeat(Math.max(0,5-Number(review.stars||0)));
      item.innerHTML=`
        <div class="review-admin-stars">${stars}</div>
        <div class="review-admin-body">
          <strong>${review.suggestion||"Avaliação recebida"}</strong>
          <p>${review.comment||"Sem comentário."}</p>
        </div>
      `;
      list.appendChild(item);
    });
}

$("#projectForm").onsubmit=async e=>{
  e.preventDefault();

  const btn=e.submitter;
  btn.disabled=true;
  btn.textContent="Salvando...";

  const files=[...selectedPhotoFiles];
  let image_urls=[];
  let image_paths=[];

  if(HAS_SUPABASE&&files.length){
    for(const file of files){
      const image_path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      const {error}=await supabase.storage.from("project-images").upload(image_path,file,{upsert:false});

      if(error){
        alert("Erro no upload de uma das imagens.");
        btn.disabled=false;
        btn.textContent="Cadastrar projeto";
        return;
      }

      const image_url=supabase.storage.from("project-images").getPublicUrl(image_path).data.publicUrl;
      image_paths.push(image_path);
      image_urls.push(image_url);
    }
  }else if(files.length){
    for(const file of files){
      image_urls.push(await fileToDataUrl(file));
    }
  }

  const project={
    id:crypto.randomUUID(),
    title:$("#title").value.trim(),
    class_name:$("#className").value.trim(),
    description:$("#description").value.trim(),
    image_url:image_urls[0]||null,
    image_urls,
    image_path:image_paths[0]||null,
    image_paths,
    active:true,
    created_at:new Date().toISOString()
  };

  if(HAS_SUPABASE){
    const {id,...dbProject}=project;
    const {error}=await supabase.from("projects").insert(dbProject);

    if(error){
      alert("Erro ao cadastrar projeto.");
      btn.disabled=false;
      btn.textContent="Cadastrar projeto";
      return;
    }
  }else{
    const items=JSON.parse(localStorage.getItem("mostra_projects")||"[]");
    items.unshift(project);
    localStorage.setItem("mostra_projects",JSON.stringify(items));
  }

  e.target.reset();
  selectedPhotoFiles=[];
  updatePhotoPreview();
  btn.disabled=false;
  btn.textContent="Cadastrar projeto";
  await load();
  showAdminView("projects");
};

load();
loadReviews();
showAdminView("create");

document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&cameraModal?.classList.contains("open")) closeCamera();
});

window.addEventListener("pagehide",stopCamera);

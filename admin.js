const CONFIG=window.MOSTRA_CONFIG||{};
const API_URL=String(CONFIG.apiUrl||"").replace(/\/$/,"");

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

  if(view==="projects") loadProjects();
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

async function api(path,options={}){
  const response=await fetch(`${API_URL}${path}`,options);
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    throw new Error(data?.error||"Erro ao comunicar com o servidor.");
  }
  return data;
}

async function uploadImage(file){
  return api("/images",{
    method:"POST",
    headers:{
      "Content-Type":file.type||"application/octet-stream",
      "X-Filename":encodeURIComponent(file.name||"image.jpg")
    },
    body:file
  });
}

async function loadProjects(){
  const list=$("#projectList");
  const count=$("#projectCount");
  list.innerHTML='<div class="admin-empty-state"><strong>Carregando...</strong></div>';

  try{
    const items=await api("/projects");
    renderProjects(Array.isArray(items)?items:[]);
  }catch(error){
    console.error(error);
    count.textContent="0 projetos";
    list.innerHTML='<div class="admin-empty-state"><strong>Erro ao carregar projetos.</strong></div>';
  }
}

function renderProjects(items){
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

  items.forEach(project=>{
    const el=document.createElement("div");
    el.className="admin-item";

    if(project.image_url){
      const img=document.createElement("img");
      img.className="admin-thumb";
      img.src=project.image_url;
      img.alt="";
      el.appendChild(img);
    }else{
      const placeholder=document.createElement("div");
      placeholder.className="admin-thumb admin-thumb--placeholder";
      placeholder.textContent="💡";
      el.appendChild(placeholder);
    }

    const meta=document.createElement("div");
    meta.className="admin-meta";

    const title=document.createElement("strong");
    title.textContent=project.title;

    const className=document.createElement("span");
    className.textContent=project.class_name||"Sem turma";

    meta.append(title,className);

    const removeBtn=document.createElement("button");
    removeBtn.className="danger-btn";
    removeBtn.type="button";
    removeBtn.textContent="Excluir";
    removeBtn.onclick=()=>removeProject(project.id);

    el.append(meta,removeBtn);
    list.appendChild(el);
  });
}

async function removeProject(id){
  if(!confirm("Excluir este projeto?"))return;

  try{
    await api(`/projects/${encodeURIComponent(id)}`,{method:"DELETE"});
    await loadProjects();
  }catch(error){
    alert(error.message);
  }
}

async function loadReviews(){
  const list=$("#reviewsList");
  list.innerHTML='<div class="admin-empty-state"><strong>Carregando...</strong></div>';

  try{
    const reviews=await api("/reviews");
    renderReviews(Array.isArray(reviews)?reviews:[]);
  }catch(error){
    console.error(error);
    $("#reviewTotal").textContent="0";
    $("#reviewAverage").textContent="—";
    $("#reviewComments").textContent="0";
    list.innerHTML='<div class="admin-empty-state"><strong>Erro ao carregar avaliações.</strong></div>';
  }
}

function renderReviews(reviews){
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

  reviews.forEach(review=>{
    const item=document.createElement("div");
    item.className="review-admin-item";

    const stars=document.createElement("div");
    stars.className="review-admin-stars";
    stars.textContent="★".repeat(Number(review.stars||0))+"☆".repeat(Math.max(0,5-Number(review.stars||0)));

    const body=document.createElement("div");
    body.className="review-admin-body";

    const title=document.createElement("strong");
    title.textContent=review.project_title||"Projeto";

    const meta=document.createElement("p");
    meta.textContent=[review.project_class,review.suggestion].filter(Boolean).join(" · ")||"Avaliação recebida";

    const comment=document.createElement("p");
    comment.textContent=review.comment||"Sem comentário.";

    body.append(title,meta,comment);
    item.append(stars,body);
    list.appendChild(item);
  });
}

$("#projectForm").onsubmit=async e=>{
  e.preventDefault();

  const btn=e.submitter;
  btn.disabled=true;
  btn.textContent="Salvando...";

  try{
    const imageKeys=[];

    for(const file of selectedPhotoFiles){
      const uploaded=await uploadImage(file);
      if(uploaded?.key) imageKeys.push(uploaded.key);
    }

    await api("/projects",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        title:$("#title").value.trim(),
        class_name:$("#className").value.trim(),
        description:$("#description").value.trim(),
        image_keys:imageKeys
      })
    });

    e.target.reset();
    selectedPhotoFiles=[];
    updatePhotoPreview();
    await loadProjects();
    showAdminView("projects");
  }catch(error){
    alert(error.message);
  }finally{
    btn.disabled=false;
    btn.textContent="Cadastrar projeto";
  }
};

loadProjects();
showAdminView("create");

document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&cameraModal?.classList.contains("open")) closeCamera();
});

window.addEventListener("pagehide",stopCamera);

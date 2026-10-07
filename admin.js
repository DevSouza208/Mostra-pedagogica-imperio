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
let legacyMigrationPromise=null;

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

async function dataUrlToFile(dataUrl,index=0){
  const response=await fetch(dataUrl);
  const blob=await response.blob();
  const extension=(blob.type.split("/")[1]||"jpg").replace("jpeg","jpg");
  return new File([blob],`foto-migrada-${Date.now()}-${index}.${extension}`,{
    type:blob.type||"image/jpeg"
  });
}

async function migrateLegacyProjects(remoteItems){
  if(legacyMigrationPromise)return legacyMigrationPromise;

  legacyMigrationPromise=(async()=>{
    let legacy=[];
    try{legacy=JSON.parse(localStorage.getItem("mostra_projects")||"[]")}catch{}
    if(!Array.isArray(legacy)||!legacy.length)return remoteItems;

    const normalized=value=>String(value||"").trim().toLowerCase();
    const merged=[...remoteItems];
    let migratedAny=false;

    for(const project of legacy){
      const duplicate=merged.some(item=>
        normalized(item.title)===normalized(project.title)&&
        normalized(item.class_name)===normalized(project.class_name)&&
        normalized(item.description)===normalized(project.description)
      );
      if(duplicate)continue;

      try{
        const sources=Array.isArray(project.image_urls)&&project.image_urls.length
          ? project.image_urls
          : (project.image_url?[project.image_url]:[]);
        const imageKeys=[];

        for(let i=0;i<sources.length;i++){
          const source=sources[i];
          if(typeof source!=="string"||!source.startsWith("data:image/"))continue;
          const file=await dataUrlToFile(source,i);
          const uploaded=await uploadImage(file);
          if(uploaded?.key)imageKeys.push(uploaded.key);
        }

        const result=await api("/projects",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            title:String(project.title||"").trim(),
            class_name:String(project.class_name||"").trim(),
            description:String(project.description||"").trim(),
            image_keys:imageKeys
          })
        });

        if(result?.project){
          merged.unshift(result.project);
          migratedAny=true;
        }
      }catch(error){
        console.warn("Não foi possível migrar um projeto antigo.",error);
      }
    }

    if(migratedAny||legacy.every(project=>merged.some(item=>
      normalized(item.title)===normalized(project.title)&&
      normalized(item.class_name)===normalized(project.class_name)&&
      normalized(item.description)===normalized(project.description)
    ))){
      localStorage.removeItem("mostra_projects");
    }

    return merged;
  })();

  try{
    return await legacyMigrationPromise;
  }finally{
    legacyMigrationPromise=null;
  }
}

async function removeNearDuplicates(items){
  const normalized=value=>String(value||"").trim().toLowerCase();
  const groups=new Map();

  for(const item of items){
    const key=[
      normalized(item.title),
      normalized(item.class_name),
      normalized(item.description)
    ].join("|");

    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(item);
  }

  const keep=[];
  const removeIds=[];

  for(const group of groups.values()){
    group.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
    const primary=group[0];
    keep.push(primary);

    for(let i=1;i<group.length;i++){
      const current=group[i];
      const delta=Math.abs(
        new Date(primary.created_at||0).getTime()-
        new Date(current.created_at||0).getTime()
      );

      const samePhotoCount=
        (Array.isArray(primary.image_urls)?primary.image_urls.length:0)===
        (Array.isArray(current.image_urls)?current.image_urls.length:0);

      if(delta<=5*60*1000&&samePhotoCount){
        removeIds.push(current.id);
      }else{
        keep.push(current);
      }
    }
  }

  if(removeIds.length){
    await Promise.all(removeIds.map(id=>
      api(`/projects/${encodeURIComponent(id)}`,{method:"DELETE"})
        .catch(error=>console.warn("Falha ao remover duplicata automática.",error))
    ));
  }

  return keep.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
}
async function loadProjects(){
  const list=$("#projectList");
  const count=$("#projectCount");
  list.innerHTML='<div class="admin-empty-state"><strong>Carregando...</strong></div>';

  try{
    const remote=await api("/projects");
    const migrated=await migrateLegacyProjects(Array.isArray(remote)?remote:[]);
    const items=await removeNearDuplicates(migrated);
    renderProjects(items);
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
  list.classList.add("project-admin-grid");

  if(!items.length){
    list.innerHTML=`
      <div class="admin-empty-state project-admin-empty">
        <span>📚</span>
        <strong>Nenhum projeto cadastrado.</strong>
      </div>
    `;
    return;
  }

  items.forEach(project=>{
    const card=document.createElement("article");
    card.className="project-admin-card";

    const media=document.createElement("div");
    media.className="project-admin-media";

    if(project.image_url){
      const img=document.createElement("img");
      img.src=project.image_url;
      img.alt=`Foto do projeto ${project.title}`;
      media.appendChild(img);
    }else{
      const placeholder=document.createElement("div");
      placeholder.className="project-admin-placeholder";
      placeholder.textContent="💡";
      media.appendChild(placeholder);
    }

    const photoTotal=Array.isArray(project.image_urls)?project.image_urls.length:(project.image_url?1:0);
    if(photoTotal>1){
      const photoBadge=document.createElement("span");
      photoBadge.className="project-admin-photo-count";
      photoBadge.textContent=`${photoTotal} fotos`;
      media.appendChild(photoBadge);
    }

    const body=document.createElement("div");
    body.className="project-admin-card-body";

    const meta=document.createElement("div");
    meta.className="project-admin-card-meta";

    const classBadge=document.createElement("span");
    classBadge.className="project-admin-class";
    classBadge.textContent=project.class_name||"Sem turma";
    meta.appendChild(classBadge);

    const title=document.createElement("h3");
    title.textContent=project.title;

    const description=document.createElement("p");
    description.textContent=project.description||"";
    if(!description.textContent)description.classList.add("hidden");

    const footer=document.createElement("div");
    footer.className="project-admin-card-footer";

    const removeBtn=document.createElement("button");
    removeBtn.className="project-admin-delete";
    removeBtn.type="button";
    removeBtn.setAttribute("aria-label",`Excluir ${project.title}`);
    removeBtn.innerHTML=`
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 10v6M15 10v6M5 7h14M10 4h4l1 2H9l1-2ZM8 20h8a1.5 1.5 0 0 0 1.5-1.5V7h-11v11.5A1.5 1.5 0 0 0 8 20Z"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Excluir</span>
    `;
    removeBtn.onclick=()=>removeProject(project.id);

    footer.appendChild(removeBtn);
    body.append(meta,title,description,footer);
    card.append(media,body);
    list.appendChild(card);
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
    const [reviewsData,projectsData]=await Promise.all([
      api("/reviews"),
      api("/projects")
    ]);

    const reviews=Array.isArray(reviewsData)?reviewsData:[];
    const projects=Array.isArray(projectsData)?projectsData:[];
    renderReviews(reviews,projects);
  }catch(error){
    console.error(error);
    $("#reviewTotal").textContent="0";
    $("#reviewAverage").textContent="—";
    $("#reviewComments").textContent="0";
    list.innerHTML='<div class="admin-empty-state"><strong>Erro ao carregar avaliações.</strong></div>';
  }
}

function renderReviews(reviews,projects=[]){
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
  list.className="review-project-picker";

  const reviewsByProject=new Map();
  reviews.forEach(review=>{
    const key=review.project_id||"sem-projeto";
    if(!reviewsByProject.has(key))reviewsByProject.set(key,[]);
    reviewsByProject.get(key).push(review);
  });

  const projectMap=new Map(projects.map(project=>[project.id,project]));
  reviewsByProject.forEach((projectReviews,projectId)=>{
    if(!projectMap.has(projectId)){
      const sample=projectReviews[0];
      projectMap.set(projectId,{
        id:projectId,
        title:sample?.project_title||"Projeto",
        class_name:sample?.project_class||""
      });
    }
  });

  const orderedProjects=[...projectMap.values()].sort((a,b)=>
    String(a.title||"").localeCompare(String(b.title||""),"pt-BR")
  );

  if(!orderedProjects.length){
    list.innerHTML=`
      <div class="admin-empty-state review-project-empty">
        <span>⭐</span>
        <strong>Nenhum projeto para mostrar.</strong>
      </div>
    `;
    return;
  }

  orderedProjects.forEach(project=>{
    const projectReviews=reviewsByProject.get(project.id)||[];
    const projectTotal=projectReviews.length;
    const projectAverage=projectTotal
      ? (projectReviews.reduce((sum,r)=>sum+Number(r.stars||0),0)/projectTotal).toFixed(1)
      : "—";

    const card=document.createElement("button");
    card.type="button";
    card.className="review-project-picker-card";
    card.setAttribute("aria-label",`Ver avaliações de ${project.title}`);

    const title=document.createElement("strong");
    title.textContent=project.title||"Projeto";

    const score=document.createElement("span");
    score.className="review-project-picker-score";
    score.innerHTML=projectTotal
      ? `<b>${projectAverage}</b><span aria-hidden="true">★</span>`
      : `<b>—</b><span aria-hidden="true">★</span>`;

    card.append(title,score);
    card.onclick=()=>renderProjectReviewDetails(project,projectReviews,reviews,projects);
    list.appendChild(card);
  });
}

function renderProjectReviewDetails(project,projectReviews,allReviews,allProjects){
  const list=$("#reviewsList");
  list.innerHTML="";
  list.className="review-project-detail";

  const total=projectReviews.length;
  const comments=projectReviews.filter(r=>r.comment?.trim()).length;
  const average=total
    ? (projectReviews.reduce((sum,r)=>sum+Number(r.stars||0),0)/total).toFixed(1)
    : "—";

  const top=document.createElement("div");
  top.className="review-detail-top";

  const back=document.createElement("button");
  back.type="button";
  back.className="review-detail-back";
  back.innerHTML=`
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Voltar</span>
  `;
  back.onclick=()=>renderReviews(allReviews,allProjects);

  const heading=document.createElement("div");
  heading.className="review-detail-heading";

  const title=document.createElement("h3");
  title.textContent=project.title||"Projeto";

  const classBadge=document.createElement("span");
  classBadge.className="review-project-class";
  classBadge.textContent=project.class_name||"Sem turma";

  heading.append(title,classBadge);
  top.append(back,heading);

  const stats=document.createElement("div");
  stats.className="review-detail-stats";

  [
    ["Avaliações",String(total)],
    ["Média",total?`${average} ★`:"—"],
    ["Comentários",String(comments)]
  ].forEach(([label,value])=>{
    const stat=document.createElement("div");
    stat.className="review-detail-stat";

    const statLabel=document.createElement("span");
    statLabel.textContent=label;

    const statValue=document.createElement("strong");
    statValue.textContent=value;

    stat.append(statLabel,statValue);
    stats.appendChild(stat);
  });

  const praiseCounts=new Map();
  projectReviews.forEach(review=>{
    if(!review.suggestion)return;
    String(review.suggestion)
      .split(" • ")
      .map(item=>item.trim())
      .filter(Boolean)
      .forEach(item=>praiseCounts.set(item,(praiseCounts.get(item)||0)+1));
  });

  const praiseItems=[...praiseCounts.entries()]
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-BR"));

  const praiseSection=document.createElement("section");
  praiseSection.className="review-praise-section";

  if(praiseItems.length){
    const praiseTitle=document.createElement("strong");
    praiseTitle.className="review-praise-title";
    praiseTitle.textContent="Elogios mais recebidos";

    const praiseList=document.createElement("div");
    praiseList.className="review-praise-list";

    praiseItems.forEach(([label,count])=>{
      const chip=document.createElement("span");
      chip.className="review-praise-chip";

      const text=document.createElement("span");
      text.textContent=label;

      const total=document.createElement("b");
      total.textContent=`${count}x`;

      chip.append(text,total);
      praiseList.appendChild(chip);
    });

    praiseSection.append(praiseTitle,praiseList);
  }

  const entries=document.createElement("div");
  entries.className="review-detail-entries";

  if(!projectReviews.length){
    const empty=document.createElement("div");
    empty.className="review-project-no-reviews";
    empty.textContent="Nenhuma avaliação ainda.";
    entries.appendChild(empty);
  }else{
    projectReviews.forEach(review=>{
      const item=document.createElement("div");
      item.className="review-entry";

      const stars=document.createElement("div");
      stars.className="review-entry-stars";
      stars.textContent="★".repeat(Number(review.stars||0))+"☆".repeat(Math.max(0,5-Number(review.stars||0)));

      const content=document.createElement("div");
      content.className="review-entry-content";

      if(review.suggestion){
        const suggestion=document.createElement("strong");
        suggestion.textContent=review.suggestion;
        content.appendChild(suggestion);
      }

      if(review.comment?.trim()){
        const comment=document.createElement("p");
        comment.textContent=review.comment;
        content.appendChild(comment);
      }else if(!review.suggestion){
        const text=document.createElement("p");
        text.textContent="Avaliação sem comentário.";
        content.appendChild(text);
      }

      item.append(stars,content);
      entries.appendChild(item);
    });
  }

  if(praiseItems.length){
    list.append(top,stats,praiseSection,entries);
  }else{
    list.append(top,stats,entries);
  }
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

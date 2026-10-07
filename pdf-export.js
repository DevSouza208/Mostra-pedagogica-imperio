(function(){
  const sessionRaw=sessionStorage.getItem("mostra_staff_user");
  if(!sessionRaw)return;

  const CONFIG=window.MOSTRA_CONFIG||{};
  const API_URL=String(CONFIG.apiUrl||"").replace(/\/$/,"");

  const modal=document.querySelector("#pdfBuilderModal");
  const openBtn=document.querySelector("#openPdfBuilderBtn");
  const projectSelect=document.querySelector("#pdfProjectSelect");
  const preview=document.querySelector("#pdfProjectPreview");
  const commentsList=document.querySelector("#pdfCommentsList");
  const selectedCount=document.querySelector("#pdfSelectedCount");
  const selectAllBtn=document.querySelector("#pdfSelectAllBtn");
  const generateBtn=document.querySelector("#generateProjectPdfBtn");

  if(!modal||!openBtn||!projectSelect||!preview||!commentsList||!generateBtn)return;

  let projects=[];
  let reviews=[];
  let loaded=false;
  let loading=false;
  const selectedByProject=new Map();

  function selectedSet(projectId){
    if(!selectedByProject.has(projectId))selectedByProject.set(projectId,new Set());
    return selectedByProject.get(projectId);
  }

  async function api(path){
    const response=await fetch(API_URL+path);
    if(!response.ok)throw new Error("Não foi possível carregar os dados.");
    return response.json();
  }

  function reviewsFor(projectId){
    return reviews.filter(review=>review.project_id===projectId);
  }

  function praiseItems(projectReviews){
    const counts=new Map();
    projectReviews.forEach(review=>{
      if(!review.suggestion)return;
      String(review.suggestion)
        .split(" • ")
        .map(item=>item.trim())
        .filter(Boolean)
        .forEach(item=>counts.set(item,(counts.get(item)||0)+1));
    });
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-BR"));
  }

  function currentProject(){
    return projects.find(project=>project.id===projectSelect.value)||null;
  }

  function updateSelectedCount(){
    const project=currentProject();
    if(!project){
      selectedCount.textContent="0 selecionados";
      return;
    }
    const set=selectedSet(project.id);
    const valid=reviewsFor(project.id).filter(review=>review.comment?.trim()&&set.has(review.id)).length;
    selectedCount.textContent=valid+" selecionado"+(valid===1?"":"s");
  }

  function renderPreview(){
    const project=currentProject();
    preview.innerHTML="";
    commentsList.innerHTML="";
    generateBtn.disabled=!project;

    if(!project){
      selectedCount.textContent="0 selecionados";
      return;
    }

    const projectReviews=reviewsFor(project.id);
    const total=projectReviews.length;
    const average=total
      ? (projectReviews.reduce((sum,review)=>sum+Number(review.stars||0),0)/total).toFixed(1)
      : "—";
    const praises=praiseItems(projectReviews).slice(0,3);

    const card=document.createElement("div");
    card.className="pdf-project-preview-card";

    const media=document.createElement("div");
    media.className="pdf-project-preview-image";
    if(project.image_url){
      const img=document.createElement("img");
      img.src=project.image_url;
      img.alt="";
      media.appendChild(img);
    }else{
      const placeholder=document.createElement("div");
      placeholder.className="pdf-project-preview-placeholder";
      placeholder.textContent="💡";
      media.appendChild(placeholder);
    }

    const copy=document.createElement("div");
    copy.className="pdf-project-preview-copy";

    const title=document.createElement("strong");
    title.textContent=project.title||"Projeto";

    const className=document.createElement("span");
    className.textContent=project.class_name||"Sem turma";

    const stats=document.createElement("div");
    stats.className="pdf-preview-stats";

    const avg=document.createElement("span");
    avg.className="pdf-preview-stat";
    avg.textContent=(total?average:"—")+" / 5";

    const votes=document.createElement("span");
    votes.className="pdf-preview-stat";
    votes.textContent=total+" avaliação"+(total===1?"":"ões");

    stats.append(avg,votes);

    const praiseWrap=document.createElement("div");
    praiseWrap.className="pdf-preview-praises";
    praises.forEach(entry=>{
      const chip=document.createElement("span");
      chip.className="pdf-preview-praise";
      chip.textContent=entry[0]+" · "+entry[1]+"x";
      praiseWrap.appendChild(chip);
    });

    copy.append(title,className,stats,praiseWrap);
    card.append(media,copy);
    preview.appendChild(card);

    const commentReviews=projectReviews.filter(review=>review.comment?.trim());
    const set=selectedSet(project.id);

    if(!commentReviews.length){
      commentsList.innerHTML='<div class="pdf-comments-empty">Este projeto ainda não recebeu comentários.</div>';
    }else{
      commentReviews.forEach(review=>{
        const option=document.createElement("label");
        option.className="pdf-comment-option";
        option.classList.toggle("selected",set.has(review.id));

        const checkbox=document.createElement("input");
        checkbox.type="checkbox";
        checkbox.checked=set.has(review.id);

        const content=document.createElement("div");
        content.className="pdf-comment-copy";

        const stars=document.createElement("strong");
        stars.textContent=String(review.stars||0)+" / 5 estrelas";

        const text=document.createElement("p");
        text.textContent=review.comment;

        content.append(stars,text);
        option.append(checkbox,content);

        checkbox.onchange=()=>{
          if(checkbox.checked)set.add(review.id);
          else set.delete(review.id);
          option.classList.toggle("selected",checkbox.checked);
          updateSelectedCount();
          updateSelectAllLabel();
        };

        commentsList.appendChild(option);
      });
    }

    updateSelectedCount();
    updateSelectAllLabel();
  }

  function updateSelectAllLabel(){
    const project=currentProject();
    if(!project){
      selectAllBtn.textContent="Selecionar todos";
      return;
    }
    const commentReviews=reviewsFor(project.id).filter(review=>review.comment?.trim());
    const set=selectedSet(project.id);
    const all=commentReviews.length>0&&commentReviews.every(review=>set.has(review.id));
    selectAllBtn.textContent=all?"Limpar seleção":"Selecionar todos";
  }

  async function loadData(){
    if(loading)return;
    loading=true;
    projectSelect.innerHTML='<option value="">Carregando projetos...</option>';
    generateBtn.disabled=true;

    try{
      const results=await Promise.all([api("/projects"),api("/reviews")]);
      projects=Array.isArray(results[0])?results[0]:[];
      reviews=Array.isArray(results[1])?results[1]:[];
      loaded=true;

      projectSelect.innerHTML="";
      if(!projects.length){
        projectSelect.innerHTML='<option value="">Nenhum projeto cadastrado</option>';
        renderPreview();
        return;
      }

      projects
        .slice()
        .sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""),"pt-BR"))
        .forEach(project=>{
          const option=document.createElement("option");
          option.value=project.id;
          option.textContent=(project.title||"Projeto")+" — "+(project.class_name||"Sem turma");
          projectSelect.appendChild(option);
        });

      renderPreview();
    }catch(error){
      console.error(error);
      projectSelect.innerHTML='<option value="">Erro ao carregar</option>';
      commentsList.innerHTML='<div class="pdf-comments-empty">Não foi possível carregar os dados agora.</div>';
    }finally{
      loading=false;
    }
  }

  function openModal(){
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("pdf-builder-open");
    loadData();
  }

  function closeModal(){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("pdf-builder-open");
  }

  document.querySelectorAll("[data-close-pdf-builder]").forEach(element=>{
    element.addEventListener("click",closeModal);
  });

  openBtn.addEventListener("click",openModal);
  projectSelect.addEventListener("change",renderPreview);

  selectAllBtn.addEventListener("click",()=>{
    const project=currentProject();
    if(!project)return;

    const commentReviews=reviewsFor(project.id).filter(review=>review.comment?.trim());
    const set=selectedSet(project.id);
    const all=commentReviews.length>0&&commentReviews.every(review=>set.has(review.id));

    if(all)set.clear();
    else commentReviews.forEach(review=>set.add(review.id));

    renderPreview();
  });

  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&modal.classList.contains("open"))closeModal();
  });

  function safeFilename(value){
    return String(value||"projeto")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-zA-Z0-9_-]+/g,"-")
      .replace(/^-+|-+$/g,"")
      .toLowerCase()||"projeto";
  }

  async function toDataUrl(url){
    const response=await fetch(url);
    if(!response.ok)throw new Error("Imagem indisponível.");
    const blob=await response.blob();
    return await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result));
      reader.onerror=reject;
      reader.readAsDataURL(blob);
    });
  }

  function imageFormat(dataUrl){
    return String(dataUrl).startsWith("data:image/png")?"PNG":"JPEG";
  }

  function addContainedImage(doc,dataUrl,x,y,w,h){
    const props=doc.getImageProperties(dataUrl);
    const ratio=Math.min(w/props.width,h/props.height);
    const drawW=props.width*ratio;
    const drawH=props.height*ratio;
    const drawX=x+(w-drawW)/2;
    const drawY=y+(h-drawH)/2;

    doc.setFillColor(244,250,253);
    doc.roundedRect(x,y,w,h,3,3,"F");
    doc.addImage(dataUrl,imageFormat(dataUrl),drawX,drawY,drawW,drawH,undefined,"FAST");
  }

  function drawStar(doc,cx,cy,outer,inner,fill){
    const points=[];
    for(let i=0;i<10;i++){
      const radius=i%2===0?outer:inner;
      const angle=-Math.PI/2+i*Math.PI/5;
      points.push([cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius]);
    }

    const vectors=[];
    for(let i=1;i<points.length;i++){
      vectors.push([points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]]);
    }
    vectors.push([points[0][0]-points[points.length-1][0],points[0][1]-points[points.length-1][1]]);

    doc.setFillColor(fill[0],fill[1],fill[2]);
    doc.lines(vectors,points[0][0],points[0][1],[1,1],"F",true);
  }

  function drawStars(doc,x,y,value,size){
    const rounded=Math.round(Number(value)||0);
    for(let i=0;i<5;i++){
      const fill=i<rounded?[244,174,20]:[216,228,235];
      drawStar(doc,x+i*(size*2.5),y,size,size*.45,fill);
    }
  }

  function addFooter(doc,imperio,codifica,pageNumber){
    const pageHeight=doc.internal.pageSize.getHeight();
    doc.setDrawColor(219,235,243);
    doc.line(14,pageHeight-16,196,pageHeight-16);

    doc.setFont("helvetica","normal");
    doc.setFontSize(7);
    doc.setTextColor(112,139,154);
    doc.text("Mostra Pedagógica · página "+pageNumber,14,pageHeight-8);

    if(imperio)addContainedImage(doc,imperio,151,pageHeight-14,11,10);
    doc.text("+",166,pageHeight-8);
    if(codifica)addContainedImage(doc,codifica,172,pageHeight-14,15,10);
  }

  async function generatePdf(){
    const project=currentProject();
    if(!project)return;

    const JsPDF=window.jspdf?.jsPDF;
    if(!JsPDF){
      alert("O gerador de PDF não carregou. Verifique a internet e tente novamente.");
      return;
    }

    const oldText=generateBtn.textContent;
    generateBtn.disabled=true;
    generateBtn.textContent="Montando PDF...";

    try{
      const projectReviews=reviewsFor(project.id);
      const total=projectReviews.length;
      const average=total
        ? Number(projectReviews.reduce((sum,review)=>sum+Number(review.stars||0),0)/total)
        : 0;
      const praises=praiseItems(projectReviews);
      const selected=selectedSet(project.id);
      const chosenComments=projectReviews.filter(review=>review.comment?.trim()&&selected.has(review.id));

      const photoUrls=Array.isArray(project.image_urls)&&project.image_urls.length
        ? project.image_urls.filter(Boolean)
        : (project.image_url?[project.image_url]:[]);

      const assets=await Promise.all([
        toDataUrl("./logo_mostra%20pedagogica_bgoff.png").catch(()=>null),
        toDataUrl("./logo_imperio.png").catch(()=>null),
        toDataUrl("./logo_codifica.png").catch(()=>null)
      ]);
      const eventLogo=assets[0];
      const imperioLogo=assets[1];
      const codificaLogo=assets[2];

      const photos=[];
      for(const url of photoUrls){
        const data=await toDataUrl(url).catch(()=>null);
        if(data)photos.push(data);
      }

      const doc=new JsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      let pageNumber=1;

      function header(){
        doc.setFillColor(235,248,255);
        doc.roundedRect(12,10,186,30,8,8,"F");
        if(eventLogo)addContainedImage(doc,eventLogo,16,13,22,22);

        doc.setFont("helvetica","bold");
        doc.setTextColor(13,66,102);
        doc.setFontSize(8.5);
        doc.text("MOSTRA PEDAGÓGICA",43,20);

        doc.setFontSize(15);
        const titleLines=doc.splitTextToSize(project.title||"Projeto",137);
        doc.text(titleLines,43,28);

        doc.setFont("helvetica","normal");
        doc.setFontSize(8);
        doc.setTextColor(86,119,137);
        doc.text(project.class_name||"Sem turma",43,titleLines.length>1?38:35);

        addFooter(doc,imperioLogo,codificaLogo,pageNumber);
      }

      function newPage(){
        doc.addPage();
        pageNumber++;
        header();
        return 49;
      }

      header();

      const statY=48;
      const statW=57;
      const stats=[
        ["MÉDIA",total?average.toFixed(1)+" / 5":"—"],
        ["AVALIAÇÕES",String(total)],
        ["COMENTÁRIOS",String(projectReviews.filter(review=>review.comment?.trim()).length)]
      ];

      stats.forEach((entry,index)=>{
        const x=14+index*(statW+4);
        doc.setFillColor(248,252,254);
        doc.setDrawColor(220,236,244);
        doc.roundedRect(x,statY,statW,22,4,4,"FD");
        doc.setFont("helvetica","bold");
        doc.setFontSize(7);
        doc.setTextColor(116,145,161);
        doc.text(entry[0],x+5,statY+7);
        doc.setFontSize(12);
        doc.setTextColor(18,65,94);
        doc.text(entry[1],x+5,statY+16);
      });

      if(total)drawStars(doc,103,64,average,1.8);

      let y=78;

      if(photos.length){
        doc.setFont("helvetica","bold");
        doc.setFontSize(10);
        doc.setTextColor(18,65,94);
        doc.text("Fotos do projeto",14,y);
        y+=5;

        const firstBatch=photos.slice(0,4);
        if(firstBatch[0])addContainedImage(doc,firstBatch[0],14,y,116,72);
        firstBatch.slice(1).forEach((photo,index)=>{
          addContainedImage(doc,photo,136,y+index*24,60,21);
        });
        y+=80;

        let offset=4;
        while(offset<photos.length){
          y=newPage();
          doc.setFont("helvetica","bold");
          doc.setFontSize(10);
          doc.setTextColor(18,65,94);
          doc.text("Mais fotos",14,y);
          y+=7;

          photos.slice(offset,offset+4).forEach((photo,index)=>{
            const col=index%2;
            const row=Math.floor(index/2);
            addContainedImage(doc,photo,14+col*92,y+row*72,86,64);
          });
          offset+=4;
          y+=145;
        }
      }

      if(praises.length){
        if(y>229)y=newPage();

        doc.setFont("helvetica","bold");
        doc.setFontSize(10);
        doc.setTextColor(18,65,94);
        doc.text("Principais elogios",14,y);
        y+=6;

        praises.slice(0,6).forEach((entry,index)=>{
          const col=index%2;
          const row=Math.floor(index/2);
          const x=14+col*91;
          const yy=y+row*14;

          doc.setFillColor(238,249,254);
          doc.setDrawColor(207,230,241);
          doc.roundedRect(x,yy,86,10,5,5,"FD");
          doc.setFont("helvetica","bold");
          doc.setFontSize(7.2);
          doc.setTextColor(23,111,154);
          const label=doc.splitTextToSize(String(entry[0]),62)[0];
          doc.text(label,x+5,yy+6.5);
          doc.text(String(entry[1])+"x",x+79,yy+6.5,{align:"right"});
        });

        y+=Math.ceil(Math.min(6,praises.length)/2)*14+6;
      }

      if(chosenComments.length){
        if(y>226)y=newPage();

        doc.setFont("helvetica","bold");
        doc.setFontSize(10);
        doc.setTextColor(18,65,94);
        doc.text("Comentários selecionados",14,y);
        y+=7;

        for(const review of chosenComments){
          const lines=doc.splitTextToSize("“"+review.comment.trim()+"”",150);
          const cardHeight=Math.max(20,11+lines.length*5);

          if(y+cardHeight>272)y=newPage();

          doc.setFillColor(250,253,255);
          doc.setDrawColor(224,237,244);
          doc.roundedRect(14,y,182,cardHeight,4,4,"FD");

          doc.setFont("helvetica","normal");
          doc.setFontSize(8.3);
          doc.setTextColor(76,103,119);
          doc.text(lines,20,y+8);

          drawStars(doc,169,y+8,Number(review.stars||0),1.25);
          y+=cardHeight+5;
        }
      }

      doc.save("mostra-"+safeFilename(project.title)+".pdf");
    }catch(error){
      console.error(error);
      alert("Não foi possível gerar o PDF agora.");
    }finally{
      generateBtn.disabled=false;
      generateBtn.textContent=oldText;
    }
  }

  generateBtn.addEventListener("click",generatePdf);
})();
const QUESTIONS = [
  {
    id:"phone", icon:"📱", category:"TECNOLOGIA",
    title:"Quanto tempo por dia você usa o celular?",
    hint:"Considere o uso do aparelho ao longo de um dia comum."
  },
  {
    id:"social", icon:"📲", category:"ENTRETENIMENTO",
    title:"Quanto tempo por dia você passa em redes sociais ou assistindo vídeos curtos?",
    hint:"Por exemplo: Instagram, TikTok, Shorts, Reels e outras redes."
  },
  {
    id:"games", icon:"🎮", category:"ENTRETENIMENTO",
    title:"Quanto tempo por dia você joga videogame, jogos de celular ou computador?",
    hint:"Vale qualquer tipo de jogo digital."
  },
  {
    id:"tv", icon:"📺", category:"ENTRETENIMENTO",
    title:"Quanto tempo por dia você assiste TV, filmes, séries ou vídeos?",
    hint:"Considere TV aberta, streaming e vídeos mais longos."
  },
  {
    id:"computer", icon:"💻", category:"ESTUDO E TRABALHO",
    title:"Quanto tempo por dia você usa computador ou tablet para estudar ou trabalhar?",
    hint:"Aqui entram tarefas, aulas, pesquisas, trabalho e outras atividades produtivas."
  },
  {
    id:"reading", icon:"📚", category:"FORA DAS TELAS",
    title:"Quanto tempo por dia você lê por escolha própria?",
    hint:"Livros, revistas, quadrinhos ou outros textos."
  },
  {
    id:"family", icon:"👨‍👩‍👧", category:"CONVÍVIO",
    title:"Quanto tempo por dia você faz alguma atividade junto com sua família ou com as pessoas que moram com você?",
    hint:"Pode ser brincar, cozinhar, passear, jogar algo juntos ou simplesmente passar um tempo em companhia."
  },
  {
    id:"conversation", icon:"💬", category:"CONVÍVIO",
    title:"Quanto tempo por dia você conversa pessoalmente com familiares ou outras pessoas da sua casa, sem usar telas?",
    hint:"Considere conversas em que a atenção está nas pessoas, e não nos aparelhos."
  },
  {
    id:"physical", icon:"🚶", category:"FORA DAS TELAS",
    title:"Quanto tempo por dia você pratica atividade física ou passa tempo em atividades fora das telas?",
    hint:"Esporte, caminhada, brincar, passear e outras atividades em movimento."
  },
  {
    id:"creative", icon:"🎨", category:"CRIATIVIDADE",
    title:"Quanto tempo por dia você faz algo criativo ou manual sem usar telas?",
    hint:"Desenhar, pintar, cozinhar, montar coisas, tocar instrumento, artesanato e outras criações."
  }
];

const TIME_OPTIONS = [
  {label:"0", value:0},
  {label:"30 min", value:.5},
  {label:"1h", value:1},
  {label:"2h", value:2},
  {label:"3h", value:3},
  {label:"4h", value:4},
  {label:"5h+", value:5}
];

const COMMENTS = {
  balanced:[
    "🙂 Olha só, parece que as telas ocupam uma parte pequena do seu dia.",
    "🌱 Seu tempo parece bem distribuído.",
    "😌 Tem bastante espaço no seu dia para outras atividades.",
    "👏 Legal! Você parece conseguir equilibrar bem as telas com outras coisas.",
    "🌤️ Seu resultado mostra uma rotina relativamente equilibrada.",
    "🧩 Parece que a tecnologia é só uma das peças do seu dia.",
    "🙂 Nada mal! Ainda sobra bastante tempo para outras experiências.",
    "🌿 Seu tempo de tela parece estar dividindo espaço com outras atividades.",
    "👀 Interessante! Seu uso não parece dominar sua rotina.",
    "⭐ Você parece ter encontrado um ritmo confortável.",
    "🧠 Seu resultado mostra bastante variedade no uso do tempo.",
    "📚 Tem espaço aí para leitura, conversa, movimento e descanso.",
    "🙂 Parece que você usa tecnologia sem deixar ela ocupar tudo.",
    "⏳ Seu tempo está distribuído de um jeito interessante.",
    "🌈 Sua rotina parece ter uma boa mistura de atividades.",
    "💙 Legal perceber que nem todo tempo livre precisa virar tempo de tela.",
    "🪁 Parece que ainda sobra bastante espaço fora das telas.",
    "🤓 Seu resultado ficou bem equilibrado.",
    "🌱 Pequenos hábitos assim podem fazer bastante diferença ao longo do ano.",
    "😊 Esse resultado parece confortável. Continue percebendo como usa seu tempo."
  ],
  moderate:[
    "👀 Opa… já são algumas horas da sua semana, hein?",
    "🤔 Parece pouco por dia, mas olha como vai somando.",
    "⏰ Interessante como algumas horinhas viram bastante tempo no fim da semana.",
    "🙂 Nada assustador, mas vale observar para onde esse tempo está indo.",
    "📱 O celular vai ocupando pequenos espaços do dia sem a gente perceber.",
    "🎮 Jogar é divertido — olha só quanto tempo isso representa na semana toda.",
    "📺 Um episódio aqui, outro ali… e o número cresce rapidinho.",
    "🤔 Se você pudesse recuperar uma hora desse tempo, o que faria?",
    "👀 Seu resultado já ocupa uma boa parte do seu tempo livre.",
    "🧠 Talvez valha observar quais dessas horas realmente valem a pena para você.",
    "⏳ Não parece tanto olhando um dia só, né?",
    "📊 Quando colocamos tudo na semana, a história muda um pouco.",
    "🙂 Tecnologia faz parte da rotina. A curiosidade é perceber quanto.",
    "👓 Seu resultado está numa faixa interessante para observar.",
    "💭 Será que todo esse tempo foi escolhido ou parte dele aconteceu no automático?",
    "📱 Quantas vezes você pega o celular sem nem saber exatamente por quê?",
    "🧩 Seu dia tem muitas peças. Quanto espaço você quer que as telas ocupem?",
    "🕐 Alguns minutos repetidos várias vezes viram horas.",
    "🤔 Talvez seu resultado seja um bom convite para prestar atenção na rotina.",
    "🌤️ Não é sobre parar de usar — é sobre perceber o uso."
  ],
  high:[
    "😮 Nossa… isso já é bastante tempo, não é?",
    "👀 Caramba, as telas ocupam uma parte grande da sua semana.",
    "⏳ Quando transformamos em horas, o número impressiona.",
    "😯 Parece menos quando está espalhado ao longo dos dias.",
    "📱 Seu celular está recebendo uma boa parcela do seu tempo.",
    "🎮 Seu tempo com jogos já representa várias horas da semana.",
    "📺 Dá para assistir bastante coisa nesse tempo, hein?",
    "🤔 Será que você imaginava que daria tudo isso?",
    "😮 Quando colocamos tudo junto, fica mais fácil perceber.",
    "🧠 Talvez seja interessante experimentar pequenas pausas ao longo do dia.",
    "👀 Uma hora a menos por dia já mudaria bastante esse resultado.",
    "⌛ Seu tempo de tela já poderia preencher um dia inteiro da semana.",
    "😲 Isso é mais tempo do que parece quando estamos usando aos poucos.",
    "📊 Os números não estão julgando você — só deixando o hábito mais visível.",
    "🤔 Qual dessas atividades você reduziria primeiro se precisasse escolher?",
    "🌱 Pequenas mudanças diárias viram grandes mudanças no mês.",
    "👣 Não precisa mudar tudo de uma vez. Observar já é um começo.",
    "📵 Talvez algumas partes do dia possam virar momentos sem tela.",
    "🧩 Seu resultado mostra como hábitos pequenos podem ocupar espaços grandes.",
    "😮 Vale pensar: esse tempo combina com o que você gostaria para sua rotina?"
  ],
  veryHigh:[
    "😳 Uau… quando vemos o total assim, impressiona bastante.",
    "🤯 Isso vira muitos dias inteiros ao longo do mês!",
    "👀 Nossa, isso é bastante, não é?",
    "⏰ Seu resultado ocupa uma parte enorme das horas da semana.",
    "😮 Talvez você nunca tivesse colocado esse tempo no papel.",
    "📱 Algumas horas por dia podem virar semanas inteiras ao longo do ano.",
    "🤔 E se uma pequena parte disso fosse usada de outro jeito?",
    "🧠 Não precisa abandonar a tecnologia — mas talvez valha escolher melhor alguns momentos.",
    "😲 O número parece gigante porque pequenos hábitos se acumulam todos os dias.",
    "📊 É exatamente por isso que medir o tempo pode ser tão interessante.",
    "👣 Uma mudança de 30 minutos por dia já faria diferença aqui.",
    "⌛ Imagine recuperar algumas dessas horas todo mês.",
    "🌿 Talvez seja uma boa oportunidade de criar alguns momentos sem tela.",
    "😮 Seu resultado mostra como é fácil perder a noção do tempo quando estamos entretidos.",
    "👀 Você imaginava chegar nesse número?",
    "📱 O “só mais cinco minutos” pode virar muita coisa ao longo de um mês.",
    "💭 O que você gostaria de fazer se tivesse algumas dessas horas de volta?",
    "🛑 Talvez algumas pausas durante o dia façam bem.",
    "🌱 Não é uma bronca — é só um convite para perceber.",
    "💙 Tecnologia é ótima. O desafio é não deixar que ela escolha sozinha como usamos nosso tempo."
  ],
  reflection:[
    "📚 Um pouco de leitura todos os dias também vira muita coisa ao longo do ano.",
    "🤓 Cada meia hora dedicada a algo importante vai se somando.",
    "📖 Pequenos hábitos podem ocupar muitas páginas da nossa história.",
    "🌱 Seu tempo fora das telas também merece aparecer nesse resultado.",
    "📚 Imagine quantas experiências cabem nas horas de uma semana.",
    "⭐ É interessante perceber quais atividades estão ganhando espaço na sua rotina.",
    "🧠 Nem todo tempo diante de uma tela tem o mesmo propósito.",
    "📖 Um pouquinho por dia pode virar centenas de horas ao longo dos anos.",
    "🌟 Pequenas escolhas também se acumulam para o lado positivo.",
    "📚 Que tal comparar o tempo rolando a tela com o tempo dedicado a outras coisas?",
    "🍽️ Que tal experimentar alguns momentos do dia sem celular por perto?",
    "🌙 Um fim de dia com menos telas pode abrir espaço para outros hábitos.",
    "💤 Talvez seu celular também mereça uma hora de descanso.",
    "🗣️ Algumas pausas de tela podem virar conversa com alguém.",
    "🚶 E se uma parte desse tempo virasse movimento, passeio ou brincadeira?",
    "🎨 Algumas horas também podem virar desenho, música, cozinha ou criação.",
    "👀 O objetivo não é usar menos tecnologia a qualquer custo — é usar com intenção.",
    "💡 Saber quanto tempo usamos já muda a forma como enxergamos nossos hábitos.",
    "🧭 Você decide como usar seu tempo. Os números só ajudam a enxergar o caminho.",
    "💙 Tecnologia faz parte da vida. O importante é perceber como estamos usando nosso tempo."
  ]
};

const CHART_META = {
  phone:["📱","Celular","screen"],
  social:["📲","Redes sociais / vídeos curtos","screen-detail"],
  games:["🎮","Jogos","screen-detail"],
  tv:["📺","TV, filmes e vídeos","screen"],
  computer:["💻","Computador / tablet","work"],
  reading:["📚","Leitura","offline"],
  family:["👨‍👩‍👧","Atividades com a família","offline"],
  conversation:["💬","Conversas em casa","offline"],
  physical:["🚶","Atividade física / fora das telas","offline"],
  creative:["🎨","Criatividade / atividades manuais","offline"]
};

const screens={
  welcome:document.querySelector("#welcomeScreen"),
  quiz:document.querySelector("#quizScreen"),
  result:document.querySelector("#resultScreen")
};

const answers={};
let currentQuestion=0;
let resetTimer=null;

function showScreen(name){
  Object.values(screens).forEach(el=>el?.classList.remove("kiosk-screen--active"));
  screens[name]?.classList.add("kiosk-screen--active");
  window.scrollTo({top:0,behavior:"instant"});
}

function formatHours(value){
  const rounded=Math.round(value*10)/10;
  if(rounded===0)return "0h";
  if(rounded<1)return `${Math.round(rounded*60)}min`;
  if(Number.isInteger(rounded))return `${rounded}h`;
  const hours=Math.floor(rounded);
  const minutes=Math.round((rounded-hours)*60);
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}

function weeklyFor(answer){
  if(!answer)return 0;
  return answer.weekday*5 + answer.weekend*2;
}

function renderOptions(container,period){
  container.innerHTML="";
  TIME_OPTIONS.forEach(option=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="kiosk-time-btn";
    button.textContent=option.label;
    button.dataset.value=String(option.value);
    button.setAttribute("role","radio");
    button.setAttribute("aria-checked","false");
    button.addEventListener("click",()=>{
      const question=QUESTIONS[currentQuestion];
      answers[question.id] ||= {};
      answers[question.id][period]=option.value;
      container.querySelectorAll(".kiosk-time-btn").forEach(btn=>{
        const active=btn===button;
        btn.classList.toggle("selected",active);
        btn.setAttribute("aria-checked",active?"true":"false");
      });
      syncNextButton();
    });
    container.appendChild(button);
  });
}

function restoreOptionState(container,period){
  const question=QUESTIONS[currentQuestion];
  const value=answers[question.id]?.[period];
  container.querySelectorAll(".kiosk-time-btn").forEach(btn=>{
    const active=value!==undefined && Number(btn.dataset.value)===value;
    btn.classList.toggle("selected",active);
    btn.setAttribute("aria-checked",active?"true":"false");
  });
}

function syncNextButton(){
  const question=QUESTIONS[currentQuestion];
  const answer=answers[question.id];
  const ready=answer && answer.weekday!==undefined && answer.weekend!==undefined;
  const button=document.querySelector("#nextQuestionBtn");
  button.disabled=!ready;
  button.textContent=currentQuestion===QUESTIONS.length-1
    ?"Ver meu resultado →"
    :"Próxima pergunta →";
}

function renderQuestion(){
  const question=QUESTIONS[currentQuestion];
  const progress=((currentQuestion+1)/QUESTIONS.length)*100;

  document.querySelector("#questionIcon").textContent=question.icon;
  document.querySelector("#questionCategory").textContent=question.category;
  document.querySelector("#questionTitle").textContent=question.title;
  document.querySelector("#questionHint").textContent=question.hint;
  document.querySelector("#questionCounter").textContent=`${currentQuestion+1} de ${QUESTIONS.length}`;
  document.querySelector("#questionPercent").textContent=`${Math.round(progress)}%`;
  document.querySelector("#questionProgressBar").style.width=`${progress}%`;
  document.querySelector("#quizBackBtn").classList.toggle("is-hidden",currentQuestion===0);

  const weekday=document.querySelector("#weekdayOptions");
  const weekend=document.querySelector("#weekendOptions");
  renderOptions(weekday,"weekday");
  renderOptions(weekend,"weekend");
  restoreOptionState(weekday,"weekday");
  restoreOptionState(weekend,"weekend");
  syncNextButton();
}

function choose(list){
  return list[Math.floor(Math.random()*list.length)];
}

function parseReaction(text){
  const match=text.match(/^(\S+)\s+(.*)$/);
  return match ? {emoji:match[1],text:match[2]} : {emoji:"👀",text};
}

function calculateResults(){
  const weekly={};
  QUESTIONS.forEach(question=>weekly[question.id]=weeklyFor(answers[question.id]));

  // Redes sociais e jogos podem estar contidos em celular/computador.
  // Para a estimativa principal, usamos somente os dispositivos/categorias-base.
  const screenEstimate=weekly.phone+weekly.tv+weekly.computer;
  const offlineEstimate=weekly.reading+weekly.family+weekly.conversation+weekly.physical+weekly.creative;
  const month=screenEstimate*4.35;
  const year=screenEstimate*52;
  const days=year/24;

  let bucket="balanced";
  if(screenEstimate>42)bucket="veryHigh";
  else if(screenEstimate>28)bucket="high";
  else if(screenEstimate>14)bucket="moderate";

  const main=parseReaction(choose(COMMENTS[bucket]));
  const reflection=parseReaction(choose(COMMENTS.reflection));

  document.querySelector("#reactionEmoji").textContent=main.emoji;
  document.querySelector("#reactionText").textContent=main.text;
  document.querySelector("#reflectionText").textContent=`${reflection.emoji} ${reflection.text}`;

  document.querySelector("#screenWeek").textContent=formatHours(screenEstimate);
  document.querySelector("#offlineWeek").textContent=formatHours(offlineEstimate);
  document.querySelector("#screenMonth").textContent=formatHours(month);
  document.querySelector("#screenYear").textContent=formatHours(year);
  document.querySelector("#screenDays").textContent=`${Math.round(days)} dias inteiros`;

  renderChart(weekly);
}

function renderChart(weekly){
  const chart=document.querySelector("#usageChart");
  const max=Math.max(...Object.values(weekly),1);
  chart.innerHTML="";

  QUESTIONS.forEach(question=>{
    const value=weekly[question.id];
    const [icon,label,type]=CHART_META[question.id];
    const row=document.createElement("div");
    row.className=`kiosk-chart-row kiosk-chart-row--${type}`;
    row.innerHTML=`
      <div class="kiosk-chart-label">
        <span class="kiosk-chart-icon">${icon}</span>
        <strong>${label}</strong>
        <b>${formatHours(value)}</b>
      </div>
      <div class="kiosk-chart-track"><span style="width:${Math.max(value/max*100,value?4:0)}%"></span></div>
    `;
    chart.appendChild(row);
  });
}

function showResults(){
  calculateResults();
  showScreen("result");
  clearTimeout(resetTimer);
  resetTimer=setTimeout(resetKiosk,90000);
}

function resetKiosk(){
  clearTimeout(resetTimer);
  Object.keys(answers).forEach(key=>delete answers[key]);
  currentQuestion=0;
  showScreen("welcome");
}

document.querySelector("#startKioskBtn").addEventListener("click",()=>{
  currentQuestion=0;
  renderQuestion();
  showScreen("quiz");
});

document.querySelector("#quizBackBtn").addEventListener("click",()=>{
  if(currentQuestion===0)return;
  currentQuestion--;
  renderQuestion();
  window.scrollTo({top:0,behavior:"smooth"});
});

document.querySelector("#nextQuestionBtn").addEventListener("click",()=>{
  const question=QUESTIONS[currentQuestion];
  const answer=answers[question.id];
  if(!answer || answer.weekday===undefined || answer.weekend===undefined)return;

  if(currentQuestion===QUESTIONS.length-1){
    showResults();
    return;
  }

  currentQuestion++;
  renderQuestion();
  window.scrollTo({top:0,behavior:"smooth"});
});

document.querySelector("#restartKioskBtn").addEventListener("click",resetKiosk);

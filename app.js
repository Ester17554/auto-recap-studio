import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

const $=id=>document.getElementById(id);
let state={projects:[],current:null};
let runtime={movie:null,audio:null};
const KEY="AUTO_RECAP_STUDIO_PROJECTS_V1";

function loadState(){try{state.projects=JSON.parse(localStorage.getItem(KEY)||"[]")}catch{state.projects=[]}}
function persist(){localStorage.setItem(KEY,JSON.stringify(state.projects))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("toastShow");setTimeout(()=>t.classList.remove("toastShow"),1800)}
function go(id){
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  $(id).classList.add("active");
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.nav===id));
  window.scrollTo(0,0);
}
function newProject(){
  state.current={id:crypto.randomUUID(),name:"",created:Date.now(),duration:0,script:"",audioDuration:null,rows:[],segments:[],status:"Novo"};
  runtime.movie=null;runtime.audio=null;
  $("projectName").value="";$("projectTitle").textContent="Novo projeto";$("scriptInput").value="";
  $("movieFile").value="";$("audioFile").value="";$("movieInfo").textContent="Nenhum filme selecionado.";$("audioInfo").textContent="Nenhuma narração selecionada.";
  $("analysisBox").classList.add("hidden");go("project");
}
function openProject(p){
  state.current=JSON.parse(JSON.stringify(p));
  runtime.movie=null;runtime.audio=null;
  $("projectName").value=p.name||"Projeto";
  $("projectTitle").textContent=p.name||"Projeto";
  $("scriptInput").value=p.script||"";
  $("movieFile").value="";$("audioFile").value="";
  $("movieInfo").textContent=p.duration?`Filme analisado · ${tc(p.duration)}`:"Selecione o filme novamente para reanalisar.";
  $("audioInfo").textContent=p.audioDuration?`Narração · ${tc(p.audioDuration)}`:"Nenhuma narração salva.";
  if(p.rows?.length){renderMap();go("map")}else go("project");
}
function saveCurrent(){
  if(!state.current)return;
  state.current.name=($("projectName").value||"Projeto sem nome").trim();
  state.current.script=$("scriptInput").value;
  state.current.status=state.current.rows?.length?"Mapa pronto":"Em preparação";
  const i=state.projects.findIndex(p=>p.id===state.current.id);
  if(i>=0)state.projects[i]=state.current;else state.projects.unshift(state.current);
  persist();renderProjects();$("projectTitle").textContent=state.current.name;toast("Projeto salvo");
}
function renderProjects(){
  const list=$("projectList"),empty=$("emptyProjects");list.innerHTML="";
  if(!state.projects.length){empty.style.display="block";return}
  empty.style.display="none";
  state.projects.forEach(p=>{
    const d=document.createElement("div");d.className="projectItem";
    d.innerHTML=`<div><b>${esc(p.name||"Sem nome")}</b><span>${esc(p.status||"Novo")} · ${p.rows?.length||0} candidatos</span></div><div class="projectArrow">›</div>`;
    d.onclick=()=>openProject(p);list.appendChild(d);
  });
}
function tc(t){if(!isFinite(t))return"--:--";t=Math.max(0,t);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${pad(h)}:${pad(m)}:${pad(s)}`:`${pad(m)}:${pad(s)}`}
function pad(n){return String(n).padStart(2,"0")}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function setAnalysis(title,msg){$("analysisBox").classList.remove("hidden");$("analysisTitle").textContent=title;$("analysisStatus").textContent=msg}
function splitScript(text,maxN){
  let a=text.split(/\n+/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
  if(a.length<4)a=(text.replace(/\s+/g," ").match(/[^.!?]+[.!?]+/g)||[text]).map(x=>x.trim()).filter(Boolean);
  const out=[];let buf="";
  for(const x of a){if(!buf)buf=x;else if((buf+" "+x).length<=210)buf+=" "+x;else{out.push(buf);buf=x}}
  if(buf)out.push(buf);
  if(out.length>maxN){const size=Math.ceil(out.length/maxN),m=[];for(let i=0;i<out.length;i+=size)m.push(out.slice(i,i+size).join(" "));return m.slice(0,maxN)}
  return out;
}
function duration(file){return new Promise((res,rej)=>{const v=document.createElement("video");v.preload="metadata";v.onloadedmetadata=()=>{URL.revokeObjectURL(v.src);res(v.duration)};v.onerror=()=>rej(new Error("Não foi possível ler o vídeo."));v.src=URL.createObjectURL(file)})}
function audioduration(file){if(!file)return Promise.resolve(null);return new Promise((res,rej)=>{const a=new Audio(),u=URL.createObjectURL(file);a.onloadedmetadata=()=>{URL.revokeObjectURL(u);res(a.duration)};a.onerror=rej;a.src=u})}
function seek(v,t){return new Promise((res,rej)=>{v.addEventListener("seeked",res,{once:true});v.addEventListener("error",()=>rej(new Error("Falha ao buscar frame.")),{once:true});v.currentTime=Math.max(0,Math.min(t,v.duration-.05))})}
async function frame(v,t,w=360){await seek(v,t);const c=document.createElement("canvas"),r=w/Math.max(1,v.videoWidth);c.width=w;c.height=Math.max(1,Math.round(v.videoHeight*r));c.getContext("2d").drawImage(v,0,0,c.width,c.height);return c}
function data(c){return c.toDataURL("image/jpeg",.64)}
function diff(a,b){const A=a.getContext("2d").getImageData(0,0,a.width,a.height).data,B=b.getContext("2d").getImageData(0,0,b.width,b.height).data;let z=0,n=0;for(let i=0;i<A.length;i+=18){z+=(Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]))/765;n++}return n?z/n:0}
function tokens(s){return [...new Set((s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").match(/[a-z0-9]{4,}/g)||[]))]}

async function analyze(){
  const movie=$("movieFile").files[0],audio=$("audioFile").files[0],script=$("scriptInput").value.trim();
  if(!movie||!script){toast("Selecione o filme e cole o roteiro.");return}
  const step=Number($("sampleStep").value),topk=Number($("candidateCount").value),sens=Number($("cutSensitivity").value),maxN=Number($("maxChunks").value);
  $("analyzeBtn").disabled=true;
  try{
    const dur=await duration(movie),ad=await audioduration(audio);
    runtime.movie=movie;runtime.audio=audio;state.current.duration=dur;state.current.audioDuration=ad;state.current.script=script;state.current.name=($("projectName").value||"Projeto").trim();
    $("movieInfo").textContent=`${movie.name} · ${tc(dur)}`;$("audioInfo").textContent=audio?`${audio.name} · ${tc(ad)}`:"Nenhuma narração.";
    const v=document.createElement("video");v.preload="auto";v.muted=true;v.playsInline=true;v.src=URL.createObjectURL(movie);await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});
    const samples=[],total=Math.ceil(dur/step);let prev=null;
    for(let i=0;i<total;i++){const t=Math.min(i*step,dur-.1);try{const c=await frame(v,t);samples.push({t,c,d:prev?diff(prev,c):0,url:data(c)});prev=c}catch{}setAnalysis("Analisando o filme",`Amostra ${i+1}/${total}`)}
    const bounds=[0];for(let i=1;i<samples.length;i++)if(samples[i].d>=sens)bounds.push(samples[i].t);bounds.push(dur);
    const seg=[];for(let i=0;i<bounds.length-1;i++){let a=bounds[i],b=bounds[i+1];if(b-a<Math.max(1,step*.45))continue;let mid=(a+b)/2,s=samples.reduce((x,y)=>Math.abs(y.t-mid)<Math.abs(x.t-mid)?y:x,samples[0]);seg.push({id:i+1,start:a,end:b,mid,canvas:s.c,url:s.url})}
    state.current.segments=seg.map(s=>({id:s.id,start:s.start,end:s.end,mid:s.mid,url:s.url}));
    setAnalysis("Carregando inteligência visual","Primeira análise pode demorar no celular...");
    env.allowLocalModels=false;
    const clf=await pipeline("zero-shot-image-classification","Xenova/clip-vit-base-patch32",{dtype:"q8"});
    const chunks=splitScript(script,maxN),rows=[];
    for(let ci=0;ci<chunks.length;ci++){
      const text=chunks[ci], phrases=[text,`a movie scene showing ${text}`,`a cinematic scene related to ${text}`,"an unrelated movie scene"];
      const target=(ci/Math.max(1,chunks.length-1))*dur,center=seg.reduce((best,s,i)=>Math.abs(s.mid-target)<Math.abs(seg[best].mid-target)?i:best,0);
      const pool=[],stride=Math.max(1,Math.floor(seg.length/80));for(let i=0;i<seg.length;i+=stride)pool.push(i);for(let d=-12;d<=12;d++)if(seg[center+d])pool.push(center+d);
      const unique=[...new Set(pool)],key=tokens(text),scores=[];
      for(const idx of unique){
        try{
          const s=seg[idx],r=await clf(s.canvas,phrases,{topk:4}),rel=(r.find(x=>x.label===phrases[0])?.score||0)+(r.find(x=>x.label===phrases[1])?.score||0)*.7+(r.find(x=>x.label===phrases[2])?.score||0)*.6;
          const near=Math.exp(-Math.abs(s.mid-target)/Math.max(30,dur*.2))*.1;
          const kw=key.length?Math.min(.06,key.filter(k=>text.toLowerCase().includes(k)).length/key.length*.06):0;
          scores.push({idx,score:rel+near+kw});
        }catch{}
      }
      scores.sort((a,b)=>b.score-a.score);
      const chosen=[],used=[];
      for(const x of scores){const s=seg[x.idx];if(used.some(t=>Math.abs(t-s.mid)<step*1.5))continue;chosen.push(x);used.push(s.mid);if(chosen.length>=topk)break}
      chosen.forEach((x,rank)=>{const s=seg[x.idx],score=Math.min(0.99,x.score);rows.push({trecho:ci+1,candidato:rank+1,roteiro:text,narracao_inicio:ad?(ci/chunks.length)*ad:null,narracao_fim:ad?((ci+1)/chunks.length)*ad:null,filme_inicio:s.start,filme_fim:s.end,frame:s.mid,score:Number(score.toFixed(4)),confianca:score>=.55?"ALTA":score>=.36?"MÉDIA":"BAIXA",cena_id:`CENA_${String(s.id).padStart(4,"0")}`,imagem:s.url,aprovada:false})});
      setAnalysis("Relacionando roteiro com cenas",`Trecho ${ci+1}/${chunks.length}`);
    }
    state.current.rows=rows;state.current.status="Mapa pronto";saveCurrent();renderMap();go("map");toast("Mapa criado");
  }catch(e){console.error(e);setAnalysis("Não foi possível concluir",e.message||"Erro");toast("Tente um trecho menor do filme.")}
  finally{$("analyzeBtn").disabled=false}
}

function renderMap(){
  const p=state.current;if(!p)return;
  $("mapTitle").textContent=p.name||"Projeto";const rows=p.rows||[];
  const groups=new Map();rows.forEach(r=>{if(!groups.has(r.trecho))groups.set(r.trecho,[]);groups.get(r.trecho).push(r)});
  $("statChunks").textContent=groups.size;$("statScenes").textContent=rows.length;$("statApproved").textContent=rows.filter(r=>r.aprovada).length;
  const box=$("mapList");box.innerHTML="";
  for(const [n,arr] of groups){
    const sec=document.createElement("div");sec.className="segment";
    sec.innerHTML=`<div class="segmentTop"><div class="segmentTitle">TRECHO ${pad(n)}</div><div class="segmentTitle">${arr.length} candidatos</div></div><div class="segmentText">${esc(arr[0].roteiro)}</div><div class="candidateGrid"></div>`;
    const grid=sec.querySelector(".candidateGrid");
    arr.forEach((r,i)=>{
      const c=document.createElement("div");c.className="candidate"+(r.aprovada?" approved":"");
      c.innerHTML=`<img src="${r.imagem}" loading="lazy"><div class="candidateBody"><div class="rank">CANDIDATO ${i+1} · ${esc(r.cena_id)}</div><div class="confidence">${r.confianca} · ${r.score}${r.aprovada?'<span class="approvedMark">✓ APROVADA</span>':''}</div><div class="time">Filme: <b>${tc(r.filme_inicio)} → ${tc(r.filme_fim)}</b><br>Frame: ${tc(r.frame)}</div><button class="smallBtn">${r.aprovada?"Desaprovar":"✓ Usar esta cena"}</button></div>`;
      c.querySelector("button").onclick=()=>{r.aprovada=!r.aprovada;persistCurrent();renderMap()};
      grid.appendChild(c);
    });box.appendChild(sec);
  }
}
function persistCurrent(){const i=state.projects.findIndex(x=>x.id===state.current.id);if(i>=0)state.projects[i]=state.current;else state.projects.unshift(state.current);persist()}
function approveBest(){const groups=new Map();state.current.rows.forEach(r=>{if(!groups.has(r.trecho))groups.set(r.trecho,[]);groups.get(r.trecho).push(r)});groups.forEach(a=>{a.sort((x,y)=>y.score-x.score);a.forEach(r=>r.aprovada=false);a[0].aprovada=true});persistCurrent();renderMap();toast("Melhores candidatos aprovados")}
function clearApproved(){state.current.rows.forEach(r=>r.aprovada=false);persistCurrent();renderMap();toast("Aprovações limpas")}
function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function exportJson(){download(`${state.current.name||"projeto"}_mapa.json`,JSON.stringify(state.current.rows,null,2),"application/json")}
function exportCsv(){const h="trecho,candidato,cena_id,narracao_inicio,narracao_fim,filme_inicio,filme_fim,frame,score,confianca,aprovada,roteiro\n";const r=state.current.rows.map(x=>[x.trecho,x.candidato,x.cena_id,x.narracao_inicio??"",x.narracao_fim??"",x.filme_inicio,x.filme_fim,x.frame,x.score,x.confianca,x.aprovada?"SIM":"NAO",`"${String(x.roteiro).replace(/"/g,'""')}"`].join(","));download(`${state.current.name||"projeto"}_mapa.csv`,h+r.join("\n"),"text/csv")}
function exportPlan(){
  const rows=state.current.rows.filter(r=>r.aprovada).sort((a,b)=>a.trecho-b.trecho);
  let out=`AUTO RECAP STUDIO — PLANO CAPCUT\nProjeto: ${state.current.name}\n\n`;
  rows.forEach((r,i)=>{out+=`CENA ${String(i+1).padStart(3,"0")}\nRoteiro: ${r.roteiro}\nFilme: ${tc(r.filme_inicio)} -> ${tc(r.filme_fim)}\nFrame: ${tc(r.frame)}\nScore: ${r.score} (${r.confianca})\n\n`});
  if(!rows.length)out+="Nenhuma cena aprovada ainda.\n";
  download(`${state.current.name||"projeto"}_plano_capcut.txt`,out,"text/plain")
}
function showExport(){go("export")}
function wire(){
  $("startBtn").onclick=newProject;$("newProject").onclick=newProject;$("saveProject").onclick=saveCurrent;$("analyzeBtn").onclick=analyze;
  $("movieFile").onchange=()=>{$("movieInfo").textContent=$("movieFile").files[0]?.name||"Nenhum filme selecionado."};
  $("audioFile").onchange=()=>{$("audioInfo").textContent=$("audioFile").files[0]?.name||"Nenhuma narração selecionada."};
  $("approveAll").onclick=approveBest;$("clearApproved").onclick=clearApproved;$("exportBtn").onclick=showExport;$("exportTop").onclick=showExport;$("capcutBtn").onclick=()=>{showExport();toast("Aprove as cenas e baixe o plano CapCut")};
  $("downloadJson").onclick=exportJson;$("downloadCsv").onclick=exportCsv;$("downloadPlan").onclick=exportPlan;
  document.querySelectorAll("[data-back]").forEach(b=>b.onclick=()=>go(b.dataset.back));
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.nav));
}
loadState();wire();renderProjects();
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});

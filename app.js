const $=id=>document.getElementById(id);
const KEY="AUTO_RECAP_STUDIO_PROJECTS_V5";
let state={projects:[],current:null};
let runtime={movie:null,audioFiles:[]};

function loadState(){try{state.projects=JSON.parse(localStorage.getItem(KEY)||"[]")}catch{state.projects=[]}}
function persist(){localStorage.setItem(KEY,JSON.stringify(state.projects))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("toastShow");setTimeout(()=>t.classList.remove("toastShow"),2200)}
function go(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.nav===id));window.scrollTo(0,0)}
function newProject(){state.current={id:crypto.randomUUID(),name:"",created:Date.now(),duration:0,script:"",audioDuration:null,audioParts:[],rows:[],segments:[],status:"Novo",engine:"V5-mobile-lite"};runtime.movie=null;runtime.audioFiles=[];$('projectName').value="";$('projectTitle').textContent="Novo projeto";$('scriptInput').value="";$('movieFile').value="";$('audioFile').value="";$('movieInfo').textContent="Nenhum filme selecionado.";$('audioInfo').textContent="Nenhuma narração selecionada.";$('audioList').innerHTML="";$('analysisBox').classList.add('hidden');setProgress(0);go('project')}
function openProject(p){state.current=JSON.parse(JSON.stringify(p));runtime.movie=null;runtime.audioFiles=[];$('projectName').value=p.name||'Projeto';$('projectTitle').textContent=p.name||'Projeto';$('scriptInput').value=p.script||'';$('movieFile').value='';$('audioFile').value='';$('movieInfo').textContent=p.duration?`Filme analisado · ${tc(p.duration)}`:'Selecione o filme novamente para gerar novos frames.';$('audioInfo').textContent=p.audioDuration?`Narração virtual · ${tc(p.audioDuration)} · ${p.audioParts?.length||0} arquivo(s)`:'Nenhuma narração salva.';$('audioList').innerHTML='';if(p.rows?.length){renderMap();go('map')}else go('project')}
function saveCurrent(){if(!state.current)return;state.current.name=($('projectName').value||'Projeto sem nome').trim();state.current.script=$('scriptInput').value;state.current.status=state.current.rows?.length?'Mapa pronto':'Em preparação';const i=state.projects.findIndex(p=>p.id===state.current.id);if(i>=0)state.projects[i]=state.current;else state.projects.unshift(state.current);persist();renderProjects();$('projectTitle').textContent=state.current.name;toast('Projeto salvo')}
function renderProjects(){const list=$('projectList'),empty=$('emptyProjects');list.innerHTML='';if(!state.projects.length){empty.style.display='block';return}empty.style.display='none';state.projects.forEach(p=>{const d=document.createElement('div');d.className='projectItem';d.innerHTML=`<div><b>${esc(p.name||'Sem nome')}</b><span>${esc(p.status||'Novo')} · ${p.rows?.length||0} candidatos</span></div><div class="projectArrow">›</div>`;d.onclick=()=>openProject(p);list.appendChild(d)})}
function tc(t){if(!isFinite(t))return'--:--';t=Math.max(0,t);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${pad(h)}:${pad(m)}:${pad(s)}`:`${pad(m)}:${pad(s)}`}
function pad(n){return String(n).padStart(2,'0')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function setAnalysis(title,msg){$('analysisBox').classList.remove('hidden');$('analysisTitle').textContent=title;$('analysisStatus').textContent=msg}
function setProgress(v){$('progressBar').style.width=`${Math.max(0,Math.min(100,v))}%`}
function splitScript(text,maxN){
  // The input itself has no character limit. We keep the full script in state.current.script.
  // This function only creates working segments for the scene map.
  const clean=String(text||'').replace(/\r/g,'').trim();
  if(!clean)return [];
  let parts=clean.split(/\n\s*\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
  if(parts.length===1) parts=(clean.match(/[^.!?]+(?:[.!?]+|$)/g)||[clean]).map(x=>x.trim()).filter(Boolean);
  const out=[]; let buf=''; const TARGET=360;
  for(const p of parts){
    if(!buf){buf=p;continue;}
    if((buf+' '+p).length<=TARGET){buf+=' '+p;}
    else{out.push(buf);buf=p;}
  }
  if(buf)out.push(buf);
  if(Number(maxN)>0 && out.length>Number(maxN)){
    const n=Math.ceil(out.length/Number(maxN)); const merged=[];
    for(let i=0;i<out.length;i+=n)merged.push(out.slice(i,i+n).join(' '));
    return merged;
  }
  return out;
}
function updateScriptInfo(){const t=$('scriptInput').value||'';const words=t.trim()?t.trim().split(/\s+/).length:0;$('scriptInfo').textContent=`${t.length.toLocaleString('pt-BR')} caracteres · ${words.toLocaleString('pt-BR')} palavras`}

function duration(file){return new Promise((res,rej)=>{
  const v=document.createElement('video'); v.preload='metadata'; v.muted=true; v.playsInline=true;
  const u=URL.createObjectURL(file); let done=false;
  const finish=(fn,val)=>{if(done)return;done=true;URL.revokeObjectURL(u);v.removeAttribute('src');try{v.load()}catch{};fn(val)};
  v.onloadedmetadata=()=>finish(res,v.duration);
  v.onerror=()=>finish(rej,new Error('O Safari não conseguiu ler a duração/codec deste vídeo. O arquivo pode continuar selecionado; tente analisar mesmo assim ou use MP4/H.264.'));
  v.src=u;
})}
function inspectMovie(file){
  if(!file)return;
  const info=$('movieInfo'), diag=$('movieDiag');
  const mb=(file.size/1048576).toFixed(1);
  info.textContent=`✅ Arquivo selecionado: ${file.name}`;
  diag.classList.remove('hidden');
  diag.innerHTML=`<b>Arquivo recebido pelo Safari.</b><br>${mb} MB · ${file.type||'tipo não informado'}<br><span>Agora vamos testar somente os metadados, sem carregar o filme inteiro.</span>`;
  // Metadata test is intentionally separate from selection. A codec failure must not erase the selected file.
  duration(file).then(d=>{
    state.current.duration=d;
    info.textContent=`✅ ${file.name} · ${mb} MB · duração ${tc(d)}`;
    diag.innerHTML=`<b>✅ Filme reconhecido.</b><br>${mb} MB · ${file.type||'tipo não informado'} · ${tc(d)}<br><span>Pronto para criar o mapa.</span>`;
  }).catch(e=>{
    info.textContent=`⚠️ ${file.name} · ${mb} MB · arquivo selecionado`;
    diag.innerHTML=`<b>⚠️ O arquivo foi selecionado, mas o Safari não conseguiu ler os metadados.</b><br>${mb} MB · ${file.type||'tipo não informado'}<br><span>${esc(e.message)}</span>`;
  });
}

function audioDuration(file){if(!file)return Promise.resolve(null);return new Promise(res=>{const a=document.createElement('audio');a.preload='metadata';const u=URL.createObjectURL(file);let done=false;const finish=d=>{if(done)return;done=true;URL.revokeObjectURL(u);res(isFinite(d)?d:null)};a.onloadedmetadata=()=>finish(a.duration);a.onerror=()=>finish(null);a.src=u})}
async function inspectAudioFiles(files){
  runtime.audioFiles=Array.from(files||[]);
  const list=$('audioList'); list.innerHTML='';
  if(!runtime.audioFiles.length){$('audioInfo').textContent='Nenhuma narração selecionada.';return;}
  const parts=[]; let total=0; let allKnown=true;
  for(let i=0;i<runtime.audioFiles.length;i++){
    const f=runtime.audioFiles[i]; const d=await audioDuration(f); if(d==null) allKnown=false; else total+=d;
    parts.push({index:i+1,name:f.name,size:f.size,type:f.type||'audio',duration:d});
    const row=document.createElement('div'); row.className='audioRow'; row.innerHTML=`<div class="audioRowMain"><b>${i+1}. ${esc(f.name)}</b><span>${d!=null?tc(d):'duração não lida'}</span></div><div class="audioRowBtns"><button class="tinyBtn" data-up="${i}">↑</button><button class="tinyBtn" data-down="${i}">↓</button><button class="tinyBtn danger" data-remove="${i}">×</button></div>`; list.appendChild(row);
  }
  const count=runtime.audioFiles.length; $('audioInfo').textContent=allKnown?`${count} arquivo(s) · narração total ${tc(total)}`:`${count} arquivo(s) · algumas durações não puderam ser lidas; o mapa ainda pode ser criado.`;
  list.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.remove);runtime.audioFiles.splice(i,1);syncAudioInput();inspectAudioFiles(runtime.audioFiles)});
  list.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>moveAudio(Number(b.dataset.up),-1));
  list.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>moveAudio(Number(b.dataset.down),1));
}
function syncAudioInput(){try{const dt=new DataTransfer();runtime.audioFiles.forEach(f=>dt.items.add(f));$('audioFile').files=dt.files}catch(e){}}
function moveAudio(i,delta){const j=i+delta;if(j<0||j>=runtime.audioFiles.length)return;[runtime.audioFiles[i],runtime.audioFiles[j]]=[runtime.audioFiles[j],runtime.audioFiles[i]];syncAudioInput();inspectAudioFiles(runtime.audioFiles)}
function buildAudioTimeline(files){return files.map((f,i)=>f.duration!=null?f:null)}
function seek(v,t){return new Promise((res,rej)=>{let done=false;const ok=()=>{if(done)return;done=true;res()};const bad=()=>{if(done)return;done=true;rej(new Error('Falha ao buscar frame.'))};v.addEventListener('seeked',ok,{once:true});v.addEventListener('error',bad,{once:true});v.currentTime=Math.max(0,Math.min(t,Math.max(0,v.duration-.05)))})}
async function frame(v,t,w=240){await seek(v,t);const c=document.createElement('canvas');const scale=w/Math.max(1,v.videoWidth);c.width=w;c.height=Math.max(1,Math.round(v.videoHeight*scale));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0,c.width,c.height);return c}
function thumb(c){return c.toDataURL('image/jpeg',.52)}
function signature(c){const ctx=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height,d=ctx.getImageData(0,0,w,h).data;let out=[];for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=8){const i=(y*w+x)*4;out.push((d[i]+d[i+1]+d[i+2])>>5)}return out}
function diffSig(a,b){if(!a||!b)return 1;let z=0;for(let i=0;i<Math.min(a.length,b.length);i++)z+=Math.abs(a[i]-b[i]);return z/(a.length*8)}
function tokens(s){return [...new Set((s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{4,}/g)||[]))]}
function keywordScore(text,scene){const ks=tokens(text);if(!ks.length)return 0;const hit=ks.filter(k=>scene.tags.includes(k)).length;return Math.min(.22,hit/ks.length*.22)}
async function analyze(){const movie=$('movieFile').files[0],audioFiles=runtime.audioFiles.length?runtime.audioFiles:Array.from($('audioFile').files||[]),script=$('scriptInput').value;if(!movie||!script.trim()){toast('Selecione o filme e cole o roteiro.');return}const step=Number($('sampleStep').value),topk=Number($('candidateCount').value),sens=Number($('cutSensitivity').value),maxN=Number($('maxChunks').value);$('analyzeBtn').disabled=true;try{setProgress(1);setAnalysis('Lendo arquivos','Abrindo apenas os metadados...');const dur=await duration(movie);runtime.movie=movie;runtime.audioFiles=audioFiles;const audioParts=[];let audioCursor=0;let audioKnown=true;for(let i=0;i<audioFiles.length;i++){const d=await audioDuration(audioFiles[i]);audioParts.push({index:i+1,name:audioFiles[i].name,duration:d,start:audioCursor,end:d!=null?audioCursor+d:audioCursor});if(d==null)audioKnown=false;else audioCursor+=d;}const ad=audioFiles.length&&audioKnown?audioCursor:null;state.current.duration=dur;state.current.audioDuration=ad;state.current.audioParts=audioParts;state.current.script=script;state.current.name=($('projectName').value||'Projeto').trim();$('movieInfo').textContent=`${movie.name} · ${tc(dur)}`;$('audioInfo').textContent=audioFiles.length?(ad?`${audioFiles.length} arquivo(s) · narração total ${tc(ad)}`:`${audioFiles.length} arquivo(s) · duração total não lida pelo Safari`):'Nenhuma narração.';
const v=document.createElement('video');v.preload='metadata';v.muted=true;v.playsInline=true;v.src=URL.createObjectURL(movie);await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(new Error('Não foi possível abrir o filme no Safari.'))});const samples=[];const total=Math.max(1,Math.ceil(dur/step));let prev=null;for(let i=0;i<total;i++){const t=Math.min(i*step,Math.max(0,dur-.1));try{const c=await frame(v,t);const sig=signature(c);samples.push({t,c,sig,d:prev?diffSig(prev,sig):1,url:thumb(c)});prev=sig}catch(e){}setProgress(5+(i+1)/total*55);setAnalysis('Extraindo frames',`Frame ${i+1} de ${total} · ${tc(t)}`);await new Promise(r=>setTimeout(r,0))}if(!samples.length)throw new Error('O Safari não conseguiu extrair frames deste filme.');
const bounds=[0];for(let i=1;i<samples.length;i++)if(samples[i].d>=sens)bounds.push(samples[i].t);bounds.push(dur);const seg=[];for(let i=0;i<bounds.length-1;i++){const a=bounds[i],b=bounds[i+1];if(b-a<Math.max(2,step*.5))continue;const mid=(a+b)/2;const s=samples.reduce((best,y)=>Math.abs(y.t-mid)<Math.abs(best.t-mid)?y:best,samples[0]);seg.push({id:i+1,start:a,end:b,mid,url:s.url,tags:[]})}if(!seg.length)throw new Error('Nenhuma cena foi encontrada.');
// Lightweight keyword hints are used only as metadata; the V3 does not claim visual-semantic AI matching.
const allText=script.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');const words=tokens(allText);seg.forEach(s=>{const near=words.slice(0,Math.min(12,words.length));s.tags=near});state.current.segments=seg.map(s=>({id:s.id,start:s.start,end:s.end,mid:s.mid,url:s.url}));
const chunks=splitScript(script,maxN);const rows=[];for(let ci=0;ci<chunks.length;ci++){const text=chunks[ci];const nStart=ad?(ci/chunks.length)*ad:null;const nEnd=ad?((ci+1)/chunks.length)*ad:null;const target=ad?((nStart+nEnd)/2):((ci+.5)/chunks.length)*dur;const filmTarget=ad?((ci+.5)/chunks.length)*dur:target;const center=seg.reduce((best,s,i)=>Math.abs(s.mid-filmTarget)<Math.abs(seg[best].mid-filmTarget)?i:best,0);const candidates=[];for(let d=-10;d<=10;d++){const idx=center+d;if(seg[idx]){const s=seg[idx],near=Math.exp(-Math.abs(s.mid-filmTarget)/Math.max(20,dur*.18));candidates.push({s,score:.55*near+keywordScore(text,s)})}}candidates.sort((a,b)=>b.score-a.score);const chosen=[];for(const x of candidates){if(chosen.some(y=>Math.abs(y.s.mid-x.s.mid)<step*.8))continue;chosen.push(x);if(chosen.length>=topk)break}chosen.forEach((x,rank)=>{const s=x.s;const score=Math.min(.95,.35+x.score*.6);const overlaps=ad?audioParts.filter(p=>p.duration!=null&&p.end>nStart&&p.start<nEnd).map(p=>p.name):[];rows.push({trecho:ci+1,candidato:rank+1,roteiro:text,narracao_inicio:nStart,narracao_fim:nEnd,narracao_arquivos:overlaps,filme_inicio:s.start,filme_fim:s.end,frame:s.mid,score:Number(score.toFixed(3)),confianca:'GUIA',cena_id:`CENA_${String(s.id).padStart(4,'0')}`,imagem:s.url,aprovada:false,metodo:'V5-lite · proximidade temporal + detecção de mudança'});});setProgress(60+(ci+1)/chunks.length*38);setAnalysis('Montando mapa',`Trecho ${ci+1} de ${chunks.length}`);await new Promise(r=>setTimeout(r,0))}
state.current.rows=rows;state.current.status='Mapa pronto';state.current.engine='V5-mobile-lite';saveCurrent();renderMap();setProgress(100);go('map');toast('Mapa V5 criado');URL.revokeObjectURL(v.src)}catch(e){console.error(e);setAnalysis('Não foi possível concluir',e.message||'Erro');toast('A análise parou. Veja a mensagem acima.')}finally{$('analyzeBtn').disabled=false}}
function renderMap(){const p=state.current;if(!p)return;$('mapTitle').textContent=p.name||'Projeto';const rows=p.rows||[];const groups=new Map();rows.forEach(r=>{if(!groups.has(r.trecho))groups.set(r.trecho,[]);groups.get(r.trecho).push(r)});$('statChunks').textContent=groups.size;$('statScenes').textContent=rows.length;$('statApproved').textContent=rows.filter(r=>r.aprovada).length;const box=$('mapList');box.innerHTML='';for(const [n,arr] of groups){const sec=document.createElement('div');sec.className='segment';sec.innerHTML=`<div class="segmentTop"><div class="segmentTitle">TRECHO ${pad(n)}</div><div class="segmentTitle">${arr.length} candidatos</div></div><div class="segmentText">${esc(arr[0].roteiro)}</div><div class="candidateGrid"></div>`;const grid=sec.querySelector('.candidateGrid');arr.forEach((r,i)=>{const c=document.createElement('div');c.className='candidate'+(r.aprovada?' approved':'');c.innerHTML=`<img src="${r.imagem}" loading="lazy"><div class="candidateBody"><div class="rank">CANDIDATO ${i+1} · ${esc(r.cena_id)}</div><div class="confidence">${r.confianca} · ${r.score}${r.aprovada?'<span class="approvedMark">✓ APROVADA</span>':''}</div><div class="time">Narração: <b>${r.narracao_inicio!=null?tc(r.narracao_inicio):'--:--'} → ${r.narracao_fim!=null?tc(r.narracao_fim):'--:--'}</b><br>Áudio: ${r.narracao_arquivos?.length?esc(r.narracao_arquivos.join(' + ')):'linha do tempo não identificada'}<br>Filme: <b>${tc(r.filme_inicio)} → ${tc(r.filme_fim)}</b><br>Frame: ${tc(r.frame)}</div><button class="smallBtn">${r.aprovada?'Desaprovar':'✓ Usar esta cena'}</button></div>`;c.querySelector('button').onclick=()=>{r.aprovada=!r.aprovada;persistCurrent();renderMap()};grid.appendChild(c)});box.appendChild(sec)}}
function persistCurrent(){const i=state.projects.findIndex(x=>x.id===state.current.id);if(i>=0)state.projects[i]=state.current;else state.projects.unshift(state.current);persist()}
function approveBest(){const groups=new Map();state.current.rows.forEach(r=>{if(!groups.has(r.trecho))groups.set(r.trecho,[]);groups.get(r.trecho).push(r)});groups.forEach(a=>{a.sort((x,y)=>y.score-x.score);a.forEach(r=>r.aprovada=false);if(a[0])a[0].aprovada=true});persistCurrent();renderMap();toast('Melhores guias aprovados')}
function clearApproved(){state.current.rows.forEach(r=>r.aprovada=false);persistCurrent();renderMap();toast('Aprovações limpas')}
function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function exportJson(){download(`${state.current.name||'projeto'}_mapa_v5.json`,JSON.stringify(state.current,null,2),'application/json')}
function exportCsv(){const h='trecho,candidato,cena_id,narracao_inicio,narracao_fim,narracao_arquivos,filme_inicio,filme_fim,frame,score,confianca,aprovada,metodo,roteiro\n';const r=state.current.rows.map(x=>[x.trecho,x.candidato,x.cena_id,x.narracao_inicio??'',x.narracao_fim??'',`"${(x.narracao_arquivos||[]).join(' + ').replace(/"/g,'""')}"`,x.filme_inicio,x.filme_fim,x.frame,x.score,x.confianca,x.aprovada?'SIM':'NAO',x.metodo,`"${String(x.roteiro).replace(/"/g,'""')}"`].join(','));download(`${state.current.name||'projeto'}_mapa_v5.csv`,h+r.join('\n'),'text/csv')}
function exportPlan(){const rows=state.current.rows.filter(r=>r.aprovada).sort((a,b)=>a.trecho-b.trecho);let out=`AUTO RECAP STUDIO V5 — PLANO CAPCUT\nProjeto: ${state.current.name}\n\n`;rows.forEach((r,i)=>{out+=`CENA ${String(i+1).padStart(3,'0')}\nRoteiro: ${r.roteiro}\nNarração: ${r.narracao_inicio!=null?tc(r.narracao_inicio):'--:--'} -> ${r.narracao_fim!=null?tc(r.narracao_fim):'--:--'}\nÁudio: ${(r.narracao_arquivos||[]).join(' + ')}\nFilme: ${tc(r.filme_inicio)} -> ${tc(r.filme_fim)}\nFrame: ${tc(r.frame)}\nMétodo: ${r.metodo}\n\n`});if(!rows.length)out+='Nenhuma cena aprovada ainda.\n';download(`${state.current.name||'projeto'}_plano_capcut_v5.txt`,out,'text/plain')}
function showExport(){go('export')}
function wire(){$('startBtn').onclick=newProject;$('newProject').onclick=newProject;$('saveProject').onclick=saveCurrent;$('analyzeBtn').onclick=analyze;$('movieFile').onchange=()=>{const f=$('movieFile').files[0];if(f)inspectMovie(f);else{$('movieInfo').textContent='Nenhum filme selecionado.';$('movieDiag').classList.add('hidden')}};$('scriptInput').addEventListener('input',updateScriptInfo);$('audioFile').onchange=()=>inspectAudioFiles(Array.from($('audioFile').files||[]));$('approveAll').onclick=approveBest;$('clearApproved').onclick=clearApproved;$('exportBtn').onclick=showExport;$('exportTop').onclick=showExport;$('capcutBtn').onclick=()=>{showExport();toast('Aprove as cenas e baixe o plano CapCut')};$('downloadJson').onclick=exportJson;$('downloadCsv').onclick=exportCsv;$('downloadPlan').onclick=exportPlan;document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>go(b.dataset.back));document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>go(b.dataset.nav))}
loadState();wire();renderProjects();
// Remove any older V1/V2 service worker and cached copies that can keep the old input UI on iPhone.
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});if(window.caches)caches.keys().then(keys=>keys.filter(k=>k.includes('auto-recap-studio')).forEach(k=>caches.delete(k))).catch(()=>{})}

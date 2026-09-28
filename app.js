const $=id=>document.getElementById(id);
const KEY='AUTO_RECAP_STUDIO_PROJECTS_V10';
let state={projects:[],current:null};
let runtime={movie:null,audioFiles:[],libraryFiles:[],thumbCache:new Map()};

function loadState(){try{state.projects=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{state.projects=[]}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state.projects))}catch(e){toast('Mapa salvo sem thumbnails por limite do iPhone.')}}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('toastShow');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('toastShow'),2600)}
function go(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.nav===id));window.scrollTo(0,0)}
function tc(t){if(!isFinite(t))return'--:--';t=Math.max(0,t);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60);return h?`${pad(h)}:${pad(m)}:${pad(s)}`:`${pad(m)}:${pad(s)}`}
function pad(n){return String(n).padStart(2,'0')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function setAnalysis(title,msg,eta=''){$('analysisBox').classList.remove('hidden');$('analysisTitle').textContent=title;$('analysisStatus').textContent=msg;$('analysisEta').textContent=eta}
function setProgress(v){$('progressBar').style.width=`${Math.max(0,Math.min(100,v))}%`}
function nextFrame(){return new Promise(r=>requestAnimationFrame(()=>r()))}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

function newProject(){state.current={id:crypto.randomUUID(),name:'',created:Date.now(),duration:0,script:'',audioDuration:null,audioParts:[],rows:[],segments:[],status:'Novo',engine:'V11-local-reused-decoder'};runtime.movie=null;runtime.audioFiles=[];runtime.libraryFiles=[];runtime.thumbCache.clear();resetForm();go('project')}
function resetForm(){$('projectName').value='';$('projectTitle').textContent='Novo projeto';$('scriptInput').value='';$('movieFile').value='';$('moviePhotoFile').value='';$('audioFile').value='';$('mediaLibrary').value='';$('movieInfo').textContent='Nenhum filme selecionado.';$('movieDiag').classList.add('hidden');$('audioInfo').textContent='Nenhuma narração selecionada.';$('audioList').innerHTML='';$('libraryList').innerHTML='';$('libraryInfo').textContent='Opcional. O filme principal continua sendo a fonte.';$('moviePreview').classList.add('hidden');$('moviePreviewVideo').removeAttribute('src');$('analysisBox').classList.add('hidden');setProgress(0);updateScriptInfo()}
function openProject(p){state.current=JSON.parse(JSON.stringify(p));runtime.movie=null;runtime.audioFiles=[];runtime.libraryFiles=[];runtime.thumbCache.clear();$('projectName').value=p.name||'Projeto';$('projectTitle').textContent=p.name||'Projeto';$('scriptInput').value=p.script||'';$('movieFile').value='';$('moviePhotoFile').value='';$('audioFile').value='';$('mediaLibrary').value='';$('movieInfo').textContent=p.duration?`Mapa salvo · filme ${tc(p.duration)}`:'Selecione o filme novamente para analisar.';$('audioInfo').textContent=p.audioDuration?`Narração virtual · ${tc(p.audioDuration)} · ${p.audioParts?.length||0} arquivo(s)`:'Nenhuma narração salva.';$('audioList').innerHTML='';updateScriptInfo();if(p.rows?.length){renderMap();go('map')}else go('project')}
function saveCurrent(){if(!state.current)return;state.current.name=($('projectName').value||'Projeto sem nome').trim();state.current.script=$('scriptInput').value;state.current.status=state.current.rows?.length?'Mapa pronto':'Em preparação';persistCurrent();renderProjects();$('projectTitle').textContent=state.current.name;toast('Projeto salvo')}
function persistCurrent(){const i=state.projects.findIndex(p=>p.id===state.current.id);if(i>=0)state.projects[i]=state.current;else state.projects.unshift(state.current);persist()}
function renderProjects(){const list=$('projectList'),empty=$('emptyProjects');list.innerHTML='';if(!state.projects.length){empty.style.display='block';return}empty.style.display='none';state.projects.forEach(p=>{const d=document.createElement('div');d.className='projectItem';d.innerHTML=`<div><b>${esc(p.name||'Sem nome')}</b><span>${esc(p.status||'Novo')} · ${p.rows?.length||0} candidatos</span></div><div class="projectArrow">›</div>`;d.onclick=()=>openProject(p);list.appendChild(d)})}
function updateScriptInfo(){const t=$('scriptInput').value||'';const words=t.trim()?t.trim().split(/\s+/).length:0;$('scriptInfo').textContent=`${t.length.toLocaleString('pt-BR')} caracteres · ${words.toLocaleString('pt-BR')} palavras`}

function duration(file){return new Promise((res,rej)=>{const v=document.createElement('video');v.preload='metadata';v.muted=true;v.playsInline=true;const u=URL.createObjectURL(file);let done=false;const finish=(fn,val)=>{if(done)return;done=true;URL.revokeObjectURL(u);v.removeAttribute('src');try{v.load()}catch{};fn(val)};v.onloadedmetadata=()=>finish(res,v.duration);v.onerror=()=>finish(rej,new Error('O iPhone não conseguiu ler a duração/codec. Tente MP4/H.264 se o arquivo não abrir.'));v.src=u})}
function inspectMovie(file){if(!file)return;runtime.movie=file;const mb=(file.size/1048576).toFixed(1);$('movieInfo').textContent=`✅ Arquivo recebido: ${file.name}`;$('movieDiag').classList.remove('hidden');$('movieDiag').innerHTML=`<b>🔒 Local.</b><br>${mb} MB · ${file.type||'tipo não informado'}<br><span>O V8 não envia o filme para a internet.</span>`;const pv=$('moviePreviewVideo');try{if(pv.dataset.url)URL.revokeObjectURL(pv.dataset.url);const u=URL.createObjectURL(file);pv.dataset.url=u;pv.src=u;$('moviePreview').classList.remove('hidden')}catch(e){}duration(file).then(d=>{state.current.duration=d;$('movieInfo').textContent=`✅ ${file.name} · ${mb} MB · duração ${tc(d)}`;$('movieDiag').innerHTML=`<b>✅ Filme reconhecido.</b><br>${mb} MB · ${file.type||'tipo não informado'} · ${tc(d)}<br><span>Pronto para o mapa local.</span>`}).catch(e=>{$('movieInfo').textContent=`⚠️ ${file.name} · ${mb} MB · selecionado`;$('movieDiag').innerHTML=`<b>⚠️ O arquivo foi recebido, mas o codec não respondeu aos metadados.</b><br>${mb} MB · ${file.type||'tipo não informado'}<br><span>${esc(e.message)}</span>`})}

function audioDuration(file){return new Promise(res=>{const a=document.createElement('audio');a.preload='metadata';const u=URL.createObjectURL(file);let done=false;const finish=d=>{if(done)return;done=true;URL.revokeObjectURL(u);res(isFinite(d)?d:null)};a.onloadedmetadata=()=>finish(a.duration);a.onerror=()=>finish(null);a.src=u})}
async function inspectAudioFiles(files,append=true){const incoming=Array.from(files||[]);runtime.audioFiles=append?[...runtime.audioFiles,...incoming]:incoming;$('audioList').innerHTML='';if(!runtime.audioFiles.length){$('audioInfo').textContent='Nenhuma narração selecionada.';return}const parts=[];let total=0,known=true;for(let i=0;i<runtime.audioFiles.length;i++){const f=runtime.audioFiles[i],d=await audioDuration(f);if(d==null)known=false;else total+=d;parts.push({index:i+1,name:f.name,size:f.size,type:f.type||'audio',duration:d});const row=document.createElement('div');row.className='audioRow';row.innerHTML=`<div class="audioRowMain"><b>${i+1}. ${esc(f.name)}</b><span>${d!=null?tc(d):'duração não lida'}</span></div><div class="audioRowBtns"><button class="tinyBtn" data-up="${i}">↑</button><button class="tinyBtn" data-down="${i}">↓</button><button class="tinyBtn danger" data-remove="${i}">×</button></div>`;$('audioList').appendChild(row)}$('audioInfo').textContent=known?`${runtime.audioFiles.length} arquivo(s) · narração total ${tc(total)}`:`${runtime.audioFiles.length} arquivo(s) · algumas durações não lidas`;state.current.audioParts=parts;state.current.audioDuration=known?total:null;$('audioList').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{runtime.audioFiles.splice(Number(b.dataset.remove),1);inspectAudioFiles(runtime.audioFiles,false)});$('audioList').querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>moveAudio(Number(b.dataset.up),-1));$('audioList').querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>moveAudio(Number(b.dataset.down),1))}
function moveAudio(i,d){const j=i+d;if(j<0||j>=runtime.audioFiles.length)return;[runtime.audioFiles[i],runtime.audioFiles[j]]=[runtime.audioFiles[j],runtime.audioFiles[i]];inspectAudioFiles(runtime.audioFiles,false)}
function showLibrary(files){runtime.libraryFiles=Array.from(files||[]);$('libraryList').innerHTML='';runtime.libraryFiles.forEach((f,i)=>{const row=document.createElement('div');row.className='audioRow';row.innerHTML=`<div class="audioRowMain"><b>${i+1}. ${esc(f.name)}</b><span>${(f.size/1048576).toFixed(1)} MB · ${esc(f.type||'mídia')}</span></div>`;$('libraryList').appendChild(row)});$('libraryInfo').textContent=runtime.libraryFiles.length?`${runtime.libraryFiles.length} item(ns) disponíveis nesta sessão.`:'Nenhum item selecionado.'}
function addAudioPicker(){$('audioFile').value='';$('audioFile').click()}

function splitScript(text,maxN){const clean=String(text||'').replace(/\r/g,'').trim();if(!clean)return[];let parts=clean.split(/\n\s*\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);if(parts.length===1)parts=(clean.match(/[^.!?]+(?:[.!?]+|$)/g)||[clean]).map(x=>x.trim()).filter(Boolean);const out=[];let buf='';const TARGET=300;for(const p of parts){if(!buf){buf=p;continue}if((buf+' '+p).length<=TARGET)buf+=' '+p;else{out.push(buf);buf=p}}if(buf)out.push(buf);if(Number(maxN)>0&&out.length>Number(maxN)){const n=Math.ceil(out.length/Number(maxN)),m=[];for(let i=0;i<out.length;i+=n)m.push(out.slice(i,i+n).join(' '));return m}return out}
function normalizeWords(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!['para','como','essa','esse','eles','elas','porque','quando','entao','muito','mais','tambem','sobre','onde','depois','agora','assim','isso','esta','este','uma','umas','uns','dos','das'].includes(w))}

// Small visual signature. It never stores the full frame.
function signature(canvas){const ctx=canvas.getContext('2d',{willReadFrequently:true});const w=32,h=18;const data=ctx.getImageData(0,0,w,h).data;const out=new Float32Array(w*h);let sum=0;for(let i=0,p=0;i<data.length;i+=4,p++){const g=(data[i]*.299+data[i+1]*.587+data[i+2]*.114)/255;out[p]=g;sum+=g}const mean=sum/out.length;for(let i=0;i<out.length;i++)out[i]-=mean;return out}
function diffSig(a,b){if(!a||!b)return 1;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}const c=dot/(Math.sqrt(aa*bb)||1);return Math.max(0,Math.min(1,1-c))}
async function seekFrame(v,t){return new Promise((resolve,reject)=>{let done=false;const finish=fn=>{if(done)return;done=true;v.removeEventListener('seeked',onSeek);clearTimeout(timer);fn()};const onSeek=()=>finish(()=>resolve());const timer=setTimeout(()=>finish(()=>reject(new Error(`Timeout ao buscar ${tc(t)}`))),9000);v.addEventListener('seeked',onSeek,{once:true});try{v.currentTime=Math.max(0,Math.min(t,Math.max(0,v.duration-.05)))}catch(e){finish(()=>reject(e))}})}
async function tinyFrame(v,t,mode='sig'){await seekFrame(v,t);await new Promise(r=>{if('requestVideoFrameCallback'in v)v.requestVideoFrameCallback(()=>r());else requestAnimationFrame(r)});const c=document.createElement('canvas');c.width=32;c.height=18;c.getContext('2d').drawImage(v,0,0,32,18);if(mode==='sig')return signature(c);return c}
async function makeThumb(v,t){await seekFrame(v,t);await new Promise(r=>{if('requestVideoFrameCallback'in v)v.requestVideoFrameCallback(()=>r());else requestAnimationFrame(r)});const c=document.createElement('canvas');c.width=240;c.height=135;c.getContext('2d').drawImage(v,0,0,240,135);return c.toDataURL('image/jpeg',.56)}
function estimateETA(done,total,start){if(!done)return'';const sec=(performance.now()-start)/1000;const left=Math.max(0,total-done);return `Estimativa: ${Math.max(1,Math.round(sec/done*left))}s restantes`}

async function waitForVideoEvent(v, event, timeout=12000){
  return new Promise((res,rej)=>{
    let done=false;
    const on=()=>{if(done)return;done=true;cleanup();res()};
    const timer=setTimeout(()=>{if(done)return;done=true;cleanup();rej(new Error(`Tempo esgotado ao preparar o vídeo (${event}).`))},timeout);
    const cleanup=()=>{clearTimeout(timer);v.removeEventListener(event,on)};
    v.addEventListener(event,on,{once:true});
  });
}
function createLocalVideo(url){
  const v=document.createElement('video');
  v.preload='metadata';v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');
  v.setAttribute('webkit-playsinline','');
  v.style.cssText='position:fixed;width:16px;height:9px;left:0;top:0;opacity:.02;pointer-events:none;z-index:-1';
  v.src=url;document.body.appendChild(v);return v;
}
function destroyLocalVideo(v,url){
  if(!v)return;
  try{v.pause();}catch{}
  try{v.removeAttribute('src');v.load();}catch{}
  try{v.remove();}catch{}
  if(url)try{URL.revokeObjectURL(url)}catch{}
}
async function prepareMovieVideo(file){
  // V11: prefer the preview decoder already created when the user selected
  // the movie. This avoids asking iOS/Safari to parse the 4.9 GB H.265 file
  // a second time just to read metadata.
  const preview=$('moviePreviewVideo');
  if(preview && preview.dataset.url && Number(preview.duration)>0 && preview.readyState>=1){
    return {v:preview,url:null,owned:false};
  }
  const url=URL.createObjectURL(file);
  const v=createLocalVideo(url);
  try{
    if(isFinite(v.duration) && v.duration>0)return {v,url,owned:true};
    await waitForVideoEvent(v,'loadedmetadata',30000);
    if(!isFinite(v.duration)||v.duration<=0)throw new Error('Duração inválida.');
    return {v,url,owned:true};
  }catch(e){destroyLocalVideo(v,url);throw e}
}
async function seekAndPlay(v,t,rate=4){
  try{v.pause()}catch{}
  try{v.currentTime=Math.max(0,Math.min(t,Math.max(0,(v.duration||t)-0.05)))}catch{}
  // Some iOS versions fire seeked; others can take a while before canplay.
  await new Promise((resolve,reject)=>{
    let done=false;
    const finish=(ok,err)=>{if(done)return;done=true;clearTimeout(timer);v.removeEventListener('canplay',okFn);v.removeEventListener('loadeddata',dataFn);v.removeEventListener('seeked',seekFn);ok?resolve():reject(err||new Error('Não foi possível preparar o bloco.'))};
    const okFn=()=>finish(true); const dataFn=()=>finish(true); const seekFn=()=>finish(true);
    const timer=setTimeout(()=>finish(false,new Error(`Tempo esgotado ao preparar o bloco em ${tc(t)}.`)),15000);
    v.addEventListener('canplay',okFn,{once:true});v.addEventListener('loadeddata',dataFn,{once:true});v.addEventListener('seeked',seekFn,{once:true});
  }).catch(()=>{});
  v.playbackRate=rate;
  try{const p=v.play();if(p?.catch)await p.catch(()=>{})}catch{}
}
async function scanChunkWithVideo(v, chunkStart, chunkEnd, step, sens, sampleOffset, totalSamples, started){
  const samples=[];
  const actualEnd=Math.min(chunkEnd, Number(v.duration)||chunkEnd);
  const start=Math.max(0,chunkStart);
  await seekAndPlay(v,start,4);
  let nextTarget=start;
  let lastMedia=Number(v.currentTime)||start;
  let lastWall=performance.now();
  let stallSince=performance.now();
  while(nextTarget<=actualEnd+0.05){
    const deadline=performance.now()+Math.max(30000,step*3200);
    let got=false;
    while(performance.now()<deadline){
      const cur=Number(v.currentTime)||0;
      if(cur+0.25>=nextTarget){
        const sig=signatureFromVideo(v);
        if(sig){samples.push({t:Math.min(cur,actualEnd),sig,d:0});}
        got=true;nextTarget+=step;
        const idx=sampleOffset+samples.length;
        setAnalysis('Varredura em blocos',`Amostra ${idx} de ${totalSamples} · ${tc(cur)} · bloco ${tc(start)}–${tc(actualEnd)}`,estimateETA(idx,totalSamples,started));
        setProgress(Math.min(65,(idx/Math.max(1,totalSamples))*65));
        break;
      }
      if(cur>lastMedia+0.03){stallSince=performance.now();lastMedia=cur}
      else if(performance.now()-stallSince>7000){break}
      await new Promise(r=>requestAnimationFrame(r));
    }
    if(!got){
      // Recover only this block. Do not destroy the entire decoder.
      try{await seekAndPlay(v,Math.max(start,nextTarget),2)}catch{}
      const cur=Number(v.currentTime)||0;
      if(cur+0.25<nextTarget){
        // One final attempt with a slightly later position; then end this block
        // so the saved checkpoint can move forward rather than hanging forever.
        try{await seekAndPlay(v,Math.min(actualEnd-0.2,Math.max(start,nextTarget+1)),1)}catch{}
        if((Number(v.currentTime)||0)+0.25<nextTarget)break;
      }
    }
  }
  try{v.pause()}catch{}
  if(!samples.length || samples[samples.length-1].t<actualEnd-1){
    try{
      await seekAndPlay(v,Math.max(start,actualEnd-0.2),1);
      await new Promise(r=>requestAnimationFrame(r));
      const sig=signatureFromVideo(v);if(sig)samples.push({t:actualEnd,sig,d:0});
    }catch{}
  }
  return samples;
}
function signatureFromVideo(v){
  const c=document.createElement('canvas');c.width=32;c.height=18;
  try{c.getContext('2d',{willReadFrequently:true}).drawImage(v,0,0,32,18);return signature(c)}catch{return ''}
}
function detectBoundaries(samples,dur,sens,step){
  const out=[...samples].sort((a,b)=>a.t-b.t);
  for(let i=1;i<out.length;i++)out[i].d=diffSig(out[i-1].sig,out[i].sig);
  const boundaries=[0];
  for(let i=1;i<out.length;i++)if(out[i].d>=sens)boundaries.push(out[i].t);
  boundaries.push(dur);
  const uniq=[];for(const t of boundaries){if(!uniq.length||t-uniq[uniq.length-1]>=Math.max(2,step*.55))uniq.push(t)}
  if(uniq[uniq.length-1]!==dur)uniq.push(dur);
  const seg=[];for(let i=0;i<uniq.length-1;i++){const a=uniq[i],b=uniq[i+1];if(b-a<Math.max(2,step*.55))continue;seg.push({id:seg.length+1,start:a,end:b,mid:(a+b)/2})}
  if(!seg.length)seg.push({id:1,start:0,end:dur,mid:dur/2});
  return seg;
}
async function generateCandidateThumbs(file, rows){
  // V10 intentionally does not seek through the 4K file during the main scan.
  // Thumbnails are optional and generated later, one candidate at a time.
  return rows.map(r=>({...r,imagem:''}));
}
async function analyze(){
  if(!state.current)return;
  const movie=runtime.movie;
  if(!movie){toast('Escolha o filme primeiro.');return}
  const script=$('scriptInput').value.trim();
  if(!script){toast('Cole o roteiro antes de criar o mapa.');return}
  const step=Number($('sampleStep').value||30),topk=Number($('candidateCount').value||2),sens=Number($('cutSensitivity').value||.10),maxN=Number($('maxChunks').value||0);
  $('analyzeBtn').disabled=true;setProgress(0);
  const started=performance.now();
  try{
    // V11: reuse the already selected movie decoder for the whole run.
    // This avoids a second metadata parse that can fail on iOS with large H.265 files.
    const prepared=await prepareMovieVideo(movie);
    const mv=prepared.v, movieUrl=prepared.url, movieOwned=prepared.owned;
    const dur=Number(state.current.duration)||Number(mv.duration);
    if(!isFinite(dur)||dur<=0)throw new Error('Duração inválida.');
    state.current.duration=dur;state.current.sampleStep=step;state.current.engine='V11-local-reused-decoder';
    const totalSamples=Math.ceil(dur/step)+1;
    const chunkLen=120;
    let samples=Array.isArray(state.current.partialSamples)?state.current.partialSamples:[];
    let startAt=0;
    if(samples.length){startAt=Math.max(0,Math.floor((samples[samples.length-1].t+0.01)/chunkLen)*chunkLen);}
    // Deduplicate/resume based on completed chunk marker.
    const completed=Number(state.current.partialUntil||0);
    if(completed>0)startAt=completed;
    setAnalysis('Varredura em blocos',`Iniciando em ${tc(startAt)} de ${tc(dur)} · blocos de ${tc(chunkLen)}`);
    for(let cs=startAt;cs<dur;cs+=chunkLen){
      const ce=Math.min(dur,cs+chunkLen);
      const existing=samples.filter(x=>x.t>=cs-0.5&&x.t<=ce+0.5);
      if(existing.length>=Math.max(1,Math.floor((ce-cs)/step))){
        state.current.partialUntil=ce;persistCurrent();continue;
      }
      setAnalysis('Varredura em blocos',`Lendo ${tc(cs)} → ${tc(ce)} · ${samples.length}/${totalSamples} amostras`);
      const got=await scanChunkWithVideo(mv,cs,ce,step,sens,samples.length,totalSamples,started);
      samples=samples.filter(x=>x.t<cs-0.5||x.t>ce+0.5).concat(got).sort((a,b)=>a.t-b.t);
      state.current.partialSamples=samples;
      state.current.partialUntil=ce;
      state.current.status=`Análise parcial · ${Math.round((ce/dur)*100)}%`;
      persistCurrent();
      await sleep(250);
    }
    // Finalize once all chunks are persisted.
    setAnalysis('Detectando cenas','Comparando as assinaturas salvas...');
    const seg=detectBoundaries(samples,dur,sens,step);
    const chunks=splitScript(script,maxN);
    const ad=Number(state.current.audioDuration);const rows=[];
    const sceneByTime=(target)=>{
      const idx=seg.reduce((best,s,i)=>Math.abs(s.mid-target)<Math.abs(seg[best].mid-target)?i:best,0);
      const arr=[];for(let d=-8;d<=8;d++){const j=idx+d;if(seg[j]){const s=seg[j];const near=Math.exp(-Math.abs(s.mid-target)/Math.max(18,step*4));arr.push({s,score:near})}}
      arr.sort((a,b)=>b.score-a.score);const chosen=[];for(const x of arr){if(chosen.some(y=>Math.abs(y.s.mid-x.s.mid)<Math.max(3,step*.65)))continue;chosen.push(x);if(chosen.length>=topk)break}return chosen;
    };
    for(let ci=0;ci<chunks.length;ci++){
      const text=chunks[ci],n0=ad?ci/chunks.length*ad:null,n1=ad?(ci+1)/chunks.length*ad:null,target=((ci+.5)/chunks.length)*dur,cand=sceneByTime(target);
      for(let rank=0;rank<cand.length;rank++){
        const s=cand[rank].s;const score=Math.min(.99,.55+cand[rank].score*.42);
        rows.push({trecho:ci+1,candidato:rank+1,roteiro:text,narracao_inicio:n0,narracao_fim:n1,narracao_arquivos:(state.current.audioParts||[]).map(x=>x.name),filme_inicio:s.start,filme_fim:s.end,frame:s.mid,score:Number(score.toFixed(3)),confianca:'GUIA',cena_id:`CENA_${String(s.id).padStart(4,'0')}`,imagem:'',aprovada:false,metodo:'V11 local · blocos de 2 min · decodificador reutilizado'});
      }
      setProgress(70+((ci+1)/chunks.length)*30);setAnalysis('Montando mapa',`Trecho ${ci+1} de ${chunks.length}`,estimateETA(ci+1,chunks.length,started));await nextFrame();
    }
    state.current.segments=seg.map(s=>({id:s.id,start:s.start,end:s.end,mid:s.mid}));state.current.rows=rows;state.current.status='Mapa pronto';state.current.analysis={samples:samples.length,detectedScenes:seg.length,mode:'chunked-sequential-reused-decoder',chunkSeconds:chunkLen};
    if(movieOwned)destroyLocalVideo(mv,movieUrl);
    delete state.current.partialSamples;delete state.current.partialUntil;persistCurrent();renderMap();setProgress(100);go('map');toast(`Mapa V10 pronto · ${seg.length} cenas detectadas`);
  }catch(e){
    try{if(typeof mv!=='undefined')destroyLocalVideo(mv,movieUrl)}catch{}
    console.error(e);setAnalysis('Análise pausada',e.message||'Erro','O progresso concluído foi salvo.');toast('A análise foi pausada. Você pode continuar do ponto salvo.');
  }finally{$('analyzeBtn').disabled=false;}
}
function renderMap(){const p=state.current;if(!p)return;$('mapTitle').textContent=p.name||'Projeto';const rows=p.rows||[];const groups=new Map();rows.forEach(r=>{if(!groups.has(r.trecho))groups.set(r.trecho,[]);groups.get(r.trecho).push(r)});$('statChunks').textContent=groups.size;$('statScenes').textContent=rows.length;$('statApproved').textContent=rows.filter(r=>r.aprovada).length;const box=$('mapList');box.innerHTML='';for(const [n,arr] of groups){const sec=document.createElement('div');sec.className='segment';sec.innerHTML=`<div class="segmentTop"><div class="segmentTitle">TRECHO ${pad(n)}</div><div class="segmentTitle">${arr.length} candidatos</div></div><div class="segmentText">${esc(arr[0].roteiro)}</div><div class="candidateGrid"></div>`;const grid=sec.querySelector('.candidateGrid');arr.forEach((r,i)=>{const c=document.createElement('div');c.className='candidate'+(r.aprovada?' approved':'');c.innerHTML=`${r.imagem?`<img src="${r.imagem}" loading="lazy">`:`<div class="candidatePlaceholder">🎬<br><span>Prévia opcional</span></div>`}<div class="candidateBody"><div class="rank">CANDIDATO ${i+1} · ${esc(r.cena_id)}</div><div class="confidence">${r.confianca} · ${r.score}${r.aprovada?'<span class="approvedMark">✓ APROVADA</span>':''}</div><div class="time">Narração: <b>${r.narracao_inicio!=null?tc(r.narracao_inicio):'--:--'} → ${r.narracao_fim!=null?tc(r.narracao_fim):'--:--'}</b><br>Filme: <b>${tc(r.filme_inicio)} → ${tc(r.filme_fim)}</b><br>Frame: ${tc(r.frame)}</div><button class="smallBtn">${r.aprovada?'Desaprovar':'✓ Usar esta cena'}</button></div>`;c.querySelector('button').onclick=()=>{r.aprovada=!r.aprovada;persistCurrent();renderMap()};grid.appendChild(c)});box.appendChild(sec)}}
function approveBest(){const groups=new Map();state.current.rows.forEach(r=>{if(!groups.has(r.trecho))groups.set(r.trecho,[]);groups.get(r.trecho).push(r)});groups.forEach(a=>{a.forEach(r=>r.aprovada=false);const best=a.slice().sort((x,y)=>y.score-x.score)[0];if(best)best.aprovada=true});persistCurrent();renderMap();toast('Melhores guias aprovados')}
function clearApproved(){state.current.rows.forEach(r=>r.aprovada=false);persistCurrent();renderMap();toast('Aprovações limpas')}
function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function exportJson(){download(`${state.current.name||'projeto'}_mapa_v11.json`,JSON.stringify(state.current,null,2),'application/json')}
function exportCsv(){const h='trecho,candidato,cena_id,narracao_inicio,narracao_fim,filme_inicio,filme_fim,frame,score,confianca,aprovada,metodo,roteiro\n';const r=state.current.rows.map(x=>[x.trecho,x.candidato,x.cena_id,x.narracao_inicio??'',x.narracao_fim??'',x.filme_inicio,x.filme_fim,x.frame,x.score,x.confianca,x.aprovada?'SIM':'NAO',x.metodo,`"${String(x.roteiro).replace(/"/g,'""')}"`].join(','));download(`${state.current.name||'projeto'}_mapa_v11.csv`,h+r.join('\n'),'text/csv')}
function exportPlan(){const rows=state.current.rows.filter(r=>r.aprovada).sort((a,b)=>a.trecho-b.trecho);let out=`AUTO RECAP STUDIO V10 — PLANO CAPCUT\nProjeto: ${state.current.name}\nMotor: V10 local em blocos\n\n`;rows.forEach((r,i)=>{out+=`CENA ${String(i+1).padStart(3,'0')}\nRoteiro: ${r.roteiro}\nNarração: ${r.narracao_inicio!=null?tc(r.narracao_inicio):'--:--'} -> ${r.narracao_fim!=null?tc(r.narracao_fim):'--:--'}\nFilme: ${tc(r.filme_inicio)} -> ${tc(r.filme_fim)}\nFrame: ${tc(r.frame)}\nMétodo: ${r.metodo}\n\n`});if(!rows.length)out+='Nenhuma cena aprovada ainda.\n';download(`${state.current.name||'projeto'}_plano_capcut_v11.txt`,out,'text/plain')}
function showExport(){go('export')}
function wire(){
$('startBtn').onclick=newProject;$('newProject').onclick=newProject;$('saveProject').onclick=saveCurrent;$('analyzeBtn').onclick=analyze;$('scriptInput').addEventListener('input',updateScriptInfo);
const moviePicked=f=>{if(f){runtime.movie=f;inspectMovie(f)}else toast('Nenhum filme foi entregue pelo seletor.')};$('movieFile').onchange=()=>moviePicked($('movieFile').files[0]);$('moviePhotoFile').onchange=()=>moviePicked($('moviePhotoFile').files[0]);$('pickMovieFiles').onclick=()=>$('movieFile').click();$('pickMoviePhotos').onclick=()=>$('moviePhotoFile').click();$('addAudioBtn').onclick=addAudioPicker;$('audioFile').onchange=()=>{const fs=Array.from($('audioFile').files||[]);if(fs.length)inspectAudioFiles(fs,true)};$('addLibraryBtn').onclick=()=>$('mediaLibrary').click();$('mediaLibrary').onchange=()=>showLibrary(Array.from($('mediaLibrary').files||[]));
$('approveAll').onclick=approveBest;$('clearApproved').onclick=clearApproved;$('exportBtn').onclick=showExport;$('exportTop').onclick=showExport;$('capcutBtn').onclick=()=>{showExport();toast('Aprove as cenas e baixe o plano CapCut')};$('downloadJson').onclick=exportJson;$('downloadCsv').onclick=exportCsv;$('downloadPlan').onclick=exportPlan;document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>go(b.dataset.back));document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>go(b.dataset.nav))}
loadState();wire();renderProjects();
if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});if(window.caches)caches.keys().then(keys=>keys.filter(k=>k.includes('auto-recap-studio')).forEach(k=>caches.delete(k))).catch(()=>{})}

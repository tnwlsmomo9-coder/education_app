// app.js — 화면이 먼저 그려진 뒤 로드되는 앱 기능 코드
// 문제·정답·역사훈련소 콘텐츠는 learning-content.js에서만 관리합니다.

// ===== 소리 설정 (효과음 + 배경음악 공통 음소거 상태) =====
const SOUND_MUTE_KEY='appSoundMuted';
function isAppSoundMuted(){ return localStorage.getItem(SOUND_MUTE_KEY)==='true'; }

// ===== 효과음 (Web Audio API로 즉석 합성, 외부 파일 없음) =====
const SFX=(()=>{
  let ctx=null;
  function getCtx(){
    if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended')ctx.resume();
    return ctx;
  }
  // freq: Hz, start: 시작 시각(초, ctx.currentTime 기준 오프셋), dur: 길이(초)
  function tone(freq,start,dur,{type='sine',peak=0.18}={}){
    const c=getCtx();
    const osc=c.createOscillator();
    const gain=c.createGain();
    osc.type=type;
    osc.frequency.value=freq;
    const t0=c.currentTime+start;
    gain.gain.setValueAtTime(0,t0);
    gain.gain.linearRampToValueAtTime(peak,t0+0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0+dur+0.02);
  }
  return{
    click(){ if(isAppSoundMuted())return; try{ tone(720,0,0.05,{type:'square',peak:0.08}); }catch(e){} },
    correct(){ if(isAppSoundMuted())return; try{ tone(880,0,0.11,{type:'sine',peak:0.16}); tone(1318.5,0.09,0.16,{type:'sine',peak:0.18}); }catch(e){} },
    wrong(){ if(isAppSoundMuted())return; try{ tone(220,0,0.16,{type:'sawtooth',peak:0.14}); tone(174.6,0.08,0.18,{type:'sawtooth',peak:0.12}); }catch(e){} },
    complete(){ if(isAppSoundMuted())return; try{ [523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,i*0.09,0.2,{type:'triangle',peak:0.17})); }catch(e){} }
  };
})();
window.SFX=SFX;
// 일반 버튼(정답/오답 버튼 제외) 클릭 시 짧은 클릭음 — 이벤트 위임이라 동적으로 추가되는 버튼에도 자동 적용됨
document.addEventListener('click',(e)=>{
  const el=e.target.closest('button,[onclick],.settings-btn');
  if(!el)return;
  // 정답/오답 사운드가 별도로 재생되는 버튼들은 일반 클릭음에서 제외 (중복 재생 방지)
  if(el.closest('.map-zone,.map-option,.ht-mingeon-choice,.option-btn,.ox-btn,.ht-check-option-grid'))return;
  if(el.matches('[onclick^="answerMapMC"],[onclick^="answerMapZone"],[onclick^="answerKingOrderQuiz"],[onclick^="doMC"],[onclick^="doOX"],[onclick^="htSelectQuizOption"],[onclick^="htSelectReviewOption"],[onclick^="htSubmitReadingCheckOption"],[onclick^="htSubmitFinalReadingCheck"]'))return;
  SFX.click();
},true);

// ===== 배경음악 (사용자 제공 mp3 플레이리스트, 순서대로 자동 재생) =====
// 곡을 추가하려면 mp3 파일을 이 프로젝트 폴더에 넣고 아래 배열에 파일명만 추가하면 됩니다.
// 예: const BGM_PLAYLIST=['bgm.mp3','bgm2.mp3','bgm3.mp3'];
const BGM_PLAYLIST=['bgm.mp3'];
let bgmTrackIndex=0;
function getBgmAudioEl_(){ return document.getElementById('bgm-audio'); }
// 손그림 느낌의 스케치 라인 아이콘(스피커 on/off) — 아이콘 모양만 교체, 토글 로직은 그대로
const SOUND_ICON_ON_SVG='<svg viewBox="0 0 24 24" width="18" height="18" style="display:block"><defs><filter id="sound-icon-sketch"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.1"/></filter></defs><g filter="url(#sound-icon-sketch)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 8.5c1.4 1.1 1.4 5.9 0 7"/><path d="M18.6 6c2.8 2.4 2.8 9.6 0 12"/></g></svg>';
const SOUND_ICON_OFF_SVG='<svg viewBox="0 0 24 24" width="18" height="18" style="display:block"><defs><filter id="sound-icon-sketch"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.1"/></filter></defs><g filter="url(#sound-icon-sketch)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 9l5.5 6M21.5 9l-5.5 6"/></g></svg>';
function updateSoundToggleBtn_(){
  const btn=document.getElementById('sound-toggle-btn');
  if(btn)btn.innerHTML=isAppSoundMuted()?SOUND_ICON_OFF_SVG:SOUND_ICON_ON_SVG;
}
function loadBgmTrack_(index){
  const audio=getBgmAudioEl_();
  if(!audio||!BGM_PLAYLIST.length)return;
  bgmTrackIndex=((index%BGM_PLAYLIST.length)+BGM_PLAYLIST.length)%BGM_PLAYLIST.length;
  audio.src=BGM_PLAYLIST[bgmTrackIndex];
}
function startBgmIfAllowed_(){
  const audio=getBgmAudioEl_();
  if(!audio||isAppSoundMuted()||!audio.paused||!BGM_PLAYLIST.length)return;
  if(!audio.src)loadBgmTrack_(bgmTrackIndex);
  audio.volume=0.35;
  audio.play().catch(()=>{});
}
function toggleAppSound(){
  const muted=!isAppSoundMuted();
  localStorage.setItem(SOUND_MUTE_KEY,String(muted));
  updateSoundToggleBtn_();
  const audio=getBgmAudioEl_();
  if(!audio)return;
  if(muted)audio.pause();
  else startBgmIfAllowed_();
}
window.toggleAppSound=toggleAppSound;
onAppDomReady_(()=>{
  updateSoundToggleBtn_();
  const audio=getBgmAudioEl_();
  // 한 곡이 끝나면 플레이리스트의 다음 곡으로 자동 전환 (마지막 곡 다음엔 처음 곡으로 돌아감)
  if(audio)audio.addEventListener('ended',()=>{
    loadBgmTrack_(bgmTrackIndex+1);
    if(!isAppSoundMuted())audio.play().catch(()=>{});
  });
  // 브라우저 자동재생 정책상 사용자 클릭 시 재생을 시작해야 함.
  // once로 한 번만 시도하면 그 첫 클릭이 음소거 토글 버튼 자체였을 때
  // toggleAppSound()의 pause()와 같은 틱에서 충돌해 무음이 되고 다시 재시도되지 않으므로,
  // 매 클릭마다(멈춰있을 때만) 재시도하고 토글 버튼 클릭은 toggleAppSound()가 전담하게 제외한다.
  document.addEventListener('click',(e)=>{
    if(e.target.closest('#sound-toggle-btn'))return;
    startBgmIfAllowed_();
  },{capture:true});
});

function onAppDomReady_(fn){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});
  else queueMicrotask(fn);
}
function onAppWindowLoad_(fn){
  if(document.readyState==='complete')queueMicrotask(fn);
  else window.addEventListener('load',fn,{once:true});
}


// ===== 기존 inline script 1 =====
// ⚠️ 아래 URL을 구글 앱스스크립트 배포 후 받은 웹앱 URL로 반드시 교체하세요!
const API_URL = 'https://script.google.com/macros/s/AKfycbyTWT4I65xF71hGPIvQmmya4VNRN_2fyFjfvUYKfpSjvd0PATHkfc7p8xK0yeSGhjFg/exec';

// ===== 읽기 API 요청 관리자: single-flight + 10초 메모리 캐시 + 동시성 제한 =====
// 화이트리스트 액션에만 적용. verifyPin/adminLogin/verifyAdminPasswordOnly/setPin/resetPin/submit/
// 모든 저장·수정·삭제/logAccess/logLogin/logLearningEvent/correctResult/토큰 요청은 절대 대상 아님.
const __READ_CACHE_TTL_MS=10000;
const __readInFlight={}; // key -> Promise
const __readCache={}; // key -> {value, at}
function __invalidateReadCache(prefix){
  Object.keys(__readCache).forEach(k=>{ if(k.indexOf(prefix)===0) delete __readCache[k]; });
  Object.keys(__readInFlight).forEach(k=>{ if(k.indexOf(prefix)===0) delete __readInFlight[k]; });
}
window.__invalidateReadCache=__invalidateReadCache; // 저장 성공 후 각 지점에서 호출

// 읽기 요청 동시성 제한(최대 3개) — 인증/기록 요청은 이 큐를 거치지 않음(별도 처리)
const __readQueueMaxConcurrent=3;
let __readQueueRunning=0;
const __readQueueWaiting=[];
function __runReadQueued(taskFn){
  return new Promise((resolve,reject)=>{
    const run=()=>{
      __readQueueRunning++;
      taskFn().then(v=>{ __readQueueRunning--; __drainReadQueue(); resolve(v); })
              .catch(e=>{ __readQueueRunning--; __drainReadQueue(); reject(e); });
    };
    // gate가 active면(인증창 열림) 큐 등록만 하고 실제 fetch 시작은 하지 않음 — 큐잉 자체는 허용
    const blocked=__authRequestInFlight || __isPrivilegedAuthGateActive_();
    if(__readQueueRunning<__readQueueMaxConcurrent && !blocked) run();
    else __readQueueWaiting.push(run);
  });
}
function __drainReadQueue(){
  const blocked=__authRequestInFlight || __isPrivilegedAuthGateActive_();
  if(blocked)return;
  while(!__authRequestInFlight && !__isPrivilegedAuthGateActive_() && __readQueueRunning<__readQueueMaxConcurrent && __readQueueWaiting.length>0){
    __readQueueWaiting.shift()();
  }
}

// 인증 API(verifyPin/adminLogin/verifyAdminPasswordOnly) 전용 — 최우선 실행, 진행 중 플래그로 다른 큐를 잠시 막음
function __wrapAuthApi(fn){
  return async function(...args){
    __authRequestInFlight=true;
    try{
      return await fn.apply(this,args);
    }finally{
      __authRequestInFlight=false;
      __drainReadQueue();
      __drainAuditLogQueue();
    }
  };
}

// 원본 읽기API 함수(fn)를 감싸서 single-flight+캐시+동시성제한을 적용.
// keyFn(...args)는 캐시/중복판정 키를 만듦(학생이름 등 결과를 바꾸는 값 포함 필수).
function __wrapReadApi(fn, keyFn){
  return function(...args){
    const key=keyFn(...args);
    const cached=__readCache[key];
    if(cached && (performance.now()-cached.at)<__READ_CACHE_TTL_MS){
      window.__perfMark&&window.__perfMark('캐시재사용:'+key);
      // 호출부에서 반환객체를 변형해도 캐시 원본이 오염되지 않도록 얕은 복제(배열/객체 최소 안전화)
      const v=cached.value;
      return Promise.resolve(Array.isArray(v)?v.slice():(v&&typeof v==='object'?{...v}:v));
    }
    if(__readInFlight[key]) return __readInFlight[key];
    const p=__runReadQueued(()=>fn.apply(this,args)).then(result=>{
      __readCache[key]={value:result, at:performance.now()};
      delete __readInFlight[key];
      return result;
    }).catch(err=>{
      delete __readInFlight[key];
      throw err;
    });
    __readInFlight[key]=p;
    return p;
  };
}

// ===== 초기 백그라운드 조회 취소 토큰 =====
// PIN성공/관리자로그인창/선생님확인창/부모님확인 진입 시 세대를 올려서,
// 아직 시작 안 한 백그라운드 작업은 건너뛰고, 이미 시작된 작업의 결과는 낡았으면 버림(UI 미반영)
// ===== 인증 gate 중앙 상태 — DOM class가 아니라 이 상태가 진실의 원천 =====
// 인증 버튼을 누르는 순간 동기적으로 active=true, epoch 증가. TDZ 방지 위해 파일 최상단에 선언.
window.__privilegedAuthGateState={active:false, epoch:0, source:''};
function __activatePrivilegedAuthGate_(source){
  window.__privilegedAuthGateState.active=true;
  window.__privilegedAuthGateState.epoch++;
  window.__privilegedAuthGateState.source=source;
  __backgroundLoadGeneration=window.__privilegedAuthGateState.epoch; // 기존 startup generation과 epoch를 통일해서 무효화
}
function __releasePrivilegedAuthGate_(expectedEpoch){
  // 더 늦게 끝난 이전 인증 Promise가 새 인증 gate를 잘못 해제하지 않도록, epoch가 일치할 때만 해제
  if(expectedEpoch!==undefined && expectedEpoch!==window.__privilegedAuthGateState.epoch) return;
  window.__privilegedAuthGateState.active=false;
  window.__privilegedAuthGateState.source='';
}
function __isPrivilegedAuthGateActive_(){ return window.__privilegedAuthGateState.active===true; }

let __backgroundLoadGeneration=0;
let __startupTaskIndex=0; // 어디까지 완료했는지(재개 시 이어서 진행) — showStudentSelectView() 등에서 조기 참조되므로 상단에 선언
function __cancelPendingBackgroundLoads(){ __backgroundLoadGeneration++; }
function __isBackgroundGenerationStale(myGen){ return myGen!==__backgroundLoadGeneration; }

// ===== 인증 요청 진행 중 플래그 — 새 백그라운드 읽기/감사로그 시작 억제 =====
let __authRequestInFlight=false;

// ===== 기록(감사로그) 요청 순차 전송 큐 — 화면 진입은 절대 안 기다림 =====
const __auditLogQueue=[];
let __auditLogSending=false;
function __enqueueAuditLog(taskFn){
  __auditLogQueue.push(taskFn);
  __drainAuditLogQueue();
}
function __drainAuditLogQueue(){
  if(__auditLogSending||__authRequestInFlight)return; // 인증 중엔 감사로그도 잠시 양보
  const next=__auditLogQueue.shift();
  if(!next)return;
  __auditLogSending=true;
  Promise.resolve().then(next).catch(err=>console.error('감사로그 전송 실패(무시):',err)).finally(()=>{
    __auditLogSending=false;
    __drainAuditLogQueue();
  });
}

// ===== 역사훈련소 저장 요청 순차 전송 큐 =====
// 한 PART 안에서 저장이 여러 번 연달아 트리거되는데, 큐 없이 병렬로 보내면
// 나중에 보낸 요청(최신 상태)의 응답이 먼저 오고 먼저 보낸 요청(오래된 상태)의
// 응답이 뒤늦게 도착해 서버 값이 오래된 상태로 덮어써지는 경쟁 상태가 생길 수 있음.
// (완료 표시가 나중에 다시 풀리는 증상의 원인) 한 번에 하나씩만 보내 순서를 보장한다.
// 단, 같은 PART에 대한 저장이 대기 중일 때 또 저장 요청이 오면 큐에 새로 쌓지 않고
// 대기 중이던 항목을 최신 요청으로 교체한다 — 그러지 않으면 한 PART를 빠르게 진행할 때
// (문단 읽기 확인·받아쓰기·퀴즈 등 단계마다 저장 호출) 요청이 수십 개씩 쌓여서,
// 정작 "완료" 저장이 그 뒤에 밀려 있다가 화면 이동/새로고침으로 전송되지 못한 채
// 유실되는 문제가 있었다(완료로 보였다가 새로고침하면 다시 미완료로 풀리는 증상의 원인).
const __historyTrainingSaveQueue=[]; // 대기 중인 partId 순서
const __historyTrainingPendingByPart={}; // partId -> 그 파트의 최신 저장 taskFn
let __historyTrainingSaveSending=false;
function __enqueueHistoryTrainingSave(partId,taskFn){
  if(!(partId in __historyTrainingPendingByPart)){
    __historyTrainingSaveQueue.push(partId);
  }
  __historyTrainingPendingByPart[partId]=taskFn;
  __drainHistoryTrainingSaveQueue();
}
function __drainHistoryTrainingSaveQueue(){
  if(__historyTrainingSaveSending)return;
  const partId=__historyTrainingSaveQueue.shift();
  if(partId===undefined)return;
  const taskFn=__historyTrainingPendingByPart[partId];
  delete __historyTrainingPendingByPart[partId];
  __historyTrainingSaveSending=true;
  Promise.resolve().then(taskFn).catch(err=>console.error('역사훈련소 저장 실패(무시):',err)).finally(()=>{
    __historyTrainingSaveSending=false;
    __drainHistoryTrainingSaveQueue();
  });
}


// ===== C안: 대용량 학습 콘텐츠(learning-content.js) 비동기 로드 =====
// 콘텐츠는 온라인에서 매번 최신 learning-content.js를 확인하므로 index/app 버전과 묶지 않습니다.
window.__contentReady=false;
let __contentLoadPromise=null; // 세션 내 중복요청 방지용 캐시(성공 시에만 유지, 실패 시 아래에서 초기화)
let __contentScriptEl=null;
const __CONTENT_LOAD_TIMEOUT_MS=15000;

function isLearningContentReady_(){
  return typeof UNITS!=='undefined'
    && typeof historyTrainingData!=='undefined'
    && typeof QUESTIONS!=='undefined'
    && Array.isArray(window.KING_ORDER_DATA)
    && typeof window.LEARNING_CONTENT_VERSION==='string';
}

function loadLearningContent(){
  // 시간초과 뒤 기존 script가 늦게 실행된 경우에는 새 태그를 중복 삽입하지 않고
  // 이미 준비된 동일 버전 데이터를 그대로 사용합니다.
  if(isLearningContentReady_()){
    window.__contentReady=true;
    return Promise.resolve();
  }
  if(__contentLoadPromise) return __contentLoadPromise; // 이미 진행중/완료된 요청 재사용 — 중복 네트워크 요청 방지
  __contentLoadPromise=new Promise((resolve,reject)=>{
    let settled=false;
    const cleanupFailedScript=()=>{
      if(__contentScriptEl===script) __contentScriptEl=null;
      script.remove();
    };
    const timeoutId=setTimeout(()=>{
      if(settled)return;
      settled=true;
      window.__contentReady=false;
      cleanupFailedScript();
      reject(new Error('학습자료 불러오기 시간 초과'));
    },__CONTENT_LOAD_TIMEOUT_MS);

    const script=document.createElement('script');
    script.src='learning-content.js?v=20260825-content-19';
    __contentScriptEl=script;
    window.__perfMark&&window.__perfMark('learning-content.js 요청시작');
    script.onload=()=>{
      if(settled)return;
      clearTimeout(timeoutId);
      if(!isLearningContentReady_()){
        settled=true;
        window.__contentReady=false;
        cleanupFailedScript();
        reject(new Error('학습자료가 완전하게 준비되지 않았습니다'));
        return;
      }
      settled=true;
      if(__contentScriptEl===script) __contentScriptEl=null;
      window.__contentReady=true;
      window.__perfMark&&window.__perfMark('learning-content.js 요청종료/contentReady=true');
      resolve();
    };
    script.onerror=()=>{
      if(settled)return;
      clearTimeout(timeoutId);
      settled=true;
      window.__contentReady=false;
      cleanupFailedScript();
      reject(new Error('학습자료 네트워크 오류'));
    };
    document.head.appendChild(script);
  });
  __contentLoadPromise.catch(()=>{
    __contentLoadPromise=null; // 실패 시 캐시를 비워 재시도 가능하게 함 (성공 시에는 계속 재사용)
  });
  return __contentLoadPromise;
}

function startLearningContentLoad_(){
  loadLearningContent().then(()=>{
    // 콘텐츠 준비 완료 — 기존 렌더 함수들을 실제 데이터로 재실행
    renderStudentCards();
    if(typeof renderUnitGrid==='function') renderUnitGrid();
    if(typeof updateProgressColors==='function') updateProgressColors();
    const retryArea=document.getElementById('content-load-retry-area');
    if(retryArea) retryArea.style.display='none';
  }).catch((err)=>{
    console.error('학습자료 로드 실패:',err);
    const retryArea=document.getElementById('content-load-retry-area');
    if(retryArea) retryArea.style.display='block';
  });
}

function retryLearningContentLoad(){
  const retryArea=document.getElementById('content-load-retry-area');
  if(retryArea) retryArea.style.display='none';
  startLearningContentLoad_();
}

// 로그인 시점에 학습콘텐츠가 아직 준비 안 된 경우에만 잠깐 보여주는 안전 화면
// 학생 기록·PIN·로그인 상태는 이미 확정된 뒤이므로 여기서는 화면만 대기시킴
function showContentPreparingScreen_(showRetry){
  const overlay=document.getElementById('content-preparing-overlay');
  if(!overlay)return;
  overlay.classList.add('show');
  const retryBtn=document.getElementById('content-preparing-retry-btn');
  if(retryBtn) retryBtn.style.display=showRetry?'block':'none';
}
function hideContentPreparingScreen_(){
  const overlay=document.getElementById('content-preparing-overlay');
  if(overlay) overlay.classList.remove('show');
}
function retryContentPreparingScreen_(){
  const retryBtn=document.getElementById('content-preparing-retry-btn');
  if(retryBtn) retryBtn.style.display='none';
  loadLearningContent().then(()=>{
    hideContentPreparingScreen_();
    const retryCard=pendingSelectCard;
    const retryName=pendingSelectName;
    if(!playerName && retryCard && retryName){
      // PIN 확인은 이미 끝났으므로 원래 선택 학생으로 자동 진입을 이어갑니다.
      selectStudent(retryCard,retryName);
    }else if(playerName){ /* 이미 로그인된 상태면 화면만 갱신 */
      renderStudentCards();
      showLearningHomeView();
    }
  }).catch(()=>{
    if(retryBtn) retryBtn.style.display='block';
  });
}


function apiConfigured(){
  return API_URL && API_URL.indexOf('PASTE_YOUR')===-1;
}

const CONTENT_VISIBILITY_STORAGE_KEY='contentVisibility_v1';
const KING_ORDER_DUE_LABEL='빨리해라';
let contentVisibilityCache=null;

// 새 문제 묶음은 이전의 빈 단원 공개값을 물려받지 않고 다시 승인하도록
// 공개 설정 키를 버전별로 분리합니다. 관리자가 공개 버튼을 누르면 이후에는 그 설정을 유지합니다.
const CONTENT_VISIBILITY_VERSIONED_KEYS={
  'unit:joseonFounding':'unit:joseonFounding@questions-v1',
  'unit:joseonEarlyKings':'unit:joseonEarlyKings@questions-v1',
  'unit:joseonGovernment':'unit:joseonGovernment@questions-v1',
  'unit:joseonDiplomacy':'unit:joseonDiplomacy@questions-v1',
  'unit:sarimEmergence':'unit:sarimEmergence@questions-v1',
  'unit:factionFormation':'unit:factionFormation@questions-v1',
  'unit:joseonCulture':'unit:joseonCulture@questions-v1',
  'unit:goryeoFounding':'unit:goryeoFounding@questions-v1',
  'unit:goryeoGovernment':'unit:goryeoGovernment@questions-v1',
  'unit:goryeoMilitaryRegime':'unit:goryeoMilitaryRegime@questions-v1',
  'unit:goryeoKhitanJurchen':'unit:goryeoKhitanJurchen@questions-v1',
  'unit:goryeoMongol':'unit:goryeoMongol@questions-v1',
  'unit:goryeoYuanInterference':'unit:goryeoYuanInterference@questions-v1',
  'unit:goryeoAntiYuanReform':'unit:goryeoAntiYuanReform@questions-v1',
  'unit:goryeoCulture':'unit:goryeoCulture@questions-v1',
  'unit:goryeoReview':'unit:goryeoReview@questions-v1',
  'unit:imjinJeongyuWar':'unit:imjinJeongyuWar@questions-v1',
  'unit:jeongmyoByeongjaWar':'unit:jeongmyoByeongjaWar@questions-v1',
  'unit:lateJoseonChange':'unit:lateJoseonChange@questions-v1',
  'unit:yeongjoJeongjoTangpyeong':'unit:yeongjoJeongjoTangpyeong@questions-v1',
  'unit:sedoPolitics':'unit:sedoPolitics@questions-v1',
  'unit:ruralSocietyChange':'unit:ruralSocietyChange@questions-v1',
  'unit:peasantUprising':'unit:peasantUprising@questions-v1',
  'unit:silhakGukhak':'unit:silhakGukhak@questions-v1',
  'unit:lateJoseonCulturalExchange':'unit:lateJoseonCulturalExchange@questions-v1',
  'unit:lateJoseonCommonerCulture':'unit:lateJoseonCommonerCulture@questions-v1',
  'unit:joseonReview':'unit:joseonReview@questions-v1',
  'historySummary:historySummary2':'historySummary:historySummary2@content-v1',
  'historyTraining:part17':'historyTraining:part17@content-v1',
  'historyTraining:part18':'historyTraining:part18@content-v1',
  'historyTraining:part19':'historyTraining:part19@content-v1',
  'historyTraining:part20':'historyTraining:part20@content-v1',
  'historyTraining:part21':'historyTraining:part21@content-v1',
  'historyTraining:part22':'historyTraining:part22@content-v1',
  'historyTraining:part23':'historyTraining:part23@content-v1',
  'historyTraining:part24':'historyTraining:part24@content-v1',
  'historyTraining:part25':'historyTraining:part25@content-v1',
  'historyTraining:part26':'historyTraining:part26@content-v1',
  'historyTraining:part27':'historyTraining:part27@content-v1'
  ,'historyTraining:part28':'historyTraining:part28@content-v1'
  ,'historyTraining:part29':'historyTraining:part29@content-v1'
  ,'historyTraining:part30':'historyTraining:part30@content-v1'
  ,'historyTraining:part31':'historyTraining:part31@content-v1'
  ,'historyTraining:part32':'historyTraining:part32@content-v1'
  ,'historyTraining:part33':'historyTraining:part33@content-v1'
  ,'historyTraining:part34':'historyTraining:part34@content-v1'
  ,'historyTraining:part35':'historyTraining:part35@content-v1'
  ,'historyTraining:part36':'historyTraining:part36@content-v1'
  ,'kingOrder:goguryeo':'kingOrder:goguryeo@content-v1'
  ,'kingOrder:baekje':'kingOrder:baekje@content-v1'
  ,'kingOrder:silla':'kingOrder:silla@content-v1'
  ,'kingOrder:balhae':'kingOrder:balhae@content-v1'
  ,'kingOrder:goryeo':'kingOrder:goryeo@content-v1'
  ,'kingOrder:joseon':'kingOrder:joseon@content-v1'
};
const CONTENT_VISIBILITY_DEFAULTS={
  'unit:joseonFounding@questions-v1':false,
  'unit:joseonEarlyKings@questions-v1':false,
  'unit:joseonGovernment@questions-v1':false,
  'unit:joseonDiplomacy@questions-v1':false,
  'unit:sarimEmergence@questions-v1':false,
  'unit:factionFormation@questions-v1':false,
  'unit:joseonCulture@questions-v1':false,
  'unit:goryeoFounding@questions-v1':false,
  'unit:goryeoGovernment@questions-v1':false,
  'unit:goryeoMilitaryRegime@questions-v1':false,
  'unit:goryeoKhitanJurchen@questions-v1':false,
  'unit:goryeoMongol@questions-v1':false,
  'unit:goryeoYuanInterference@questions-v1':false,
  'unit:goryeoAntiYuanReform@questions-v1':false,
  'unit:goryeoCulture@questions-v1':false,
  'unit:goryeoReview@questions-v1':false,
  'unit:imjinJeongyuWar@questions-v1':false,
  'unit:jeongmyoByeongjaWar@questions-v1':false,
  'unit:lateJoseonChange@questions-v1':false,
  'unit:yeongjoJeongjoTangpyeong@questions-v1':false,
  'unit:sedoPolitics@questions-v1':false,
  'unit:ruralSocietyChange@questions-v1':false,
  'unit:peasantUprising@questions-v1':false,
  'unit:silhakGukhak@questions-v1':false,
  'unit:lateJoseonCulturalExchange@questions-v1':false,
  'unit:lateJoseonCommonerCulture@questions-v1':false,
  'unit:joseonReview@questions-v1':false,
  'historySummary:historySummary2@content-v1':false,
  'historyTraining:part17@content-v1':false,
  'historyTraining:part18@content-v1':false,
  'historyTraining:part19@content-v1':false,
  'historyTraining:part20@content-v1':false,
  'historyTraining:part21@content-v1':false,
  'historyTraining:part22@content-v1':false,
  'historyTraining:part23@content-v1':false,
  'historyTraining:part24@content-v1':false,
  'historyTraining:part25@content-v1':false,
  'historyTraining:part26@content-v1':false,
  'historyTraining:part27@content-v1':false
  ,'historyTraining:part28@content-v1':false
  ,'historyTraining:part29@content-v1':false
  ,'historyTraining:part30@content-v1':false
  ,'historyTraining:part31@content-v1':false
  ,'historyTraining:part32@content-v1':false
  ,'historyTraining:part33@content-v1':false
  ,'historyTraining:part34@content-v1':false
  ,'historyTraining:part35@content-v1':false
  ,'historyTraining:part36@content-v1':false
  ,'kingOrder:goguryeo@content-v1':false
  ,'kingOrder:baekje@content-v1':false
  ,'kingOrder:silla@content-v1':false
  ,'kingOrder:balhae@content-v1':false
  ,'kingOrder:goryeo@content-v1':false
  ,'kingOrder:joseon@content-v1':false
};

// 사건배열은 화면·진행률·이어하기에서 제외하되 기존 문제와 학생 기록은 보존합니다.
const TIMELINE_GAME_ENABLED=false;

function contentVisibilityItemKey(type,key){
  const baseKey=`${String(type||'').trim()}:${String(key||'').trim()}`;
  return CONTENT_VISIBILITY_VERSIONED_KEYS[baseKey]||baseKey;
}

function getCurrentContentVisibilitySeed(){
  const seed={};
  Object.keys(typeof UNITS!=='undefined'?UNITS:{}).forEach(key=>{
    const itemKey=contentVisibilityItemKey('unit',key);
    seed[itemKey]=Object.prototype.hasOwnProperty.call(CONTENT_VISIBILITY_DEFAULTS,itemKey)
      ? CONTENT_VISIBILITY_DEFAULTS[itemKey]
      : true;
  });
  if(typeof historyTrainingData!=='undefined'){
    historyTrainingData.forEach(part=>{
      const itemKey=contentVisibilityItemKey('historyTraining',part.id);
      seed[itemKey]=Object.prototype.hasOwnProperty.call(CONTENT_VISIBILITY_DEFAULTS,itemKey)
        ? CONTENT_VISIBILITY_DEFAULTS[itemKey]
        : true;
    });
  }
  if(TIMELINE_GAME_ENABLED){
    ['easy','medium','hard'].forEach(key=>{seed[contentVisibilityItemKey('timeline',key)]=true;});
  }
  ['historySummary1','historySummary2'].forEach(key=>{
    const itemKey=contentVisibilityItemKey('historySummary',key);
    seed[itemKey]=Object.prototype.hasOwnProperty.call(CONTENT_VISIBILITY_DEFAULTS,itemKey)
      ? CONTENT_VISIBILITY_DEFAULTS[itemKey]
      : true;
  });
  if(typeof MAP_STUDY_PARTS!=='undefined'){
    MAP_STUDY_PARTS.forEach(part=>{seed[contentVisibilityItemKey('mapStudy',part.id)]=true;});
  }
  if(typeof KING_ORDER_DATA!=='undefined'){
    KING_ORDER_DATA.forEach(era=>{
      const itemKey=contentVisibilityItemKey('kingOrder',era.id);
      seed[itemKey]=Object.prototype.hasOwnProperty.call(CONTENT_VISIBILITY_DEFAULTS,itemKey)
        ? CONTENT_VISIBILITY_DEFAULTS[itemKey]
        : false;
    });
  }
  return seed;
}

function readLocalContentVisibility(){
  try{
    const raw=JSON.parse(localStorage.getItem(CONTENT_VISIBILITY_STORAGE_KEY)||'null');
    if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw;
  }catch(error){}
  const seed=getCurrentContentVisibilitySeed();
  try{localStorage.setItem(CONTENT_VISIBILITY_STORAGE_KEY,JSON.stringify(seed));}catch(error){}
  return seed;
}

function normalizeContentVisibility(payload){
  let src=payload;
  if(src&&src.data&&typeof src.data==='object')src=src.data;
  if(src&&src.visibility&&typeof src.visibility==='object')src=src.visibility;
  if(!src||typeof src!=='object'||Array.isArray(src))return {};
  const out={};
  Object.keys(src).forEach(key=>{out[key]=src[key]===true;});
  return out;
}

async function apiGetContentVisibility(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=getContentVisibility',{cache:'no-store'});
    const payload=await res.json();
    if(!res.ok||!payload||payload.ok===false)return {};
    return normalizeContentVisibility(payload);
  }catch(error){
    console.warn('getContentVisibility 요청 실패:',error);
    return {};
  }
}

async function apiSetContentVisibility(visibility){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setContentVisibility');
    body.set('data',JSON.stringify(visibility||{}));
    const res=await fetch(API_URL,{method:'POST',body});
    const payload=await res.json();
    return !!(res.ok&&payload&&payload.ok===true);
  }catch(error){
    console.warn('setContentVisibility 요청 실패:',error);
    return false;
  }
}

async function loadContentVisibility(force=false){
  if(contentVisibilityCache&&!force)return contentVisibilityCache;

  const local=readLocalContentVisibility();
  const [server]=await Promise.all([
    apiGetContentVisibility(),
    loadContentRequirement(force) // 공개설정 로드 시 필수대상설정도 함께 최신화 (실패해도 각자 내부에서 흡수되어 이 흐름을 막지 않음)
  ]);

  const seed=getCurrentContentVisibilitySeed();

  if(Object.keys(server).length>0){
    // 기존 서버 설정은 유지하고, 새로 추가된 콘텐츠 키만 각 콘텐츠의 안전한 기본값으로 보충
    contentVisibilityCache={...seed,...server};
    try{localStorage.setItem(CONTENT_VISIBILITY_STORAGE_KEY,JSON.stringify(contentVisibilityCache));}catch(error){}
  }else{
    contentVisibilityCache={...seed,...local};
  }
  return contentVisibilityCache;
}

function isContentApproved(type,key){
  if(isAdminSessionActive())return true;
  const map=contentVisibilityCache||readLocalContentVisibility();
  const itemKey=contentVisibilityItemKey(type,key);
  return map[itemKey]===true;
}

async function setContentApproved(type,key,approved){
  const map={...(contentVisibilityCache||readLocalContentVisibility())};
  map[contentVisibilityItemKey(type,key)]=approved===true;
  contentVisibilityCache=map;
  try{localStorage.setItem(CONTENT_VISIBILITY_STORAGE_KEY,JSON.stringify(map));}catch(error){}

  renderContentApprovalPanel();
  renderUnitGrid();
  if(playerName){
    renderIncompleteUnitsSection();
    renderHomeSummaryCard();
  }

  const ok=await apiSetContentVisibility(map);
  showToast2(ok
    ?(approved?'✅ 학생에게 공개했어요.':'🔒 학생에게서 숨겼어요.')
    :'⚠️ 이 기기에는 반영됐지만 서버 저장은 되지 않았어요.');
}

async function setAllContentApproved(approved){
  const map={...(contentVisibilityCache||readLocalContentVisibility())};
  getContentApprovalGroups().forEach(group=>{
    group.items.forEach(item=>{
      map[contentVisibilityItemKey(item.type,item.key)]=approved===true;
    });
  });
  contentVisibilityCache=map;
  try{localStorage.setItem(CONTENT_VISIBILITY_STORAGE_KEY,JSON.stringify(map));}catch(error){}
  renderContentApprovalPanel();
  renderUnitGrid();
  const ok=await apiSetContentVisibility(map);
  showToast2(ok
    ?(approved?'✅ 전체 문제를 공개했어요.':'🔒 전체 문제를 비공개했어요.')
    :'⚠️ 이 기기에는 반영됐지만 서버 저장은 되지 않았어요.');
}

// ══════════════════════════════════════════
// 콘텐츠별 "필수 대상 학생" — 공개(contentVisibility)와는 별개의 저장소.
// 공개된 콘텐츠는 전원이 계속 열람·풀이 가능하되, 이 목록에 없는 학생에게는
// 미완료 목록/진행률 계산에서만 빠진다(참고용). 설정한 적 없는 콘텐츠는
// 키 자체가 없으므로 기존과 동일하게 전원 필수로 취급된다(하위호환 기본값).
// ══════════════════════════════════════════
const CONTENT_REQUIREMENT_STORAGE_KEY='contentRequirement_v1';
let contentRequirementCache=null;

function readLocalContentRequirement(){
  try{
    const raw=JSON.parse(localStorage.getItem(CONTENT_REQUIREMENT_STORAGE_KEY)||'null');
    if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw;
  }catch(error){}
  return {};
}

function normalizeContentRequirement(payload){
  let src=payload;
  if(src&&src.data&&typeof src.data==='object')src=src.data;
  if(!src||typeof src!=='object'||Array.isArray(src))return {};
  const validNames=STUDENTS.map(s=>s.name);
  const out={};
  Object.keys(src).forEach(key=>{
    const list=src[key];
    if(!Array.isArray(list))return;
    out[key]=list.filter(n=>validNames.indexOf(n)!==-1);
  });
  return out;
}

async function apiGetContentRequirement(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=getContentRequirement',{cache:'no-store'});
    const payload=await res.json();
    if(!res.ok||!payload||payload.ok===false)return {};
    return normalizeContentRequirement(payload);
  }catch(error){
    console.warn('getContentRequirement 요청 실패:',error);
    return {};
  }
}

async function apiSetContentRequirement(requirement){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setContentRequirement');
    body.set('data',JSON.stringify(requirement||{}));
    const res=await fetch(API_URL,{method:'POST',body});
    const payload=await res.json();
    return !!(res.ok&&payload&&payload.ok===true);
  }catch(error){
    console.warn('setContentRequirement 요청 실패:',error);
    return false;
  }
}

async function loadContentRequirement(force=false){
  if(contentRequirementCache&&!force)return contentRequirementCache;
  const local=readLocalContentRequirement();
  const server=await apiGetContentRequirement();
  if(Object.keys(server).length>0){
    contentRequirementCache=server;
    try{localStorage.setItem(CONTENT_REQUIREMENT_STORAGE_KEY,JSON.stringify(contentRequirementCache));}catch(error){}
  }else{
    contentRequirementCache=local;
  }
  return contentRequirementCache;
}

// 설정한 적 없는 콘텐츠는 기존과 동일하게 전원 필수 — 이 기본값이 하위호환의 핵심.
// isContentApproved와 달리 관리자 모드에서도 절대 true로 우회하지 않는다 — 선생님/부모님
// 확인 화면이 바로 이 함수로 "그 학생 기준" 진행률을 봐야 하는 화면이기 때문
// (getApprovedKingOrderEras_가 contentVisibilityCache를 직접 읽는 것과 같은 이유).
function isContentRequiredForStudent(type,key,name){
  if(!name)return true;
  const map=contentRequirementCache||readLocalContentRequirement();
  const required=map[contentVisibilityItemKey(type,key)];
  if(!Array.isArray(required))return true;
  return required.indexOf(name)!==-1;
}

async function setContentRequiredStudents(type,key,studentNames){
  const map={...(contentRequirementCache||readLocalContentRequirement())};
  const itemKey=contentVisibilityItemKey(type,key);
  const validNames=STUDENTS.map(s=>s.name);
  map[itemKey]=validNames.filter(n=>Array.isArray(studentNames)&&studentNames.indexOf(n)!==-1);
  contentRequirementCache=map;
  try{localStorage.setItem(CONTENT_REQUIREMENT_STORAGE_KEY,JSON.stringify(map));}catch(error){}

  renderContentApprovalPanel();
  if(playerName){
    renderIncompleteUnitsSection();
    renderHomeSummaryCard();
  }

  const ok=await apiSetContentRequirement(map);
  showToast2(ok?'✅ 필수 대상을 저장했어요.':'⚠️ 이 기기에는 반영됐지만 서버 저장은 되지 않았어요.');
}

function toggleContentRequiredStudent(type,key,studentName){
  const itemKey=contentVisibilityItemKey(type,key);
  const map=contentRequirementCache||readLocalContentRequirement();
  const current=Array.isArray(map[itemKey])?map[itemKey]:STUDENTS.map(s=>s.name);
  const next=current.indexOf(studentName)!==-1
    ? current.filter(n=>n!==studentName)
    : [...current,studentName];
  setContentRequiredStudents(type,key,next);
}

function getContentApprovalGroups(){
  const unitItems=Object.keys(UNITS||{}).map(key=>({
    type:'unit',key,label:UNITS[key].title
  }));
  const historyItems=(typeof historyTrainingData==='undefined'?[]:historyTrainingData).map(part=>({
    type:'historyTraining',key:part.id,label:`PART ${part.partNumber} · ${part.title}`
  }));
  const timelineItems=TIMELINE_GAME_ENABLED
    ? ['easy','medium','hard'].map(key=>({type:'timeline',key,label:`사건 배열 · ${DIFF_INFO[key]?.label||key}`}))
    : [];
  const mapItems=(typeof MAP_STUDY_PARTS==='undefined'?[]:MAP_STUDY_PARTS).map(part=>({
    type:'mapStudy',key:part.id,label:`${part.id.toUpperCase()} · ${part.title}`
  }));
  const historySummaryItems=[
    {type:'historySummary',key:'historySummary1',label:'역사총정리① · 선사시대 ~ 통일 신라'},
    {type:'historySummary',key:'historySummary2',label:'역사총정리② · 고려 시대'}
  ];
  const kingOrderItems=(typeof KING_ORDER_DATA==='undefined'?[]:KING_ORDER_DATA).map(era=>({
    type:'kingOrder',key:era.id,label:`${era.title} · ${era.period}`
  }));
  return [
    {title:'역사 단원 문제',items:unitItems},
    {title:'역사 훈련소',items:historyItems},
    {title:'역사총정리',items:historySummaryItems},
    {title:'사건 배열하기',items:timelineItems},
    {title:`역대 왕 계보 · ${KING_ORDER_DUE_LABEL}`,items:kingOrderItems},
    {title:'지도 문제',items:mapItems}
  ].filter(group=>group.items.length>0);
}

function toggleContentApprovalPanel(){
  const body=document.getElementById('content-approval-body');
  const arrow=document.getElementById('content-approval-arrow');
  if(!body)return;
  const open=!body.classList.contains('open');
  body.classList.toggle('open',open);
  if(arrow)arrow.textContent=open?'▴':'▾';
  if(open)renderContentApprovalPanel();
}

function renderContentApprovalPanel(){
  const body=document.getElementById('content-approval-body');
  if(!body)return;
  const map=contentVisibilityCache||readLocalContentVisibility();
  const reqMap=contentRequirementCache||readLocalContentRequirement();
  body.innerHTML=getContentApprovalGroups().map(group=>`
    <div class="content-approval-group">
      <div class="content-approval-group-title">${group.title}</div>
      ${group.items.map(item=>{
        const approved=map[contentVisibilityItemKey(item.type,item.key)]===true;
        const itemKey=contentVisibilityItemKey(item.type,item.key);
        const requiredList=Array.isArray(reqMap[itemKey])?reqMap[itemKey]:STUDENTS.map(s=>s.name);
        return `<div class="content-approval-row">
          <div class="content-approval-row-main">
            <div class="content-approval-label">${item.label}</div>
            <button type="button"
              class="content-approval-switch ${approved?'open':'closed'}"
              onclick="setContentApproved('${item.type}','${item.key}',${approved?'false':'true'})">
              ${approved?'공개 중':'비공개'}
            </button>
          </div>
          <div class="content-approval-required-row">
            <span class="content-approval-required-label">필수 대상</span>
            ${STUDENTS.map(s=>{
              const isRequired=requiredList.indexOf(s.name)!==-1;
              return `<button type="button"
                class="content-approval-required-chip ${isRequired?'on':'off'}"
                onclick="toggleContentRequiredStudent('${item.type}','${item.key}','${s.name}')">
                ${s.name}
              </button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  `).join('')+`
    <div class="content-approval-actions">
      <button type="button" onclick="setAllContentApproved(true)" style="background:rgba(52,199,123,.15);color:#15834a">전체 공개</button>
      <button type="button" onclick="setAllContentApproved(false)" style="background:rgba(110,120,140,.15);color:#596273">전체 비공개</button>
    </div>`;
}

// ===== QuizAttemptLog: resultId 기반 멱등 제출 (4단계) =====
function generateResultId_(){
  if(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function') return crypto.randomUUID();
  return `result_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// 제출 버튼 최초 클릭 시 한 번만 생성, 같은 제출 시도의 재시도 동안 유지. 새 퀴즈를 실제로 시작할 때만 새 컨텍스트로 교체
let currentQuizAttemptContext=null;
function startNewQuizAttemptContext_(){
  currentQuizAttemptContext={resultId:generateResultId_(), startedAtMs:Date.now()};
}
function getOrCreateQuizAttemptContext_(){
  if(!currentQuizAttemptContext) startNewQuizAttemptContext_();
  return currentQuizAttemptContext;
}

function auditRecoveryQueueKey_(name){
  return `pendingAuditRecovery_${name}`;
}
function readAuditRecoveryQueue_(name){
  try{
    const parsed=JSON.parse(localStorage.getItem(auditRecoveryQueueKey_(name))||'[]');
    return Array.isArray(parsed)?parsed:[];
  }catch(e){ return []; }
}
function writeAuditRecoveryQueue_(name,list){
  try{ localStorage.setItem(auditRecoveryQueueKey_(name), JSON.stringify(list)); }catch(e){}
}
// Results 저장은 이미 성공했지만 QuizAttemptLog 저장만 실패한 경우, 낮은 수준의 재전송만 대기열에 남김
// (submitResult 재실행·점수계산·보상·완료화면 재실행 절대 안 함 — apiSubmitRaw_만 다시 호출)
function enqueueAuditRecovery_(entry){
  if(!entry||!entry.name)return;
  const list=readAuditRecoveryQueue_(entry.name);
  list.push(entry);
  writeAuditRecoveryQueue_(entry.name,list);
}
let auditRecoveryFlushLocks_={};
async function flushAuditRecoveryQueue_(name){
  const safeName=String(name||'').trim();
  if(!safeName)return;
  if(auditRecoveryFlushLocks_[safeName])return;
  auditRecoveryFlushLocks_[safeName]=true;
  try{
    let list=readAuditRecoveryQueue_(safeName);
    for(let i=0;i<list.length;i++){
      const result=await apiSubmitRaw_(list[i]);
      if(!result || !result.ok || (result.resultSaved && !result.auditLogged)) break; // 여전히 감사로그 미완료면 순서유지 위해 중단
      const remaining=readAuditRecoveryQueue_(safeName);
      remaining.shift();
      writeAuditRecoveryQueue_(safeName, remaining);
    }
  }catch(e){
    console.error('감사로그 복구 처리 중 오류(무시):',e);
  }finally{
    auditRecoveryFlushLocks_[safeName]=false;
  }
}

async function apiSubmit(entry){
  if(isLearningWriteBlocked())return {ok:false,blocked:true};
  if(entry&&entry.pass&&typeof addCompletedStudyActivity==='function'){
    addCompletedStudyActivity({
      source:entry.subject==='math'?'math':'history',
      key:`unit_${entry.unit||entry.title||'unit'}_${entry.level||''}_${todayLocalDate()}`,
      title:`${entry.subject==='math'?'수학':'역사'} · ${entry.unit||entry.title||'단원 문제'}`,
      detail:`${entry.level?entry.level+' · ':''}PASS`
    });
  }
  if(!apiConfigured())return {ok:false};
  return apiSubmitRaw_(entry);
}

// 서버에 실제 POST만 보내는 저수준 함수 — 감사로그(QuizAttemptLog) 복구 재시도 전용으로도 재사용
// addCompletedStudyActivity, 화면 갱신 등 부가동작은 절대 여기서 실행하지 않음(중복 방지)
async function apiSubmitRaw_(entry){
  if(!apiConfigured())return {ok:false};
  try{
    const body=new URLSearchParams();
    body.set('action','submit');
    body.set('payload', JSON.stringify(entry));
    body.set('isAdminMode', isAdminSessionActive()?'true':'false');
    const stored=getStoredLoginSession_();
    if(stored && stored.name===entry.name) body.set('loginSessionId', stored.loginSessionId);
    const res=await fetch(API_URL, { method:'POST', body });
    const data=await res.json();
    return data && typeof data==='object' ? data : {ok:false};
  }catch(e){console.error(e);return {ok:false};}
}

async function apiGetStudyPlanner(name){
  if(!apiConfigured()||!name)return {};
  try{
    const url=API_URL+'?action=getStudyPlanner&name='+encodeURIComponent(name);
    const res=await fetch(url,{cache:'no-store'});
    const payload=await res.json();

    if(!res.ok||!payload||payload.ok===false){
      console.error('getStudyPlanner 오류:',res.status,payload);
      return {};
    }

    const data=(payload.data&&typeof payload.data==='object')
      ? payload.data
      : (payload.studyPlanner&&typeof payload.studyPlanner==='object')
        ? payload.studyPlanner
        : payload;

    return (data&&typeof data==='object'&&!Array.isArray(data))?data:{};
  }catch(error){
    console.error('getStudyPlanner 요청 실패:',error);
    return {};
  }
}

async function apiSetStudyPlanner(name,plans){
  if(!apiConfigured()||!name||isAdminSessionActive()||isDeveloperTestMode()||parentChildViewActive||viewerModeActive)return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setStudyPlanner');
    body.set('name',name);
    body.set('data',JSON.stringify(plans||{}));
    body.set('isAdminMode',isAdminSessionActive()?'true':'false');

    const res=await fetch(API_URL,{method:'POST',body});
    const payload=await res.json();

    if(!res.ok||!payload||payload.ok!==true){
      console.error('setStudyPlanner 오류:',res.status,payload);
      return false;
    }
    return true;
  }catch(error){
    console.error('setStudyPlanner 요청 실패:',error);
    return false;
  }
}

// ===== LoginLog: 로그인 세션 기록 (2단계) =====
// sessionStorage에 name/loginEventId/loginSessionId를 하나의 객체로 저장 — 같은 탭 새로고침 시 재사용
const LOGIN_SESSION_STORAGE_KEY='appLoginSession';

function generateLoginId_(prefix,name){
  if(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function') return crypto.randomUUID();
  return `${prefix}_${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getStoredLoginSession_(){
  try{ return JSON.parse(sessionStorage.getItem(LOGIN_SESSION_STORAGE_KEY)||'null'); }
  catch(e){ return null; }
}

function getMinimalDeviceInfo_(){
  const ua=navigator.userAgent||'';
  let browser='Unknown';
  if(ua.includes('Edg/'))browser='Edge';
  else if(ua.includes('Chrome/'))browser='Chrome';
  else if(ua.includes('Safari/')&&!ua.includes('Chrome'))browser='Safari';
  else if(ua.includes('Firefox/'))browser='Firefox';
  let os='Unknown';
  if(ua.includes('Windows'))os='Windows';
  else if(ua.includes('Mac OS'))os='macOS';
  else if(ua.includes('Android'))os='Android';
  else if(ua.includes('iPhone')||ua.includes('iPad'))os='iOS';
  return `${browser}/${os}`; // 전체 userAgent 원문·IP·기기고유값은 절대 포함하지 않음
}

async function apiLogLogin(name,loginEventId,loginSessionId){
  if(!apiConfigured()||!name)return false;
  if(isAdminSessionActive()||isDeveloperTestMode()||viewerModeActive)return false; // 관리자/테스트/조회모드는 로그인 기록 안 남김
  try{
    const body=new URLSearchParams();
    body.set('action','logLogin');
    body.set('name',name);
    body.set('loginEventId',loginEventId);
    body.set('loginSessionId',loginSessionId);
    body.set('deviceInfo',getMinimalDeviceInfo_());
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    return !!data.ok;
  }catch(e){console.error('apiLogLogin 오류:',e);return false;}
}

// ===== LearningEventLog: 학습 이벤트 상세이력 (3단계) =====
const LEARNING_EVENT_TYPES=['unit','lecture','historyTraining','eventOrder','mapStudy','studyPlanner','focusMode'];
const LEARNING_EVENT_ACTIONS=['start','complete','leave','return'];

function generateLearningEventId_(name){
  if(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function') return crypto.randomUUID();
  return `evt_${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function pendingLearningEventsKey_(name){
  return `pendingLearningEvents_${name}`; // 학생별로 완전히 분리, 다른 앱 데이터와 접두어로 구분
}

function readPendingLearningEvents_(name){
  try{
    const parsed=JSON.parse(localStorage.getItem(pendingLearningEventsKey_(name))||'[]');
    return Array.isArray(parsed)?parsed:[];
  }catch(e){
    return []; // JSON 손상 시 앱이 멈추지 않도록 안전한 빈 배열로 복구
  }
}
function writePendingLearningEvents_(name,events){
  try{ localStorage.setItem(pendingLearningEventsKey_(name), JSON.stringify(events)); return true; }
  catch(e){ console.error('학습이벤트 대기열 저장 실패(무시):',e); return false; }
}

function isLearningEventTrackable_(){
  return !!playerName && !isAdminSessionActive() && !isDeveloperTestMode() && !viewerModeActive;
}

// 이벤트 발생 즉시 eventId를 한 번 생성해 대기열에 넣고, 바로 1회 전송을 시도함(실패해도 대기열엔 남음)
function enqueueLearningEvent_(eventPartial){
  if(!isLearningEventTrackable_())return null;
  const name=playerName;
  const stored=getStoredLoginSession_();
  const event={
    eventId: eventPartial.eventId || generateLearningEventId_(name),
    relatedEventId: eventPartial.relatedEventId||'',
    loginSessionId: (stored&&stored.name===name)?stored.loginSessionId:'',
    name,
    contentType: eventPartial.contentType||'',
    unitId: eventPartial.unitId||'',
    contentId: eventPartial.contentId||'',
    contentTitle: eventPartial.contentTitle||'',
    action: eventPartial.action||'',
    progressBefore: (eventPartial.progressBefore===undefined||eventPartial.progressBefore===null)?'':eventPartial.progressBefore,
    progressAfter: (eventPartial.progressAfter===undefined||eventPartial.progressAfter===null)?'':eventPartial.progressAfter,
    clientOccurredAtMs: eventPartial.clientOccurredAtMs||Date.now(),
    exitCountAfter: (eventPartial.exitCountAfter===undefined||eventPartial.exitCountAfter===null)?'':eventPartial.exitCountAfter
  };
  const events=readPendingLearningEvents_(name);
  events.push(event);
  const writeOk=writePendingLearningEvents_(name,events);
  if(!writeOk)return null; // 대기열 저장 자체가 실패하면 이벤트를 만든 적 없는 것으로 취급(호출부가 정리 등을 하지 않도록)
  flushPendingLearningEvents_(name).catch(err=>console.error('학습이벤트 전송 실패(무시):',err));
  return event.eventId;
}

async function apiLogLearningEvent(event){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','logLearningEvent');
    body.set('name',event.name);
    body.set('eventId',event.eventId);
    body.set('relatedEventId',event.relatedEventId||'');
    body.set('loginSessionId',event.loginSessionId||'');
    body.set('contentType',event.contentType||'');
    body.set('unitId',event.unitId||'');
    body.set('contentId',event.contentId||'');
    body.set('contentTitle',event.contentTitle||'');
    body.set('eventAction',event.action||'');
    body.set('progressBefore', event.progressBefore===''?'':String(event.progressBefore));
    body.set('progressAfter', event.progressAfter===''?'':String(event.progressAfter));
    body.set('clientOccurredAtMs', String(event.clientOccurredAtMs||''));
    body.set('exitCountAfter', event.exitCountAfter===''?'':String(event.exitCountAfter));
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    return !!(data && data.ok);
  }catch(e){
    console.error('apiLogLearningEvent 오류(무시):',e);
    return false;
  }
}

let learningEventFlushLocks_={}; // 학생별 실행 잠금(동시에 여러 flush 실행 방지)

// 대기열을 발생 순서대로 순차 전송 — 하나라도 실패하면 그 뒤는 시도 안 하고 순서를 지킴(다음 트리거 때 이어서)
async function flushPendingLearningEvents_(name){
  const safeName=String(name||'').trim();
  if(!safeName)return;
  if(isAdminSessionActive()||isDeveloperTestMode()||viewerModeActive)return; // 관리자/테스트/조회모드는 전송 자체 안 함
  if(learningEventFlushLocks_[safeName])return;
  learningEventFlushLocks_[safeName]=true;
  try{
    let events=readPendingLearningEvents_(safeName);
    for(let i=0;i<events.length;i++){
      const ok=await apiLogLearningEvent(events[i]);
      if(!ok) break; // 실패 시 순서 보존을 위해 중단, 대기열은 그대로 유지
      const remaining=readPendingLearningEvents_(safeName);
      remaining.shift();
      writePendingLearningEvents_(safeName, remaining);
    }
  }catch(e){
    console.error('학습이벤트 대기열 처리 중 오류(무시):',e);
  }finally{
    learningEventFlushLocks_[safeName]=false;
  }
}

// 같은 로그인 세션 안에서 동일 콘텐츠의 start 중복 기록만 막기 위한 값 — 진행률/완료 판정에는 절대 사용 안 함
function getSessionStartedContentMap_(){
  try{ return JSON.parse(sessionStorage.getItem('startedContentThisSession')||'{}'); }
  catch(e){ return {}; }
}
function hasStartedThisSession_(contentType,contentId){
  const stored=getStoredLoginSession_();
  const sessionId=stored?stored.loginSessionId:'no-session';
  const key=`${sessionId}::${contentType}::${contentId}`;
  return !!getSessionStartedContentMap_()[key];
}
function markStartedThisSession_(contentType,contentId){
  const stored=getStoredLoginSession_();
  const sessionId=stored?stored.loginSessionId:'no-session';
  const key=`${sessionId}::${contentType}::${contentId}`;
  const map=getSessionStartedContentMap_();
  map[key]=true;
  try{ sessionStorage.setItem('startedContentThisSession', JSON.stringify(map)); }catch(e){}
}

async function apiLogLogout(){
  const stored=getStoredLoginSession_();
  if(!stored||!stored.name||!stored.loginSessionId)return false;
  if(!apiConfigured())return false;
  if(isAdminSessionActive()||isDeveloperTestMode()||viewerModeActive)return false;
  try{
    const body=new URLSearchParams();
    body.set('action','logLogout');
    body.set('name',stored.name);
    body.set('loginSessionId',stored.loginSessionId);
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    return !!data.ok;
  }catch(e){console.error('apiLogLogout 오류:',e);return false;}
}

// PIN 성공이 확정된 두 지점(신규생성/기존검증)에서만 호출 — 학생 화면 진입이 실제로 확정된 경우만 로그인으로 기록
// 중요: 이 함수의 실패는 절대 selectStudent() 진입을 막으면 안 됨 — 호출부에서 await 없이(fire-and-forget) 사용
async function handleStudentLoginLogging_(name){
  try{
    if(isAdminSessionActive()||isDeveloperTestMode()||viewerModeActive)return;
    const stored=getStoredLoginSession_();

    if(stored && stored.name===name){
      if(stored.serverLogged){
        flushPendingLearningEvents_(name).catch(err=>console.error('학습이벤트 전송 실패(무시):',err)); // 같은 학생의 다음 로그인 확인 시점에 재전송 시도
        return;
      }
      // 이전 시도가 실패해서 serverLogged=false로 남아있는 상태 — 같은 eventId/sessionId로 재시도만 함
      const ok=await apiLogLogin(name, stored.loginEventId, stored.loginSessionId);
      if(ok){
        sessionStorage.setItem(LOGIN_SESSION_STORAGE_KEY, JSON.stringify({...stored, serverLogged:true}));
      }
      flushPendingLearningEvents_(name).catch(err=>console.error('학습이벤트 전송 실패(무시):',err));
      return;
    }

    if(stored && stored.name && stored.name!==name){
      flushPendingLearningEvents_(stored.name).catch(err=>console.error('학습이벤트 전송 실패(무시):',err)); // 학생 전환 직전 — 이전 학생 대기열 마지막 전송 시도
      apiLogLogout().catch(err=>console.error('로그아웃 기록 실패(무시하고 진행):',err)); // 이전 학생 세션 종료 — 실패해도 학생 전환을 막지 않음
    }

    const loginEventId=generateLoginId_('login',name);
    const loginSessionId=generateLoginId_('session',name);
    // 요청 전에 먼저 저장 — 실패해도 같은 id로 다음에 재시도 가능하게
    sessionStorage.setItem(LOGIN_SESSION_STORAGE_KEY, JSON.stringify({name,loginEventId,loginSessionId,serverLogged:false}));

    const ok=await apiLogLogin(name,loginEventId,loginSessionId);
    if(ok){
      sessionStorage.setItem(LOGIN_SESSION_STORAGE_KEY, JSON.stringify({name,loginEventId,loginSessionId,serverLogged:true}));
    }
    flushPendingLearningEvents_(name).catch(err=>console.error('학습이벤트 전송 실패(무시):',err));
    // 실패해도 아무것도 안 함 — serverLogged:false로 남아 다음 로그인 확인 시점에 같은 id로 재시도됨
  }catch(err){
    console.error('로그인 기록 처리 중 오류(학생 화면 진입에는 영향 없음):',err);
  }
}

async function apiSetStudyTime(name,data,useBeacon){
  if(!apiConfigured()||!name||isAdminSessionActive()||isDeveloperTestMode())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setStudyTime');
    body.set('name',name);
    body.set('data',JSON.stringify(data));
    body.set('isAdminMode',isAdminSessionActive()?'true':'false');

    if(useBeacon && navigator.sendBeacon){
      // 앱 종료/탭 전환 직전처럼 응답을 기다릴 수 없는 상황 — sendBeacon으로 최대한 전달 보장
      return navigator.sendBeacon(API_URL, body);
    }

    const res=await fetch(API_URL,{method:'POST',body,keepalive:true});
    const payload=await res.json();
    return !!(payload && payload.ok);
  }catch(e){console.error('apiSetStudyTime 오류:',e);return false;}
}

async function apiGetStudyTime(name){
  if(!apiConfigured()||!name)return null;
  try{
    const res=await fetch(API_URL+'?action=getStudyTime&name='+encodeURIComponent(name));
    return await res.json();
  }catch(e){console.error('apiGetStudyTime 오류:',e);return null;}
}

async function apiListStudyTime(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=listStudyTime');
    const payload=await res.json();
    return (payload && payload.data && typeof payload.data==='object')?payload.data:{};
  }catch(e){console.error('apiListStudyTime 오류:',e);return {};}
}

async function apiAddCompletedStudyActivity(name,activity){
  if(!apiConfigured()||!name||!activity||isAdminSessionActive()||isDeveloperTestMode()||parentChildViewActive||viewerModeActive)return false;
  try{
    const body=new URLSearchParams();
    body.set('action','addCompletedStudyActivity');
    body.set('name',name);
    body.set('activity',JSON.stringify(activity));
    body.set('isAdminMode',isAdminSessionActive()?'true':'false');

    const res=await fetch(API_URL,{method:'POST',body});
    const payload=await res.json();

    if(!res.ok||!payload||payload.ok!==true){
      console.error('addCompletedStudyActivity 오류:',res.status,payload);
      return false;
    }
    return true;
  }catch(error){
    console.error('addCompletedStudyActivity 요청 실패:',error);
    return false;
  }
}

async function apiGetKingOrderProgress(name){
  if(!apiConfigured()||!name)return {data:{},needsMigration:[]};
  try{
    const body=new URLSearchParams();
    body.set('action','getKingOrderProgress');
    body.set('name',name);
    const res=await fetch(API_URL,{method:'POST',body,cache:'no-store'});
    const payload=await res.json();
    if(!res.ok||!payload||payload.ok!==true){
      console.error('getKingOrderProgress 오류:',res.status,payload);
      return {data:{},needsMigration:[]};
    }
    return {
      data:(payload.data&&typeof payload.data==='object'&&!Array.isArray(payload.data))?payload.data:{},
      needsMigration:Array.isArray(payload.needsMigration)?payload.needsMigration:[]
    };
  }catch(error){
    console.error('getKingOrderProgress 요청 실패:',error);
    return {data:{},needsMigration:[]};
  }
}

async function apiListKingOrderProgress(){
  if(!apiConfigured())return {};
  try{
    const body=new URLSearchParams();
    body.set('action','listKingOrderProgress');
    const res=await fetch(API_URL,{method:'POST',body,cache:'no-store'});
    const payload=await res.json();
    return (res.ok&&payload&&payload.ok===true&&payload.data&&typeof payload.data==='object')?payload.data:{};
  }catch(error){
    console.error('listKingOrderProgress 요청 실패:',error);
    return {};
  }
}

async function apiSetKingOrderEraComplete(name,eraId,completedAt){
  if(!apiConfigured()||!name||!eraId||isLearningWriteBlocked())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setKingOrderEraComplete');
    body.set('name',name);
    body.set('eraId',eraId);
    body.set('completedAt',completedAt||new Date().toISOString());
    body.set('isAdminMode',isAdminSessionActive()?'true':'false');
    const res=await fetch(API_URL,{method:'POST',body});
    const payload=await res.json();
    return !!(res.ok&&payload&&payload.ok===true);
  }catch(error){
    console.error('setKingOrderEraComplete 요청 실패:',error);
    return false;
  }
}

async function apiList(){
  if(!apiConfigured())return [];
  for(let attempt=0; attempt<2; attempt++){
    try{
      const res=await fetch(API_URL+'?action=list');
      const data=await res.json();
      if(Array.isArray(data)) return data;
    }catch(e){console.error(e);}
    await new Promise(r=>setTimeout(r,900)); // 잠깐 대기 후 재시도
  }
  return [];
}

async function apiReset(){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','reset');
    body.set('token',adminToken||'');
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiResetByDate(date,name){
  if(!apiConfigured())return {ok:false};
  try{
    const body=new URLSearchParams();
    body.set('action','resetByDate');
    body.set('token',adminToken||'');
    body.set('date',date);
    if(name) body.set('name',name);
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return data;
  }catch(e){console.error(e);return {ok:false};}
}

async function apiResetStudent(name){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','resetStudent');
    body.set('token',adminToken||'');
    body.set('name',name);
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiSetAvatar(name,avatar){
  if(isLearningWriteBlocked())return false;
  if(!apiConfigured())return false;
  try{
    const url=API_URL+'?action=setAvatar&name='+encodeURIComponent(name)+'&avatar='+encodeURIComponent(avatar);
    const res=await fetch(url);
    const data=await res.json();
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiGetAvatars(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=getAvatars');
    const data=await res.json();
    return (data && typeof data==='object')?data:{};
  }catch(e){console.error(e);return {};}
}

async function apiLogAccess(name){
  if(isAdminSessionActive()||isDeveloperTestMode())return false;
  if(!apiConfigured())return false;
  try{
    const url=API_URL+'?action=logAccess&name='+encodeURIComponent(name)+'&isAdminMode='+(isAdminSessionActive()?'true':'false');
    const res=await fetch(url);
    const data=await res.json();
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiListAccessLog(){
  if(!apiConfigured())return [];
  try{
    const res=await fetch(API_URL+'?action=listAccessLog');
    const data=await res.json();
    return Array.isArray(data)?data:[];
  }catch(e){console.error(e);return [];}
}

async function apiResetAccessLog(){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','resetAccessLog');
    body.set('token',adminToken||'');
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiSetNote(name,note){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setNote');
    body.set('token',adminToken||'');
    body.set('name',name);
    body.set('note',note);
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiListNotes(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=listNotes');
    const data=await res.json();
    return (data&&typeof data==='object')?data:{};
  }catch(e){console.error(e);return {};}
}

async function apiSetMood(name,mood){
  if(isLearningWriteBlocked())return false;
  if(!apiConfigured())return false;
  try{
    const url=API_URL+'?action=setMood&name='+encodeURIComponent(name)+'&mood='+encodeURIComponent(mood);
    const res=await fetch(url);
    const data=await res.json();
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiListMoods(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=listMoods');
    const data=await res.json();
    return (data&&typeof data==='object')?data:{};
  }catch(e){console.error(e);return {};}
}

async function apiSetPin(name,pin,oldPin){
  if(!apiConfigured())return {ok:false};
  try{
    let url=API_URL+'?action=setPin&name='+encodeURIComponent(name)+'&pin='+encodeURIComponent(pin);
    if(oldPin) url+='&oldPin='+encodeURIComponent(oldPin);
    const res=await fetch(url);
    return await res.json();
  }catch(e){console.error(e);return {ok:false};}
}

async function apiVerifyPin(name,pin){
  if(!apiConfigured())return {ok:false};
  try{
    const url=API_URL+'?action=verifyPin&name='+encodeURIComponent(name)+'&pin='+encodeURIComponent(pin);
    const res=await fetch(url);
    return await res.json();
  }catch(e){console.error(e);return {ok:false};}
}

async function apiListPins(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=listPins');
    if(!res.ok)throw new Error('PIN 목록 응답 오류: '+res.status);
    const data=await res.json();
    if(data&&data.ok===false)throw new Error(data.error||'PIN 목록 조회 실패');
    return (data&&typeof data==='object')?data:{};
  }catch(e){console.error(e);throw e;}
}

async function apiResetPin(name){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','resetPin');
    body.set('token',adminToken||'');
    body.set('name',name);
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiSetDeadline(unitKey,dueDate){
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setDeadline');
    body.set('token',adminToken||'');
    body.set('unitKey',unitKey);
    body.set('dueDate',dueDate);
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

async function apiListDeadlines(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=listDeadlines');
    const data=await res.json();
    return (data&&typeof data==='object')?data:{};
  }catch(e){console.error(e);return {};}
}

// ── 캐릭터 꾸미기 시스템 ──
// ── 캐릭터 꾸미기 시스템 (얼굴 부품 조합형) ──
// ── 캐릭터 꾸미기 시스템 (얼굴 부품 조합형 v2 - 머리/얼굴 이음새 없앰) ──
const SKIN_TONES=['#FFDCB2','#F2C48D','#E0A878','#8D5B3F'];

const HAIR_STYLES=[
  {name:'단발',color:'#6B452B'},
  {name:'곱슬',color:'#2E2A26'},
  {name:'사이드',color:'#D4622A'},
  {name:'웨이브',color:'#D4A62A'},
  {name:'포니테일',color:'#6B452B'},
  {name:'스포츠컷',color:'#2E2A26'},
  {name:'가르마',color:'#6B452B'},
  {name:'언더컷',color:'#2E2A26'},
  {name:'민머리',color:null}
];

const EYE_STYLES=['dot','oval','happy','wink','sleepy'];
const NOSE_STYLES=['dot','curve','none'];
const MOUTH_STYLES=['smile','open','line','o'];
const ACCESSORIES=['glasses','cap','earring'];

function isCharConfig(str){
  return /^\d+(-\d+){4}(-[\d,]*)?$/.test(str||'');
}

function defaultCharConfig(){ return '0-0-0-0-0-'; }

function parseAccessoryIndices(accStr){
  if(!accStr) return [];
  return accStr.split(',').map(Number).filter(n=>!isNaN(n) && n>=0 && n<ACCESSORIES.length);
}

function buildAvatarSVG(configStr,size){
  size=size||34;
  const parts=(configStr||defaultCharConfig()).split('-');
  while(parts.length<6) parts.push('');
  const raw=parts.slice(0,5).map(Number);
  const accIndices=parseAccessoryIndices(parts[5]);
  const skin=SKIN_TONES[raw[0]]||SKIN_TONES[0];
  const hair=HAIR_STYLES[raw[1]]||HAIR_STYLES[0];
  const eyeStyle=EYE_STYLES[raw[2]]||EYE_STYLES[0];
  const noseStyle=NOSE_STYLES[raw[3]]||NOSE_STYLES[0];
  const mouthStyle=MOUTH_STYLES[raw[4]]||MOUTH_STYLES[0];
  const outline='#3A2A1E';

  // 얼굴 중심/반지름 (기준값) — 머리는 이 원보다 넉넉하게 그려서
  // 얼굴 원을 나중에 덮어 그리면 이음새 없이 자연스럽게 붙습니다.
  const cx=50, cy=56, r=31;

  // ── 눈 ──
  let eyesSvg='';
  if(eyeStyle==='dot'){
    eyesSvg=`<circle cx="37" cy="54" r="3.4" fill="${outline}"/><circle cx="63" cy="54" r="3.4" fill="${outline}"/>`;
  }else if(eyeStyle==='oval'){
    eyesSvg=`<ellipse cx="37" cy="54" rx="4" ry="5.2" fill="${outline}"/><ellipse cx="63" cy="54" rx="4" ry="5.2" fill="${outline}"/>
      <circle cx="38.3" cy="52" r="1.3" fill="#fff"/><circle cx="64.3" cy="52" r="1.3" fill="#fff"/>`;
  }else if(eyeStyle==='happy'){
    eyesSvg=`<path d="M31,55 A7,7 0 0,1 43,55" stroke="${outline}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M57,55 A7,7 0 0,1 69,55" stroke="${outline}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }else if(eyeStyle==='wink'){
    eyesSvg=`<circle cx="37" cy="54" r="3.4" fill="${outline}"/>
      <path d="M57,54 A7,7 0 0,1 69,54" stroke="${outline}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }else if(eyeStyle==='sleepy'){
    eyesSvg=`<line x1="31" y1="54" x2="43" y2="54" stroke="${outline}" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="57" y1="54" x2="69" y2="54" stroke="${outline}" stroke-width="2.6" stroke-linecap="round"/>`;
  }

  // ── 코 ──
  let noseSvg='';
  if(noseStyle==='dot'){
    noseSvg=`<circle cx="50" cy="62" r="1.8" fill="${outline}" opacity="0.55"/>`;
  }else if(noseStyle==='curve'){
    noseSvg=`<path d="M48,58 Q47,63 50,64" stroke="${outline}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  }

  // ── 입 ──
  let mouthSvg='';
  if(mouthStyle==='smile'){
    mouthSvg=`<path d="M41,71 Q50,77 59,71" stroke="${outline}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  }else if(mouthStyle==='open'){
    mouthSvg=`<path d="M41,70 Q50,80 59,70 Q50,75 41,70 Z" fill="#B0473A"/>`;
  }else if(mouthStyle==='line'){
    mouthSvg=`<line x1="43" y1="72" x2="57" y2="72" stroke="${outline}" stroke-width="2.4" stroke-linecap="round"/>`;
  }else if(mouthStyle==='o'){
    mouthSvg=`<ellipse cx="50" cy="73" rx="4" ry="5" fill="#B0473A"/>`;
  }

  // ── 헤어: 얼굴보다 먼저 그리는 "뒷머리(캡)" + 얼굴 그린 뒤 그리는 "덧머리(장식)" ──
  let hairBack='';
  let hairFront='';
  if(hair.color){
    const hc=hair.color;
    if(hair.name==='단발'){
      hairBack=`<ellipse cx="${cx}" cy="${cy-10}" rx="${r+3}" ry="${r+1}" fill="${hc}"/>`;
      hairFront=`<path d="M15,${cy-4} Q13,${cy+20} 20,${cy+26} Q16,${cy+10} 18,${cy-4} Z" fill="${hc}"/>
        <path d="M85,${cy-4} Q87,${cy+20} 80,${cy+26} Q84,${cy+10} 82,${cy-4} Z" fill="${hc}"/>`;
    }else if(hair.name==='곱슬'){
      hairBack=`<ellipse cx="${cx}" cy="${cy-9}" rx="${r+4}" ry="${r+3}" fill="${hc}"/>
        ${[19,32,50,68,81].map(x=>`<circle cx="${x}" cy="${cy-27}" r="9" fill="${hc}"/>`).join('')}
        <circle cx="14" cy="${cy-6}" r="9" fill="${hc}"/><circle cx="86" cy="${cy-6}" r="9" fill="${hc}"/>`;
    }else if(hair.name==='사이드'){
      hairBack=`<ellipse cx="${cx-3}" cy="${cy-10}" rx="${r+5}" ry="${r+2}" fill="${hc}"/>`;
      hairFront=`<path d="M14,${cy-2} Q10,${cy+14} 22,${cy+18} Q14,${cy+4} 20,${cy-8} Q30,${cy-20} 50,${cy-24} Q30,${cy-18} 14,${cy-2} Z" fill="${hc}"/>`;
    }else if(hair.name==='웨이브'){
      hairBack=`<ellipse cx="${cx}" cy="${cy-10}" rx="${r+3}" ry="${r+1}" fill="${hc}"/>`;
      hairFront=`<path d="M14,${cy-6} Q9,${cy+4} 15,${cy+16} Q19,${cy+7} 14,${cy-2} Q22,${cy+8} 17,${cy+22} Q26,${cy+10} 20,${cy-4}" fill="${hc}"/>
        <path d="M86,${cy-6} Q91,${cy+4} 85,${cy+16} Q81,${cy+7} 86,${cy-2} Q78,${cy+8} 83,${cy+22} Q74,${cy+10} 80,${cy-4}" fill="${hc}"/>`;
    }else if(hair.name==='포니테일'){
      hairBack=`<ellipse cx="${cx}" cy="${cy-10}" rx="${r+3}" ry="${r+1}" fill="${hc}"/>`;
      hairFront=`<circle cx="84" cy="${cy-16}" r="8" fill="${hc}"/><path d="M87,${cy-20} Q102,${cy-8} 92,${cy+18}" stroke="${hc}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    }else if(hair.name==='스포츠컷'){
      hairBack=`<ellipse cx="${cx}" cy="${cy-16}" rx="${r-2}" ry="${r-15}" fill="${hc}"/>`;
    }else if(hair.name==='가르마'){
      hairBack=`<ellipse cx="${cx}" cy="${cy-11}" rx="${r+2}" ry="${r-3}" fill="${hc}"/>`;
      hairFront=`<path d="M33,${cy-25} Q41,${cy-31} 31,${cy-34}" stroke="${skin}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    }else if(hair.name==='언더컷'){
      hairBack=`<ellipse cx="${cx}" cy="${cy-15}" rx="${r-4}" ry="${r-16}" fill="${hc}"/>`;
      hairFront=`${[39,45,51,57].map(x=>`<path d="M${x},${cy-27} L${x+3.5},${cy-35} L${x+7},${cy-27} Z" fill="${hc}"/>`).join('')}`;
    }
  }

  // ── 악세서리 (얼굴 그린 뒤 맨 위에 표시, 여러 개 동시 착용 가능) ──
  let accessorySvg='';
  accIndices.forEach(idx=>{
    const accessory=ACCESSORIES[idx];
    if(accessory==='glasses'){
      accessorySvg+=`<circle cx="37" cy="54" r="9" fill="none" stroke="${outline}" stroke-width="2.2"/>
        <circle cx="63" cy="54" r="9" fill="none" stroke="${outline}" stroke-width="2.2"/>
        <line x1="46" y1="54" x2="54" y2="54" stroke="${outline}" stroke-width="2.2"/>
        <line x1="28" y1="52" x2="22" y2="50" stroke="${outline}" stroke-width="2"/>
        <line x1="72" y1="52" x2="78" y2="50" stroke="${outline}" stroke-width="2"/>`;
    }else if(accessory==='cap'){
      accessorySvg+=`<path d="M17,50 Q17,14 50,14 Q83,14 83,50 Z" fill="#2C4A6E" stroke="${outline}" stroke-width="1.2"/>
        <ellipse cx="74" cy="45" rx="12" ry="5.5" fill="#2C4A6E" stroke="${outline}" stroke-width="1"/>
        <circle cx="50" cy="17" r="2" fill="#1E3A56"/>`;
    }else if(accessory==='earring'){
      accessorySvg+=`<circle cx="19" cy="62" r="2.2" fill="#E8B84A"/><circle cx="81" cy="62" r="2.2" fill="#E8B84A"/>`;
    }
  });

  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">
    ${hairBack}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}" stroke="${outline}" stroke-width="1.6"/>
    <path d="M28,40 A24,24 0 0,1 60,32 A20,20 0 0,0 28,40 Z" fill="#fff" opacity="0.1"/>
    <ellipse cx="30" cy="64" rx="5.4" ry="3.6" fill="#F3A68C" opacity="0.6"/>
    <ellipse cx="70" cy="64" rx="5.4" ry="3.6" fill="#F3A68C" opacity="0.6"/>
    ${eyesSvg}
    ${noseSvg}
    ${mouthSvg}
    ${hairFront}
    ${accessorySvg}
  </svg>`;
}

function renderAvatarHtml(avatarValue,size){
  if(isCharConfig(avatarValue)) return buildAvatarSVG(avatarValue,size||34);
  return `<span style="font-size:${size||34}px;line-height:1">${avatarValue}</span>`;
}

const STUDENTS=[
  {name:'김주하',avatar:'⭐',grade:'middle2',mathUnitId:'geometry-properties'},
  {name:'전민건',avatar:'⭐',grade:'middle3',mathUnitId:'trigonometric-ratios'},
  {name:'이하이',avatar:'⭐',grade:'middle1',mathUnitId:'linear-equation'},
  {name:'최단비',avatar:'⭐',grade:'high1',mathUnitId:'coordinate-geometry'}
];

const ART={
  'goindol':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Gochang_Dolmen_Sites_-_3.JPG?width=400',cap:'고창 고인돌 유적 (청동기 시대)'},
  'dongkeom':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Liaoning-type_bronze_dagger.National_Museum_of_Korea.jpg?width=400',cap:'비파형 동검 (청동기 시대)'},
  'jinkeum':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/%EA%B8%88%EB%8F%99%EC%97%B0%EA%B0%807%EB%85%84%EB%AA%85%EC%97%AC%EB%9E%98%EC%9E%85%EC%83%81.jpg?width=400',cap:'금동 연가 7년명 여래 입상 (고구려)'},
  'hyanro':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Incense_Burner_of_Baekje_in_National_Museum_of_Korea.jpg?width=400',cap:'백제 금동대향로'},
  'bungwang':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Bunhwangsa_Pagode.JPG?width=400',cap:'경주 분황사 모전석탑 (신라, 선덕여왕)'},
  'cheom':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Cheomseongdae-1.jpg?width=400',cap:'경주 첨성대 (신라, 선덕여왕)'},
  'muwon':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Tomb_of_Muryeong_of_Baekje.JPG?width=400',cap:'백제 무령왕릉 내부'},
  'sashindo':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/%EB%B0%B1%ED%98%B8_%EC%A1%B0%EC%84%A0%EA%B3%A0%EC%A0%81%EB%8F%84%EB%B3%B4.jpg?width=400',cap:'고구려 고분 벽화 - 사신도(백호)'},
  'bangasa':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Bangasayusang.jpg?width=400',cap:'금동 미륵보살 반가사유상 (국보 제83호)'},
  'hunmin':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Hunminjeongum.jpg?width=400',cap:'훈민정음 해례본 (조선, 세종)'},
  'kangnido':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/KangnidoMap.jpg?width=400',cap:'혼일강리역대국도지도 (조선, 태종)'},
  'cheonsang':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Cheonsang.jpg?width=400',cap:'천상열차분야지도 (조선, 태조)'},
  'sillok':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Joseon_Wangjo_Sillok_and_its_case_in_museum.jpg?width=400',cap:'조선왕조실록'},
  'gyeongguk':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Gyeongguk_daejeon_in_the_National_Museum_of_Korea_2016-11.jpg?width=400',cap:'경국대전 (조선, 성종)'},
  'angbu':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Seoul-Gyeongbokgung-Sundial-02.jpg?width=400',cap:'앙부일구 (조선, 세종)'},
  'singijeon':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Hwacha_cropped.jpg?width=400',cap:'신기전과 화차 (조선)'},
  'samgang':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Samganghaengsildo_in_museum.jpg?width=400',cap:'삼강행실도 (조선, 세종)'}
};


// 문제 데이터가 아직 없는 신규 단원은 카드만 '준비 중'으로 보여주고
// 전체 진행률·미완료·이어하기 계산에서는 제외합니다.
// 각 단원 문제 배열에 문제를 넣는 순간 별도 코드 변경 없이 자동 활성화됩니다.
function isUnitReadyForLearning(unitKey){
  const u=UNITS[unitKey];
  if(!u) return false;
  if(!u.activateWhenQuestionsAdded) return true;
  return Array.isArray(u.questions) && u.questions.length>0;
}
function getActiveUnitKeys(){
  return Object.keys(UNITS).filter(isUnitReadyForLearning);
}

let currentUnit=null;

// UNIT 기록 매칭: unitKey가 있으면 그걸로, 없는(구버전) 기록은 title 또는 legacyTitles로 폴백
// 나중에 UNITS[key].title을 바꾸더라도, 예전 제목을 legacyTitles:['예전 제목'] 에 추가해두면 과거 기록이 안 사라짐
function entryMatchesUnit(entry, unitKey){
  if(!entry) return false;
  if(entry.unitKey){
    return entry.unitKey===unitKey;
  }
  const u=UNITS[unitKey];
  if(!u) return false;
  if(entry.unit===u.title) return true;
  if(Array.isArray(u.legacyTitles) && u.legacyTitles.includes(entry.unit)) return true;
  return false;
}

// ── 글꼴 선택 (기기별 개인 설정) ──
const FONT_OPTIONS=[
  {id:'Gaegu',label:'✏️ 개구 (손글씨체)'},
  {id:'Noto Sans KR',label:'🔠 노토산스 (기본체)'},
  {id:'Pretendard',label:'🌐 프리텐다드 (모던체)'},
  {id:'Gowun Dodum',label:'🍡 고운돋움 (둥근체)'},
  {id:'Nanum Myeongjo',label:'📜 나눔명조 (붓글씨느낌)'}
];

function applyFont(fontId){
  document.documentElement.style.setProperty('--app-font', `'${fontId}'`);
  try{ localStorage.setItem('appFont', fontId); }catch(e){}
}

function openFontPicker(){
  let saved='Pretendard';
  try{ saved=localStorage.getItem('appFont')||'Pretendard'; }catch(e){}
  document.getElementById('font-opt-list').innerHTML=FONT_OPTIONS.map(f=>
    `<div class="font-opt-item${f.id===saved?' chosen':''}" style="font-family:'${f.id}'" onclick="chooseFontOption('${f.id}')">${f.label}</div>`
  ).join('');
  document.getElementById('font-picker-overlay').classList.add('show');
}

function closeFontPicker(){
  document.getElementById('font-picker-overlay').classList.remove('show');
}

function chooseFontOption(fontId){
  applyFont(fontId);
  openFontPicker(); // 선택 표시 갱신
}

try{
  const savedFont=localStorage.getItem('appFont');
  if(savedFont) applyFont(savedFont);
}catch(e){}

// 학생별 포인트 컬러(Design.md 2.2) — 학생 선택 시 --student-accent 등 CSS 변수 주입
const STUDENT_ACCENT_VARS={
  '김주하':{accent:'--student-coral',tint:'--student-coral-tint',shade:'--student-coral-shade'},
  '전민건':{accent:'--student-mint',tint:'--student-mint-tint',shade:'--student-mint-shade'},
  '이하이':{accent:'--student-lavender',tint:'--student-lavender-tint',shade:'--student-lavender-shade'},
  '최단비':{accent:'--student-lemon',tint:'--student-lemon-tint',shade:'--student-lemon-shade'}
};

function applyStudentAccent(name){
  const vars=STUDENT_ACCENT_VARS[name];
  if(!vars)return;
  const root=document.documentElement.style;
  root.setProperty('--student-accent',`var(${vars.accent})`);
  root.setProperty('--student-accent-tint',`var(${vars.tint})`);
  root.setProperty('--student-accent-shade',`var(${vars.shade})`);
}

let levelSectionVisible=false;

function selectUnit(el,key){
  if(!isContentApproved('unit',key)){
    showToast2('선생님이 아직 공개하지 않은 학습입니다.');
    return;
  }
  if(parentChildViewActive&&!isUnitCompletedForParent(parentChildViewName,key)){
    if(typeof showToast2==='function')showToast2('🔒 아직 완료하지 않은 단원은 문제를 볼 수 없어요.');
    return;
  }
  if(!isUnitReadyForLearning(key)){
    if(typeof showToast2==='function') showToast2('📚 이 단원의 문제를 준비 중이에요.');
    return;
  }
  const levelWrap=document.getElementById('level-section-wrapper');
  const isSameUnit = (key===currentUnit) && el.classList.contains('active');

  if(isSameUnit && levelSectionVisible){
    // 이미 펼쳐진 같은 단원을 다시 누르면 접기
    levelSectionVisible=false;
    if(levelWrap) levelWrap.style.display='none';
    return;
  }

  document.querySelectorAll('.unit-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  currentUnit=key;
  levelSectionVisible=true;
  if(levelWrap) levelWrap.style.display='block';
  updateLevelDesc();
  renderStudentCards();
  updateProgressColors();
  if(levelWrap) el.insertAdjacentElement('afterend', levelWrap);
  if(UNITS[key].examMode){
    openStartQuizPopup();
  }
}

const UNIT_GROUP1_KEYS=['prehistoric','politics','culture'];
const UNIT_GROUP2_KEYS=['suidang','unification','balhae','silla','sillaCulture','balhaeCulture','southNorthExchange'];
const UNIT_GROUP3_KEYS=['goryeoFounding','goryeoGovernment','goryeoMilitaryRegime','goryeoKhitanJurchen','goryeoMongol','goryeoYuanInterference','goryeoAntiYuanReform','goryeoCulture'];
const UNIT_GROUP4_KEYS=['joseonFounding','joseonEarlyKings','joseonGovernment','joseonDiplomacy','sarimEmergence','factionFormation','joseonCulture','imjinJeongyuWar','jeongmyoByeongjaWar'];
const UNIT_GROUP5_KEYS=['lateJoseonChange','yeongjoJeongjoTangpyeong','sedoPolitics','ruralSocietyChange','peasantUprising','silhakGukhak','lateJoseonCulturalExchange','lateJoseonCommonerCulture'];
const UNIT_GROUP_REVIEW_KEYS=['review','southNorthReview','goryeoReview','joseonReview'];

// 번호가 매겨진 UNIT 그룹들 — 새 UNIT을 추가할 땐 이 배열에만 항목을 넣으면 됩니다.
// '정리문제' 그룹은 아래 getAllUnitGroups_()에서 항상 이 배열 뒤에 붙으므로, 그룹이 몇 개로 늘어나든 항상 맨 아래에 남습니다.
const NUMBERED_UNIT_GROUPS_=[
  {id:'unit-group-1', label:'UNIT 1', keys:UNIT_GROUP1_KEYS},
  {id:'unit-group-2', label:'UNIT 2', keys:UNIT_GROUP2_KEYS},
  {id:'unit-group-3', label:'UNIT 3', keys:UNIT_GROUP3_KEYS},
  {id:'unit-group-4', label:'UNIT 4', keys:UNIT_GROUP4_KEYS},
  {id:'unit-group-5', label:'UNIT 5', keys:UNIT_GROUP5_KEYS}
];
function getAllUnitGroups_(){
  return [...NUMBERED_UNIT_GROUPS_, {id:'unit-group-review', label:'정리문제', keys:UNIT_GROUP_REVIEW_KEYS}];
}

function getUnitGroupInfo(unitKey){
  const found=getAllUnitGroups_().find(g=>g.keys.includes(unitKey));
  return found?{label:found.label, id:found.id}:{label:'UNIT 2', id:'unit-group-2'};
}

function renderUnitGrid(){
  const grid=document.getElementById('unit-grid');
  // selectUnit()이 level-section-wrapper를 클릭한 카드 바로 뒤로 옮겨두는데(insertAdjacentElement),
  // 그 카드가 unit-grid 내부에 있으면 이 아래 innerHTML 초기화 때 함께 영구 소실됨 — 초기화 전에 안전한 위치로 되돌림
  const levelWrapToPreserve=document.getElementById('level-section-wrapper');
  if(levelWrapToPreserve && grid && grid.contains(levelWrapToPreserve)){
    grid.insertAdjacentElement('afterend', levelWrapToPreserve);
  }
  const groups=getAllUnitGroups_();
  grid.innerHTML=groups.map(g=>`
    <div class="unit-group-toggle" onclick="toggleUnitGroup('${g.id}')">
      <span>${g.label}</span><span id="${g.id}-arrow" class="unit-group-arrow" data-open="false"></span>
    </div>
    <div class="unit-group-body" id="${g.id}" style="display:none"></div>
  `).join('');
  groups.forEach(g=>renderUnitGroupBody(g.id,g.keys));

  // 역사학습콘텐츠 카드 구성 (사건배열은 운영 제외, 데이터·기록만 보존)
  const gameSection=document.getElementById('timeline-game-section');
  if(gameSection){
    gameSection.innerHTML='';
    gameSection.appendChild(createHistoryTrainingCard());
    gameSection.appendChild(createKingOrderCard());
    gameSection.appendChild(createMapStudyCard());
  }
  updateLevelDesc();
  updateProgressColors();
  const activeCard=grid.querySelector('.unit-card.active')||grid.querySelector('.unit-card');
  const levelWrap=document.getElementById('level-section-wrapper');
  if(activeCard && levelWrap) activeCard.insertAdjacentElement('afterend', levelWrap);
  levelSectionVisible=false;
  if(levelWrap) levelWrap.style.display='none';
}



const MAP_STUDY_PARTS=[
  {
    id:'part1', title:'고조선과 여러 나라', sub:'고조선 · 부여 · 고구려 · 옥저 · 동예 · 삼한',
    questions:[
      {type:'mc',q:'압록강 중류 지역에서 성장한 나라는?',options:['부여','고구려','동예','삼한'],answer:1,ex:'고구려는 압록강 중류의 졸본 지역에서 성장했어요.'},
      {type:'mc',q:'만주 쑹화강 유역에 있었던 나라는?',options:['부여','옥저','삼한','백제'],answer:0,ex:'부여는 만주 쑹화강 유역에 있었어요.'},
      {type:'mc',q:'함경도 해안 지역에 있었던 나라는?',options:['옥저','삼한','고조선','신라'],answer:0,ex:'옥저는 함경도 해안 지역에 있었어요.'},
      {type:'mc',q:'한반도 동해안 북부 지역에 있었던 나라는?',options:['동예','부여','백제','가야'],answer:0,ex:'동예는 동해안 북부 지역에 있었어요.'},
      {type:'mc',q:'한반도 남부에 자리 잡은 여러 소국의 연맹체는?',options:['삼한','부여','고조선','옥저'],answer:0,ex:'마한·진한·변한을 합쳐 삼한이라고 해요.'},
      {type:'map',q:'부여의 위치를 눌러보세요.',answer:'north',ex:'부여는 만주 북부 쪽에 있었어요.'},
      {type:'map',q:'고구려의 위치를 눌러보세요.',answer:'northwest',ex:'고구려는 압록강 중류 지역에서 성장했어요.'},
      {type:'map',q:'옥저의 위치를 눌러보세요.',answer:'northeast',ex:'옥저는 함경도 해안 지역에 있었어요.'},
      {type:'map',q:'동예의 위치를 눌러보세요.',answer:'east',ex:'동예는 한반도 동해안 북부에 있었어요.'},
      {type:'map',q:'삼한의 위치를 눌러보세요.',answer:'south',ex:'삼한은 한반도 남부에 있었어요.'}
    ]
  },
  {
    id:'part2', title:'삼국의 성장', sub:'고구려 · 백제 · 신라 · 가야 · 한강 유역',
    questions:[
      {type:'mc',q:'국내성을 수도로 삼았던 나라는?',options:['고구려','백제','신라','가야'],answer:0,ex:'고구려는 국내성을 중심으로 성장했어요.'},
      {type:'mc',q:'한성을 수도로 삼았던 나라는?',options:['신라','백제','고구려','가야'],answer:1,ex:'백제는 한강 유역의 한성을 수도로 삼았어요.'},
      {type:'mc',q:'금성을 수도로 삼았던 나라는?',options:['고구려','백제','신라','가야'],answer:2,ex:'신라의 수도 금성은 오늘날 경주예요.'},
      {type:'mc',q:'낙동강 유역에서 성장한 나라는?',options:['가야','고구려','백제','옥저'],answer:0,ex:'가야는 낙동강 유역에서 성장했어요.'},
      {type:'mc',q:'삼국이 치열하게 다투었던 핵심 지역은?',options:['한강 유역','압록강 유역','두만강 유역','제주도'],answer:0,ex:'한강 유역은 교통과 농업에 유리했어요.'},
      {type:'map',q:'고구려의 중심 지역을 눌러보세요.',answer:'northwest',ex:'고구려는 한반도 북부와 만주 일대에서 성장했어요.'},
      {type:'map',q:'백제의 중심 지역을 눌러보세요.',answer:'centralwest',ex:'백제는 한강 유역을 중심으로 성장했어요.'},
      {type:'map',q:'신라의 중심 지역을 눌러보세요.',answer:'southeast',ex:'신라는 경주를 중심으로 성장했어요.'},
      {type:'map',q:'가야의 중심 지역을 눌러보세요.',answer:'south',ex:'가야는 낙동강 하류 지역에 있었어요.'},
      {type:'map',q:'한강 유역을 눌러보세요.',answer:'central',ex:'한강 유역은 삼국의 각축장이었어요.'}
    ]
  },
  {
    id:'part3', title:'삼국의 전성기', sub:'근초고왕 · 광개토대왕 · 장수왕 · 진흥왕',
    questions:[
      {type:'mc',q:'4세기 한강 유역을 바탕으로 전성기를 이룬 나라는?',options:['백제','고구려','신라','발해'],answer:0,ex:'근초고왕 때 백제가 전성기를 맞았어요.'},
      {type:'mc',q:'광개토대왕 때 영토를 크게 넓힌 나라는?',options:['신라','백제','고구려','가야'],answer:2,ex:'광개토대왕은 만주와 한반도 북부로 영토를 넓혔어요.'},
      {type:'mc',q:'장수왕이 수도를 옮긴 곳은?',options:['평양','한성','금성','사비'],answer:0,ex:'장수왕은 남진 정책을 위해 평양으로 천도했어요.'},
      {type:'mc',q:'6세기 진흥왕 때 한강 유역을 차지한 나라는?',options:['신라','백제','고구려','가야'],answer:0,ex:'신라는 진흥왕 때 한강 유역을 차지했어요.'},
      {type:'mc',q:'한강 유역을 차지한 순서로 알맞은 것은?',options:['백제→고구려→신라','신라→백제→고구려','고구려→신라→백제','백제→신라→고구려'],answer:0,ex:'백제, 고구려, 신라 순으로 한강 유역을 차지했어요.'},
      {type:'map',q:'백제 전성기의 중심인 한강 유역을 눌러보세요.',answer:'centralwest',ex:'백제는 한강 유역을 바탕으로 성장했어요.'},
      {type:'map',q:'고구려 전성기의 중심 지역을 눌러보세요.',answer:'northwest',ex:'고구려는 만주와 한반도 북부에서 강성했어요.'},
      {type:'map',q:'장수왕이 옮긴 수도 평양의 위치를 눌러보세요.',answer:'northcentral',ex:'평양은 한반도 북서부에 있어요.'},
      {type:'map',q:'진흥왕 때 신라가 차지한 한강 유역을 눌러보세요.',answer:'central',ex:'신라는 한강 유역을 차지하며 크게 성장했어요.'},
      {type:'map',q:'신라의 수도 금성 지역을 눌러보세요.',answer:'southeast',ex:'금성은 오늘날 경주예요.'}
    ]
  },
  {
    id:'part4', title:'삼국 통일 과정', sub:'백제 멸망 · 고구려 멸망 · 매소성 · 기벌포',
    questions:[
      {type:'mc',q:'660년에 멸망한 나라는?',options:['백제','고구려','신라','발해'],answer:0,ex:'백제는 660년에 나당 연합군에게 멸망했어요.'},
      {type:'mc',q:'668년에 멸망한 나라는?',options:['백제','고구려','가야','신라'],answer:1,ex:'고구려는 668년에 멸망했어요.'},
      {type:'mc',q:'신라가 삼국 통일 과정에서 연합한 나라는?',options:['수','당','일본','발해'],answer:1,ex:'신라는 당과 연합했어요.'},
      {type:'mc',q:'신라가 당군을 크게 물리친 전투는?',options:['매소성 전투','살수 대첩','황산벌 전투','귀주 대첩'],answer:0,ex:'매소성 전투에서 신라는 당군을 크게 물리쳤어요.'},
      {type:'mc',q:'나당 전쟁의 마지막 승리를 거둔 해전은?',options:['기벌포 전투','한산도 대첩','명량 해전','노량 해전'],answer:0,ex:'기벌포 전투 승리로 당의 세력을 몰아냈어요.'},
      {type:'map',q:'백제의 마지막 수도 사비 지역을 눌러보세요.',answer:'southwest',ex:'사비는 오늘날 충남 부여 지역이에요.'},
      {type:'map',q:'고구려의 마지막 수도 평양 지역을 눌러보세요.',answer:'northcentral',ex:'고구려의 마지막 수도는 평양이었어요.'},
      {type:'map',q:'황산벌 전투가 벌어진 지역을 눌러보세요.',answer:'southwest',ex:'황산벌은 백제 지역에서 벌어졌어요.'},
      {type:'map',q:'매소성 전투 지역을 눌러보세요.',answer:'central',ex:'매소성 전투는 한반도 중부 지역에서 벌어졌어요.'},
      {type:'map',q:'기벌포 전투가 벌어진 서해안 지역을 눌러보세요.',answer:'westcoast',ex:'기벌포는 금강 하구의 서해안 지역으로 봐요.'}
    ]
  },
  {
    id:'part5', title:'통일신라와 발해', sub:'남북국 시대 · 9주 5소경 · 5경 15부 62주',
    questions:[
      {type:'mc',q:'대조영이 세운 나라는?',options:['발해','통일신라','후고구려','고려'],answer:0,ex:'대조영은 698년에 발해를 세웠어요.'},
      {type:'mc',q:'통일신라의 지방 행정 조직은?',options:['9주 5소경','5경 15부 62주','8도','23부'],answer:0,ex:'통일신라는 전국을 9주로 나누고 5소경을 두었어요.'},
      {type:'mc',q:'발해의 지방 행정 조직은?',options:['9주 5소경','5경 15부 62주','8도','12목'],answer:1,ex:'발해는 5경 15부 62주 체제를 갖추었어요.'},
      {type:'mc',q:'발해의 전성기를 이끈 왕은?',options:['선왕','무열왕','진흥왕','신문왕'],answer:0,ex:'선왕 때 발해는 해동성국이라 불렸어요.'},
      {type:'mc',q:'통일신라와 발해가 함께 존재한 시대를 부르는 말은?',options:['남북국 시대','후삼국 시대','삼국 시대','고조선 시대'],answer:0,ex:'남쪽의 신라와 북쪽의 발해가 함께 존재했어요.'},
      {type:'map',q:'발해의 중심 지역을 눌러보세요.',answer:'north',ex:'발해는 만주와 한반도 북부에 걸쳐 있었어요.'},
      {type:'map',q:'통일신라의 중심 영역을 눌러보세요.',answer:'south',ex:'통일신라는 대동강 이남의 한반도 대부분을 차지했어요.'},
      {type:'map',q:'발해의 수도 상경용천부가 있던 북쪽 지역을 눌러보세요.',answer:'north',ex:'상경용천부는 발해 북부 중심지였어요.'},
      {type:'map',q:'통일신라의 수도 금성 지역을 눌러보세요.',answer:'southeast',ex:'금성은 오늘날 경주예요.'},
      {type:'map',q:'남북국 시대의 남쪽 국가 영역을 눌러보세요.',answer:'south',ex:'남쪽에는 통일신라가 있었어요.'}
    ]
  }
];

const MAP_ZONES=[
  {id:'north',label:'만주 북부',left:42,top:8},
  {id:'northwest',label:'압록강 중류',left:18,top:21},
  {id:'northeast',label:'함경도 해안',left:64,top:22},
  {id:'northcentral',label:'평양',left:31,top:34},
  {id:'east',label:'동해안 북부',left:67,top:38},
  {id:'centralwest',label:'한성',left:23,top:49},
  {id:'central',label:'한강 유역',left:46,top:51},
  {id:'westcoast',label:'서해안',left:12,top:64},
  {id:'southwest',label:'사비·백제',left:25,top:70},
  {id:'southeast',label:'금성·신라',left:62,top:74},
  {id:'south',label:'삼한·가야',left:43,top:86}
];


let mapLearnLabelsVisible=true;
let mapLearnSelectedZone=null;

function getMapLearnItems(partId){
  const groups={
    part1:[
      {zone:'north',name:'부여',desc:'만주 쑹화강 유역에 위치했어요.'},
      {zone:'northwest',name:'고구려',desc:'압록강 중류 지역에서 성장했어요.'},
      {zone:'northeast',name:'옥저',desc:'함경도 해안 지역에 있었어요.'},
      {zone:'east',name:'동예',desc:'한반도 동해안 북부 지역에 있었어요.'},
      {zone:'south',name:'삼한',desc:'한반도 남부에 자리 잡았어요.'}
    ],
    part2:[
      {zone:'northwest',name:'고구려',desc:'만주와 한반도 북부에서 성장했어요.'},
      {zone:'centralwest',name:'백제',desc:'한강 유역의 한성을 중심으로 성장했어요.'},
      {zone:'southeast',name:'신라',desc:'금성, 오늘날 경주를 중심으로 성장했어요.'},
      {zone:'south',name:'가야',desc:'낙동강 하류 지역에서 성장했어요.'},
      {zone:'central',name:'한강 유역',desc:'삼국이 치열하게 다투었던 핵심 지역이에요.'}
    ],
    part3:[
      {zone:'centralwest',name:'백제 전성기',desc:'근초고왕 때 한강 유역을 바탕으로 전성기를 이루었어요.'},
      {zone:'northwest',name:'고구려 전성기',desc:'광개토대왕 때 만주와 한반도 북부로 영토를 넓혔어요.'},
      {zone:'northcentral',name:'평양',desc:'장수왕이 남진 정책을 위해 수도를 옮긴 곳이에요.'},
      {zone:'central',name:'한강 유역',desc:'진흥왕 때 신라가 차지했어요.'},
      {zone:'southeast',name:'금성',desc:'신라의 수도로 오늘날 경주예요.'}
    ],
    part4:[
      {zone:'southwest',name:'사비',desc:'백제의 마지막 수도로 오늘날 충남 부여 지역이에요.'},
      {zone:'northcentral',name:'평양',desc:'고구려의 마지막 수도예요.'},
      {zone:'southwest',name:'황산벌',desc:'백제 멸망 과정에서 계백이 싸운 곳이에요.'},
      {zone:'central',name:'매소성',desc:'신라가 당군을 크게 물리친 곳이에요.'},
      {zone:'westcoast',name:'기벌포',desc:'금강 하구의 서해안 지역으로, 나당 전쟁의 마지막 승리를 거둔 곳이에요.'}
    ],
    part5:[
      {zone:'north',name:'발해',desc:'만주와 한반도 북부에 걸쳐 있었어요.'},
      {zone:'south',name:'통일신라',desc:'대동강 이남의 한반도 대부분을 차지했어요.'},
      {zone:'north',name:'상경용천부',desc:'발해의 대표적인 수도이자 북부 중심지였어요.'},
      {zone:'southeast',name:'금성',desc:'통일신라의 수도로 오늘날 경주예요.'},
      {zone:'south',name:'남쪽 국가 영역',desc:'남북국 시대의 남쪽 국가는 통일신라였어요.'}
    ]
  };
  return groups[partId]||[];
}

function renderDetailedMap(includeNames=false){
  const labels = includeNames ? `
    <text x="145" y="115" class="korea-map-label">국내성</text>
    <text x="152" y="168" class="korea-map-label">평양</text>
    <text x="134" y="228" class="korea-map-label">한성</text>
    <text x="112" y="297" class="korea-map-label">사비</text>
    <text x="201" y="326" class="korea-map-label">금성</text>
    <text x="188" y="58" class="korea-map-label">상경</text>
    <text x="121" y="132" class="korea-map-label">압록강</text>
    <text x="217" y="94" class="korea-map-label">두만강</text>
    <text x="134" y="187" class="korea-map-label">대동강</text>
    <text x="135" y="249" class="korea-map-label">한강</text>
    <text x="190" y="292" class="korea-map-label">태백산맥</text>
    <text x="180" y="357" class="korea-map-label">낙동강</text>
    <text x="142" y="80" class="korea-map-label">만주</text>` : '';

  return `<div class="korea-map map-study-map">
    <svg class="korea-map-svg" viewBox="0 0 360 440" aria-hidden="true">
      <text x="34" y="118" class="korea-map-sea-label">서해</text>
      <text x="300" y="168" class="korea-map-sea-label">동해</text>
      <text x="156" y="425" class="korea-map-sea-label">남해</text>
      <path class="korea-map-north" d="M80,22 C112,8 166,12 211,24 C246,33 267,52 265,77 C261,99 239,112 224,126 L201,145 L150,139 L112,121 L86,95 L63,63 Z"/>
      <path class="korea-map-boundary" d="M151,98 C170,91 196,95 208,113 C218,128 214,147 204,160 C196,171 204,188 213,204 C221,220 219,239 210,254 C201,270 208,289 220,306 C232,324 234,344 224,359 C215,373 198,379 188,395 C178,410 166,421 151,415 C138,410 129,393 120,382 C109,369 91,365 82,352 C72,338 77,320 88,306 C99,292 102,277 96,261 C90,246 78,232 79,216 C81,197 98,187 107,173 C116,160 113,145 108,130 C103,114 119,103 132,99 Z"/>
      <path class="korea-map-river" d="M104,105 C130,114 158,112 181,102"/>
      <path class="korea-map-river" d="M196,102 C219,105 239,96 255,83"/>
      <path class="korea-map-river" d="M119,166 C143,174 161,173 182,166"/>
      <path class="korea-map-river" d="M101,230 C129,238 155,235 184,226"/>
      <path class="korea-map-river" d="M177,268 C178,299 188,325 198,349"/>
      <path class="korea-map-mountain" d="M196,121 C190,149 194,180 188,207 C184,235 190,263 194,292 C197,320 193,349 184,378"/>
      <path class="korea-map-mountain" d="M130,142 C145,158 156,175 164,197"/>
      ${labels}
    </svg>
    ${MAP_ZONES.map(z=>`<button class="map-zone ${mapLearnSelectedZone===z.id?'learn-highlight':''} ${mapLearnSelectedZone&&mapLearnSelectedZone!==z.id?'learn-muted':''}" data-zone="${z.id}" style="left:${z.left}%;top:${z.top}%;transform:translate(-50%,-50%)" onclick="selectMapLearnZone('${z.id}')">${includeNames?z.label:(MAP_ZONES.indexOf(z)+1)}</button>`).join('')}
  </div>`;
}

function openMapStudyLearn(partId){
  if(!isContentApproved('mapStudy',partId)){
    showToast2('선생님이 아직 공개하지 않은 학습입니다.');
    return;
  }
  mapStudyPart=MAP_STUDY_PARTS.find(p=>p.id===partId);
  if(!mapStudyPart)return;
  if(!hasStartedThisSession_('mapStudy',partId)){
    enqueueLearningEvent_({contentType:'mapStudy', contentId:partId, contentTitle:mapStudyPart.title||'', action:'start'});
    markStartedThisSession_('mapStudy',partId);
  }
  mapLearnLabelsVisible=true;
  mapLearnSelectedZone=null;
  document.getElementById('map-study-list-screen').style.display='none';
  document.getElementById('map-study-quiz-screen').style.display='none';
  document.getElementById('map-study-learn-screen').style.display='none';
  document.getElementById('map-study-learn-screen').style.display='block';
  document.getElementById('map-learn-title').textContent=`🗺️ ${mapStudyPart.id.toUpperCase()} · ${mapStudyPart.title}`;
  renderMapLearnScreen();
  window.scrollTo(0,0);
}

function renderMapLearnScreen(){
  const items=getMapLearnItems(mapStudyPart.id);
  document.getElementById('map-learn-tabs').innerHTML=items.map(item=>`<button class="map-learn-tab ${mapLearnSelectedZone===item.zone?'active':''}" onclick="selectMapLearnZone('${item.zone}')">${item.name}</button>`).join('');
  document.getElementById('map-learn-map').innerHTML=renderDetailedMap(mapLearnLabelsVisible);
  document.getElementById('map-learn-toggle-btn').textContent=mapLearnLabelsVisible?'이름 가리기':'이름 다시 보기';
}

function selectMapLearnZone(zone){
  mapLearnSelectedZone=zone;
  const item=getMapLearnItems(mapStudyPart.id).find(x=>x.zone===zone);
  document.getElementById('map-learn-explain').innerHTML=item?`<b>${item.name}</b><br>${item.desc}`:'이름을 눌러 확인해보세요.';
  renderMapLearnScreen();
}

function toggleMapLearnLabels(){
  mapLearnLabelsVisible=!mapLearnLabelsVisible;
  renderMapLearnScreen();
}

function beginMapQuizAfterLearn(){
  document.getElementById('map-study-learn-screen').style.display='none';
  startMapStudyPart(mapStudyPart.id,true);
}

let mapStudyPart=null;
let mapStudyIndex=0;
let mapStudyCorrect=0;
let mapStudyAnswered=false;
let mapStudyWrongQuestions=[];
let mapStudyReviewQueue=[];
let mapStudyReviewMode=false;
let mapStudyInitialCorrect=0;

function createMapStudyCard(){
  const card=document.createElement('div');
  card.className='unit-card';
  card.dataset.learningContent='mapStudy';
  card.innerHTML=`<div class="unit-icon">🗺️</div>
    <div class="unit-info">
      <div class="unit-title">지도 문제</div>
      <div class="unit-sub">PART 1~5 · 위치와 영토 익히기 · 50문제</div>
    </div>`;
  card.onclick=()=>showMapStudyList();
  return card;
}

const mapStudyCache={};

function normalizeMapStudyData(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return {};
  let src=payload;
  for(const key of ['data','mapStudy','result']){
    if(src[key]&&typeof src[key]==='object'&&!Array.isArray(src[key])){
      src=src[key];
      break;
    }
  }
  const out={};
  MAP_STUDY_PARTS.forEach(part=>{
    const p=src[part.id];
    if(!p||typeof p!=='object')return;
    const correct=Math.max(0,Number(p.correct)||0);
    const total=Math.max(0,Number(p.total)||0);
    const passed=typeof p.passed==='boolean'?p.passed:(total>0&&correct>=Math.ceil(total*0.6));
    out[part.id]={...p,correct,total,passed,completed:passed||p.completed===true};
  });
  return out;
}

function getMapStudyProgress(name=(parentChildViewActive?parentChildViewName:playerName)){
  if(!name)return {};
  if(mapStudyCache[name])return mapStudyCache[name];
  try{
    const local=JSON.parse(localStorage.getItem('mapStudy_'+name)||'{}');
    mapStudyCache[name]=normalizeMapStudyData(local);
  }catch(e){
    mapStudyCache[name]={};
  }
  return mapStudyCache[name];
}

async function loadMapStudyProgress(name=playerName){
  if(!name)return {};
  const serverData=await apiGetMapStudy(name);
  const normalized=normalizeMapStudyData(serverData);
  if(Object.keys(normalized).length>0){
    mapStudyCache[name]=normalized;
    localStorage.setItem('mapStudy_'+name,JSON.stringify(normalized));
  }else if(!mapStudyCache[name]){
    getMapStudyProgress(name);
  }
  return mapStudyCache[name]||{};
}

async function saveMapStudyProgress(partId,correct,total){
  if(isAdminSessionActive()||!playerName)return;
  const all={...getMapStudyProgress(playerName)};
  const prev=all[partId]||{};
  const wasCompleted=!!prev.completed;
  if(!prev.correct || correct>=prev.correct){
    all[partId]={correct,total,passed:correct>=Math.ceil(total*0.6),completed:correct>=Math.ceil(total*0.6),updatedAt:new Date().toISOString()};
    mapStudyCache[playerName]=all;

    if(isDeveloperTestMode()){
      renderHomeSummaryCard();
      renderIncompleteUnitsSection();
      return;
    }

    localStorage.setItem('mapStudy_'+playerName,JSON.stringify(all));
    await apiSetMapStudy(playerName, all);
    if(!wasCompleted && all[partId].completed){
      // 서버 저장이 성공적으로 완료된 뒤에만, 실제 미완료→완료 전환일 때 한 번만 기록
      const partInfo=MAP_STUDY_PARTS.find(p=>p.id===partId);
      enqueueLearningEvent_({contentType:'mapStudy', contentId:partId, contentTitle:(partInfo&&partInfo.title)||'', action:'complete'});
    }
    await loadMapStudyProgress(playerName);
    renderHomeSummaryCard();
    renderIncompleteUnitsSection();
  }
}

function hideAllForMapStudy(){
  ['start-screen','quiz-screen','result-screen','teacher-screen','parent-screen','timeline-game-screen','king-order-screen','ht-list-screen','ht-part-screen','summary-screen','lecture-screen','qbank-screen','map-study-learn-screen','math-concept-screen']
    .forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
}

async function showMapStudyList(){
  if(!playerName){showToast2('⚠️ 먼저 이름을 선택해주세요!');return;}
  loadContentVisibility(true).then(()=>{
    if(document.getElementById('map-study-list-screen')?.style.display==='block') showMapStudyList();
  });
  hideAllForMapStudy();
  document.getElementById('map-study-quiz-screen').style.display='none';
  document.getElementById('map-study-list-screen').style.display='block';
  document.getElementById('map-admin-note').style.display=isAdminSessionActive()?'block':'none';

  await loadMapStudyProgress(playerName);
  const progress=getMapStudyProgress(playerName);
  const visibleMapParts=parentChildViewActive
    ?MAP_STUDY_PARTS.filter(part=>isContentApproved('mapStudy',part.id) && progress[part.id]&&progress[part.id].passed)
    :MAP_STUDY_PARTS.filter(part=>isContentApproved('mapStudy',part.id));
  document.getElementById('map-part-list').innerHTML=visibleMapParts.map(part=>{
    const p=progress[part.id];
    const score=p?`${p.correct}/${p.total}${p.passed?' · PASS':' · 다시 도전'}`:'미완료';
    return `<button class="map-part-card" onclick="openMapStudyLearn('${part.id}')">
      <span class="map-part-icon">🗺️</span>
      <span class="map-part-info">
        <span class="map-part-title">${part.id.toUpperCase()} · ${part.title}</span>
        <span class="map-part-sub">${part.sub}</span>
      </span>
      <span class="map-part-score">${score}</span>
    </button>`;
  }).join('');
  window.scrollTo(0,0);
}

function startMapStudyPart(partId,fromLearn=false){
  if(!isContentApproved('mapStudy',partId)){
    showToast2('선생님이 아직 공개하지 않은 학습입니다.');
    return;
  }
  mapStudyPart=MAP_STUDY_PARTS.find(p=>p.id===partId);
  if(!mapStudyPart)return;
  mapStudyIndex=0;
  mapStudyCorrect=0;
  mapStudyAnswered=false;
  mapStudyWrongQuestions=[];
  mapStudyReviewQueue=[];
  mapStudyReviewMode=false;
  mapStudyInitialCorrect=0;
  document.getElementById('map-study-list-screen').style.display='none';
  document.getElementById('map-study-quiz-screen').style.display='block';
  renderMapStudyQuestion();
  window.scrollTo(0,0);
}

function renderMapStudyQuestion(){
  if(!mapStudyPart)return;
  const activeQuestions=mapStudyReviewMode?mapStudyReviewQueue:mapStudyPart.questions;
  if(mapStudyIndex>=activeQuestions.length){
    renderMapStudyResult();
    return;
  }
  mapStudyAnswered=false;
  const q=activeQuestions[mapStudyIndex];
  document.getElementById('map-part-label').textContent=`${mapStudyPart.id.toUpperCase()} · ${mapStudyPart.title}`;
  document.getElementById('map-question-progress').textContent=mapStudyReviewMode
    ? `오답 복습 ${mapStudyIndex+1} / ${activeQuestions.length}`
    : `${mapStudyIndex+1} / ${activeQuestions.length}`;
  document.getElementById('map-question-text').textContent=q.q;
  const area=document.getElementById('map-question-area');
  const feedback=document.getElementById('map-feedback');
  const next=document.getElementById('map-next-btn');
  const clickGuide=document.getElementById('map-click-guide');
  if(clickGuide)clickGuide.style.display=q.type==='map'?'block':'none';
  feedback.className='map-feedback';
  feedback.textContent='';
  next.style.display='none';

  if(q.type==='mc'){
    area.innerHTML=`<div class="map-options">${q.options.map((o,i)=>`<button class="map-option" onclick="answerMapMC(${i},this)">${o}</button>`).join('')}</div>`;
  }else{
    area.innerHTML=`<div class="korea-map">
      <svg class="korea-map-svg" viewBox="0 0 360 440" aria-hidden="true">
        <text x="34" y="118" class="korea-map-sea-label">서해</text>
        <text x="300" y="168" class="korea-map-sea-label">동해</text>
        <text x="156" y="425" class="korea-map-sea-label">남해</text>

        <!-- 만주 및 한반도 윤곽 -->
        <path class="korea-map-north" d="M80,22 C112,8 166,12 211,24 C246,33 267,52 265,77 C261,99 239,112 224,126 L201,145 L150,139 L112,121 L86,95 L63,63 Z"/>
        <path class="korea-map-boundary" d="M151,98 C170,91 196,95 208,113 C218,128 214,147 204,160 C196,171 204,188 213,204 C221,220 219,239 210,254 C201,270 208,289 220,306 C232,324 234,344 224,359 C215,373 198,379 188,395 C178,410 166,421 151,415 C138,410 129,393 120,382 C109,369 91,365 82,352 C72,338 77,320 88,306 C99,292 102,277 96,261 C90,246 78,232 79,216 C81,197 98,187 107,173 C116,160 113,145 108,130 C103,114 119,103 132,99 Z"/>

        <!-- 압록강/두만강/대동강/한강/낙동강 -->
        <path class="korea-map-river" d="M104,105 C130,114 158,112 181,102"/>
        <path class="korea-map-river" d="M196,102 C219,105 239,96 255,83"/>
        <path class="korea-map-river" d="M119,166 C143,174 161,173 182,166"/>
        <path class="korea-map-river" d="M101,230 C129,238 155,235 184,226"/>
        <path class="korea-map-river" d="M177,268 C178,299 188,325 198,349"/>

        <!-- 산맥 -->
        <path class="korea-map-mountain" d="M196,121 C190,149 194,180 188,207 C184,235 190,263 194,292 C197,320 193,349 184,378"/>
        <path class="korea-map-mountain" d="M130,142 C145,158 156,175 164,197"/>

        <!-- 주요 지점 -->
        
        
        
        
        
        
        
        
        
        
        
        

        <!-- 지형명 -->
        
        
        
        
        
        
        
      </svg>
      ${MAP_ZONES.map((z,i)=>`<button class="map-zone" data-zone="${z.id}" style="left:${z.left}%;top:${z.top}%;transform:translate(-50%,-50%)" onclick="answerMapZone('${z.id}',this)" aria-label="${i+1}번 위치">${i+1}</button>`).join('')}
    </div>`;
  }
}

function showMapFeedback(ok,ex){
  const feedback=document.getElementById('map-feedback');
  feedback.className='map-feedback show '+(ok?'good':'bad');
  feedback.textContent=(ok?'정답이에요! ':'아쉬워요. ')+ex;
  document.getElementById('map-next-btn').style.display='block';
  ok?SFX.correct():SFX.wrong();
}

function answerMapMC(choice,btn){
  if(mapStudyAnswered)return;
  mapStudyAnswered=true;
  const activeQuestions=mapStudyReviewMode?mapStudyReviewQueue:mapStudyPart.questions;
  const q=activeQuestions[mapStudyIndex];
  const buttons=[...document.querySelectorAll('.map-option')];
  buttons[q.answer]?.classList.add('correct');
  if(choice===q.answer){
    if(!mapStudyReviewMode) mapStudyCorrect++;
  }else{
    btn.classList.add('wrong');
    if(mapStudyReviewMode) mapStudyWrongQuestions.push(q);
    else if(!mapStudyWrongQuestions.includes(q)) mapStudyWrongQuestions.push(q);
  }
  buttons.forEach(b=>b.disabled=true);
  showMapFeedback(choice===q.answer,q.ex);
}

function answerMapZone(zone,btn){
  if(mapStudyAnswered)return;
  mapStudyAnswered=true;
  const activeQuestions=mapStudyReviewMode?mapStudyReviewQueue:mapStudyPart.questions;
  const q=activeQuestions[mapStudyIndex];
  const correct=document.querySelector(`.map-zone[data-zone="${q.answer}"]`);
  if(correct)correct.classList.add('correct');
  if(zone===q.answer){
    if(!mapStudyReviewMode) mapStudyCorrect++;
  }else{
    btn.classList.add('wrong');
    if(mapStudyReviewMode) mapStudyWrongQuestions.push(q);
    else if(!mapStudyWrongQuestions.includes(q)) mapStudyWrongQuestions.push(q);
  }
  document.querySelectorAll('.map-zone').forEach(b=>b.disabled=true);
  showMapFeedback(zone===q.answer,q.ex);
}

function nextMapQuestion(){
  mapStudyIndex++;
  renderMapStudyQuestion();
  window.scrollTo(0,0);
}

function renderMapStudyResult(){
  if(!mapStudyReviewMode){
    const total=mapStudyPart.questions.length;
    const passed=mapStudyCorrect>=6;
    mapStudyInitialCorrect=mapStudyCorrect;
    saveMapStudyProgress(mapStudyPart.id,mapStudyCorrect,total);

    if(mapStudyWrongQuestions.length>0){
      mapStudyReviewMode=true;
      mapStudyReviewQueue=mapStudyWrongQuestions.slice();
      mapStudyWrongQuestions=[];
      mapStudyIndex=0;
      document.getElementById('map-question-progress').textContent='오답 복습 시작';
      document.getElementById('map-question-text').textContent=`틀린 문제 ${mapStudyReviewQueue.length}개를 모두 맞혀야 완료돼요.`;
      document.getElementById('map-feedback').className='map-feedback';
      document.getElementById('map-next-btn').style.display='none';
      document.getElementById('map-question-area').innerHTML='<div class="map-result"><div style="font-size:50px">🔁</div><div class="pass">오답을 자동으로 다시 출제합니다</div></div>';
      setTimeout(()=>renderMapStudyQuestion(),1000);
      return;
    }

    showMapStudyMasteredResult(passed,total);
    return;
  }

  if(mapStudyWrongQuestions.length>0){
    mapStudyReviewQueue=mapStudyWrongQuestions.slice();
    mapStudyWrongQuestions=[];
    mapStudyIndex=0;
    document.getElementById('map-question-progress').textContent='오답 복습 계속';
    document.getElementById('map-question-text').textContent=`아직 ${mapStudyReviewQueue.length}문제가 남았어요.`;
    document.getElementById('map-question-area').innerHTML='<div class="map-result"><div style="font-size:50px">🔁</div><div class="pass">남은 오답을 다시 풀어요</div></div>';
    setTimeout(()=>renderMapStudyQuestion(),900);
    return;
  }

  showMapStudyMasteredResult(mapStudyInitialCorrect>=6,mapStudyPart.questions.length);
}

function showMapStudyMasteredResult(passed,total){
  document.getElementById('map-question-progress').textContent='완료';
  document.getElementById('map-question-text').textContent='';
  document.getElementById('map-feedback').className='map-feedback';
  document.getElementById('map-next-btn').style.display='none';
  SFX.complete();
  document.getElementById('map-question-area').innerHTML=`<div class="map-result">
    <div style="font-size:54px">🎉</div>
    <div class="score">${mapStudyInitialCorrect}/${total}</div>
    <div class="pass">오답까지 모두 맞혔어요!</div>
    <p style="color:var(--sand);font-size:13px;margin:8px 0 16px">최초 점수는 그대로 저장되고, 오답 복습은 성적을 바꾸지 않아요.</p>
    <button class="start-btn" onclick="showMapStudyList()">지도 문제 목록으로</button>
  </div>`;
}

function createTimelineGameCard(){
  const gameCard=document.createElement('div');
  gameCard.className='unit-card';
  gameCard.innerHTML=`<div class="unit-icon">📜</div>
    <div class="unit-info">
      <div class="unit-title">사건 배열하기</div>
      <div class="unit-sub">시대 흐름 배열 게임 · 100문제</div>
    </div>`;
  gameCard.onclick=()=>showTimelineGame();
  return gameCard;
}

function createUnitCardElement(key){
  const u=UNITS[key];
  const ready=isUnitReadyForLearning(key);
  const approved=isContentApproved('unit',key);
  const c=document.createElement('div');
  c.className='unit-card'+(key===currentUnit?' active':'')+(ready&&approved?'':' locked')+(!approved?' teacher-locked-content':'');
  c.dataset.unitKey=key;
  c.innerHTML=`<div class="unit-icon">${u.icon}</div>
    <div class="unit-info">
      <div class="unit-title">${u.title}</div>
      <div class="unit-sub">${!approved?'선생님 공개 대기 중':(ready?(u.examMode?`${u.totalQuestions}문제 · ${Math.floor(u.duration/60)}분`:`기본 ${u.easyCount} · 심화 ${u.hardCount}`):'문제 준비 중 · 문제 추가 시 자동 활성화')}</div>
    </div>
    ${!approved?'<div class="content-lock-badge">🔒 비공개</div>':''}
    <div class="unit-pass-overlay">PASS</div>`;
  c.onclick=()=>selectUnit(c,key);
  return c;
}

function renderUnitGroupBody(containerId,keys){
  const body=document.getElementById(containerId);
  if(!body)return;
  body.innerHTML='';
  keys.forEach(key=>{
    body.appendChild(createUnitCardElement(key));
  });
}

function toggleUnitGroup(id){
  const body=document.getElementById(id);
  const arrow=document.getElementById(id+'-arrow');
  if(!body)return;
  const isHidden=body.style.display==='none';
  body.style.display=isHidden?'flex':'none';
  if(arrow) arrow.dataset.open=String(isHidden);
}

function toggleSectionFold(bodyId,arrowId){
  const body=document.getElementById(bodyId);
  const arrow=document.getElementById(arrowId);
  if(!body)return;
  const isHidden=body.style.display==='none';
  body.style.display=isHidden?'flex':'none';
  if(arrow) arrow.dataset.open=String(isHidden);
}

// ══════════════════════════════════════════════════
// 📊 공통 진행률 계산 시스템
// ══════════════════════════════════════════════════
// 모든 계산 함수는 { percent, status, completed, resumeTarget } 형태로 반환합니다.

function calculateUnitProgress(name, unitKey){
  const u=UNITS[unitKey];
  const mine=allEntriesCache.filter(e=>e.name===name && entryMatchesUnit(e,unitKey));
  const easyEntries=mine.filter(e=>e.level==='기본');
  const hardEntries=mine.filter(e=>e.level==='심화');
  const bestEasy=easyEntries.length?Math.max(...easyEntries.map(e=>e.correct||0)):0;
  const bestHard=hardEntries.length?Math.max(...hardEntries.map(e=>e.correct||0)):0;
  const easyPassed=easyEntries.some(e=>e.pass===true);
  const hardPassed=hardEntries.some(e=>e.pass===true);
  const totalRequired=(u.easyCount||0)+(u.hardCount||0);
  const doneCount=Math.min(bestEasy,u.easyCount||0)+Math.min(bestHard,u.hardCount||0);
  let percent=totalRequired>0?Math.round((doneCount/totalRequired)*100):0;
  const completed=easyPassed && hardPassed;
  if(completed){ percent=100; }
  else if(percent>=100){ percent=99; }

  let status;
  if(completed) status='완료';
  else if(percent===0) status='시작 전';
  else if(!easyPassed) status='기본 문제 진행 중';
  else if(!hardPassed) status='심화 문제 진행 중';
  else status='완료 저장 확인 필요';

  return {
    percent, status, completed,
    resumeTarget:{type:'unit', unitKey}
  };
}

function calculateSummaryQuizProgress(name, unitKey='review'){
  const u=UNITS[unitKey];
  if(!u) return {percent:0,status:'시작 전',completed:false,resumeTarget:{type:'unit',unitKey}};
  const mine=allEntriesCache.filter(e=>e.name===name && entryMatchesUnit(e,unitKey));
  const bestCorrect=mine.length?Math.max(...mine.map(e=>Number(e.correct)||0)):0;
  const passed=mine.some(e=>e.pass===true);
  const total=u.totalQuestions||0;
  let percent=total>0?Math.round((bestCorrect/total)*100):0;
  if(passed){ percent=100; }
  else if(percent>=100){ percent=99; }

  let status;
  if(passed) status='완료';
  else if(percent===0) status='시작 전';
  else status='정리문제 진행 중';

  return {
    percent, status, completed:passed,
    resumeTarget:{type:'unit', unitKey}
  };
}

function calculateHistoryTrainingProgress(name, partId){
  const part=htGetPart(partId);
  const mineAll=getHistoryTrainingProgressStore(name);
  const prog=mineAll[partId];

  if(!prog){
    return {
      percent:0, status:'시작 전', completed:false,
      resumeTarget:{type:'historyTraining', partId, step:'reading'}
    };
  }

  const totalSentences=htGetTranscriptionSentences(part,name).length;
  const totalQuestions=htGetQuestionsForStudent(part,name).length;

  const readingPct=(()=>{
    if(prog.readingCompleted) return 10;
    if(htIsMingeonPart17(part,name)){
      const groups=Array.isArray(part.mingeonGroups)?part.mingeonGroups:[];
      if(groups.length===0) return 0;
      const flow=prog.mingeonFlow||{};
      const completedGroups=Math.min((flow.completedGroups||[]).length,groups.length);
      const group=groups[Math.min(Number(flow.groupIndex)||0,groups.length-1)];
      const cardTotal=(group&&group.cards&&group.cards.length)||1;
      let currentFraction=0;
      if(completedGroups<groups.length){
        if(flow.phase==='delayed'){
          currentFraction=.75+(Math.min(Number(flow.delayedIndex)||0,cardTotal)/cardTotal)*.25;
        }else if(flow.phase==='groupDone'){
          currentFraction=(group&&flow.completedGroups.includes(group.id))?0:1;
        }else{
          currentFraction=(Math.min(Number(flow.cardIndex)||0,cardTotal)/cardTotal)*.75;
          if(flow.cardStage==='recall') currentFraction+=.25/cardTotal;
          if(flow.cardStage==='sentence') currentFraction+=.5/cardTotal;
        }
      }
      return Math.min(9.9,((completedGroups+Math.min(1,currentFraction))/groups.length)*10);
    }
    if(!prog.readingProgress) return 0;
    const rp=prog.readingProgress;
    const paragraphs=htSplitReadingParagraphs(part);
    const totalParas=paragraphs.length||1;
    const confirmedCount=Math.min((rp.confirmedParagraphIds||[]).length, totalParas);
    return (confirmedCount/totalParas)*8 + (rp.reachedBottom?1:0) + (rp.selectedKeySentenceId?1:0);
  })();
  const doneSentences=Math.min((prog.completedTranscriptionSentenceIds||[]).length, totalSentences);
  const transPct=totalSentences>0?(doneSentences/totalSentences)*30:30;
  const doneAnswered=Math.min((prog.answeredQuestionIds||[]).length, totalQuestions);
  const quizPct=totalQuestions>0?(doneAnswered/totalQuestions)*40:40;
  const firstPassDone=totalQuestions>0 && doneAnswered>=totalQuestions;

  let reviewPct=0;
  const wrongIds=prog.firstWrongQuestionIds||[];
  if(firstPassDone){
    if(wrongIds.length===0){
      reviewPct=15;
    }else{
      const remaining=prog.remainingWrongQuestionIds||[];
      const resolved=Math.max(0, wrongIds.length-remaining.length);
      reviewPct=(resolved/wrongIds.length)*15;
    }
  }

  const finalPct=prog.completed?5:0;

  let percent=Math.round(readingPct+transPct+quizPct+reviewPct+finalPct);
  const completed=!!prog.completed;
  if(completed){ percent=100; }
  else if(percent>=100){ percent=99; }

  let status;
  if(completed) status='완료';
  else if(percent===0) status='시작 전';
  else if(!prog.readingCompleted) status=htIsMingeonPart17(part,name)?'핵심카드 진행 중':'읽기 진행 중';
  else if(doneSentences<totalSentences) status='필사 진행 중';
  else if(!firstPassDone) status='빈칸 풀이 중';
  else if(wrongIds.length>0 && !prog.reviewCompleted) status='오답 복습 필요';
  else status='완료 저장 확인 필요';

  let step='reading';
  if(prog.readingCompleted) step='transcription';
  if(doneSentences>=totalSentences && totalSentences>0) step='quiz';
  if(firstPassDone){
    step=(wrongIds.length>0 && !prog.reviewCompleted)?'review':'completed';
  }

  // 화면 표시용 캐시 값 저장 (신뢰하지는 않고, 항상 위 계산이 우선함)
  prog.progressPercent=percent;

  return {
    percent, status, completed,
    resumeTarget:{type:'historyTraining', partId, step}
  };
}

// 사건 배열하기: 3개 난이도(쉬움/보통/어려움) 중 PASS한 비율로 진행률 산출
function calculateTimelineGameProgress(name){
  if(!TIMELINE_GAME_ENABLED){
    return {percent:0,status:'사용 안 함',completed:true,resumeTarget:null,incompleteCount:0,completedAmount:0,totalAmount:0,includeInOverall:false};
  }
  if(typeof PASS_THRESHOLDS==='undefined'){
    return {percent:0,status:'시작 전',completed:false,resumeTarget:{type:'timelineGame'},incompleteCount:1,completedAmount:0,totalAmount:100,includeInOverall:true};
  }

  const keys=['easy','medium','hard'].filter(key=>isContentApproved('timeline',key)); // 비공개 난이도는 계산 자체에서 제외
  if(keys.length===0){
    return {percent:0,status:'완료',completed:true,resumeTarget:{type:'timelineGame'},incompleteCount:0,completedAmount:0,totalAmount:100,includeInOverall:true};
  }
  const store=(typeof getTimelineGameScoreStore==='function')
    ? getTimelineGameScoreStore(name)
    : {};

  let progressSum=0;
  let attempted=false;

  keys.forEach(key=>{
    const score=(store&&store[key])||{};
    const correct=Math.max(0,Number(score.correct)||0);
    const total=Math.max(0,Number(score.total)||0);
    const threshold=Math.max(1,Number(PASS_THRESHOLDS[key])||1);

    if(total>0||correct>0) attempted=true;
    progressSum+=Math.min(correct/threshold,1);
  });

  const completed=keys.every(key=>isDiffPassed(key,name));
  let percent=Math.round((progressSum/keys.length)*100);

  if(completed) percent=100;
  else if(percent>=100) percent=99;

  const status=completed?'완료':(attempted?'진행 중':'시작 전');

  return {
    percent, status, completed, resumeTarget:{type:'timelineGame'},
    incompleteCount:completed?0:1,
    completedAmount:percent,
    totalAmount:100,
    includeInOverall:true
  };
}

function calculateLearningItemProgress(name, itemType, itemId){
  if(itemType==='unit'){
    if(itemId==='review') return calculateSummaryQuizProgress(name);
    return calculateUnitProgress(name, itemId);
  }
  if(itemType==='historyTraining'){
    return calculateHistoryTrainingProgress(name, itemId);
  }
  if(itemType==='timelineGame'){
    return calculateTimelineGameProgress(name);
  }
  return {percent:0, status:'알 수 없음', completed:false, resumeTarget:null};
}

// 공통 진행바+% 렌더링 (카드 내부에서 사용)
function renderIncompleteProgressBar(progressResult){
  const pct=progressResult.percent;
  const warn = pct<50;
  return `<div class="ht-progress-row${warn?' warn':''}">
    <span class="ht-progress-status">${progressResult.status} · ${pct}%</span>
    <div class="ht-progress-bar"><div class="ht-progress-fill" style="width:${pct}%"></div></div>
  </div>`;
}

// 학생 변경 시 캐시(진행률은 매번 실계산이라 캐시 자체가 없음 - 최신 데이터만 다시 불러옴)
function refreshAllProgressCache(name){
  // allEntriesCache, historyTrainingProgress는 서버에서 이미 로드되어 있으므로
  // 여기서는 재렌더링만 트리거해서 화면이 항상 최신 계산값을 보여주도록 함
  renderIncompleteUnitsSection();
}

let htGroupExpanded=false; // 역사훈련소 그룹 토글 상태 (렌더링 간 유지)

function calculateHistoryTrainingOverallProgress(name){
  const approvedParts=historyTrainingData.filter(part=>isContentApproved('historyTraining',part.id)&&isContentRequiredForStudent('historyTraining',part.id,name)); // 비공개 PART·이 학생에게 필수 아닌 PART는 계산 자체에서 제외
  const total=approvedParts.length;
  if(total===0) return {percent:0, incompleteCount:0, completed:true, status:'완료', resumeTarget:null, completedAmount:0, totalAmount:100, includeInOverall:true};
  let sum=0, incompleteCount=0;
  approvedParts.forEach(part=>{
    const p=calculateHistoryTrainingProgress(name, part.id);
    sum+=p.percent;
    if(p.percent<100) incompleteCount++;
  });
  const percent=Math.round(sum/total);
  const completed=incompleteCount===0;
  let resumeTarget=null;
  if(!completed && typeof resolveHistoryTrainingResumeTarget==='function'){
    const rt=resolveHistoryTrainingResumeTarget(name);
    if(rt) resumeTarget={type:'historyTraining', partId:rt.partId, step:rt.step};
  }
  return {
    percent, incompleteCount, completed,
    status: completed?'완료':`미완료 PART ${incompleteCount}개`,
    resumeTarget,
    completedAmount: percent, totalAmount: 100, // calculateLearningContentProgress가 쓰던 것과 동일한 100분율 기준
    includeInOverall:true
  };
}

// ── 이름카드·부모님확인·선생님확인 공통 전체 진행률 ──
function calculateUnitOverallProgress(name){
  const keys=getActiveUnitKeys().filter(key=>isContentApproved('unit',key)&&isContentRequiredForStudent('unit',key,name)); // 비공개 단원·이 학생에게 필수 아닌 단원은 계산 자체에서 제외
  let completedAmount=0;
  let incompleteCount=0;
  let resumeTarget=null;
  keys.forEach(key=>{
    const p = UNITS[key].examMode ? calculateSummaryQuizProgress(name,key) : calculateUnitProgress(name,key);
    completedAmount+=p.percent;
    if(!p.completed){
      incompleteCount++;
      if(!resumeTarget) resumeTarget=p.resumeTarget;
    }
  });
  const totalAmount=keys.length*100;
  const percent=totalAmount>0?Math.round((completedAmount/totalAmount)*100):0;
  const completed=incompleteCount===0;
  return {
    percent, completedAmount, totalAmount, incompleteCount, completed,
    status: completed?'완료':`미완료 ${incompleteCount}개`,
    resumeTarget,
    includeInOverall:true
  };
}

function calculateMapStudyProgress(name){
  const data=getMapStudyProgress(name);
  const approvedParts=MAP_STUDY_PARTS.filter(part=>isContentApproved('mapStudy',part.id)&&isContentRequiredForStudent('mapStudy',part.id,name)); // 비공개 PART·이 학생에게 필수 아닌 PART는 계산 자체에서 제외
  const total=approvedParts.length;
  if(total===0)return {percent:0,completed:true,incompleteCount:0,resumeTarget:null,completedAmount:0,totalAmount:100,includeInOverall:true};
  let sum=0;
  let incompleteCount=0;
  let nextPart=null;
  approvedParts.forEach(part=>{
    const p=data[part.id];
    const partPercent=p&&p.passed?100:(p&&p.total>0?Math.min(99,Math.round((p.correct/p.total)*100)):0);
    sum+=partPercent;
    if(!p||!p.passed){
      incompleteCount++;
      if(!nextPart)nextPart=part.id;
    }
  });
  const percent=Math.round(sum/total);
  return {
    percent,completed:incompleteCount===0,incompleteCount,
    status:incompleteCount===0?'완료':`미완료 PART ${incompleteCount}개`,
    resumeTarget:nextPart?{type:'mapStudy',partId:nextPart}:null,
    completedAmount: percent, totalAmount: 100, // calculateLearningContentProgress가 쓰던 것과 동일한 100분율 기준
    includeInOverall:true
  };
}

// 역대 왕 계보: 공개된 시대만 필수 분모에 넣고, 시대별 통과 여부를 균등하게 계산합니다.
// 아직 공개된 시대가 하나도 없으면 전체 진행률 분자·분모에서 모두 제외합니다.
function getApprovedKingOrderEras_(name){
  if(typeof KING_ORDER_DATA==='undefined'||!Array.isArray(KING_ORDER_DATA))return [];
  // 관리자 미리보기 권한과 실제 학생 공개 상태를 분리해, 비공개 시대가 진행률에 섞이지 않게 합니다.
  const visibility=contentVisibilityCache||readLocalContentVisibility();
  return KING_ORDER_DATA.filter(era=>
    visibility[contentVisibilityItemKey('kingOrder',era.id)]===true
    && isContentRequiredForStudent('kingOrder',era.id,name)
  );
}

function calculateKingOrderProgress(name){
  const eras=getApprovedKingOrderEras_(name);
  const total=eras.length;
  if(total===0){
    return {
      percent:0, completed:true, status:'공개된 시대 없음', incompleteCount:0,
      resumeTarget:null, completedAmount:0, totalAmount:0, includeInOverall:false
    };
  }

  const saved=getKingOrderProgress(name);
  const completedCount=eras.filter(era=>saved[era.id]?.completed===true).length;
  const incompleteEras=eras.filter(era=>saved[era.id]?.completed!==true);
  const percent=Math.round((completedCount/total)*100);
  const completed=completedCount===total;
  const nextEra=incompleteEras[0]||null;

  return {
    percent, completed,
    status:completed?'완료':`${completedCount}/${total}개 시대 완료`,
    incompleteCount:incompleteEras.length,
    resumeTarget:nextEra?{type:'kingOrder',eraId:nextEra.id}:null,
    completedAmount:completedCount,
    totalAmount:total,
    includeInOverall:true
  };
}

// 스터디플래너: 오늘 날짜 계획 기준 (전체 진행률에는 미포함, includeInOverall:false)
function calculateStudyPlannerProgress(name){
  // todayLocalDate/getStudyPlannerData/getCompletedStudyActivities는 이후 <script> 블록에 정의되어 있어
  // 페이지 최초 동기 렌더링 시점엔 아직 없을 수 있음 — 방어적으로 처리 (다음 재렌더링에서 자동 보정됨)
  const _now=new Date();
  const today=new Date(_now.getTime()-_now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const plans=(typeof getStudyPlannerData==='function') ? (getStudyPlannerData(name)||{}) : {};
  const todayPlans=Array.isArray(plans[today])?plans[today]:[];
  const total=todayPlans.length;
  const doneCount=todayPlans.filter(p=>p&&p.status==='done').length;
  const percent=total>0?Math.round((doneCount/total)*100):0;
  const completed=total>0 && doneCount===total;

  let status;
  if(total===0) status='오늘 계획 없음';
  else if(completed) status='완료';
  else if(doneCount>0) status='진행중';
  else status='시작 전';

  const activitiesToday=(typeof getCompletedStudyActivities==='function')
    ? (getCompletedStudyActivities(name)||[]).filter(a=>a&&a.date===today)
    : [];
  if(activitiesToday.length>0){
    status+=` · 오늘 학습기록 ${activitiesToday.length}건`;
  }

  return {
    percent, completed, status,
    incompleteCount: completed?0:(total>0?1:0),
    resumeTarget:{type:'studyPlanner'},
    completedAmount: percent, totalAmount: 100,
    includeInOverall:false
  };
}

// 예전 진행률 계산 함수 — getUnifiedProgressForUI()의 폴백 안전망으로 계속 사용 중이므로 삭제하지 말 것
function calculateOverallProgress(name){
  // UNIT 섹션
  const unitKeys=getActiveUnitKeys();
  let unitSum=0, unitIncomplete=0, unitResumeTarget=null;
  unitKeys.forEach(key=>{
    const p = UNITS[key].examMode ? calculateSummaryQuizProgress(name,key) : calculateUnitProgress(name,key);
    unitSum+=p.percent;
    if(!p.completed){
      unitIncomplete++;
      if(!unitResumeTarget) unitResumeTarget=p.resumeTarget;
    }
  });
  const unitSection={
    key:'unit',
    percent: unitKeys.length>0?Math.round(unitSum/unitKeys.length):0,
    completed: unitIncomplete===0,
    status: unitIncomplete===0?'완료':`미완료 ${unitIncomplete}개`,
    incompleteCount: unitIncomplete,
    resumeTarget: unitResumeTarget,
    includeInOverall:true
  };

  // 역사훈련소 섹션
  let htSum=0, htIncomplete=0;
  historyTrainingData.forEach(part=>{
    const p=calculateHistoryTrainingProgress(name, part.id);
    htSum+=p.percent;
    if(!p.completed) htIncomplete++;
  });
  let htResumeTarget=null;
  if(typeof resolveHistoryTrainingResumeTarget==='function'){
    const rt=resolveHistoryTrainingResumeTarget(name);
    if(rt) htResumeTarget={type:'historyTraining', partId:rt.partId, step:rt.step};
  }
  const historyTrainingSection={
    key:'historyTraining',
    percent: historyTrainingData.length>0?Math.round(htSum/historyTrainingData.length):0,
    completed: htIncomplete===0,
    status: htIncomplete===0?'완료':`미완료 PART ${htIncomplete}개`,
    incompleteCount: htIncomplete,
    resumeTarget: htResumeTarget,
    includeInOverall:true
  };

  // 사건배열 섹션 (운영 제외 상태에서도 이전 기록 호환을 위해 결과 모양만 유지)
  const tg=calculateTimelineGameProgress(name);
  const eventOrderSection={
    key:'eventOrder',
    percent: tg.percent,
    completed: tg.completed,
    status: tg.status,
    incompleteCount: tg.completed?0:1,
    resumeTarget: tg.resumeTarget,
    includeInOverall:false
  };

  // 지도문제 섹션
  const map=calculateMapStudyProgress(name);
  const mapStudySection={
    key:'mapStudy',
    percent: map.percent,
    completed: map.completed,
    status: map.status || (map.completed?'완료':`미완료 ${map.incompleteCount||0}개`),
    incompleteCount: map.incompleteCount||0,
    resumeTarget: map.resumeTarget,
    includeInOverall:true
  };

  // 역대 왕 계보 섹션 — 공개된 시대가 있을 때만 전체 진행률에 포함
  const king=calculateKingOrderProgress(name);
  const kingOrderSection={
    key:'kingOrder',
    percent:king.percent,
    completed:king.completed,
    status:king.status,
    incompleteCount:king.incompleteCount||0,
    resumeTarget:king.resumeTarget,
    includeInOverall:king.includeInOverall!==false
  };

  // 스터디플래너 섹션 (표시는 되지만 전체 진행률 계산에서는 제외)
  const studyPlannerSection=Object.assign({key:'studyPlanner'}, calculateStudyPlannerProgress(name));

  const sections=[unitSection, historyTrainingSection, eventOrderSection, mapStudySection, kingOrderSection, studyPlannerSection];

  const overallSections=sections.filter(s=>s.includeInOverall!==false);
  const totalAmount=overallSections.length*100;
  const completedAmount=overallSections.reduce((sum,s)=>sum+s.percent,0);
  const percent=totalAmount>0?Math.round((completedAmount/totalAmount)*100):0;
  // buildIncompleteLearningItems를 다시 호출하지 않고, sections 결과만으로 계산 (순환 방지)
  const incompleteCount=overallSections.reduce((sum,s)=>sum+(s.completed?0:1),0);
  const completed=percent>=100 && incompleteCount===0;
  const historyContentPercents=[historyTrainingSection.percent,mapStudySection.percent];
  if(kingOrderSection.includeInOverall!==false)historyContentPercents.push(kingOrderSection.percent);

  return {
    percent, completed, incompleteCount, sections,
    breakdown:{
      unitLearning: unitSection.percent,
      learningContent: Math.round(historyContentPercents.reduce((sum,value)=>sum+value,0)/historyContentPercents.length),
      timelineGame: 0,
      historyTraining: historyTrainingSection.percent,
      mapStudy: mapStudySection.percent,
      kingOrder: kingOrderSection.percent
    }
  };
}

function calculateLearningContentProgress(name){
  const htOverall=calculateHistoryTrainingOverallProgress(name);
  const mapOverall=calculateMapStudyProgress(name);
  const kingOverall=calculateKingOrderProgress(name);
  const included=[htOverall,mapOverall];
  if(kingOverall.includeInOverall!==false)included.push(kingOverall);
  const completedAmount=included.reduce((sum,item)=>sum+item.percent,0);
  const totalAmount=included.length*100;
  const percent=Math.round(completedAmount/totalAmount);
  return {percent,completedAmount,totalAmount,timelineGame:0,historyTraining:htOverall.percent,mapStudy:mapOverall.percent,kingOrder:kingOverall.percent};
}

function calculateStudentOverallProgress(name){
  const unitProg=calculateUnitOverallProgress(name);
  const contentProg=calculateLearningContentProgress(name);
  const completedAmount=unitProg.completedAmount+contentProg.completedAmount;
  const totalAmount=unitProg.totalAmount+contentProg.totalAmount;
  const percent=totalAmount>0?Math.round((completedAmount/totalAmount)*100):0;
  const incompleteCount=(typeof buildIncompleteLearningItems==='function')?buildIncompleteLearningItems(name).length:0;
  const completed=percent>=100 && incompleteCount===0;
  return {
    percent, completed, completedAmount, totalAmount, incompleteCount,
    breakdown:{
      unitLearning:unitProg.percent,
      learningContent:contentProg.percent,
      timelineGame:contentProg.timelineGame,
      historyTraining:contentProg.historyTraining,
      mapStudy:contentProg.mapStudy,
      kingOrder:contentProg.kingOrder
    }
  };
}

function resolveHistoryTrainingResumeTarget(name){
  const mine=historyTrainingProgress[name]||{};
  // 1순위: 오답 복습이 남은 PART 중 가장 빠른 것
  for(const part of historyTrainingData){
    const prog=mine[part.id];
    if(prog && !prog.completed && (prog.firstWrongQuestionIds||[]).length>0 && !prog.reviewCompleted){
      const p=calculateHistoryTrainingProgress(name, part.id);
      if(p.percent<100) return {partId:part.id, step:'review'};
    }
  }
  // 2순위: 이미 시작했지만 완료하지 않은 PART 중 가장 빠른 것
  for(const part of historyTrainingData){
    const prog=mine[part.id];
    if(prog && !prog.completed){
      const p=calculateHistoryTrainingProgress(name, part.id);
      if(p.percent>0 && p.percent<100) return {partId:part.id, step:p.resumeTarget.step};
    }
  }
  // 3순위: 아직 시작하지 않은 PART 중 가장 빠른 것
  for(const part of historyTrainingData){
    const prog=mine[part.id];
    if(!prog || (!prog.completed && calculateHistoryTrainingProgress(name,part.id).percent===0)){
      return {partId:part.id, step:'reading'};
    }
  }
  return null; // 모두 완료
}

// 예전 미완료 목록 계산 함수 — 미완료단원/홈 화면의 V2 실패 시 폴백 경로에서 실제로 쓰이므로 삭제하지 말 것
function buildIncompleteLearningItems(name){
  const items=[];

  if(typeof calculateKingOrderProgress==='function'){
    const kingProgress=calculateKingOrderProgress(name);
    if(kingProgress.includeInOverall!==false&&!kingProgress.completed){
      items.push({
        type:'item',
        area:`역사학습콘텐츠 · ${KING_ORDER_DUE_LABEL}`,
        label:'역대 왕 계보',
        progress:kingProgress
      });
    }
  }

  getActiveUnitKeys().forEach(key=>{
    const u=UNITS[key];
    const progress = UNITS[key].examMode ? calculateSummaryQuizProgress(name,key) : calculateUnitProgress(name,key);
    if(progress.percent<100){
      const area=getUnitGroupInfo(key).label;
      items.push({type:'item', area, label:u.title, progress});
    }
  });

  if(typeof historyTrainingData!=='undefined' && historyTrainingData.length>0){
    const overall=calculateHistoryTrainingOverallProgress(name);
    if(overall.incompleteCount>0){
      const resumeTarget=resolveHistoryTrainingResumeTarget(name);
      const children=historyTrainingData
        .map(part=>({partId:part.id, partNumber:part.partNumber, title:part.title, progress:calculateHistoryTrainingProgress(name,part.id)}))
        .filter(c=>c.progress.percent<100);
      items.push({
        type:'group', id:'historyTraining', title:'역사 훈련소',
        percent:overall.percent,
        status:'미완료 PART '+overall.incompleteCount+'개',
        resumeTarget: resumeTarget?{type:'historyTraining', partId:resumeTarget.partId, step:resumeTarget.step}:null,
        children
      });
    }
  }



  if(typeof calculateMapStudyProgress==='function'){
    const mapProgress=calculateMapStudyProgress(name);
    if(!mapProgress.completed){
      items.push({
        type:'item',
        area:'역사학습콘텐츠',
        label:'지도 문제',
        progress:mapProgress
      });
    }
  }

  if(TIMELINE_GAME_ENABLED && typeof calculateTimelineGameProgress==='function'){
    const tg=calculateTimelineGameProgress(name);
    if(tg.percent<100){
      items.push({type:'item', area:'역사학습콘텐츠', label:'사건 배열하기', progress:tg});
    }
  }

  return items;
}

// ══════════════════════════════════════════════════
// 🧩 공통 학습 모듈 등록부 (2단계 인프라 — 화면은 아직 안 바꿈)
// 기존 계산 함수를 그대로 호출만 하고, 새 계산 로직은 만들지 않음
// ══════════════════════════════════════════════════

// UNIT (일반 단원 + 정리문제) — 기존 buildIncompleteLearningItems의 UNIT 루프와 동일한 순서/내용
function getUnitIncompleteItems(name){
  const items=[];
  getActiveUnitKeys().filter(key=>isContentApproved('unit',key)&&isContentRequiredForStudent('unit',key,name)).forEach((key,idx)=>{
    const u=UNITS[key];
    const progress = UNITS[key].examMode ? calculateSummaryQuizProgress(name,key) : calculateUnitProgress(name,key);
    if(progress.percent<100){
      const area=getUnitGroupInfo(key).label;
      items.push({
        moduleKey:'unit', itemKey:key,
        title:u.title, subtitle:area,
        percent:progress.percent, status:progress.status,
        resumeTarget:progress.resumeTarget,
        sortOrder:idx
      });
    }
  });
  return items;
}
function getUnitResumeTarget(name){
  const items=getUnitIncompleteItems(name);
  return items.length>0 ? items[0].resumeTarget : null;
}

// 역사훈련소 — 기존엔 "그룹 카드 1개"로만 미완료목록에 노출되던 것과 동일하게 1개 항목만 반환
function getHistoryTrainingIncompleteItems(name){
  if(typeof historyTrainingData==='undefined' || historyTrainingData.length===0) return [];
  const overall=calculateHistoryTrainingOverallProgress(name);
  if(overall.incompleteCount<=0) return [];
  // children: 그룹 카드를 펼쳤을 때 보여주는 PART별 세부 목록 (비공개 PART·이 학생에게 필수 아닌 PART는 제외)
  const children=historyTrainingData
    .filter(part=>isContentApproved('historyTraining',part.id)&&isContentRequiredForStudent('historyTraining',part.id,name))
    .map(part=>({partNumber:part.partNumber, title:part.title, progress:calculateHistoryTrainingProgress(name, part.id)}))
    .filter(c=>c.progress.percent<100);
  return [{
    moduleKey:'historyTraining', itemKey:'historyTraining',
    title:'역사 훈련소', subtitle:'역사학습콘텐츠',
    percent:overall.percent, status:overall.status,
    resumeTarget:overall.resumeTarget,
    sortOrder:1000,
    children
  }];
}
function getHistoryTrainingResumeTarget(name){
  const items=getHistoryTrainingIncompleteItems(name);
  return items.length>0 ? items[0].resumeTarget : null;
}

// 지도문제 — 기존과 동일하게 1개 항목만 반환 (PART별 세분화 없음)
function getMapStudyIncompleteItems(name){
  if(typeof calculateMapStudyProgress!=='function') return [];
  const mapProgress=calculateMapStudyProgress(name);
  if(mapProgress.completed) return [];
  return [{
    moduleKey:'mapStudy', itemKey:'mapStudy',
    title:'지도 문제', subtitle:'역사학습콘텐츠',
    percent:mapProgress.percent, status:mapProgress.status,
    resumeTarget:mapProgress.resumeTarget,
    sortOrder:1001
  }];
}
function getMapStudyResumeTarget(name){
  const items=getMapStudyIncompleteItems(name);
  return items.length>0 ? items[0].resumeTarget : null;
}

// 사건배열 — 기존과 동일하게 1개 항목만 반환
function getTimelineIncompleteItems(name){
  if(!TIMELINE_GAME_ENABLED) return [];
  if(typeof calculateTimelineGameProgress!=='function') return [];
  const tg=calculateTimelineGameProgress(name);
  if(tg.percent>=100) return [];
  return [{
    moduleKey:'eventOrder', itemKey:'eventOrder',
    title:'사건 배열하기', subtitle:'역사학습콘텐츠',
    percent:tg.percent, status:tg.status,
    resumeTarget:tg.resumeTarget,
    sortOrder:1002
  }];
}
function getTimelineResumeTarget(name){
  const items=getTimelineIncompleteItems(name);
  return items.length>0 ? items[0].resumeTarget : null;
}

// 역대 왕 계보 — 공개된 시대 전체를 하나의 필수 모듈로 표시
function getKingOrderIncompleteItems(name){
  const progress=calculateKingOrderProgress(name);
  if(progress.includeInOverall===false||progress.completed)return [];
  return [{
    moduleKey:'kingOrder', itemKey:'kingOrder',
    title:'역대 왕 계보', subtitle:`역사학습콘텐츠 · ${KING_ORDER_DUE_LABEL}`,
    percent:progress.percent, status:progress.status,
    resumeTarget:progress.resumeTarget,
    sortOrder:-1
  }];
}
function getKingOrderResumeTarget(name){
  const items=getKingOrderIncompleteItems(name);
  return items.length>0?items[0].resumeTarget:null;
}

function getHistorySummaryConfigIds_(name){
  return [HISTORY_SUMMARY1_ID, HISTORY_SUMMARY2_ID].filter(id=>isContentApproved('historySummary',id)&&isContentRequiredForStudent('historySummary',id,name));
}
// 역사총정리①·②를 하나의 모듈로 집계 — 기존 getHistorySummary1IncompleteProgress 계산식을 그대로 재사용(새로 만들지 않음)
function calculateHistorySummaryOverallProgress(name){
  const ids=getHistorySummaryConfigIds_(name);
  if(ids.length===0){
    return {percent:0, completed:true, incompleteCount:0, resumeTarget:null, completedAmount:0, totalAmount:100, includeInOverall:true};
  }
  let completedAmount=0, incompleteCount=0, resumeTarget=null;
  ids.forEach(id=>{
    const p=getHistorySummary1IncompleteProgress(name,id);
    completedAmount+=p.percent;
    if(!p.completed){
      incompleteCount++;
      if(!resumeTarget) resumeTarget=p.resumeTarget;
    }
  });
  const totalAmount=ids.length*100;
  const percent=totalAmount>0?Math.round((completedAmount/totalAmount)*100):0;
  const completed=incompleteCount===0;
  return {
    percent, completedAmount, totalAmount, incompleteCount, completed,
    status: completed?'완료':`미완료 ${incompleteCount}개`,
    resumeTarget,
    includeInOverall:true
  };
}
function getHistorySummaryIncompleteItems(name){
  const ids=getHistorySummaryConfigIds_(name);
  const items=[];
  ids.forEach(id=>{
    const p=getHistorySummary1IncompleteProgress(name,id);
    if(p.completed)return;
    const config=getHistorySummaryConfig_(id);
    items.push({
      moduleKey:'historySummary', itemKey:id,
      title:`역사총정리${config.number} · ${config.title}`, subtitle:'역사학습콘텐츠',
      percent:p.percent, status:p.status,
      resumeTarget:p.resumeTarget,
      sortOrder:1002
    });
  });
  return items;
}
function getHistorySummaryResumeTarget(name){
  const items=getHistorySummaryIncompleteItems(name);
  return items.length>0 ? items[0].resumeTarget : null;
}

const LEARNING_MODULES={
  unit:{
    key:'unit', title:'단원 학습', includeInOverall:true,
    calculateProgress:calculateUnitOverallProgress,
    getIncompleteItems:getUnitIncompleteItems,
    getResumeTarget:getUnitResumeTarget
  },
  historyTraining:{
    key:'historyTraining', title:'역사 훈련소', includeInOverall:true,
    calculateProgress:calculateHistoryTrainingOverallProgress,
    getIncompleteItems:getHistoryTrainingIncompleteItems,
    getResumeTarget:getHistoryTrainingResumeTarget
  },
  eventOrder:{
    key:'eventOrder', title:'사건 배열', includeInOverall:false,
    calculateProgress:calculateTimelineGameProgress,
    getIncompleteItems:getTimelineIncompleteItems,
    getResumeTarget:getTimelineResumeTarget
  },
  kingOrder:{
    key:'kingOrder', title:'역대 왕 계보', includeInOverall:true,
    calculateProgress:calculateKingOrderProgress,
    getIncompleteItems:getKingOrderIncompleteItems,
    getResumeTarget:getKingOrderResumeTarget
  },
  mapStudy:{
    key:'mapStudy', title:'지도 문제', includeInOverall:true,
    calculateProgress:calculateMapStudyProgress,
    getIncompleteItems:getMapStudyIncompleteItems,
    getResumeTarget:getMapStudyResumeTarget
  },
  studyPlanner:{
    key:'studyPlanner', title:'스터디플래너', includeInOverall:false,
    calculateProgress:calculateStudyPlannerProgress,
    getIncompleteItems:()=>[],
    getResumeTarget:()=>null
  },
  historySummary:{
    key:'historySummary', title:'역사총정리', includeInOverall:true,
    calculateProgress:calculateHistorySummaryOverallProgress,
    getIncompleteItems:getHistorySummaryIncompleteItems,
    getResumeTarget:getHistorySummaryResumeTarget
  }
};

// 진행률 통합 작업(홈/미완료/이어하기/부모님/선생님 화면)의 최종 스위치.
// true = 전 화면이 calculateOverallProgressV2 기준으로 동작 (현재 상태)
// false = 전 화면이 예전 계산 함수(calculateOverallProgress 등)만 사용
// 실제 전환은 getUnifiedProgressForUI()가 담당하며, 화면 코드는 이 값을 직접 참조하지 않음
const USE_UNIFIED_PROGRESS=true;

// LEARNING_MODULES를 한 번씩만 순회해서 진행률+미완료목록을 함께 계산 (모듈별 중복호출 없음)
function calculateOverallProgressV2(name){
  const sections=[];
  let totalCompletedAmount=0, totalAmount=0, overallIncompleteCount=0;
  let allItems=[];

  Object.keys(LEARNING_MODULES).forEach(moduleKey=>{
    const mod=LEARNING_MODULES[moduleKey];
    let progress;
    try{
      progress=mod.calculateProgress(name);
    }catch(err){
      console.warn('[calculateOverallProgressV2] 모듈 계산 오류 — 기본값으로 대체:', moduleKey, err);
      progress={percent:0, completed:false, status:'오류', incompleteCount:0, resumeTarget:null, completedAmount:0, totalAmount:100};
    }
    const includeInOverall = mod.includeInOverall!==false && progress.includeInOverall!==false;
    if(includeInOverall){
      // calculateOverallProgress()와 동일한 기준: 모듈 개수만큼 균등하게(모듈당 100점) 집계
      // (모듈 내부의 completedAmount/totalAmount는 세부항목 비례라서 여기서는 쓰지 않음 — 실제 화면 기준과 다르면 안 되므로)
      totalCompletedAmount += progress.percent;
      totalAmount += 100;
      if(!progress.completed) overallIncompleteCount++;
    }
    sections.push(Object.assign({moduleKey}, progress, {includeInOverall}));

    let items=[];
    try{
      items = mod.getIncompleteItems ? (mod.getIncompleteItems(name)||[]) : [];
    }catch(err){
      console.warn('[calculateOverallProgressV2] getIncompleteItems 오류 — 빈 목록으로 대체:', moduleKey, err);
      items=[];
    }
    allItems=allItems.concat(items);
  });

  // 원본 배열은 안 건드리고 복사본만 정렬
  const sortedItems=allItems.slice().sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
  const seen=new Set();
  const dedupedItems=[];
  sortedItems.forEach(item=>{
    const dedupeKey=item.moduleKey+'::'+item.itemKey;
    if(!seen.has(dedupeKey)){
      seen.add(dedupeKey);
      dedupedItems.push(item);
    }
  });

  const percent = totalAmount>0 ? Math.round((totalCompletedAmount/totalAmount)*100) : 0;
  const completed = percent>=100 && overallIncompleteCount===0;
  const resumeTarget = dedupedItems.length>0 ? dedupedItems[0].resumeTarget : null;

  return {
    percent, completed,
    incompleteCount: dedupedItems.length,
    incompleteItems: dedupedItems,
    resumeTarget,
    sections
  };
}

// buildIncompleteLearningItems(name)는 삭제하지 않고 그대로 둠 — 이건 V2 전용 별도 함수
// calculateOverallProgressV2 결과를 재사용만 하고 모듈 계산을 다시 반복하지 않음
function buildIncompleteLearningItemsV2(name){
  return calculateOverallProgressV2(name).incompleteItems;
}

// calculateOverallProgress(name)는 그대로 둠 — 이건 V2 전용 별도 함수
function resolveOverallResumeTargetV2(name){
  return calculateOverallProgressV2(name).resumeTarget;
}

// ── 개발용 검증 함수: 기존 계산과 V2 계산 결과를 정규화해서 비교 (화면에는 표시 안 함) ──
function compareProgressResults(name){
  // renderStudentCards()/renderHomeSummaryCard()가 실제로 쓰는 함수를 기준으로 비교 (calculateStudentOverallProgress 아님)
  const legacyOverall=calculateOverallProgress(name);
  const legacyItems=buildIncompleteLearningItems(name);
  const v2=calculateOverallProgressV2(name);

  const diffs=[];

  if((legacyOverall.percent||0) !== (v2.percent||0)){
    diffs.push(`percent: 기존 ${legacyOverall.percent} vs V2 ${v2.percent}`);
  }
  if(!!legacyOverall.completed !== !!v2.completed){
    diffs.push(`completed: 기존 ${!!legacyOverall.completed} vs V2 ${!!v2.completed}`);
  }
  // 주의: calculateOverallProgress().incompleteCount는 "미완료 모듈 개수"(왕순서 공개 시 최대 5)이고,
  // 실제 홈 화면(renderHomeSummaryCard)에 "미완료 학습 N개"로 표시되는 값은
  // buildIncompleteLearningItems(name).length(세부 항목 개수)이므로 이 값과 비교해야 함
  if((legacyItems.length||0) !== (v2.incompleteCount||0)){
    diffs.push(`incompleteCount: 기존(화면표시값,buildIncompleteLearningItems.length) ${legacyItems.length||0} vs V2 ${v2.incompleteCount||0}`);
  }

  // 기존 목록(item/group 혼재 구조)을 모듈 식별값 배열로 정규화해서 순서까지 비교
  const legacyKeys=legacyItems.map(it=>{
    if(it.type==='group') return it.id; // 'historyTraining'
    if(it.label==='지도 문제') return 'mapStudy';
    if(it.label==='사건 배열하기') return 'eventOrder';
    if(it.label==='역대 왕 계보') return 'kingOrder';
    const foundKey=Object.keys(UNITS).find(k=>UNITS[k].title===it.label);
    return 'unit:'+(foundKey||it.label);
  });
  const v2Keys=v2.incompleteItems.map(it=> it.moduleKey==='unit' ? ('unit:'+it.itemKey) : it.moduleKey);

  if(JSON.stringify(legacyKeys)!==JSON.stringify(v2Keys)){
    diffs.push(`미완료 항목 목록/순서 다름: 기존 [${legacyKeys.join(', ')}] vs V2 [${v2Keys.join(', ')}]`);
  }

  // resumeTarget은 실제 이동 대상(type+식별자+step)만 정규화해서 비교 (부가 필드/undefined-null 차이 무시)
  const normResume=rt=>{
    if(!rt) return 'null';
    return [rt.type||'', rt.unitKey||'', rt.partId||'', rt.eraId||'', rt.step||''].join(':');
  };
  const legacyFirst=legacyItems[0];
  const legacyResumeTarget = legacyFirst ? (legacyFirst.type==='group' ? legacyFirst.resumeTarget : legacyFirst.progress.resumeTarget) : null;
  if(normResume(legacyResumeTarget)!==normResume(v2.resumeTarget)){
    diffs.push(`resumeTarget 다름: 기존 ${normResume(legacyResumeTarget)} vs V2 ${normResume(v2.resumeTarget)}`);
  }

  const result={name, ok:diffs.length===0, diffs};
  if(diffs.length>0){
    console.warn(`[compareProgressResults] "${name}" 님 결과 차이 발견:`, diffs);
  }
  return result;
}

// percent/sections/incompleteItems 등이 없거나 비정상(NaN, 음수, 100 초과, null 등)이어도
// 화면이 깨지지 않도록 값만 안전하게 보정하는 공통 헬퍼.
// legacy(calculateOverallProgress)든 V2(calculateOverallProgressV2)든 이 함수를 거치면 동일하게 적용됨.
function sanitizeProgressResult(prog){
  const safe=(prog && typeof prog==='object') ? prog : {};
  let percent=Number(safe.percent);
  if(!isFinite(percent)) percent=0;
  percent=Math.max(0, Math.min(100, Math.round(percent)));
  let incompleteCount=Number(safe.incompleteCount);
  if(!isFinite(incompleteCount) || incompleteCount<0) incompleteCount=0;
  return Object.assign({}, safe, {
    percent,
    completed: !!safe.completed,
    status: (typeof safe.status==='string') ? safe.status : '',
    sections: Array.isArray(safe.sections) ? safe.sections : [],
    incompleteItems: Array.isArray(safe.incompleteItems) ? safe.incompleteItems : undefined,
    incompleteCount,
    resumeTarget: safe.resumeTarget || null
  });
}

// 홈/미완료단원/이어하기/부모님확인/선생님확인 — 진행률이 필요한 모든 화면이 반드시 이 함수 하나만 거쳐야 함.
// USE_UNIFIED_PROGRESS=true면 V2(calculateOverallProgressV2) 사용, false면 예전 계산(calculateOverallProgress)만 사용.
// V2가 예외를 던지거나 비정상 값을 반환하면 자동으로 예전 계산으로 폴백함.
// ⚠️ calculateOverallProgress / calculateStudentOverallProgress / buildIncompleteLearningItems 는
//    이 폴백 경로에서 실제로 쓰이는 안전망이므로 삭제하지 말 것.
function getUnifiedProgressForUI(name){
  let result;
  if(!USE_UNIFIED_PROGRESS){
    result=calculateOverallProgress(name);
  }else{
    try{
      result=calculateOverallProgressV2(name);
      if(!result || typeof result!=='object') throw new Error('V2 결과가 비정상입니다(null/undefined)');
    }catch(error){
      console.warn('통합 진행률 계산 실패, 기존 방식으로 폴백', name, error);
      result=calculateOverallProgress(name);
    }
  }
  return sanitizeProgressResult(result);
}

// 부모님 확인처럼 "미완료 모듈 개수"(왕순서 공개 시 최대 5)를 쓰는 화면을 위한 헬퍼
// prog가 legacy(calculateOverallProgress)든 V2(calculateOverallProgressV2)든 sections 구조가 같아서 그대로 재사용 가능
function getModuleIncompleteCountForUI(prog){
  if(!prog || !Array.isArray(prog.sections)) return (prog && prog.incompleteCount) || 0;
  return prog.sections.filter(s=>s.includeInOverall!==false && !s.completed).length;
}

// 선생님/관리자 화면이 쓰는 breakdown(unitLearning/learningContent/timelineGame/historyTraining/mapStudy/kingOrder)을
// legacy(calculateOverallProgress, 이미 breakdown 있음)든 V2(sections만 있음)든 동일하게 얻기 위한 헬퍼
function getBreakdownForUI(prog){
  if(prog && prog.breakdown) return prog.breakdown;
  if(!prog || !Array.isArray(prog.sections)) return {unitLearning:0, learningContent:0, timelineGame:0, historyTraining:0, mapStudy:0, kingOrder:0};
  const find=k=>{ const s=prog.sections.find(x=>x.moduleKey===k); return s?s.percent:0; };
  const historyTraining=find('historyTraining'), mapStudy=find('mapStudy'), kingOrder=find('kingOrder');
  const kingSection=prog.sections.find(x=>x.moduleKey==='kingOrder');
  const contentPercents=[historyTraining,mapStudy];
  if(kingSection&&kingSection.includeInOverall!==false)contentPercents.push(kingOrder);
  return {
    unitLearning: find('unit'),
    learningContent: Math.round(contentPercents.reduce((sum,value)=>sum+value,0)/contentPercents.length),
    timelineGame:0, historyTraining, mapStudy, kingOrder
  };
}

function getResumeButtonLabel(progress){
  if(progress.completed) return null;
  if(typeof progress.status==='string' && progress.status.indexOf('오답 복습')!==-1) return '다시 풀기';
  const rt=progress.resumeTarget||{};
  if(rt.type==='unit' && UNITS[rt.unitKey]?.examMode && progress.percent>0) return '다시 풀기';
  if(progress.percent>0) return '이어하기';
  return '시작하기';
}

function renderHistoryTrainingIncompleteGroup(group){
  const rt=group.resumeTarget||{};
  const childrenHtml=group.children.map(c=>{
    return `<div class="ht-group-child-row">
      <span>PART ${c.partNumber} · ${c.title}</span>
      <span>${c.progress.percent}% · ${c.progress.status}</span>
    </div>`;
  }).join('');
  return `<div class="unit-card ht-incomplete-card ht-group-card">
    <div class="ht-group-header" data-action="toggle-ht-group">
      <span class="ht-group-arrow">${htGroupExpanded?'▴':'▾'}</span>
      <div class="unit-info">
        <div class="ht-incomplete-area">역사학습콘텐츠</div>
        <div class="unit-title">역사 훈련소</div>
        ${renderIncompleteProgressBar({percent:group.percent, status:group.status})}
      </div>
    </div>
    <button type="button" class="ht-part-btn" data-action="resume-learning" data-type="historyTraining" data-part-id="${rt.partId||''}" data-step="${rt.step||''}">${rt.step==='review'?'다시 풀기':(group.percent>0?'이어하기':'시작하기')}</button>
    <div class="ht-group-children" style="display:${htGroupExpanded?'flex':'none'}">${childrenHtml}</div>
  </div>`;
}


function getHistorySummary1IncompleteProgress(name,summaryId){
  const targetId=summaryId||HISTORY_SUMMARY1_ID;
  const prog=getHistorySummary1Progress(name,targetId);
  const readingProgress=prog.readingProgress||{};
  const paragraphs=getHistorySummaryReadingParagraphs(targetId);
  const confirmedCount=Array.isArray(readingProgress.confirmedParagraphIds)
    ?readingProgress.confirmedParagraphIds.length:0;
  const totalParagraphs=Math.max(1,paragraphs.length);

  let percent=Number(prog.progressPercent)||0;
  if(!prog.completed){
    if(readingProgress.completed||prog.readingCompleted){
      percent=Math.max(percent,50);
    }else if(confirmedCount>0){
      percent=Math.max(percent,Math.min(45,Math.round((confirmedCount/totalParagraphs)*45)));
    }
  }
  percent=Math.max(0,Math.min(100,Math.round(percent)));

  let status='시작 전';
  let step='reading';
  if(prog.completed){
    status='완료';
    step='completed';
  }else if(readingProgress.completed||prog.readingCompleted){
    status='1분 핵심요약 확인 중';
    step='summary';
  }else if(confirmedCount>0){
    status=`읽기 진행 중 · ${confirmedCount}/${totalParagraphs}문단`;
  }

  return {
    completed:!!prog.completed,
    percent,
    status,
    resumeTarget:{type:'historySummary',summaryId:targetId,step}
  };
}

let incompleteSectionExpanded=false;

function renderIncompleteUnitsSection(){
  const wrap=document.getElementById('incomplete-section-wrap');
  const body=document.getElementById('incomplete-units-body');
  const countBadge=document.getElementById('incomplete-count-badge');
  if(!body)return;

  if(!playerName){
    if(wrap) wrap.style.display='none';
    body.style.display='none';
    return;
  }

  // USE_UNIFIED_PROGRESS면 V2(공통 모듈 등록부) 결과를, 아니면 기존 함수 결과를 그대로 사용
  // 두 소스의 모양이 달라서(item/group 혼재 vs 평면구조) 렌더링 직전에 공통 형태로 정규화만 함
  let normalizedItems;
  let usedV2=false;
  if(USE_UNIFIED_PROGRESS){
    try{
      normalizedItems=buildIncompleteLearningItemsV2(playerName).map(it=>({
        isGroup: it.moduleKey==='historyTraining',
        area: it.subtitle, title: it.title,
        percent: it.percent, status: it.status,
        resumeTarget: it.resumeTarget,
        children: it.children||[]
      }));
      usedV2=true;
    }catch(error){
      console.warn('미완료 목록 V2 계산 실패, 기존 방식으로 폴백', playerName, error);
      normalizedItems=null;
    }
  }
  if(!normalizedItems){
    normalizedItems=buildIncompleteLearningItems(playerName).map(item=>{
      if(item.type==='group'){
        return {isGroup:true, area:'역사학습콘텐츠', title:item.title, percent:item.percent, status:item.status, resumeTarget:item.resumeTarget, children:item.children};
      }
      return {isGroup:false, area:item.area, title:item.label, percent:item.progress.percent, status:item.progress.status, resumeTarget:item.progress.resumeTarget, children:[]};
    });
  }

  // V2 경로는 LEARNING_MODULES.historySummary를 통해 이미 역사총정리를 포함하므로,
  // 레거시(non-V2) 폴백일 때만 아래에서 별도로 보충함 — 그렇지 않으면 역사총정리가 두 번 나타남
  if(!usedV2)
  [HISTORY_SUMMARY1_ID,HISTORY_SUMMARY2_ID].forEach(summaryId=>{
    if(!isContentApproved('historySummary',summaryId))return;
    const historySummaryProgress=getHistorySummary1IncompleteProgress(playerName,summaryId);
    if(historySummaryProgress.completed)return;
    const config=getHistorySummaryConfig_(summaryId);
    normalizedItems.push({
      isGroup:false,
      area:'역사학습콘텐츠',
      title:`역사총정리${config.number} · ${config.title}`,
      percent:historySummaryProgress.percent,
      status:historySummaryProgress.status,
      resumeTarget:historySummaryProgress.resumeTarget,
      children:[]
    });
  });

  if(normalizedItems.length===0){
    if(wrap) wrap.style.display='none';
    body.style.display='none';
    return;
  }

  if(wrap) wrap.style.display='block';
  if(countBadge) countBadge.textContent='('+normalizedItems.length+')';
  body.style.display=incompleteSectionExpanded?'flex':'none';

  const arrow=document.getElementById('incomplete-section-arrow');
  if(arrow) arrow.textContent=incompleteSectionExpanded?'▾':'▸';
  body.innerHTML=normalizedItems.map(n=>{
    if(n.isGroup){
      return renderHistoryTrainingIncompleteGroup({percent:n.percent, status:n.status, resumeTarget:n.resumeTarget, children:n.children});
    }
    const rt=n.resumeTarget||{};
    const isReview = rt.type==='unit' && !!UNITS[rt.unitKey]?.examMode;
    const progressLike={percent:n.percent, status:n.status, completed:false, resumeTarget:rt};
    return `<div class="unit-card ht-incomplete-card">
      <div class="unit-info">
        <div class="ht-incomplete-area">${n.area}</div>
        <div class="unit-title">${n.title}</div>
        ${isReview
          ? `<div class="ht-progress-row"><span class="ht-progress-status">${n.status}</span></div>`
          : renderIncompleteProgressBar(progressLike)}
      </div>
      <button type="button" class="ht-part-btn" data-action="resume-learning" data-type="${rt.type||''}" data-unit-id="${rt.unitKey||''}" data-part-id="${rt.partId||''}" data-era-id="${rt.eraId||''}" data-summary-id="${rt.summaryId||''}" data-step="${rt.step||''}" data-direct-start="${rt.type==='unit'?'1':'0'}" onclick="handleResumeLearningElement(this,event)">${rt.type==='unit'?'바로 시작':(getResumeButtonLabel(progressLike)||'이어하기')}</button>
    </div>`;
  }).join('');

  bindIncompleteLearningEvents();
}

// ── 이벤트 위임: 컨테이너에 한 번만 바인딩, 재렌더링돼도 유지됨 ──
function bindIncompleteLearningEvents(){
  const body=document.getElementById('incomplete-units-body');
  if(!body || body.dataset.htBound==='1') return;
  body.dataset.htBound='1';
  body.addEventListener('click', handleIncompleteResumeClick);
}

function handleResumeLearningElement(element,event){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }
  const target=resolveLearningResumeTarget(element);
  if(!target){
    console.warn('이어하기 대상 정보를 만들지 못했습니다.',element?.dataset);
    if(typeof showToast2==='function')showToast2('⚠️ 학습 화면을 열지 못했어요.');
    return;
  }

  if(target.type==='unit'&&element?.dataset?.directStart==='1'){
    startIncompleteUnitDirectly(target.unitKey);
    return;
  }

  openLearningResumeTarget(target);
}

function getNextUnitLevelForStudent(name,unitKey){
  const unit=UNITS[unitKey];
  if(!unit||unit.examMode)return 'easy';

  const mine=(allEntriesCache||[]).filter(entry=>
    entry&&entry.name===name&&entryMatchesUnit(entry,unitKey)
  );
  const easyPassed=mine.some(entry=>entry.level==='기본'&&entry.pass===true);
  const hardPassed=mine.some(entry=>entry.level==='심화'&&entry.pass===true);

  if(!easyPassed)return 'easy';
  if(!hardPassed)return 'hard';
  return 'easy';
}

function startIncompleteUnitDirectly(unitKey){
  const unit=UNITS[unitKey];
  if(!unit){
    if(typeof showToast2==='function')showToast2('⚠️ 해당 단원을 찾지 못했어요.');
    return;
  }

  currentUnit=unitKey;
  currentLevel=getNextUnitLevelForStudent(playerName,unitKey);
  levelSectionVisible=false;

  const levelWrap=document.getElementById('level-section-wrapper');
  if(levelWrap)levelWrap.style.display='none';

  // 미완료 목록에서 누르면 단원 선택 화면을 거치지 않고 곧바로 문제 시작
  if(unit.examMode){
    startQuiz();
    return;
  }

  startQuiz();
}

function handleIncompleteResumeClick(evt){
  const btn=evt.target.closest('[data-action="resume-learning"]');
  if(btn){
    handleResumeLearningElement(btn,evt);
    return;
  }
  const toggleEl=evt.target.closest('[data-action="toggle-ht-group"]');
  if(toggleEl){
    htGroupExpanded=!htGroupExpanded;
    renderIncompleteUnitsSection();
  }
}

function resolveLearningResumeTarget(el){
  const type=el.dataset.type;
  if(type==='unit') return {type:'unit', unitKey:el.dataset.unitId};
  if(type==='historyTraining') return {type:'historyTraining', partId:el.dataset.partId, step:el.dataset.step};
  if(type==='timelineGame') return TIMELINE_GAME_ENABLED?{type:'timelineGame'}:null;
  if(type==='mapStudy') return {type:'mapStudy',partId:el.dataset.partId||''};
  if(type==='kingOrder') return {type:'kingOrder',eraId:el.dataset.eraId||''};
  if(type==='historySummary') return {type:'historySummary',summaryId:el.dataset.summaryId||HISTORY_SUMMARY1_ID,step:el.dataset.step||'reading'};
  return null;
}

const HT_ALLOWED_STEPS=['reading','transcription','quiz','firstResult','review','completed'];

function openLearningResumeTarget(target){
  if(!target)return;

  if(target.type==='historySummary'){
    openHistorySummary1(target.summaryId||HISTORY_SUMMARY1_ID);
    if(target.step==='summary'){
      setTimeout(()=>showHistorySummaryMinute(),0);
    }
    return;
  }

  if(target.type==='unit'){
    if(!target.unitKey||!UNITS[target.unitKey]){
      console.error('이어하기 UNIT 키가 올바르지 않습니다.',target);
      if(typeof showToast2==='function')showToast2('⚠️ 해당 단원을 찾지 못했어요.');
      return;
    }

    htShowOnlyScreen('start-screen');

    const unitGrid=document.getElementById('unit-grid');
    if(!unitGrid){
      console.error('UNIT 목록 영역을 찾지 못했습니다.');
      return;
    }

    // TEST USER처럼 일반 로그인 경로를 건너뛴 경우에도 목록을 확실히 준비
    let groupId=getUnitGroupInfo(target.unitKey).id;
    let group=document.getElementById(groupId);
    let card=document.querySelector(`#${groupId} .unit-card[data-unit-key="${target.unitKey}"]`);

    if(!group||!card){
      renderUnitGrid();
      groupId=getUnitGroupInfo(target.unitKey).id;
      group=document.getElementById(groupId);
      card=document.querySelector(`#${groupId} .unit-card[data-unit-key="${target.unitKey}"]`);
    }

    unitGrid.style.display='flex';
    if(group)group.style.display='flex';

    const arrow=document.getElementById(groupId+'-arrow');
    if(arrow)arrow.textContent='▾';

    if(card){
      selectUnit(card,target.unitKey);
      card.scrollIntoView({behavior:'smooth',block:'center'});
    }else{
      console.error('이어하기 단원 카드를 찾지 못했습니다.',target);
      if(typeof showToast2==='function')showToast2('⚠️ 단원 화면을 준비하지 못했어요.');
    }

  }else if(target.type==='historyTraining'){
    if(!target.partId || !htGetPart(target.partId)){
      console.error('역사 훈련소 PART ID가 올바르지 않습니다.', target);
      return;
    }
    const step = HT_ALLOWED_STEPS.includes(target.step) ? target.step : 'reading';
    openHistoryTrainingPart(target.partId, step);

  }else if(target.type==='timelineGame'){
    if(!TIMELINE_GAME_ENABLED){
      showLearningHomeView();
      return;
    }
    showTimelineGame();
  }else if(target.type==='mapStudy'){
    if(target.partId)openMapStudyLearn(target.partId);
    else showMapStudyList();
  }else if(target.type==='kingOrder'){
    showKingOrder();
    if(target.eraId)openKingOrderEra(target.eraId);
  }
}

function updateLevelDesc(){
  if(!currentUnit)return;
  const u=UNITS[currentUnit];
  const isExam=!!u.examMode;
  document.getElementById('level-section-label').style.display=isExam?'none':'block';
  document.getElementById('level-grid-wrap').style.display=isExam?'none':'grid';
  if(!isExam){
    document.getElementById('easy-desc').textContent=u.easyCount+'문제 · OX + 4지선다';
    document.getElementById('hard-desc').textContent=u.hardCount+'문제 · 단답형 포함';
  }
}

// 선택된 학생이 완료한 단원/난이도를 다른 색상으로 표시
function updateProgressColors(){
  const myEntries=playerName ? allEntriesCache.filter(e=>e.name===playerName) : [];

  // 단원 카드: 해당 단원의 기본+심화를 모두 완료했으면 done 표시
  document.querySelectorAll('.unit-card').forEach(c=>{
    const key=c.dataset.unitKey;
    if(!key){ c.classList.remove('done'); return; }
    const u=UNITS[key];
    const mine=myEntries.filter(e=>entryMatchesUnit(e,key));
    if(u.examMode){
      // 정리문제: 70점 이상(합격) 기록이 하나라도 있으면 done, 시도는 했지만 불합격이면 partial
      const passed=mine.some(e=>e.pass);
      const attempted=mine.length>0;
      c.classList.toggle('done', passed);
      c.classList.toggle('partial', attempted && !passed);
      c.classList.toggle('unit-passed', passed);
      return;
    }
    const easyDone=mine.some(e=>e.level==='기본' && e.pass);
    const hardDone=mine.some(e=>e.level==='심화' && e.pass);
    const easyAttempted=mine.some(e=>e.level==='기본');
    const hardAttempted=mine.some(e=>e.level==='심화');
    c.classList.toggle('done', easyDone && hardDone);
    c.classList.toggle('partial', (easyAttempted || hardAttempted) && !(easyDone && hardDone));
    c.classList.toggle('unit-passed', easyDone && hardDone);
  });

  // 미완료 단원만 모아서 별도 토글에 보여주기 (완료 단원이 없으면 이 토글 자체를 숨김)
  renderIncompleteUnitsSection();

  // 난이도 카드: 현재 선택된 단원 기준으로 합격 여부 표시 (시험모드는 난이도 카드 자체가 없음)
  if(currentUnit && !UNITS[currentUnit].examMode){
    const mineCur=myEntries.filter(e=>entryMatchesUnit(e,currentUnit));
    const easyDoneCur=mineCur.some(e=>e.level==='기본' && e.pass);
    const hardDoneCur=mineCur.some(e=>e.level==='심화' && e.pass);
    const easyCard=document.querySelector('.level-card[data-level="easy"]');
    const hardCard=document.querySelector('.level-card[data-level="hard"]');
    if(easyCard) easyCard.classList.toggle('done', easyDoneCur);
    if(hardCard) hardCard.classList.toggle('done', hardDoneCur);
  }
}

// ── 강의 보기 (문제와 별개, 유튜브 링크 전용) ──
// url이 비어있으면 아직 링크가 등록되지 않은 강의
const LECTURE_VIDEOS=[
  { group:'past', title:'1강', url:'https://youtu.be/AlS_luv39FY' },
  { group:'past', title:'2강', url:'https://youtu.be/Clxq3EN7vfM' },
  { group:'past', title:'3강', url:'https://youtu.be/zClCCYNEzlw' },
  { group:'past', title:'4강', url:'https://youtu.be/B7uKuNqM3Ts' },
  { group:'past', title:'5강', url:'https://youtu.be/2Ge5jomMHRU' },
  { group:'past', title:'6강', url:'https://youtu.be/CAOqJQphnqU' },
  { group:'past', title:'7강', url:'https://youtu.be/f_cicKzeqNk' },
  { group:'past', title:'8강', url:'https://youtu.be/lFaYasphmSM' },
  { group:'past', title:'9강', url:'https://youtu.be/wJZtr-4rZ2M' },
  { group:'past', title:'10강', url:'https://youtu.be/nbssx4bQKuE' },
  { group:'past', title:'11강', url:'https://youtu.be/C7NNTsa8OIY' },
  { group:'past', title:'12강', url:'https://youtu.be/rPosxU7lan8' },
  { group:'past', title:'13강', url:'https://youtu.be/5gDD_YXxW9w' },
  { group:'past', title:'14강', url:'https://youtu.be/yEyxBCHu-CQ' },
  { group:'past', title:'15강', url:'https://www.youtube.com/watch?v=x_OvWWMHrcY&list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m&index=15&t=8s' },
  { group:'past', title:'16강', url:'https://www.youtube.com/watch?v=DOnLcduba2s&list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m&index=16' },
  { group:'past', title:'17강', url:'https://www.youtube.com/watch?v=lmcofa_lnOA&list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m&index=17' },
  { group:'past', title:'18강', url:'https://www.youtube.com/watch?v=8FLIz0Bb-sc&list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m&index=18' },
  { group:'past', title:'19강', url:'https://www.youtube.com/watch?v=UCvxc9I6Qs4&list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m&index=19' },
  { group:'past', title:'20강', url:'https://youtu.be/sEMaSsKBMwk' },
  { group:'past', title:'21강', url:'https://youtu.be/qdnzur4PZkU' },
  { group:'past', title:'22강', url:'https://youtu.be/WsUS5nodNwQ' },
  { group:'past', title:'23강', url:'https://youtu.be/lSoHI9Ra3gg' },
  { group:'past', title:'24강', url:'https://youtu.be/JtVfI__Zer4?list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m' },
  { group:'past', title:'25강', url:'https://youtu.be/GmAQ_3FPZwM?list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m' },
  { group:'past', title:'26강', url:'https://youtu.be/qYSKYwmY7GA' },
  { group:'past', title:'27강', url:'https://youtu.be/Hw68A6HpOeE' },
  { group:'past', title:'28강', url:'https://youtu.be/uVnlnrZc3nw' },
  { group:'past', title:'29강', url:'https://youtu.be/BqW42jrO9uc?si=6odC2TsK3rO7tEEU' },
  { group:'past', title:'30강', url:'https://youtu.be/Os8GGDkNNUc?si=RhexAfKvHDjbVXIH' },
  { group:'past', title:'31강', url:'https://www.youtube.com/watch?v=0DoINo25Uic&list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m&index=31' },
  { group:'past', title:'32강', url:'https://youtu.be/irdi-Dcj2qI?list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m' },
  { group:'past', title:'33강', url:'https://www.youtube.com/watch?v=PMNVrwgIl_U' },
  { group:'past', title:'34강', url:'https://youtu.be/sHi5Z1g0Mxs?list=PLWHFxmcZ4OBC0mi2Xnu7HVAohkUjjty3m' },
  { group:'past', title:'35강', url:'https://youtu.be/aimRbf8x-wQ?si=XBHBfYTpHKW1Cxcv' },
  { group:'past', title:'36강', url:'https://youtu.be/Y-kvHCDb65s?si=BDCUCXEi01uIBcW3' },
  { group:'past', title:'37강', url:'https://youtu.be/ia_tIlqgVYE?si=DMAhSova_Cqacrg9' },
  { group:'today', title:'38강', url:'https://youtu.be/N6i5RPNR3nQ' },
];

function showLectures(){
  document.getElementById('start-screen').style.display='none';
  document.getElementById('lecture-screen').style.display='block';
  renderLectureVideoList();
}

function hideLectures(){
  document.getElementById('lecture-screen').style.display='none';
  document.getElementById('start-screen').style.display='block';
}

const PAST_PREVIEW_COUNT=3;


let lectureExternalNavigation=false;
let lectureExternalNavigationAt=0;

function markLectureExternalNavigation(){
  lectureExternalNavigation=true;
  lectureExternalNavigationAt=Date.now();
  try{sessionStorage.setItem('lectureExternalNavigation','1');}catch(error){}
}

function isLectureExternalNavigation(){
  if(lectureExternalNavigation)return true;
  try{
    if(sessionStorage.getItem('lectureExternalNavigation')==='1')return true;
  }catch(error){}
  return Date.now()-lectureExternalNavigationAt<15000;
}

function clearLectureExternalNavigation(){
  lectureExternalNavigation=false;
  lectureExternalNavigationAt=0;
  try{sessionStorage.removeItem('lectureExternalNavigation');}catch(error){}
}

function registerLectureClick(lec){
  if(parentChildViewActive||viewerModeActive)return false;
  if(!playerName||isAdminSessionActive()||!lec)return false;

  const name=playerName;
  const date=todayLocalDate();
  const data={...getStudyPlannerData(name)};
  const list=Array.isArray(data[date])?[...data[date]]:[];
  const lectureKey=`lecture_plan_${date}_${String(lec.title||'lecture').replace(/\s+/g,'_')}`;

  if(!hasStartedThisSession_('lecture',lectureKey)){
    enqueueLearningEvent_({contentType:'lecture', contentId:lectureKey, contentTitle:lec.title||'', action:'start'});
    markStartedThisSession_('lecture',lectureKey);
  }

  if(!list.some(item=>item&&item.lectureKey===lectureKey)){
    list.push({
      id:makeStudyPlanId(),
      text:`강의보기 · ${lec.title}`,
      status:'doing',
      lectureKey,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
    data[date]=list;
  }

  // 새 탭이 바로 열려도 기록이 사라지지 않도록 로컬에 먼저 즉시 저장
  studyPlannerCache[name]=data;
  if(!isDeveloperTestMode()){
    localStorage.setItem(studyPlannerKey(name),JSON.stringify(data));
  }

  if(document.getElementById('study-planner-overlay')?.classList.contains('show')){
    renderStudyPlanner();
  }

  // TEST USER는 메모리 전용
  if(isDeveloperTestMode())return true;

  // 탭 이동 직전에도 요청이 취소되지 않도록 keepalive 사용
  try{
    const body=new URLSearchParams();
    body.set('action','setStudyPlanner');
    body.set('name',name);
    body.set('data',JSON.stringify(data));
    body.set('isAdminMode','false');

    fetch(API_URL,{
      method:'POST',
      body,
      keepalive:true
    }).catch(error=>console.error('강의 스터디플래너 저장 실패:',error));
  }catch(error){
    console.error('강의 스터디플래너 저장 준비 실패:',error);
  }

  return true;
}

function makeLectureItem(lec){
  const hasUrl=!!lec.url;
  const el=document.createElement(hasUrl?'a':'div');
  el.className='lecture-item'+(lec.group==='today'?' today':'')+(!hasUrl?' locked':'');

  if(hasUrl){
    // 일반 링크 그대로 사용
    el.href=lec.url;
    el.target='_blank';
    el.rel='noopener';

    const prepareLectureNavigation=()=>{
      markLectureExternalNavigation();
      registerLectureClick(lec);
    };

    // 브라우저가 visibilitychange를 click보다 먼저 처리하는 경우까지 대비
    el.addEventListener('pointerdown',prepareLectureNavigation,{once:true});
    el.addEventListener('touchstart',prepareLectureNavigation,{once:true,passive:true});
    el.addEventListener('mousedown',prepareLectureNavigation,{once:true});
    el.addEventListener('click',()=>{
      markLectureExternalNavigation();
      registerLectureClick(lec);
    });
  }

  const badgeClass=lec.group==='today'?'today':(hasUrl?'ready':'locked');
  const badgeIcon=lec.group==='today'?'🆕':(hasUrl?'▶️':'🔒');

  el.innerHTML=`<div class="lecture-badge ${badgeClass}">${badgeIcon}</div>
    <div class="lecture-info">
      <div class="lecture-title">${lec.title}</div>
      <div class="lecture-sub">${hasUrl?'눌러서 시청하기':'링크 준비중이에요'}</div>
    </div>`;

  if(!hasUrl){
    el.onclick=()=>showToast2('⏳ 아직 영상 링크가 등록되지 않았어요');
  }

  return el;
}

function renderLectureVideoList(){
  const pastList=document.getElementById('past-lecture-list');
  const todayList=document.getElementById('today-lecture-list');
  const moreBtn=document.getElementById('past-more-btn');
  pastList.innerHTML='';
  todayList.innerHTML='';

  const todayItems=LECTURE_VIDEOS.filter(l=>l.group==='today');
  const pastItems=LECTURE_VIDEOS.filter(l=>l.group==='past').slice().reverse(); // 최신 강의가 위로

  todayItems.forEach(lec=>todayList.appendChild(makeLectureItem(lec)));

  pastItems.slice(0,PAST_PREVIEW_COUNT).forEach(lec=>pastList.appendChild(makeLectureItem(lec)));

  if(pastItems.length>PAST_PREVIEW_COUNT){
    moreBtn.classList.remove('hidden');
    moreBtn.textContent='더보기 ▾';
    moreBtn.onclick=()=>{
      pastItems.slice(PAST_PREVIEW_COUNT).forEach(lec=>pastList.appendChild(makeLectureItem(lec)));
      moreBtn.classList.add('hidden');
    };
  }else{
    moreBtn.classList.add('hidden');
  }
}

let playerName='',currentLevel='easy',questions=[],currentIdx=0,score=0,wrongQ=[],answered=false,submitted=false;
let wrongRetryMode=false;
let memoryCardStageByIndex=new Map();
let memoryCardRetryIndices=new Set();
let memoryCardGateTimer=null;
let forcedReviewTimer=null;
let timerInt=null,timeLeft=10;
const CIRC=113.1;let TSEC=10;

function selectLevel(el){
  document.querySelectorAll('.level-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  currentLevel=el.dataset.level;
  openStartQuizPopup();
}

function openStartQuizPopup(){
  const u=UNITS[currentUnit];
  document.getElementById('start-popup-title').textContent=u.title;
  if(u.examMode){
    document.getElementById('start-popup-sub').textContent='✉️ 정리문제 · '+u.totalQuestions+'문제';
  }else{
    const levelLabel=currentLevel==='easy'?'🌱 기본':'🔥 심화';
    document.getElementById('start-popup-sub').textContent=levelLabel+' · '+(currentLevel==='easy'?u.easyCount:u.hardCount)+'문제';
  }
  document.getElementById('start-quiz-overlay').classList.add('show');
}

function closeStartQuizPopup(){
  document.getElementById('start-quiz-overlay').classList.remove('show');
}

function confirmStartQuiz(){
  document.getElementById('start-quiz-overlay').classList.remove('show');
  quizActiveFlag=true;
  startQuiz();
}

let allEntriesCache=[];
let avatarMap={};

async function renderStudentGrid(options={}){
  const grid=document.getElementById('student-grid');
  // 학생 이름은 서버 응답과 관계없이 먼저 보여준다.
  // 서버가 느리거나 연결되지 않아도 이름 선택 화면이 비어 보이지 않게 한다.
  renderStudentCards();
  updateProgressColors();
  // 앱 시작/학생 선택 화면에서는 이름·기본 아바타만 먼저 표시한다.
  // 전체 퀴즈 기록은 인증 완료 후 학생 홈의 기존 백그라운드 로딩에서 조회한다.
  if(!options.refreshData || !apiConfigured()) return;
  allEntriesCache=await apiList();
  renderStudentCards();
  updateProgressColors();
}

let noteMap={};

function getStudentCardTotalStudySeconds(name){
  try{
    const safeName=String(name||'').trim();
    if(!safeName)return 0;
    const raw=JSON.parse(localStorage.getItem(`studyTimeData_${safeName}`)||'{}');
    const localTotal=Math.max(0,Number(raw.total)||0);
    const server=studyTimeServerCache[safeName];
    const serverTotal=server?Math.max(0,Number(server.totalSeconds)||0):0;
    return Math.max(localTotal,serverTotal);
  }catch(error){
    return 0;
  }
}

// ===== 학생 카드 순서 직접 바꾸기 (길게 눌러 드래그, 이 기기에만 저장) =====
const LAST_LOGIN_STUDENT_KEY='lastLoginStudent';
let previewPrimaryName='';
function getPrimaryStudentName_(){
  try{ return previewPrimaryName||localStorage.getItem(LAST_LOGIN_STUDENT_KEY)||''; }catch(e){ return previewPrimaryName||''; }
}
function rememberLastLoginStudent_(name){
  previewPrimaryName='';
  try{ localStorage.setItem(LAST_LOGIN_STUDENT_KEY,name); }catch(e){}
}
// 다른 학생 카드를 눌러 "미리보기"만 하고 싶을 때 — 로그인(PIN)은 하지 않고 그 학생 카드만 크게 보여줌
function previewStudentCard(name){
  previewPrimaryName=name;
  renderStudentCards();
}
const STUDENT_CARD_ORDER_KEY='studentCardOrder';
function getOrderedStudents_(){
  let order=[];
  try{ order=JSON.parse(localStorage.getItem(STUDENT_CARD_ORDER_KEY)||'[]'); }catch(e){ order=[]; }
  if(!Array.isArray(order))order=[];
  const byName={};
  STUDENTS.forEach(s=>{ byName[s.name]=s; });
  const ordered=order.map(n=>byName[n]).filter(Boolean);
  STUDENTS.forEach(s=>{ if(!ordered.includes(s))ordered.push(s); });
  return ordered.length===STUDENTS.length?ordered:STUDENTS.slice();
}
function saveStudentCardOrderFromDom_(){
  const grid=document.getElementById('student-grid');
  if(!grid)return;
  const names=Array.from(grid.querySelectorAll('.student-card')).map(el=>el.dataset.name).filter(Boolean);
  try{ localStorage.setItem(STUDENT_CARD_ORDER_KEY,JSON.stringify(names)); }catch(e){}
}
function bindCardReorderGesture_(card){
  let pressTimer=null,startX=0,startY=0,dragging=false,pointerId=null;
  const cancelPress=()=>{ if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } };
  card.addEventListener('pointerdown',(e)=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    startX=e.clientX; startY=e.clientY; dragging=false; pointerId=e.pointerId;
    cancelPress();
    pressTimer=setTimeout(()=>{
      dragging=true;
      card.dataset.suppressClick='1';
      card.classList.add('card-dragging');
      try{ card.setPointerCapture(pointerId); }catch(err){}
    },420);
  });
  card.addEventListener('pointermove',(e)=>{
    if(!dragging){
      if(pressTimer&&(Math.abs(e.clientX-startX)>8||Math.abs(e.clientY-startY)>8))cancelPress();
      return;
    }
    e.preventDefault();
    const dx=e.clientX-startX,dy=e.clientY-startY;
    card.style.transform=`translate(${dx}px,${dy}px) scale(1.04)`;
    card.style.zIndex='20';
    const grid=document.getElementById('student-grid');
    if(!grid)return;
    const others=Array.from(grid.querySelectorAll('.student-card')).filter(el=>el!==card);
    for(const other of others){
      const r=other.getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
        const all=Array.from(grid.children);
        if(all.indexOf(card)<all.indexOf(other)) grid.insertBefore(card,other.nextSibling);
        else grid.insertBefore(card,other);
        break;
      }
    }
  });
  const endDrag=(e)=>{
    cancelPress();
    if(dragging){
      dragging=false;
      card.classList.remove('card-dragging');
      card.style.transform='';
      card.style.zIndex='';
      try{ card.releasePointerCapture(pointerId); }catch(err){}
      saveStudentCardOrderFromDom_();
      setTimeout(()=>{ delete card.dataset.suppressClick; },0);
    }
  };
  card.addEventListener('pointerup',endDrag);
  card.addEventListener('pointercancel',endDrag);
  card.addEventListener('pointerleave',()=>{ if(!dragging)cancelPress(); });
}

function renderStudentCards(){
  const grid=document.getElementById('student-grid');
  grid.innerHTML='';
  const orderedStudents=getOrderedStudents_();
  const primaryName=getPrimaryStudentName_();
  const hasPrimary=!!primaryName && orderedStudents.some(s=>s.name===primaryName);
  const renderList=hasPrimary
    ? [...orderedStudents.filter(s=>s.name===primaryName), ...orderedStudents.filter(s=>s.name!==primaryName)]
    : orderedStudents;
  grid.classList.toggle('has-primary',hasPrimary);
  for(const s of renderList){
    const avatar=avatarMap[s.name]||s.avatar;
    const note=noteMap[s.name];
    const mood=moodMap[s.name];
    // 학습 콘텐츠(UNITS/historyTrainingData) 로드 전에는 진행률 계산을 시도하지 않음 — '불러오는 중'으로 표시
    const contentReady=(typeof window.__contentReady!=='undefined')?window.__contentReady:true;
    const prog=contentReady?getUnifiedProgressForUI(s.name):{percent:0,loading:true};
    const totalStudySeconds=getStudentCardTotalStudySeconds(s.name);
    const isLoggedIn=isAccessBadgeActive(s.name);
    const myAccess=accessLogCache.filter(a=>a.name===s.name).sort((a,b)=>(b.ts||0)-(a.ts||0));
    const lastAccessText=myAccess.length>0?myAccess[0].time:null;
    // 콘텐츠가 아직 준비되지 않은 경우에만 스켈레톤을 표시하고, 서버 지연/실패 때는
    // 이미 가진 로컬·메모리 캐시 값을 임시 오류 화면으로 교체하지 않는다.
    // 서버 응답 지연/실패 여부와 관계없이 현재 로컬·메모리 캐시 값을 계속 표시한다.
    // watchdog는 백그라운드 재시도 신호일 뿐, 카드 내용을 오류 UI로 교체하지 않는다.
    const cardDataLoading=prog.loading;
    const c=document.createElement('div');
    c.className='student-card'+(note?' has-note':'')+(hasPrimary?(s.name===primaryName?' primary-card':' compact-card'):'');
    c.dataset.name=s.name;
    c.innerHTML=`${isLoggedIn?'<div class="access-complete-badge">🟡 접속완료</div>':''}
      <div class="student-avatar">${renderAvatarHtml(avatar,34)}</div>
      <div class="student-row-info">
        <div class="student-name-row">
          <div class="student-name">${s.name}</div>
          <div class="student-actions">
            <button class="settings-btn" type="button" aria-label="${s.name} 설정" title="아바타와 기분 설정" onclick="openSettingsMenu(event,'${s.name}')">⋮</button>
          </div>
        </div>
        ${mood?`<div class="student-mood">${mood}</div>`:''}
        ${note?`<div class="student-note">📌 ${note}</div>`:''}
        <div class="student-progress-row${cardDataLoading?' student-card-skeleton':''}">
          ${cardDataLoading
            ? `<div class="student-progress-bar student-card-skeleton-bar"></div><span class="student-progress-pct">학습 기록 불러오는 중...</span>`
            : `<div class="student-progress-bar"><div class="student-progress-fill${prog.percent<=50?' warning':''}" style="width:${prog.percent}%"></div></div>
          <span class="student-progress-pct${prog.percent<=50?' warning':''}">${prog.percent}%</span>`}
        </div>
        ${(!cardDataLoading)?`<div class="student-study-total">⏱ 총 공부시간 ${formatStudySeconds(totalStudySeconds)}</div>`:''}
        ${(!cardDataLoading&&lastAccessText)?`<div class="student-last-access">🕐 마지막 접속: ${lastAccessText}</div>`:''}
        ${canViewStudentDetail_()?`<button type="button" class="pw-btn pw-cancel student-detail-btn" style="margin-top:6px;font-size:12px;padding:6px 10px" onclick="event.stopPropagation();openStudentDetailPanel('${s.name}')">📋 상세 기록 보기</button>`:''}
        <div class="student-drag-hint">⠿⠿⠿</div>
      </div>
      <div class="student-card-arrow">›</div>
      <div class="selected-checkmark"><svg viewBox="0 0 24 24" width="44" height="44"><path d="M4 12.5 L9.5 18 L20 6" fill="none" stroke="white" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    c.onclick=()=>{
      if(c.dataset.suppressClick==='1'){ delete c.dataset.suppressClick; return; }
      if(hasPrimary&&s.name!==primaryName){ previewStudentCard(s.name); return; } // 다른 학생 카드는 미리보기(크게)만, 로그인은 안 함
      requestSelectStudent(c,s.name,c);
    };
    bindCardReorderGesture_(c);
    if(s.name===playerName){ c.classList.add('selected'); }
    grid.appendChild(c);
  }
}

let moodMap={};
let pinMap={};
let pinMapReady=false;
let pinMapLoadPromise=null;
let privilegedAuthOverlayOpen=false;
let startupBackgroundLoadStarted=false;
let startupBackgroundLoadTimer=null;
let deadlineMap={};

function ensurePinMapReady_(force=false){
  if(pinMapReady&&!force)return Promise.resolve(pinMap);
  if(pinMapLoadPromise&&!force)return pinMapLoadPromise;
  pinMapLoadPromise=apiListPins().then(map=>{
    pinMap=(map&&typeof map==='object'&&!Array.isArray(map))?map:{};
    pinMapReady=true;
    return pinMap;
  }).catch(error=>{
    pinMapReady=false;
    throw error;
  }).finally(()=>{
    pinMapLoadPromise=null;
  });
  return pinMapLoadPromise;
}

function setPrivilegedAuthOverlayOpen_(open){
  privilegedAuthOverlayOpen=!!open;
  if(!privilegedAuthOverlayOpen)scheduleStartupBackgroundLoads_(250);
}

function waitForPrivilegedAuthClose_(){
  if(!privilegedAuthOverlayOpen)return Promise.resolve();
  return new Promise(resolve=>{
    const check=()=>{
      if(!privilegedAuthOverlayOpen)resolve();
      else setTimeout(check,150);
    };
    check();
  });
}

function todayDateStr(){
  const now=new Date();
  const y=now.getFullYear();
  const m=String(now.getMonth()+1).padStart(2,'0');
  const d=String(now.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

async function refreshHomeHeading(){
  deadlineMap=await apiListDeadlines();
  if(typeof UNITS==='undefined')return;
  const today=todayDateStr();
  const dueUnits=Object.keys(deadlineMap)
    .filter(key=>UNITS[key] && deadlineMap[key] && deadlineMap[key]<=today)
    .map(key=>UNITS[key].title);
  const heading=document.getElementById('learning-home-heading');
  if(!heading)return;
  if(dueUnits.length>0){
    heading.innerHTML=`📅 오늘까지 해야 할 단원<br><span style="color:var(--ember)">${dueUnits.join(', ')}</span>`;
  }else{
    heading.innerHTML='단원을 선택하고<br>퀴즈를 시작하세요!';
  }
}

let pendingSettingsName='';
let pendingSettingsTriggerEl=null;

function openSettingsMenu(evt,name){
  evt.stopPropagation();
  pendingSettingsName=name;
  pendingSettingsTriggerEl=evt.currentTarget;
  document.getElementById('settings-menu-overlay').classList.add('show');
  __a11yDialogOpened_('settings-menu-overlay',pendingSettingsTriggerEl,closeSettingsMenu);
}

function closeSettingsMenu(){
  document.getElementById('settings-menu-overlay').classList.remove('show');
  __a11yDialogClosed_('settings-menu-overlay');
}

function chooseSettingsAvatar(){
  const name=pendingSettingsName;
  closeSettingsMenu();
  requestSettingsPinThen_(name, ()=>openAvatarPicker(null,name));
}

function chooseSettingsMood(){
  const name=pendingSettingsName;
  closeSettingsMenu();
  requestSettingsPinThen_(name, ()=>openMoodPicker(null,name));
}

// ===== 접근성: 로그인/설정 모달 포커스 관리 (신규) =====
// 열림 스택에 쌓아두고, 맨 위 모달에 한해 Tab 트랩 + ESC 닫기를 전역 키다운 1개로 처리.
// 각 오버레이의 열기/닫기 함수 본문은 그대로 두고, 그 함수들 안에 이 두 함수 호출만 덧붙인다.
let __a11yDialogStack_=[];

function __getFocusableIn_(container){
  if(!container)return [];
  return Array.from(container.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )).filter(el=>el.offsetParent!==null);
}

function __a11yDialogOpened_(overlayId,triggerEl,closeFn){
  const overlay=document.getElementById(overlayId);
  if(!overlay)return;
  __a11yDialogStack_.push({overlayId,triggerEl:triggerEl||document.activeElement,closeFn});
  setTimeout(()=>{
    const focusables=__getFocusableIn_(overlay);
    if(focusables.length) focusables[0].focus();
  },0);
}

function __a11yDialogClosed_(overlayId){
  const idx=__a11yDialogStack_.map(d=>d.overlayId).lastIndexOf(overlayId);
  if(idx===-1)return;
  const entry=__a11yDialogStack_[idx];
  __a11yDialogStack_.splice(idx,1);
  if(entry.triggerEl && typeof entry.triggerEl.focus==='function'){
    setTimeout(()=>entry.triggerEl.focus(),0);
  }
}

document.addEventListener('keydown',function(e){
  if(!__a11yDialogStack_.length)return;
  const top=__a11yDialogStack_[__a11yDialogStack_.length-1];
  const overlay=document.getElementById(top.overlayId);
  if(!overlay||!overlay.classList.contains('show'))return;
  if(e.key==='Escape'){
    e.preventDefault();
    if(typeof top.closeFn==='function')top.closeFn();
    return;
  }
  if(e.key==='Tab'){
    const focusables=__getFocusableIn_(overlay);
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
});

// 로그인 전 아바타/기분 설정을 아무나 바꾸지 못하도록, 해당 학생의 기존 4자리 PIN을
// 확인한 뒤에만 onSuccess(피커 열기)를 실행한다. 학생 로그인(confirmPinAction 등)과는
// 별개의 독립 오버레이·상태를 사용 — 로그인 흐름은 건드리지 않는다.
let pendingSettingsPinName='';
let pendingSettingsPinSuccess=null;

function requestSettingsPinThen_(name,onSuccess){
  if(!pinMap[name]){
    showToast2('⚠️ 아직 비밀번호가 없어요. 먼저 로그인해서 비밀번호를 만들어주세요.');
    return;
  }
  pendingSettingsPinName=name;
  pendingSettingsPinSuccess=onSuccess;
  const input=document.getElementById('settings-pin-input');
  if(input)input.value='';
  const err=document.getElementById('settings-pin-error');
  if(err)err.textContent='';
  document.getElementById('settings-pin-overlay').classList.add('show');
  __a11yDialogOpened_('settings-pin-overlay',pendingSettingsTriggerEl,closeSettingsPinGate_);
}

function closeSettingsPinGate_(){
  document.getElementById('settings-pin-overlay').classList.remove('show');
  pendingSettingsPinName='';
  pendingSettingsPinSuccess=null;
  __a11yDialogClosed_('settings-pin-overlay');
}

async function confirmSettingsPinGate_(){
  const name=pendingSettingsPinName;
  const onSuccess=pendingSettingsPinSuccess;
  const input=document.getElementById('settings-pin-input');
  const errEl=document.getElementById('settings-pin-error');
  const pin=input?input.value.trim():'';
  if(!pin){ if(errEl)errEl.textContent='비밀번호를 입력해주세요.'; return; }
  if(!/^\d{4}$/.test(pin)){ if(errEl)errEl.textContent='숫자 4자리로 입력해주세요.'; return; }
  const res=await apiVerifyPin(name,pin);
  if(res && res.ok){
    closeSettingsPinGate_();
    if(typeof onSuccess==='function') onSuccess();
  }else{
    if(errEl) errEl.textContent='비밀번호가 틀렸어요.';
  }
}
window.closeSettingsPinGate_=closeSettingsPinGate_;
window.confirmSettingsPinGate_=confirmSettingsPinGate_;

const MOOD_OPTIONS=[
  '😄 신남','😊 좋음','😐 보통','😪 피곤','😢 슬픔','😠 화남',
  '🤒 아픔','😴 졸림','🤩 설렘','😎 자신감','🥱 심심','💪 힘참',
  '😳 부끄러움','🥳 축하해줘','😤 답답함','🍔 배고픔',
  '📚 시험기간','🏃 하교하고싶음','📱 폰하고싶다','🍚 급식맛있음',
  '💘 썸타는중','👯 놀고싶음','🙈 혼자있고싶음','💢 스트레스',
  '😆 꿀잼','😑 노잼','🫠 현타옴','🍀 럭키비키',
  '🥺 귀엽뽀짝','😭 폭망','🔥 텐션업','🧊 무기력'
];

function openMoodPicker(evt,name){
  if(evt) evt.stopPropagation();
  document.getElementById('mood-modal-title').textContent=name+'님, 오늘 기분은 어때요?';
  const current=moodMap[name];
  document.getElementById('mood-picker-grid').innerHTML=MOOD_OPTIONS.map(m=>
    `<button type="button" class="mood-opt${m===current?' chosen':''}" onclick="chooseMood('${name}','${m}')">${m}</button>`
  ).join('');
  document.getElementById('mood-overlay').classList.add('show');
  __a11yDialogOpened_('mood-overlay',evt?evt.currentTarget:pendingSettingsTriggerEl,closeMoodPicker);
}

function closeMoodPicker(){
  document.getElementById('mood-overlay').classList.remove('show');
  __a11yDialogClosed_('mood-overlay');
}

async function chooseMood(name,mood){
  moodMap[name]=mood;
  renderStudentCards();
  closeMoodPicker();
  const ok=await apiSetMood(name,mood);
  if(ok){
    showToast2('✅ 기분이 저장됐어요!');
  }else{
    showToast2('⚠️ 저장 실패! 백엔드가 최신 버전인지 확인해주세요.');
  }
}

let editingStudentName='';
let editingConfig=[0,0,0,0,0,0];

function openAvatarPicker(evt,name){
  if(evt) evt.stopPropagation();
  editingStudentName=name;
  const current=avatarMap[name];
  if(isCharConfig(current)){
    const parts=current.split('-');
    editingConfig=parts.slice(0,5).map(Number);
    editingConfig[5]=parseAccessoryIndices(parts[5]);
  }else{
    editingConfig=[0,0,0,0,0,[]];
  }
  document.getElementById('avatar-modal-title').textContent=name+'님, 캐릭터를 만들어보세요';
  renderAvatarPickerRows();
  updateAvatarPreview();
  document.getElementById('avatar-overlay').classList.add('show');
  __a11yDialogOpened_('avatar-overlay',evt?evt.currentTarget:pendingSettingsTriggerEl,closeAvatarPicker);
}

const ACC_LABELS={glasses:'안경',cap:'모자',earring:'귀걸이'};

function renderAvatarPickerRows(){
  document.getElementById('skin-row').innerHTML=SKIN_TONES.map((c,i)=>
    `<button type="button" class="avatar-swatch${editingConfig[0]===i?' chosen':''}" style="background:${c}" onclick="pickAvatarPart(0,${i})"></button>`
  ).join('');
  document.getElementById('hair-row').innerHTML=HAIR_STYLES.map((h,i)=>
    `<button type="button" class="avatar-swatch style-swatch${editingConfig[1]===i?' chosen':''}" onclick="pickAvatarPart(1,${i})">${h.name}</button>`
  ).join('');
  document.getElementById('eyes-row').innerHTML=EYE_STYLES.map((e,i)=>
    `<button type="button" class="avatar-swatch style-swatch${editingConfig[2]===i?' chosen':''}" onclick="pickAvatarPart(2,${i})">${buildAvatarSVG([0,5,i,2,2,''].join('-'),30)}</button>`
  ).join('');
  document.getElementById('nose-row').innerHTML=NOSE_STYLES.map((n,i)=>
    `<button type="button" class="avatar-swatch style-swatch${editingConfig[3]===i?' chosen':''}" onclick="pickAvatarPart(3,${i})">${buildAvatarSVG([0,5,2,i,2,''].join('-'),30)}</button>`
  ).join('');
  document.getElementById('mouth-row').innerHTML=MOUTH_STYLES.map((m,i)=>
    `<button type="button" class="avatar-swatch style-swatch${editingConfig[4]===i?' chosen':''}" onclick="pickAvatarPart(4,${i})">${buildAvatarSVG([0,5,2,2,i,''].join('-'),30)}</button>`
  ).join('');
  document.getElementById('accessory-row').innerHTML=ACCESSORIES.map((a,i)=>
    `<button type="button" class="avatar-swatch style-swatch${editingConfig[5].includes(i)?' chosen':''}" onclick="toggleAccessoryPart(${i})">${ACC_LABELS[a]}${editingConfig[5].includes(i)?' ✓':''}</button>`
  ).join('');
}

const AVATAR_ROW_IDS_=['skin-row','hair-row','eyes-row','nose-row','mouth-row','accessory-row'];
function __refocusAvatarSwatch_(catIdx,valIdx){
  const row=document.getElementById(AVATAR_ROW_IDS_[catIdx]);
  const btn=row&&row.children[valIdx];
  if(btn&&typeof btn.focus==='function')btn.focus();
}

function pickAvatarPart(catIdx,valIdx){
  editingConfig[catIdx]=valIdx;
  renderAvatarPickerRows();
  updateAvatarPreview();
  __refocusAvatarSwatch_(catIdx,valIdx);
}

function toggleAccessoryPart(idx){
  const arr=editingConfig[5];
  const pos=arr.indexOf(idx);
  if(pos===-1){ arr.push(idx); } else { arr.splice(pos,1); }
  renderAvatarPickerRows();
  updateAvatarPreview();
  __refocusAvatarSwatch_(5,idx);
}

function updateAvatarPreview(){
  document.getElementById('avatar-preview').innerHTML=buildAvatarSVG(editingConfig.join('-'),76);
}

function closeAvatarPicker(){
  document.getElementById('avatar-overlay').classList.remove('show');
  __a11yDialogClosed_('avatar-overlay');
}

async function saveCharAvatar(){
  const configStr=editingConfig.join('-');
  avatarMap[editingStudentName]=configStr;
  renderStudentCards();
  closeAvatarPicker();
  const ok=await apiSetAvatar(editingStudentName,configStr);
  if(ok){
    showToast2('✅ 캐릭터가 저장되었어요!');
  }else{
    showToast2('⚠️ 저장 실패! 백엔드가 최신 버전인지 확인해주세요.');
  }
}

let accessLoggedNames=new Set();
let accessLogCache=[];
let studentDataLoadedAt={};        // { 학생이름: 마지막 서버조회 완료 시각(ms) }
let studentDataLoadingPromises={}; // { 학생이름: 진행 중인 조회 Promise } — 동일 학생 중복요청 방지

// 학생 선택 화면 카드의 진행률/공부시간/마지막접속이 "서버 데이터 도착 전 임시값"으로
// 잠깐 보이는 문제를 막기 위한 상태. true가 되기 전엔 카드에 스켈레톤만 표시한다.
let studentCardServerDataReady=false;
let studentCardServerDataFailed=false;
let studentCardDataTimeoutTimer=null;

// 학생 홈의 백그라운드 응답들이 짧은 시간에 연달아 도착해도 진행률/미완료/요약을
// 응답마다 다시 그리지 않고, 다음 paint 한 번으로 합쳐 갱신한다.
let homeUiRefreshFrame_=null;
let homeUiRefreshNeedsUnits_=false;
function scheduleHomeUiRefresh_(options={}){
  if(!playerName)return;
  homeUiRefreshNeedsUnits_=homeUiRefreshNeedsUnits_||!!options.rebuildUnits;
  if(homeUiRefreshFrame_!==null)return;
  homeUiRefreshFrame_=requestAnimationFrame(()=>{
    homeUiRefreshFrame_=null;
    const rebuildUnits=homeUiRefreshNeedsUnits_;
    homeUiRefreshNeedsUnits_=false;
    if(!playerName)return;
    if(rebuildUnits) renderUnitGrid();
    else updateProgressColors();
    renderHomeSummaryCard();
  });
}

// 서버 조회가 끝난 뒤(또는 즉시 캐시 표시 시) 화면을 한 번만 갱신하는 공통 함수
// includeStudentList:false면 이름 목록 재렌더링은 생략 (이미 특정 학생 화면에 들어와 있을 때 등)
function refreshStudentProgressUI(name, options={}){
  const opts=Object.assign({includeStudentList:true}, options);
  if(opts.includeStudentList) renderStudentCards();
  if(!opts.includeStudentList && playerName===name && document.getElementById('learning-home-view')?.style.display==='block'){
    scheduleHomeUiRefresh_();
    return;
  }
  updateProgressColors();
  // updateSelectedNameBanner()는 renderHomeSummaryCard()의 별칭이라 한 번만 호출
  if(playerName===name){
    renderHomeSummaryCard(); // 홈 진행률 + "오늘 이어하기" 영역까지 여기서 함께 갱신됨
    renderIncompleteUnitsSection();
  }
}

// 학생별 서버 데이터를 필요할 때만 조회 (5초 이내 재조회 생략, 진행 중인 요청 재사용)
function loadStudentDataIfStale(name, forceRefresh=false){
  if(!name) return Promise.resolve();
  const now=Date.now();

  if(!forceRefresh && studentDataLoadedAt[name] && (now-studentDataLoadedAt[name]<5000)){
    return Promise.resolve(); // 최근에 이미 불러왔으면 생략
  }
  if(!forceRefresh && studentDataLoadingPromises[name]){
    return studentDataLoadingPromises[name]; // 이미 진행 중인 조회가 있으면 그걸 재사용
  }

  const requestedName=name; // 응답 도착 시점에 학생이 바뀌었는지 비교하기 위한 스냅샷

  const promise=Promise.allSettled([
    apiList().then(entries=>{ if(Array.isArray(entries)) allEntriesCache=entries; }),
    loadHistoryTrainingProgressForName_(requestedName), // 전체 학생이 아니라 이 학생 것만 가볍게 조회
    loadScore(),
    loadMapStudyProgress(requestedName),
    loadStudyPlannerData(requestedName),
    loadKingOrderProgress(requestedName)
  ]).then(()=>{
    studentDataLoadedAt[requestedName]=Date.now();
    // 응답이 늦게 와서 그 사이 다른 학생으로 바뀌었다면, 지금 화면은 덮어쓰지 않음
    if(playerName===requestedName){
      refreshStudentProgressUI(requestedName, {includeStudentList:false});
    }
  }).finally(()=>{
    delete studentDataLoadingPromises[requestedName];
  });

  studentDataLoadingPromises[name]=promise;
  return promise;
}
let testMode=false;
try{ testMode = localStorage.getItem('testMode')==='1'; }catch(e){}

// 개발용 테스트모드: 실제 학생·서버 기록과 완전히 분리된 가상 사용자
// 테스트모드 진입 비밀번호도 하드코딩 대신 verifyAdminPasswordOnly로 서버 검증 (토큰 발급 안 함)
const DEVELOPER_TEST_USER='TEST USER';
let developerTestMode=false;

function isDeveloperTestMode(){
  return developerTestMode===true;
}

function cleanupDeveloperTestStorage(){
  const exactKeys=[
    'mapStudy_'+DEVELOPER_TEST_USER,
    'historyTrainingProgress_'+DEVELOPER_TEST_USER,
    'studyPlanner_'+DEVELOPER_TEST_USER,
    'completedStudyActivity_'+DEVELOPER_TEST_USER,
    'studyTimeData_'+DEVELOPER_TEST_USER,
    'focusModeData_'+DEVELOPER_TEST_USER
  ];
  try{
    exactKeys.forEach(key=>localStorage.removeItem(key));
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i)||'';
      if(key.includes(DEVELOPER_TEST_USER)||key.includes('TEST_USER')){
        localStorage.removeItem(key);
      }
    }
  }catch(e){}
}

function resetDeveloperTestMemory(){
  cleanupDeveloperTestStorage();

  allEntriesCache=(allEntriesCache||[]).filter(e=>e&&e.name!==DEVELOPER_TEST_USER);
  historyTrainingProgress[DEVELOPER_TEST_USER]={};
  tlgScoreByStudent[DEVELOPER_TEST_USER]=tlgDefaultScore();
  mapStudyCache[DEVELOPER_TEST_USER]={};
  studyPlannerCache[DEVELOPER_TEST_USER]={};
  completedStudyActivityCache[DEVELOPER_TEST_USER]=[];
  studyTimeServerCache[DEVELOPER_TEST_USER]={};
  avatarMap[DEVELOPER_TEST_USER]='🛠️';
}

function updateDeveloperTestModeUI(){
  const banner=document.getElementById('developer-test-banner');
  if(banner)banner.classList.toggle('show',developerTestMode);
}

function openDeveloperTestLogin(){
  const overlay=document.getElementById('developer-test-login-overlay');
  const input=document.getElementById('developer-test-login-input');
  const error=document.getElementById('developer-test-login-error');
  if(error)error.textContent='';
  if(input)input.value='';
  if(overlay)overlay.classList.add('show');
  setTimeout(()=>input&&input.focus(),100);
}

function closeDeveloperTestLogin(){
  document.getElementById('developer-test-login-overlay')?.classList.remove('show');
}

async function confirmDeveloperTestLogin(){
  const input=document.getElementById('developer-test-login-input');
  const error=document.getElementById('developer-test-login-error');
  const password=input?input.value.trim():'';
  if(!password){
    if(error)error.textContent='비밀번호를 입력해주세요.';
    return;
  }
  const result=await apiVerifyAdminPasswordOnly(password);
  if(!result || !result.ok){
    if(error){
      error.textContent = (result && result.error==='ADMIN_PASSWORD_NOT_CONFIGURED')
        ? '관리자 비밀번호가 아직 설정되지 않았어요. 관리자에게 문의해주세요.'
        : '비밀번호가 틀렸어요.';
    }
    return;
  }
  // verify-only라 adminToken은 전혀 저장하지 않음 — 테스트모드는 관리자 권한을 얻지 않음
  // 관리자 로그인 상태에서 전환하는 경우 기존 토큰을 그대로 남겨두지 않고 여기서 확실히 폐기함
  const previousAdminToken=adminToken;
  adminDetailAccessActive=false;
  adminToken=null;
  if(typeof closeStudentDetailPanel==='function') closeStudentDetailPanel();
  if(previousAdminToken){
    apiAdminLogout(previousAdminToken).catch(err=>console.error('기존 관리자 토큰 폐기 실패(무시하고 화면 전환 진행):',err));
  }
  if(typeof renderStudentCards==='function') renderStudentCards(); // 상세 기록 버튼 제거 확실히
  closeDeveloperTestLogin();
  enterDeveloperTestMode();
}

function enterDeveloperTestMode(){

  if(testMode){
    showToast2('⚠️ 관리자 모드를 먼저 종료해주세요.');
    return;
  }

  if(typeof focusModeState!=='undefined'&&focusModeState.active&&typeof endFocusMode==='function')endFocusMode(false,true);
  developerTestMode=true;
  viewerModeActive=false;
  studyPlannerViewerMode=false;
  try{
    resetDeveloperTestMemory();
  }catch(error){
    console.error('TEST USER 초기화 실패:',error);
    developerTestMode=false;
    showToast2('⚠️ 테스트모드 초기화 중 오류가 발생했어요.');
    return;
  }

  playerName=DEVELOPER_TEST_USER;
  studyTimeState.testSessionDaily={};
  studyTimeState.testSessionIdleDaily={};
  studyTimeState.testSessionTotal=0;
  studyTimeState.currentStudent=DEVELOPER_TEST_USER;
  studyTimeState.lastTick=Date.now();
  studyTimeState.lastInteraction=Date.now();
  loginTimestamp=Date.now();
  quizActiveFlag=false;
  pendingSelectCard=null;
  pendingSelectName='';

  updateDeveloperTestModeUI();
  renderStudentCards();
  updateProgressColors();
  updateSelectedNameBanner();
  showLearningHomeView();
  if(typeof startFocusMode==='function'){
    try{startFocusMode({autoStart:true});}catch(error){console.warn('TEST USER 집중모드 시작 실패:',error);}
  }
  showToast2('🟡 TEST MODE 시작 · 실제 기록은 저장되지 않아요.');
}

function exitDeveloperTestMode(){
  if(!developerTestMode)return;
  if(focusModeState.active)endFocusMode(false,true);

  cleanupDeveloperTestStorage();
  allEntriesCache=(allEntriesCache||[]).filter(e=>e&&e.name!==DEVELOPER_TEST_USER);
  delete historyTrainingProgress[DEVELOPER_TEST_USER];
  delete tlgScoreByStudent[DEVELOPER_TEST_USER];
  delete mapStudyCache[DEVELOPER_TEST_USER];
  delete studyPlannerCache[DEVELOPER_TEST_USER];
  delete completedStudyActivityCache[DEVELOPER_TEST_USER];
  delete studyTimeServerCache[DEVELOPER_TEST_USER];
  delete avatarMap[DEVELOPER_TEST_USER];

  developerTestMode=false;
  playerName='';
  loginTimestamp=0;
  quizActiveFlag=false;
  updateDeveloperTestModeUI();
  updateSelectedNameBanner();
  renderStudentCards();
  showStudentSelectView();
  showToast2('✅ TEST MODE 종료 · 임시 기록을 모두 지웠어요.');
}

// 이전 테스트 중 남은 임시 브라우저 기록도 앱 시작 때 제거
cleanupDeveloperTestStorage();

onAppDomReady_(()=>{
  const button=document.getElementById('developer-test-btn');
  if(button){
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
    });
  }
  const input=document.getElementById('developer-test-login-input');
  if(input){
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter')confirmDeveloperTestLogin();
    });
  }
});



function updateTestModeUI(){
  const banner=document.getElementById('test-mode-banner');
  const btn=document.getElementById('test-mode-btn');
  const quickBtn=document.getElementById('admin-quick-btn');
  if(banner) banner.style.display = testMode ? 'block' : 'none';
  if(btn) btn.textContent = testMode ? '👩‍🏫 관리자 모드 끄기' : '👩‍🏫 관리자 모드 켜기';
  if(quickBtn){
    quickBtn.textContent = testMode ? '👩‍🏫 관리자 모드 ON' : '👩‍🏫 관리자 모드';
    quickBtn.classList.toggle('is-on', testMode);
  }
}

function toggleTeacherBtnRow(){
  const row=document.querySelector('#student-select-view .teacher-btn-row');
  if(row)row.classList.toggle('show');
}

function toggleTestMode(){
  if(testMode){
    requestExitTestMode();
  }else{
    openAdminLogin();
  }
}


let adminToken=null; // 0단계: 메모리 변수에만 보관, localStorage 저장 안 함 (새로고침 시 사라짐 → 재로그인 필요, 의도된 동작)

// 5단계 권한분리 수정: isAdminSessionActive()(=testMode)만으로 상세조회를 허용하면
// 선생님확인·개발자테스트모드도 testMode/유사상태를 공유해 버튼이 새는 문제가 있었음.
// 실제 adminLogin 성공으로 adminToken을 발급받은 경우에만 true가 되는 별도 상태를 둠.
let adminDetailAccessActive=false;
function canViewStudentDetail_(){
  return adminDetailAccessActive===true
    && typeof adminToken==='string'
    && adminToken.trim().length>0;
}

// 0단계: 서버에 POST로 비밀번호를 보내 검증하고 토큰을 받아옴 (비밀번호는 이 최초 로그인 요청에만 실림)
// 비밀번호가 맞는지만 확인 — 관리자 토큰을 발급하지 않음 (선생님확인/테스트모드종료 전용)
async function apiVerifyAdminPasswordOnly(password){
  if(!apiConfigured())return {ok:false,error:'api not configured'};
  try{
    const body=new URLSearchParams();
    body.set('action','verifyAdminPasswordOnly');
    body.set('password',password);
    const res=await fetch(API_URL,{method:'POST',body});
    return await res.json();
  }catch(e){console.error(e);return {ok:false,error:'network-error'};}
}

// 관리자 API 응답이 unauthorized면 토큰을 비우고 재로그인을 안내 (비밀번호는 자동으로 다시 안 보냄)
function handleAdminUnauthorized_(data){
  if(data && data.error==='unauthorized'){
    adminToken=null;
    adminDetailAccessActive=false; // 토큰 만료 시 상세조회 권한도 함께 초기화
    if(typeof closeStudentDetailPanel==='function') closeStudentDetailPanel(); // 열려있던 상세기록 즉시 닫고 DOM·상태 비움
    if(typeof renderStudentCards==='function') renderStudentCards(); // 상세 기록 버튼이 즉시 사라지도록 재렌더링
    if(typeof showToast2==='function') showToast2('⚠️ 관리자 인증이 만료됐어요. 다시 로그인해주세요.');
    return true;
  }
  return false;
}

// 5단계: 학생별 상세기록 조회(완전 읽기 전용) — logType별로 커서 기반 페이지 요청
async function apiGetStudentDetail(name, logType, cursor, limit){
  if(!canViewStudentDetail_())return {ok:false,error:'unauthorized'}; // 실제 관리자 토큰 세션이 아니면 요청 자체를 안 보냄
  if(!apiConfigured())return {ok:false,error:'api not configured'};
  try{
    const body=new URLSearchParams();
    body.set('action','getStudentDetail');
    body.set('token', adminToken||'');
    body.set('name', name);
    body.set('logType', logType);
    if(cursor!==null && cursor!==undefined) body.set('cursor', String(cursor));
    if(limit) body.set('limit', String(limit));
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return data;
  }catch(e){console.error('apiGetStudentDetail 오류:',e);return {ok:false,error:'network-error'};}
}

// ===== 6단계: 결과 정정 =====
async function apiCorrectResult(payload){
  if(!canViewStudentDetail_())return {ok:false,error:'unauthorized'};
  if(!apiConfigured())return {ok:false,error:'api not configured'};
  try{
    const body=new URLSearchParams();
    body.set('action','correctResult');
    body.set('token', adminToken||'');
    Object.keys(payload).forEach(k=>{ if(payload[k]!==undefined && payload[k]!==null) body.set(k, String(payload[k])); });
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return data;
  }catch(e){console.error('apiCorrectResult 오류:',e);return {ok:false,error:'network-error'};}
}

async function loadResultCorrectionSection_(name){
  const el=document.getElementById('student-detail-section-resultCorrection');
  if(!el)return;
  el.innerHTML='';
  const h=document.createElement('h4'); h.textContent='결과 정정'; el.appendChild(h);
  const loading=document.createElement('div'); loading.textContent='불러오는 중...'; el.appendChild(loading);

  const data=await apiGetStudentDetail(name,'resultCorrection',null,50);
  if(studentDetailState.name!==name)return;
  if(!data||!data.ok){
    if(data && data.error==='unauthorized'){ closeStudentDetailPanel(); return; }
    renderStudentDetailError_('resultCorrection','결과 정정');
    return;
  }
  studentDetailState.items['resultCorrection']=data.items||[];
  renderResultCorrectionSection_(name,data.items||[]);
}

function renderResultCorrectionSection_(name,items){
  const el=document.getElementById('student-detail-section-resultCorrection');
  if(!el)return;
  el.innerHTML='';
  const h=document.createElement('h4'); h.textContent='결과 정정'; el.appendChild(h);
  if(items.length===0){
    const empty=document.createElement('div'); empty.textContent='시도 기록이 없어요.'; el.appendChild(empty);
    return;
  }
  items.forEach((item,idx)=>{
    const row=document.createElement('div');
    row.style.padding='6px 0';
    row.style.borderBottom='1px solid rgba(0,0,0,0.06)';

    const info=document.createElement('div');
    info.textContent=`${item.unit} · ${item.level} · 제출 ${item.submittedAt}`;
    row.appendChild(info);

    const originalLine=document.createElement('div');
    originalLine.style.fontSize='12px'; originalLine.style.color='#64748b';
    originalLine.textContent=`원본: ${item.originalCorrect}/${item.originalTotal} · ${item.originalScore}점 · ${item.originalPass?'합격':'불합격'}`;
    row.appendChild(originalLine);

    const currentLine=document.createElement('div');
    currentLine.style.fontSize='13px'; currentLine.style.fontWeight='700';
    currentLine.textContent=`현재 유효: ${item.currentCorrect}/${item.currentTotal} · ${item.currentScore}점 · ${item.currentPass?'합격':'불합격'} (정정 ${item.correctionCount}회)`;
    row.appendChild(currentLine);

    if(item.correctionCount>0){
      const lastLine=document.createElement('div');
      lastLine.style.fontSize='12px'; lastLine.style.color='#64748b';
      lastLine.textContent=`최근 사유: ${item.lastCorrectionReason} (${item.lastCorrectedAt})`;
      row.appendChild(lastLine);
    }

    if(!item.correctable){
      const warn=document.createElement('div');
      warn.style.color='#b91c1c'; warn.style.fontSize='12px';
      warn.textContent='원본 시각 오류로 정정 불가';
      row.appendChild(warn);
    }else{
      const btn=document.createElement('button');
      btn.className='pw-btn pw-cancel';
      btn.style.marginTop='4px'; btn.style.fontSize='12px'; btn.style.padding='6px 10px';
      btn.textContent='결과 정정';
      btn.onclick=()=>openResultCorrectionModal(name,item);
      row.appendChild(btn);
    }
    el.appendChild(row);
  });
}

let correctionModalState=null; // {name, unit, level, resultId, targetResultKey, currentCorrect, currentTotal, correctionId}

function openResultCorrectionModal(name,item){
  if(!canViewStudentDetail_())return;
  correctionModalState={
    name, unit:item.unit, level:item.level,
    resultId:item.resultId||'', targetResultKey:item.targetResultKey||'',
    currentCorrect:item.currentCorrect, currentTotal:item.currentTotal,
    correctionId:generateLearningEventId_(name) // 팝업 열 때 1회만 생성, 재시도 시 재사용
  };
  const infoEl=document.getElementById('correction-modal-info');
  if(infoEl) infoEl.textContent=`${name} · ${item.unit} · ${item.level} · 현재 유효: ${item.currentCorrect}/${item.currentTotal} (${item.currentScore}점, ${item.currentPass?'합격':'불합격'})`;
  document.getElementById('correction-type-select').value='scoreCorrection';
  document.getElementById('correction-correct-input').value=item.currentCorrect;
  document.getElementById('correction-total-input').value=item.currentTotal;
  document.getElementById('correction-reason-input').value='';
  document.getElementById('correction-error').textContent='';
  onCorrectionTypeChange_();
  document.getElementById('result-correction-overlay').classList.add('show');
}

function closeResultCorrectionModal(){
  document.getElementById('result-correction-overlay').classList.remove('show');
  correctionModalState=null;
}

function onCorrectionTypeChange_(){
  const type=document.getElementById('correction-type-select').value;
  const scoreInputs=document.getElementById('correction-score-inputs');
  scoreInputs.style.display=(type==='scoreCorrection')?'block':'none';
  updateCorrectionPreview_();
}

function updateCorrectionPreview_(){
  if(!correctionModalState)return;
  const type=document.getElementById('correction-type-select').value;
  const previewEl=document.getElementById('correction-preview');
  let correct=correctionModalState.currentCorrect, total=correctionModalState.currentTotal;
  if(type==='scoreCorrection'){
    correct=Number(document.getElementById('correction-correct-input').value)||0;
    total=Number(document.getElementById('correction-total-input').value)||1;
  }
  let score, pass;
  if(correctionModalState.level==='정리문제'){
    score=Math.round((correct/total)*100); pass = type==='forcePass' ? true : score>=70;
  }else{
    score=correct*10;
    const passLine=Math.ceil(total*(correctionModalState.level==='심화'?0.8:0.9));
    pass = type==='forcePass' ? true : correct>=passLine;
  }
  previewEl.textContent=`미리보기: ${correct}/${total} · ${score}점 · ${pass?'합격':'불합격'}`;
}

async function submitResultCorrection_(){
  if(!correctionModalState)return;
  const reason=document.getElementById('correction-reason-input').value.trim();
  const errorEl=document.getElementById('correction-error');
  if(!reason){ errorEl.textContent='정정 사유를 입력해주세요.'; return; }
  if(reason.length>500){ errorEl.textContent='정정 사유는 500자 이하로 입력해주세요.'; return; }

  const type=document.getElementById('correction-type-select').value;
  const payload={
    name: correctionModalState.name,
    unit: correctionModalState.unit,
    level: correctionModalState.level,
    resultId: correctionModalState.resultId,
    targetResultKey: correctionModalState.targetResultKey,
    correctionId: correctionModalState.correctionId,
    correctionType: type,
    correctionReason: reason
  };
  if(type==='scoreCorrection'){
    payload.correctedCorrect=document.getElementById('correction-correct-input').value;
    payload.correctedTotal=document.getElementById('correction-total-input').value;
  }

  const saveBtn=document.getElementById('correction-save-btn');
  saveBtn.disabled=true; saveBtn.textContent='저장 중...';
  const result=await apiCorrectResult(payload);
  saveBtn.disabled=false; saveBtn.textContent='정정 저장';

  if(!result || !result.ok){
    // 실패해도 팝업을 닫지 않고 입력값·correctionId를 그대로 유지해 재시도 가능하게 함
    errorEl.textContent = (result && result.error) ? ('저장 실패: '+result.error) : '저장에 실패했어요. 다시 시도해주세요.';
    return;
  }

  closeResultCorrectionModal();
  showToast2('✅ 결과가 정정됐어요.');
  await refreshAfterResultCorrection_();
}

// 정정 완료 후: list API 재호출 → allEntriesCache 갱신 → 학생카드/상세화면 진행률 갱신 → 정정목록/이력 재조회
async function refreshAfterResultCorrection_(){
  if(typeof renderStudentGrid==='function') await renderStudentGrid({refreshData:true}); // apiList() 재호출 + allEntriesCache 갱신 + 학생카드 갱신까지 한번에
  const name=studentDetailState.name;
  if(!name)return;
  const prog=getUnifiedProgressForUI(name);
  const summaryEl=document.getElementById('student-detail-summary');
  if(summaryEl){
    const totalSeconds=(typeof getStudentCardTotalStudySeconds==='function')?getStudentCardTotalStudySeconds(name):0;
    summaryEl.textContent=`전체 진행률 ${prog.percent}% · 누적 공부시간 ${formatStudySeconds(totalSeconds)}`;
  }
  loadResultCorrectionSection_(name);
  loadStudentDetailTab_('correctionHistory','결과 정정 이력');
}


// ===== 5단계: 학생별 상세 기록 패널(완전 읽기 전용) =====
let studentDetailState={name:null, cursors:{}, items:{}};

function closeStudentDetailPanel(){
  document.getElementById('student-detail-overlay').classList.remove('show');
  if(typeof closeResultCorrectionModal==='function') closeResultCorrectionModal(); // 상세패널 닫힐 때 정정팝업도 함께 닫음
  // 다른 학생 선택 시 이전 데이터가 남지 않도록 완전히 초기화
  studentDetailState={name:null, cursors:{}, items:{}};
  ['loginLog','learningEvent','quizAttempt','focusSummary','resultCorrection','correctionHistory'].forEach(t=>{
    const el=document.getElementById('student-detail-section-'+t);
    if(el) el.innerHTML='';
  });
}

async function openStudentDetailPanel(name){
  if(!canViewStudentDetail_()){
    showToast2('⚠️ 관리자 로그인이 필요해요.');
    return;
  }
  closeStudentDetailPanel(); // 이전 학생 데이터 먼저 정리
  studentDetailState.name=name;
  document.getElementById('student-detail-overlay').classList.add('show');

  const titleEl=document.getElementById('student-detail-title');
  if(titleEl) titleEl.textContent='📋 '+name+' 상세 기록';

  // 진행률·공부시간은 새 서버요청 없이 관리자 화면이 이미 갖고 있는 값을 그대로 재사용
  const prog=getUnifiedProgressForUI(name);
  const totalSeconds=(typeof getStudentCardTotalStudySeconds==='function')?getStudentCardTotalStudySeconds(name):0;
  const summaryEl=document.getElementById('student-detail-summary');
  if(summaryEl){
    summaryEl.textContent=`전체 진행률 ${prog.percent}% · 누적 공부시간 ${formatStudySeconds(totalSeconds)}`;
  }

  loadStudentDetailTab_('loginLog','로그인 이력');
  loadStudentDetailTab_('learningEvent','학습 활동 이력');
  loadStudentDetailTab_('quizAttempt','퀴즈 시도 이력');
  loadStudentDetailTab_('focusSummary','집중모드 이탈 요약(최근 30일)');
  loadResultCorrectionSection_(name);
  loadStudentDetailTab_('correctionHistory','결과 정정 이력');
}

function renderStudentDetailError_(logType,label){
  const el=document.getElementById('student-detail-section-'+logType);
  if(!el)return;
  el.innerHTML='';
  const h=document.createElement('h4'); h.textContent=label; el.appendChild(h);
  const msg=document.createElement('div'); msg.style.color='#e87474'; msg.textContent='불러오기에 실패했어요.';
  el.appendChild(msg);
  const retryBtn=document.createElement('button');
  retryBtn.className='pw-btn pw-confirm';
  retryBtn.style.marginTop='6px';
  retryBtn.textContent='다시 시도';
  retryBtn.onclick=()=>loadStudentDetailTab_(logType,label);
  el.appendChild(retryBtn);
}

async function loadStudentDetailTab_(logType,label){
  const name=studentDetailState.name;
  if(!name)return;
  const el=document.getElementById('student-detail-section-'+logType);
  if(el){
    el.innerHTML='';
    const h=document.createElement('h4'); h.textContent=label; el.appendChild(h);
    const loading=document.createElement('div'); loading.textContent='불러오는 중...'; el.appendChild(loading);
  }
  const data=await apiGetStudentDetail(name, logType, null, 20);
  if(studentDetailState.name!==name)return; // 그 사이 패널이 닫히거나 다른 학생으로 바뀌었으면 반영 안 함
  if(!data || !data.ok){
    if(data && data.error==='unauthorized'){
      closeStudentDetailPanel(); // 토큰 만료 시 패널 닫고, handleAdminUnauthorized_가 이미 재로그인 안내 처리
      return;
    }
    renderStudentDetailError_(logType,label);
    return;
  }
  studentDetailState.cursors[logType]=data.nextCursor;
  studentDetailState.items[logType]=(logType==='focusSummary')?(data.daily||[]):(data.items||[]);
  renderStudentDetailSection_(logType,label,data,false);
}

async function loadMoreStudentDetailTab_(logType,label){
  const name=studentDetailState.name;
  if(!name)return;
  const cursor=studentDetailState.cursors[logType];
  if(cursor===null||cursor===undefined)return;
  const data=await apiGetStudentDetail(name, logType, cursor, 20);
  if(studentDetailState.name!==name)return;
  if(!data || !data.ok){
    if(data && data.error==='unauthorized'){ closeStudentDetailPanel(); return; }
    showToast2('⚠️ 추가 항목을 불러오지 못했어요.');
    return;
  }
  studentDetailState.cursors[logType]=data.nextCursor;
  studentDetailState.items[logType]=(studentDetailState.items[logType]||[]).concat(data.items||[]);
  renderStudentDetailSection_(logType,label,data,true);
}

function renderStudentDetailSection_(logType,label,data,append){
  const el=document.getElementById('student-detail-section-'+logType);
  if(!el)return;
  if(!append){
    el.innerHTML='';
    const h=document.createElement('h4'); h.textContent=label; el.appendChild(h);
  }else{
    const moreBtn=el.querySelector('.detail-more-btn');
    if(moreBtn) moreBtn.remove();
  }

  const list=document.createElement('div');
  if(logType==='focusSummary'){
    if(!data.daily || data.daily.length===0){
      const empty=document.createElement('div'); empty.textContent='최근 30일간 이탈 기록이 없어요.'; list.appendChild(empty);
    }else{
      data.daily.forEach(d=>{
        const row=document.createElement('div');
        row.textContent=`${d.date} · ${d.leaveCount}회`; // 텍스트만 사용, innerHTML 안 씀
        list.appendChild(row);
      });
    }
  }else{
    const items=data.items||[];
    if(items.length===0 && !append){
      const empty=document.createElement('div'); empty.textContent='기록이 없어요.'; list.appendChild(empty);
    }
    items.forEach(item=>{
      const row=document.createElement('div');
      row.style.padding='4px 0';
      row.style.borderBottom='1px solid rgba(0,0,0,0.06)';
      row.textContent=buildStudentDetailRowText_(logType,item); // textContent만 사용(innerHTML 금지)
      list.appendChild(row);
    });
  }
  el.appendChild(list);

  if(logType!=='focusSummary' && data.hasMore){
    const moreBtn=document.createElement('button');
    moreBtn.className='pw-btn pw-cancel detail-more-btn';
    moreBtn.style.marginTop='6px';
    moreBtn.textContent='더 보기';
    moreBtn.onclick=()=>loadMoreStudentDetailTab_(logType,label);
    el.appendChild(moreBtn);
  }
}

// 서버 시각(저장시각) 우선 표시, 실제 발생시각은 필요할 때만 괄호로 함께 표시
function buildStudentDetailRowText_(logType,item){
  if(logType==='loginLog'){
    return `로그인 ${item.loginAt} · 마지막활동 ${item.lastActiveAt}${item.logoutAt?(' · 로그아웃 '+item.logoutAt):''} · 세션 공부시간 ${formatStudySeconds(item.sessionStudySeconds||0)}`;
  }
  if(logType==='learningEvent'){
    const occurred=item.clientOccurredAtMs?(' (실제발생 '+new Date(item.clientOccurredAtMs).toLocaleString('ko-KR')+')'):'';
    return `[${item.contentType}] ${item.contentTitle||item.contentId} · ${item.action} · 저장시각 ${item.serverSavedAt}${occurred}`;
  }
  if(logType==='quizAttempt'){
    return `${item.unit} · ${item.level}(${item.quizType}) · ${item.attemptNumber}번째 시도 · ${item.correctCount}/${item.totalQuestionCount} · ${item.score}점 · ${item.pass?'합격':'불합격'} · 저장시각 ${item.savedAt}`;
  }
  if(logType==='correctionHistory'){
    const typeLabel={scoreCorrection:'점수정정',passCorrection:'PASS재판정',forcePass:'강제PASS'}[item.correctionType]||item.correctionType;
    return `${item.unit} · ${item.level} · [${typeLabel}] → ${item.correctedCorrect}/${item.correctedTotal} · ${item.correctedScore}점 · ${item.correctedPass?'합격':'불합격'} · 사유: ${item.correctionReason} · ${item.correctedAt}`;
  }
  return '';
}

async function apiAdminLogin(password){
  if(!apiConfigured())return {ok:false,error:'api not configured'};
  try{
    const body=new URLSearchParams();
    body.set('action','adminLogin');
    body.set('password',password);
    const res=await fetch(API_URL,{method:'POST',body});
    return await res.json();
  }catch(e){console.error(e);return {ok:false,error:'network-error'};}
}

async function apiAdminLogout(token){
  if(!apiConfigured()||!token)return false;
  try{
    const body=new URLSearchParams();
    body.set('action','adminLogout');
    body.set('token',token);
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    return !!data.ok;
  }catch(e){console.error(e);return false;}
}

function openAdminLogin(){
  __activatePrivilegedAuthGate_('admin'); // 1)gate active 2)epoch증가 3)startup generation 무효화 — 전부 동기적으로 즉시
  __cancelPendingBackgroundLoads(); // 관리자 인증창 열림 — 대기 중인 백그라운드 조회 취소
  const overlay=document.getElementById('admin-login-overlay');
  const input=document.getElementById('admin-login-input');
  const error=document.getElementById('admin-login-error');

  if(error) error.textContent='';
  if(input) input.value='';
  setPrivilegedAuthOverlayOpen_(true);
  if(overlay) overlay.classList.add('show');

  setTimeout(()=>{
    if(input) input.focus();
  },100);
}

function closeAdminLogin(){
  const overlay=document.getElementById('admin-login-overlay');
  if(overlay) overlay.classList.remove('show');
  setPrivilegedAuthOverlayOpen_(false);
  if(!adminToken){ // 로그인 성공 없이(취소) 닫힌 경우에만 gate 해제 — 성공 시엔 confirmAdminLogin에서 별도 처리
    __releasePrivilegedAuthGate_(window.__privilegedAuthGateState.epoch);
    if(typeof __resumeBackgroundLoadsAtStartScreen_==='function') __resumeBackgroundLoadsAtStartScreen_();
  }
}

async function confirmAdminLogin(){
  window.__perfMark&&window.__perfMark('관리자 비밀번호확인 클릭');
  const input=document.getElementById('admin-login-input');
  const error=document.getElementById('admin-login-error');
  const password=input ? input.value.trim() : '';

  if(!password){
    if(error) error.textContent='비밀번호를 입력해주세요.';
    return;
  }

  const confirmButton=document.querySelector('#admin-login-overlay .pw-confirm');
  const originalButtonText=confirmButton?confirmButton.textContent:'';
  if(confirmButton){
    confirmButton.disabled=true;
    confirmButton.textContent='확인 중...';
  }
  try{
    const result=await apiAdminLogin(password);
    if(!result || !result.ok){
      if(error){
        error.textContent = (result && result.error==='ADMIN_PASSWORD_NOT_CONFIGURED')
          ? '관리자 비밀번호가 아직 설정되지 않았어요. 관리자에게 문의해주세요.'
          : '비밀번호가 틀렸어요.';
      }
      return;
    }

    adminToken=result.token;
    adminDetailAccessActive=true; // 실제 adminLogin 성공으로 토큰 발급받은 경우에만 상세조회 권한 부여
    testMode=true;
    window.__perfMark&&window.__perfMark('관리자모드 적용');
    if(focusModeState.active) endFocusMode(false,true);
    try{ localStorage.setItem('testMode','1'); }catch(e){}
    updateTestModeUI();
    renderStudentCards(); // 상세 기록 버튼이 즉시 나타나도록 재렌더링
    closeAdminLogin();
    // 관리자 화면에서는 기존 startup 대기 작업이 재개되면 안 되므로, gate는 해제하되 세대는 새로 증가시켜
    // 이전 startup 목록이 이어지지 않게 함(첫화면 복귀 시에만 __resumeBackgroundLoadsAtStartScreen_로 재개됨)
    __releasePrivilegedAuthGate_(window.__privilegedAuthGateState.epoch);
    __backgroundLoadGeneration++; // 관리자 화면 위에서 이전 startup 작업이 재개되지 않도록
    window.__perfMark&&window.__perfMark('관리자 로그인창 닫힘');
    showToast2('👩‍🏫 관리자 모드 ON — 기록이 저장되지 않아요');
  }finally{
    if(confirmButton){
      confirmButton.disabled=false;
      confirmButton.textContent=originalButtonText;
    }
  }
}


function requestExitTestMode(){
  document.getElementById('admin-exit-input').value='';
  document.getElementById('admin-exit-error').textContent='';
  document.getElementById('admin-exit-overlay').classList.add('show');
}

function closeExitTestMode(){
  document.getElementById('admin-exit-overlay').classList.remove('show');
}

async function checkExitTestModePassword(){
  const val=document.getElementById('admin-exit-input').value.trim();
  if(!val){
    document.getElementById('admin-exit-error').textContent='비밀번호를 입력해주세요.';
    return;
  }
  const result=await apiVerifyAdminPasswordOnly(val);
  if(result && result.ok){
    if(adminToken){
      apiAdminLogout(adminToken); // 관리자 모드로 진입해 실제 토큰이 있었다면 그 토큰만 폐기 (fire-and-forget)
    }
    adminToken=null; // 새 토큰을 발급받지 않으므로, 종료 후 관리자 변경 권한이 전혀 남지 않음
    adminDetailAccessActive=false; // 관리자 로그아웃 시 상세조회 권한도 반드시 초기화
    if(typeof closeStudentDetailPanel==='function') closeStudentDetailPanel();
    testMode=false;
    try{ localStorage.setItem('testMode','0'); }catch(e){}
    updateTestModeUI();
    renderStudentCards(); // 상세 기록 버튼이 즉시 사라지도록 재렌더링
    closeExitTestMode();
    showToast2('✅ 관리자 모드 OFF — 정상적으로 기록됩니다');
  }else{
    document.getElementById('admin-exit-error').textContent='비밀번호가 틀렸어요.';
  }
}

async function resetAccessLogUI(btn){
  if(btn.dataset.confirming!=='1'){
    btn.dataset.confirming='1';
    btn.textContent='정말 삭제할까요? 다시 눌러 확인';
    setTimeout(()=>{btn.dataset.confirming='0';btn.textContent='🕐 접속기록 초기화';},4000);
    return;
  }
  btn.dataset.confirming='0';
  btn.textContent='🕐 접속기록 초기화';
  const ok=await apiResetAccessLog();
  if(ok){
    showToast2('✅ 접속기록이 초기화됐어요.');
  }else{
    showToast2('⚠️ 초기화 실패 (백엔드 연결을 확인하세요)');
  }
  showTeacherNoAuth();
}

let pendingSelectCard=null;
let pendingSelectName='';

let pinMode=''; // 'create' or 'verify'


function updateFontPickerVisibility(){
  const startScreen=document.getElementById('start-screen');
  const learningHome=document.getElementById('learning-home-view');

  const startVisible=!!startScreen && startScreen.style.display!=='none';
  const learningHomeVisible=!!learningHome && learningHome.style.display!=='none';

  const showOnHome=
    startVisible &&
    learningHomeVisible &&
    !viewerModeActive &&
    !parentChildViewActive &&
    !studyPlannerViewerMode &&
    !isAdminSessionActive();

  document.body.classList.toggle('font-picker-home-only',showOnHome);
}


function closeFontPickerOutsideHome(){
  updateFontPickerVisibility();
  if(!document.body.classList.contains('font-picker-home-only')){
    document.getElementById('font-picker-overlay')?.classList.remove('show');
  }
}

function showStudentSelectView(){
  const selectView=document.getElementById('student-select-view');
  const learningView=document.getElementById('learning-home-view');
  if(selectView) selectView.style.display='block';
  if(learningView) learningView.style.display='none';
  updateFontPickerVisibility();
  window.scrollTo({top:0,behavior:'smooth'});
  if(typeof __resumeBackgroundLoadsAtStartScreen_==='function') __resumeBackgroundLoadsAtStartScreen_();
}

function showLearningHomeView(){
  window.__perfMark&&window.__perfMark('학생 학습홈 표시');
  const selectView=document.getElementById('student-select-view');
  const learningView=document.getElementById('learning-home-view');
  if(selectView) selectView.style.display='none';
  if(learningView) learningView.style.display='block';
  // 공개설정/역사훈련소 최신화는 학생별 핵심 데이터 로딩 뒤 초기 공통 조회에서 처리한다.
  // 홈 DOM 표시 직후에는 캐시 기반 화면을 유지해 비필수 요청이 paint를 방해하지 않게 한다.
  refreshHomeHeading();
  updateFontPickerVisibility();
  window.scrollTo({top:0,behavior:'smooth'});
}

function changeStudentFromLearningHome(){
  if(isDeveloperTestMode()){
    exitDeveloperTestMode();
    return;
  }
  if(quizActiveFlag){
    showToast2('진행 중인 학습을 먼저 마쳐주세요.');
    return;
  }
  if(focusModeState.active) endFocusMode(false,true);
  if(playerName) flushPendingLearningEvents_(playerName).catch(err=>console.error('학습이벤트 전송 실패(무시):',err)); // 로그아웃 직전 — 마지막 전송 시도
  apiLogLogout(); // 명시적 로그아웃 — 실패해도 학생 전환을 막지 않음(fire-and-forget)
  sessionStorage.removeItem(LOGIN_SESSION_STORAGE_KEY);
  playerName='';
  loginTimestamp=0;
  pendingSelectCard=null;
  pendingSelectName='';
  levelSectionVisible=false;
  const lw=document.getElementById('level-section-wrapper');
  if(lw) lw.style.display='none';
  updateSelectedNameBanner();
  renderStudentCards();
  showStudentSelectView();
}

async function requestSelectStudent(card,name,triggerEl){
  window.__perfMark&&window.__perfMark('학생카드클릭:'+name);
  if(playerName===name) return; // 이미 선택된 이름을 또 눌러도 아무 일도 안 생기게
  if(testMode){
    selectStudent(card,name); // 관리자 모드에서는 비밀번호 확인 없이 바로 선택
    return;
  }
  pendingSelectCard=card;
  pendingSelectName=name;
  applyStudentAccent(name);
  if(!pinMapReady){
    window.__perfMark&&window.__perfMark('ensurePinMapReady_ 진입','재사용='+(!!pinMapLoadPromise));
    showToast2('🔐 비밀번호 정보를 확인하고 있어요...');
    try{
      await ensurePinMapReady_();
      window.__perfMark&&window.__perfMark('PIN정보 준비완료');
    }catch(error){
      if(pendingSelectName===name){
        pendingSelectCard=null;
        pendingSelectName='';
      }
      showToast2('⚠️ 비밀번호 정보를 불러오지 못했어요. 잠시 후 다시 눌러주세요.');
      return;
    }
    // PIN 조회를 기다리는 동안 다른 학생을 눌렀거나 이미 로그인했다면 오래된 클릭은 무시합니다.
    if(pendingSelectName!==name||playerName)return;
    const refreshedCard=Array.from(document.querySelectorAll('.student-card')).find(el=>el.dataset.name===name);
    if(refreshedCard){
      card=refreshedCard;
      pendingSelectCard=refreshedCard;
    }
  }
  const sInfo=STUDENTS.find(s=>s.name===name);
  const avatar=avatarMap[name]||(sInfo?sInfo.avatar:'⭐');
  document.getElementById('name-confirm-avatar').innerHTML=renderAvatarHtml(avatar,64);
  document.getElementById('pin-error').textContent='';
  __activatePrivilegedAuthGate_('pin');

  if(pinMap[name]){
    pinMode='verify';
    window.__perfMark&&window.__perfMark('기존PIN입력창표시');
    document.getElementById('name-confirm-text').textContent=name+' 맞나요?';
    document.getElementById('name-confirm-desc').innerHTML='본인의 4자리 비밀번호를 입력해주세요.';
    document.getElementById('pin-input-area').innerHTML=`<input type="password" inputmode="numeric" maxlength="4" id="pin-verify-input" class="pw-input" placeholder="비밀번호 4자리"/>`;
    document.getElementById('pin-confirm-btn').textContent='확인';
  }else{
    pinMode='create';
    window.__perfMark&&window.__perfMark('신규PIN생성창표시');
    document.getElementById('name-confirm-text').textContent=name+' 맞나요?';
    document.getElementById('name-confirm-desc').innerHTML='처음이시네요! 나만 아는 <b style="color:var(--ash)">4자리 비밀번호</b>를 만들어주세요.<br>다음부터 이름 누르면 이 비밀번호로 확인해요.';
    document.getElementById('pin-input-area').innerHTML=`
      <input type="password" inputmode="numeric" maxlength="4" id="pin-create-input1" class="pw-input" placeholder="새 비밀번호 4자리" style="margin-bottom:8px"/>
      <input type="password" inputmode="numeric" maxlength="4" id="pin-create-input2" class="pw-input" placeholder="비밀번호 다시 입력"/>`;
    document.getElementById('pin-confirm-btn').textContent='만들기';
  }
  document.getElementById('name-confirm-overlay').classList.add('show');
  document.getElementById('name-confirm-overlay').style.display='flex';
  __a11yDialogOpened_('name-confirm-overlay',triggerEl||card,closeNameConfirm);
}

function closePinOverlay(){
  __releasePrivilegedAuthGate_(window.__privilegedAuthGateState.epoch);
  const el=document.getElementById('name-confirm-overlay');
  el.classList.remove('show');
  el.style.display='none';
  __a11yDialogClosed_('name-confirm-overlay');
}

function closeNameConfirm(){
  closePinOverlay();
  pendingSelectCard=null;
  pendingSelectName='';
}

// 심야 시간대(자정~새벽 6시) 로그인 경고 — 앱 사용을 막지는 않고 안내만 보여줌
function isLateNightHour_(){
  const h=new Date().getHours();
  return h>=0 && h<6;
}
function showLateNightWarningIfNeeded_(){
  if(!isLateNightHour_())return;
  document.getElementById('late-night-overlay')?.classList.add('show');
}
function closeLateNightWarning(){
  document.getElementById('late-night-overlay')?.classList.remove('show');
}
window.closeLateNightWarning=closeLateNightWarning;

async function confirmPinAction(){
  const errEl=document.getElementById('pin-error');
  errEl.textContent='';

  if(pinMode==='create'){
    const p1=document.getElementById('pin-create-input1').value.trim();
    const p2=document.getElementById('pin-create-input2').value.trim();
    if(!/^\d{4}$/.test(p1)){ errEl.textContent='숫자 4자리로 입력해주세요.'; return; }
    if(p1!==p2){ errEl.textContent='두 비밀번호가 서로 달라요. 다시 확인해주세요.'; return; }
    const res=await apiSetPin(pendingSelectName,p1);
    if(res.ok){
      pinMap[pendingSelectName]=true;
      closePinOverlay();
      // 로그인 기록은 실패/지연되어도 학생 화면 진입을 막지 않도록 await 없이 백그라운드 처리
      handleStudentLoginLogging_(pendingSelectName).catch(err=>console.error('로그인 기록 실패(무시):',err));
      selectStudent(pendingSelectCard, pendingSelectName);
      showLateNightWarningIfNeeded_();
      showToast2('✅ 비밀번호가 만들어졌어요!');
    }else{
      errEl.textContent='저장 실패! 백엔드가 최신 버전인지 확인해주세요.';
    }
  }else{
    const p=document.getElementById('pin-verify-input').value.trim();
    if(!/^\d{4}$/.test(p)){ errEl.textContent='숫자 4자리로 입력해주세요.'; return; }
    const res=await apiVerifyPin(pendingSelectName,p);
    if(res.ok){
      closePinOverlay();
      // 로그인 기록은 실패/지연되어도 학생 화면 진입을 막지 않도록 await 없이 백그라운드 처리
      handleStudentLoginLogging_(pendingSelectName).catch(err=>console.error('로그인 기록 실패(무시):',err));
      selectStudent(pendingSelectCard, pendingSelectName);
      showLateNightWarningIfNeeded_();
    }else{
      errEl.textContent='비밀번호가 틀렸어요. 본인이 맞는지 확인해주세요!';
    }
  }
}

const ACCESS_BADGE_LIMIT_MS = 20*60*1000; // 20분
let loginTimestamp=0;
let quizActiveFlag=false;

function isAccessBadgeActive(name){
  if(name!==playerName || !loginTimestamp) return false;
  if(quizActiveFlag) return true; // 퀴즈 진행중이면 시간 상관없이 계속 유지
  return (Date.now()-loginTimestamp) < ACCESS_BADGE_LIMIT_MS;
}

async function selectStudent(card,name){
  if(playerName===name) return; // 이미 선택된 이름을 또 눌러도 아무 일도 안 생기게
  __releasePrivilegedAuthGate_(window.__privilegedAuthGateState.epoch); // PIN 성공 확정 — gate 해제
  __cancelPendingBackgroundLoads(); // 아직 시작 안 한 초기 백그라운드 조회는 더 이상 진행 안 함(학생 홈은 loadStudentDataIfStale가 필요한 것만 새로 조회)

  // 학습 콘텐츠(UNITS/historyTrainingData)가 아직 준비 안 됐으면, 안전 준비화면을 보여주고
  // 준비 완료 후 이 함수를 그대로 다시 호출(재진입) — 학생 기록은 아직 아무것도 안 건드림
  if(!window.__contentReady){
    showContentPreparingScreen_();
    loadLearningContent().then(()=>{
      hideContentPreparingScreen_();
      selectStudent(card,name); // 콘텐츠 준비 완료 후 자동으로 원래 로그인 흐름 재시도
    }).catch((err)=>{
      console.error('학습자료 로드 실패:',err);
      showContentPreparingScreen_(true); // 재시도 버튼 노출
    });
    return;
  }

  const previousStudent=playerName;
  if(focusModeState.active) endFocusMode(false,true); // 학생 변경 — 이전 학생의 집중모드 종료
  playerName=name;
  applyStudentAccent(name);
  rememberLastLoginStudent_(name);
  studyTimeState.currentStudent=name;
  studyTimeState.lastTick=Date.now();
  studyTimeState.lastInteraction=Date.now();
  loginTimestamp=Date.now();
  quizActiveFlag=false;

  // 이전 학생의 학습시간을 백그라운드로 저장 (await 안 함 — 화면 전환 속도에 영향 없음)
  if(previousStudent) syncStudyTimeToServer(previousStudent,false);

  // 1) 캐시/localStorage로 즉시 홈을 표시 (학생 선택 화면의 4명 카드 재렌더링은 홈에 불필요)
  // 학생 선택 화면으로 돌아갈 때는 changeStudentFromLearningHome()에서 카드를 갱신한다.
  updateProgressColors();
  updateSelectedNameBanner();
  showLearningHomeView();
  startFocusMode({autoStart:true}); // 로그인 시 집중모드 자동 시작 (전체화면 없이 wakeLock+상단바만)
  updateStudyTimeDisplays();

  // 2) 실제 학생만 서버 데이터를 백그라운드에서 조회
  if(!isDeveloperTestMode()){
    const studentDataPromise=loadStudentDataIfStale(name);
    // 학생별 핵심 데이터가 시작된 뒤에만 초기 공통 조회(공개설정/메모 등)를 재개한다.
    studentDataPromise.finally(()=>scheduleStartupBackgroundLoads_(0));
  }

  if(testMode || isDeveloperTestMode()) return; // 관리자/TEST USER는 접속기록 남기지 않음
  if(!accessLoggedNames.has(name)){
    accessLoggedNames.add(name);
    apiLogAccess(name);
  }
}

function updateSelectedNameBanner(){
  renderHomeSummaryCard();
}

const HT_BIBLE_VERSES=[
  {text:'선을 행하되 낙심하지 말지니 포기하지 아니하면 때가 이르매 거두리라', ref:'갈라디아서 6:9'},
  {text:'너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라', ref:'잠언 3:5'},
  {text:'내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라', ref:'빌립보서 4:13'},
  {text:'오직 여호와를 앙망하는 자는 새 힘을 얻으리니 독수리가 날개치며 올라감 같을 것이요', ref:'이사야 40:31'},
  {text:'너의 행사를 여호와께 맡기라 그리하면 네가 경영하는 것이 이루어지리라', ref:'잠언 16:3'},
  {text:'강하고 담대하라 두려워하지 말며 놀라지 말라 네 하나님 여호와가 너와 함께 하느니라', ref:'여호수아 1:9'},
  {text:'너희는 먼저 그의 나라와 그의 의를 구하라 그리하면 이 모든 것을 너희에게 더하시리라', ref:'마태복음 6:33'},
  {text:'너의 길을 여호와께 맡기라 그를 의지하면 그가 이루시고', ref:'시편 37:5'},
  {text:'항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라', ref:'데살로니가전서 5:16-18'},
  {text:'구하라 그리하면 너희에게 주실 것이요 찾으라 그리하면 찾아낼 것이요', ref:'마태복음 7:7'}
];

function renderHomeSummaryCard(){
  const banner=document.getElementById('selected-name-banner');
  if(!banner)return;
  if(!playerName){
    banner.style.display='none';
    return;
  }
  const sInfo=STUDENTS.find(s=>s.name===playerName);
  const avatar=avatarMap[playerName]||(sInfo?sInfo.avatar:'⭐');

  const overall=getUnifiedProgressForUI(playerName);
  banner.classList.toggle('summary-complete', !!overall.completed);

  // 미완료 단원 화면과 동일한 정규화 로직 재사용 — item/group 혼재 구조를 공통 형태로 통일
  // USE_UNIFIED_PROGRESS면 overall(이미 계산됨)에 담긴 incompleteItems를 그대로 재사용 — calculateOverallProgressV2 중복호출 방지
  let normalizedIncompleteItems;
  if(USE_UNIFIED_PROGRESS && Array.isArray(overall.incompleteItems)){
    try{
      normalizedIncompleteItems=overall.incompleteItems.map(it=>({
        isGroup: it.moduleKey==='historyTraining',
        title: it.title, resumeTarget: it.resumeTarget
      }));
    }catch(error){
      console.warn('홈 이어하기 V2 결과 정규화 실패, 기존 방식으로 폴백', playerName, error);
      normalizedIncompleteItems=null;
    }
  }
  if(!normalizedIncompleteItems){
    normalizedIncompleteItems=buildIncompleteLearningItems(playerName).map(item=>{
      if(item.type==='group') return {isGroup:true, title:item.title, resumeTarget:item.resumeTarget};
      return {isGroup:false, title:item.label, resumeTarget:item.progress.resumeTarget};
    });
  }
  const incompleteCount=normalizedIncompleteItems.length;
  const nextItem=normalizedIncompleteItems[0];

  const myAccess=accessLogCache.filter(a=>a.name===playerName).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const lastAccessText=myAccess.length>0?myAccess[0].time:null;

  const myAttempts=allEntriesCache.filter(e=>e.name===playerName).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const recentAttempts=myAttempts.slice(0,3);

  const bibleVerse=HT_BIBLE_VERSES[Math.floor(Math.random()*HT_BIBLE_VERSES.length)];

  let resumeHtml;
  if(nextItem){
    const rt=nextItem.resumeTarget||{};
    resumeHtml=`<div class="home-resume-row" data-action="resume-learning" data-type="${rt.type||''}" data-unit-id="${rt.unitKey||''}" data-part-id="${rt.partId||''}" data-era-id="${rt.eraId||''}" data-summary-id="${rt.summaryId||''}" data-step="${rt.step||''}" onclick="handleResumeLearningElement(this,event)">
      <span class="home-resume-label">🔥 오늘 이어하기: ${nextItem.title}</span><span class="home-resume-arrow">›</span>
    </div>`;
  }else{
    resumeHtml=`<div class="home-resume-row"><span class="home-resume-label">🎉 모든 학습을 완료했어요!</span></div>`;
  }

  const recentHtml=recentAttempts.length>0?`<div class="home-recent-list">
      ${recentAttempts.map(a=>`<div class="home-recent-item"><span>${a.pass?'✅':'🟡'} ${a.unit||''} · ${a.level||''}</span><span class="home-recent-time">${a.time||''}</span></div>`).join('')}
    </div>`:'';

  banner.innerHTML=`
    <div class="home-summary-top">
      <span class="sel-name-avatar">${renderAvatarHtml(avatar,26)}</span>
      <div class="home-summary-name-wrap">
        <div class="learning-name-message-row">
          <span class="sel-name-text">${playerName}</span>
          <button class="learning-name-mail-btn" type="button" aria-label="선생님과 쪽지" title="선생님과 쪽지" onclick="openMessageCenter();event.stopPropagation();">
            ✉️
            <span class="learning-name-mail-badge" style="display:none">0</span>
          </button>
        </div>
        ${lastAccessText?`<span class="home-last-access">🕐 마지막 접속: ${lastAccessText}</span>`:''}
      </div>
    </div>
    <div class="home-progress-row">
      <div class="home-progress-bar"><div class="home-progress-fill" style="width:${overall.percent}%"></div></div>
      <span class="home-progress-pct">${overall.percent}%</span>
    </div>
    ${overall.completed?'':`<div class="home-incomplete-count">⏳ 미완료 학습 ${incompleteCount}개</div>`}
    <div class="home-studytime-block">
      <div id="home-study-today" class="home-studytime-row"><span class="home-studytime-label">⏱ 오늘 공부시간</span> <span class="home-studytime-value">불러오는 중...</span></div>
      <div id="home-study-week" class="home-studytime-row"><span class="home-studytime-label">📚 이번주 공부시간</span> <span class="home-studytime-value">불러오는 중...</span></div>
      <div id="home-study-focus" class="home-studytime-row"><span class="home-studytime-label">🔥 집중도</span> <span class="home-studytime-value">-</span></div>
    </div>
    ${resumeHtml}
    ${recentHtml}
    <div class="home-bible-verse">📖 “${bibleVerse.text}” <span class="home-bible-ref">- ${bibleVerse.ref}</span></div>
  `;
  banner.style.display='flex';
  updateStudyTimeDisplays();
  if(!banner.dataset.htBound){
    banner.dataset.htBound='1';
    banner.addEventListener('click', handleIncompleteResumeClick);
  }
  if(typeof updateMessageBadge==='function') updateMessageBadge();
}

function showTeacher(){
  __activatePrivilegedAuthGate_('teacher');
  __cancelPendingBackgroundLoads(); // 선생님확인창 열림 — 대기 중인 백그라운드 조회 취소
  document.getElementById('pw-error').textContent='';
  document.getElementById('pw-input').value='';
  setPrivilegedAuthOverlayOpen_(true);
  document.getElementById('pw-overlay').classList.add('show');
  setTimeout(()=>document.getElementById('pw-input').focus(),100);
}

// ===== 사건 배열하기 게임 =====
async function showTimelineGame(){
  if(!TIMELINE_GAME_ENABLED){
    showLearningHomeView();
    return;
  }
  if(!playerName){ showToast2('⚠️ 먼저 이름을 선택해주세요!'); return; }
  loadContentVisibility(true).then(()=>{
    if(document.getElementById('timeline-game-screen')?.style.display==='block' && typeof renderDiffList==='function') renderDiffList();
  });

  document.getElementById('start-screen').style.display='none';
  document.getElementById('timeline-game-screen').style.display='block';
  document.getElementById('tlg-quiz-screen').style.display='none';
  document.getElementById('tlg-start-screen').style.display='block';

  // 관리자모드에서 이전에 눌러본 임시 결과가 남지 않도록 초기화
  if(isAdminSessionActive()){
    adminPreviewState.timelineGame=tlgDefaultScore();
  }

  // 서버의 최신 실제 학생 기록을 불러온 뒤 표시
  try{
    await loadScore();
  }catch(error){
    console.error('사건배열 기록 새로고침 실패:',error);
  }

  const startBtn=document.querySelector('#tlg-start-screen .start-btn');
  if(startBtn){
    if(isAdminSessionActive()){
      startBtn.disabled=true;
      startBtn.textContent='👩‍🏫 관리자 보기 전용 · 문제 풀이 안 함';
      startBtn.style.opacity='0.55';
      startBtn.style.cursor='not-allowed';
    }else{
      startBtn.disabled=false;
      startBtn.textContent='두루마리 펼치기 →';
      startBtn.style.opacity='';
      startBtn.style.cursor='';
    }
  }

  renderScoreStrip();
  renderDiffList();
}


const DIFF_INFO = {
  easy:   {label:'쉬움',   sub:'4개 사건 배열 · 몸풀기', icon:'Ⅰ'},
  medium: {label:'보통',   sub:'6개 사건 배열 · 흐름 잡기', icon:'Ⅱ'},
  hard:   {label:'어려움', sub:'8~10개 사건 배열 · 진짜 실력', icon:'Ⅲ'}
};

let chosenDiff='easy';
let tlgPool=[];          // 현재 난이도의 문제 큐
let curQ=null;
let curOrder=[];       // 플레이어가 담은 순서 (event id 배열)
let tlgScoreByStudent={}; // { 학생이름: {easy:{correct,total}, medium:{...}, hard:{...}} }
const PASS_THRESHOLDS={easy:20,medium:15,hard:5};

function tlgDefaultScore(){
  return { easy:{correct:0,total:0}, medium:{correct:0,total:0}, hard:{correct:0,total:0} };
}

function normalizeTimelineDifficulty(value){
  const src=(value&&typeof value==='object')?value:{};
  return {
    correct:Math.max(0,Number(src.correct)||0),
    total:Math.max(0,Number(src.total)||0)
  };
}

function normalizeTimelineScore(value){
  let src=(value&&typeof value==='object')?value:{};

  if(src.eventOrder&&typeof src.eventOrder==='object')src=src.eventOrder;
  else if(src.timelineGame&&typeof src.timelineGame==='object')src=src.timelineGame;
  else if(src.score&&typeof src.score==='object')src=src.score;

  return {
    easy:normalizeTimelineDifficulty(src.easy),
    medium:normalizeTimelineDifficulty(src.medium),
    hard:normalizeTimelineDifficulty(src.hard)
  };
}

function extractTimelineGameMap(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return {};

  let src=payload;
  for(const key of ['data','records','scores','result','timelineGame','eventOrder']){
    if(src[key]&&typeof src[key]==='object'&&!Array.isArray(src[key])){
      src=src[key];
      break;
    }
  }

  if(!src||typeof src!=='object'||Array.isArray(src))return {};

  if(src.name&&(src.easy||src.medium||src.hard)){
    return {[String(src.name)]:normalizeTimelineScore(src)};
  }

  const out={};
  Object.entries(src).forEach(([name,value])=>{
    if(['ok','error','message','success'].includes(name))return;
    if(!value||typeof value!=='object'||Array.isArray(value))return;

    const raw=value.eventOrder||value.timelineGame||value.score||value;
    const hasScore=['easy','medium','hard'].some(key=>raw[key]&&typeof raw[key]==='object');
    if(hasScore)out[name]=normalizeTimelineScore(value);
  });
  return out;
}

function getTimelineGameScoreStore(name){
  if(isAdminSessionActive() && !name){
    if(!adminPreviewState.timelineGame || !adminPreviewState.timelineGame.easy){
      adminPreviewState.timelineGame=tlgDefaultScore();
    }
    adminPreviewState.timelineGame=normalizeTimelineScore(adminPreviewState.timelineGame);
    return adminPreviewState.timelineGame;
  }

  const targetName=name||(parentChildViewActive?parentChildViewName:playerName);
  if(!targetName)return tlgDefaultScore();

  if(!tlgScoreByStudent[targetName]){
    tlgScoreByStudent[targetName]=tlgDefaultScore();
  }else{
    tlgScoreByStudent[targetName]=normalizeTimelineScore(tlgScoreByStudent[targetName]);
  }
  return tlgScoreByStudent[targetName];
}

function refreshTimelineGameResultViews(){
  try{
    if(document.getElementById('tlgScore-strip'))renderScoreStrip();
    if(document.getElementById('diff-list'))renderDiffList();
    if(playerName && document.getElementById('learning-home-view')?.style.display==='block'){
      scheduleHomeUiRefresh_();
    }else{
      if(typeof renderHomeSummaryCard==='function')renderHomeSummaryCard();
      if(typeof renderIncompleteUnitsSection==='function')renderIncompleteUnitsSection();
    }
  }catch(error){
    console.error('사건배열 결과 화면 갱신 실패:',error);
  }
}

async function loadScore(){
  const payload=await apiListTimelineGame();
  const incoming=extractTimelineGameMap(payload);

  // 빈 응답 때문에 기존 기록을 지우지 않음
  if(Object.keys(incoming).length>0){
    Object.entries(incoming).forEach(([name,score])=>{
      tlgScoreByStudent[name]=normalizeTimelineScore(score);
    });
  }

  if(playerName&&tlgScoreByStudent[playerName]){
    tlgScoreByStudent[playerName]=normalizeTimelineScore(tlgScoreByStudent[playerName]);
  }

  refreshTimelineGameResultViews();
  return tlgScoreByStudent;
}

async function saveScore(){
  if(isLearningWriteBlocked())return false;
  if(!playerName)return false;

  const snapshot=normalizeTimelineScore(getTimelineGameScoreStore(playerName));
  tlgScoreByStudent[playerName]=snapshot;
  refreshTimelineGameResultViews();

  const ok=await apiSetTimelineGame(playerName,snapshot);
  if(!ok){
    console.error('사건배열 저장 실패:',playerName,snapshot);
    if(typeof showToast2==='function')showToast2('⚠️ 사건배열 결과 저장에 실패했어요.');
    return false;
  }

  await loadScore();
  return true;
}

function isDiffPassed(key,name){
  return getTimelineGameScoreStore(name)[key].correct >= PASS_THRESHOLDS[key];
}

function isTimelineGameFullyPassed(){
  return isDiffPassed('easy') && isDiffPassed('medium') && isDiffPassed('hard');
}

function renderDiffList(){
  const wrapEl=document.getElementById('diff-list');
  if(typeof QUESTIONS==='undefined'){ if(wrapEl) wrapEl.innerHTML=''; return; } // 학습콘텐츠 로드 전에는 렌더링 보류(경합 방지)

  // 관리자모드로 특정 학생 화면에 들어온 경우에도
  // 미리보기 점수가 아니라 해당 학생의 실제 저장 기록을 표시
  const displayName=isAdminSessionActive()?playerName:undefined;
  const displayScore=getTimelineGameScoreStore(displayName);

  const visibleDiffKeys=Object.keys(DIFF_INFO).filter(key=>
    parentChildViewActive
      ?(isContentApproved('timeline',key) && isDiffPassed(key,parentChildViewName))
      :isContentApproved('timeline',key)
  );
  wrapEl.innerHTML=visibleDiffKeys.map(key=>{
    const d=DIFF_INFO[key];
    const count=QUESTIONS.filter(q=>q.difficulty===key).length;
    const passed=isDiffPassed(key,displayName);
    return `<div class="diff-card${key===chosenDiff?' chosen':''}${passed?' tlg-passed':''}" onclick="chooseDiff('${key}')">
      <div class="diff-num">${d.icon}</div>
      <div class="diff-info"><b>${d.label}</b><span>${d.sub} · 총 ${count}문제 · ${displayScore[key].correct}/${PASS_THRESHOLDS[key]}문제 통과 필요</span></div>
      ${passed?'<div class="tlg-pass-tag">PASS</div>':''}
    </div>`;
  }).join('');
}

function chooseDiff(key){
  if(!isContentApproved('timeline',key)){
    showToast2('선생님이 아직 공개하지 않은 학습입니다.');
    return;
  }
  chosenDiff=key;
  renderDiffList();
}

function renderScoreStrip(){
  const el=document.getElementById('tlgScore-strip');

  // 관리자모드에서도 선택한 학생의 실제 저장 기록을 표시
  const displayName=isAdminSessionActive()?playerName:undefined;
  const _tlgS=getTimelineGameScoreStore(displayName);

  const totalCorrect=_tlgS.easy.correct+_tlgS.medium.correct+_tlgS.hard.correct;
  const totalAttempt=_tlgS.easy.total+_tlgS.medium.total+_tlgS.hard.total;
  const passedCount=['easy','medium','hard'].filter(key=>isDiffPassed(key,displayName)).length;
  el.innerHTML=`<span>지금까지 ${totalAttempt}문제 도전 (정답 ${totalCorrect}개)</span><span>${passedCount}/3 난이도 PASS</span>`;
}

function startGame(){
  if(!isContentApproved('timeline',chosenDiff)){
    showToast2('선생님이 아직 공개하지 않은 학습입니다.');
    return;
  }
  if(isAdminSessionActive()){
    showToast2('👩‍🏫 관리자모드는 보기 전용이에요.');
    return;
  }
  tlgPool=shuffleArr(QUESTIONS.filter(q=>q.difficulty===chosenDiff));
  document.getElementById('tlg-start-screen').style.display='none';
  document.getElementById('tlg-quiz-screen').style.display='block';
  document.getElementById('quiz-diff-badge').textContent=DIFF_INFO[chosenDiff].label;
  tlgNextQuestion();
}

function shuffleArr(arr){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function tlgNextQuestion(){
  if(tlgPool.length===0){
    tlgPool=shuffleArr(QUESTIONS.filter(q=>q.difficulty===chosenDiff));
  }
  curQ=tlgPool.pop();
  curOrder=[];
  document.getElementById('result-panel').style.display='none';
  document.getElementById('tlg-submit-btn').style.display='inline-block';
  document.getElementById('tlg-submit-btn').disabled=true;
  document.querySelector('.quiz-actions').style.display='flex';
  renderPool();
  renderRope();
  updateProgressLabel();
}

function updateProgressLabel(){
  const totalForDiff=QUESTIONS.filter(q=>q.difficulty===chosenDiff).length;
  document.getElementById('quiz-progress').textContent=`${getTimelineGameScoreStore()[chosenDiff].total+1}번째 도전 (${DIFF_INFO[chosenDiff].label} · 총 ${totalForDiff}문제 중 랜덤)`;
}

function renderPool(){
  const wrapEl=document.getElementById('event-tlgPool');
  wrapEl.innerHTML=curQ.events.map(ev=>{
    const isUsedFlag=curOrder.includes(ev.id);
    return `<div class="event-card${isUsedFlag?' used':''}" onclick="pickEvent('${ev.id}')">
      <span class="dot"></span>${ev.label}
    </div>`;
  }).join('');
}

function renderRope(){
  const wrapEl=document.getElementById('rope-line');
  if(curOrder.length===0){
    wrapEl.innerHTML='<span class="rope-empty-hint">아래 사건을 눌러서 순서대로 담아보세요</span>';
    return;
  }
  wrapEl.innerHTML=curOrder.map((id,i)=>{
    const ev=curQ.events.find(e=>e.id===id);
    return `<span class="rope-slot" onclick="unpickEvent('${id}')"><span class="n">${i+1}</span>${ev.label}</span>`;
  }).join('');
}

function pickEvent(id){
  if(curOrder.includes(id))return;
  curOrder.push(id);
  renderPool();
  renderRope();
  document.getElementById('tlg-submit-btn').disabled = curOrder.length!==curQ.events.length;
}

function unpickEvent(id){
  curOrder=curOrder.filter(x=>x!==id);
  renderPool();
  renderRope();
  document.getElementById('tlg-submit-btn').disabled = curOrder.length!==curQ.events.length;
}

function resetOrder(){
  curOrder=[];
  renderPool();
  renderRope();
  document.getElementById('tlg-submit-btn').disabled=true;
}

function checkAnswer(){
  const isCorrect = JSON.stringify(curOrder)===JSON.stringify(curQ.correctOrder);
  getTimelineGameScoreStore()[curQ.difficulty].total++;
  if(isCorrect) getTimelineGameScoreStore()[curQ.difficulty].correct++;
  saveScore();

  document.querySelector('.quiz-actions').style.display='none';
  document.getElementById('result-panel').style.display='block';

  const flag=document.getElementById('result-flag');
  const justPassed=isCorrect && isDiffPassed(curQ.difficulty) && getTimelineGameScoreStore()[curQ.difficulty].correct===PASS_THRESHOLDS[curQ.difficulty];
  justPassed?SFX.complete():(isCorrect?SFX.correct():SFX.wrong());
  if(justPassed && typeof addCompletedStudyActivity==='function'){
    addCompletedStudyActivity({
      source:'history',
      key:`timeline_${curQ.difficulty}_${todayLocalDate()}`,
      title:`사건 배열하기 · ${DIFF_INFO[curQ.difficulty].label} PASS`,
      detail:`정답 ${getTimelineGameScoreStore()[curQ.difficulty].correct}개 달성`
    });
    enqueueLearningEvent_({contentType:'eventOrder', contentId:curQ.difficulty, action:'complete'});
  }
  flag.className='result-flag '+(isCorrect?'good':'bad');
  flag.textContent=isCorrect?(justPassed?`🎉 정답! ${DIFF_INFO[curQ.difficulty].label} PASS 달성!`:'🎉 정답이에요!'):'🤔 순서가 달라요';

  document.getElementById('correct-order').innerHTML=curQ.correctOrder.map((id,i)=>{
    const ev=curQ.events.find(e=>e.id===id);
    return `<div class="co-item"><span class="n">${i+1}</span>${ev.label}</div>`;
  }).join('');

  document.getElementById('explain-box').innerHTML='<b>왜 이 순서일까요?</b><br>'+curQ.explanation;
  const nextBtn=document.getElementById('tlg-result-next-btn');
  if(nextBtn){
    if(isCorrect){
      nextBtn.textContent='다음 사건 →';
      nextBtn.onclick=()=>tlgNextQuestion();
    }else{
      nextBtn.textContent='🔁 같은 문제 다시 풀기';
      nextBtn.onclick=()=>tlgRetryCurrentQuestion();
    }
  }
}

function tlgRetryCurrentQuestion(){
  curOrder=[];
  document.getElementById('result-panel').style.display='none';
  document.getElementById('tlg-submit-btn').style.display='inline-block';
  document.getElementById('tlg-submit-btn').disabled=true;
  document.querySelector('.quiz-actions').style.display='flex';
  renderPool();
  renderRope();
}

function backToStart(){
  document.getElementById('tlg-quiz-screen').style.display='none';
  document.getElementById('tlg-start-screen').style.display='block';
  renderScoreStrip();
  renderDiffList();
}

// ══════════════════════════════════════════════════
// 🏛️ 역사 훈련소 (historyTraining / ht 접두사)
// ══════════════════════════════════════════════════
let historyTrainingProgress = {}; // playerName -> { partId: {...} }
let htCurrentPartId = null;
let htTranscriptionIdx = 0;
let htQuizIdx = 0;
let htQuizAttempt = 1;
let htReviewQueue = [];

function htGetPart(partId){
  return historyTrainingData.find(p=>p.id===partId);
}

function htResolveTargetName(name){
  return name||(parentChildViewActive?parentChildViewName:playerName)||'';
}

function htIsMingeonPart17(part,name){
  // 기존 함수명을 유지하되, 전민건 맞춤형 데이터가 등록된 이후 PART에도 같은 흐름을 적용합니다.
  return !!part
    && htResolveTargetName(name)==='전민건'
    && Array.isArray(part.mingeonGroups)
    && Array.isArray(part.mingeonQuestions)
    && Array.isArray(part.mingeonTranscriptionSentences);
}

function htGetTranscriptionSentences(part,name){
  if(!part) return [];
  return htIsMingeonPart17(part,name) && Array.isArray(part.mingeonTranscriptionSentences)
    ? part.mingeonTranscriptionSentences
    : (Array.isArray(part.transcriptionSentences)?part.transcriptionSentences:[]);
}

function htGetQuestionsForStudent(part,name){
  if(!part) return [];
  return htIsMingeonPart17(part,name) && Array.isArray(part.mingeonQuestions)
    ? part.mingeonQuestions
    : (Array.isArray(part.questions)?part.questions:[]);
}

function isAdminSessionActive(){
  return testMode===true;
}

// 관리자모드에서는 학습 결과를 어떤 경로로도 저장하지 않음.
// 쪽지 보내기/삭제는 별도 API이므로 이 제한의 영향을 받지 않음.
let parentChildViewActive=false;
let parentChildViewName='';

function isParentPracticeMode(){
  return parentChildViewActive;
}

function isParentUnitPracticeMode(){
  return !!(parentChildViewActive && parentChildViewName && currentUnit && isUnitCompletedForParent(parentChildViewName,currentUnit));
}

function updateParentUnitPracticeUI(){
  document.body.classList.toggle('parent-unit-practice',isParentUnitPracticeMode());
}

function isLearningWriteBlocked(){
  return isAdminSessionActive() || isDeveloperTestMode() || parentChildViewActive;
}

let adminPreviewState={ historyTraining:{}, timelineGame:{} };

function getHistoryTrainingProgressStore(name){
  // 관리자 모드에서 실제 학생명을 명시하지 않은 학습 화면만 미리보기 기록을 사용
  if(isAdminSessionActive() && !name){
    return adminPreviewState.historyTraining;
  }
  const targetName=name||(parentChildViewActive?parentChildViewName:playerName);
  if(!targetName) return {};
  if(!historyTrainingProgress[targetName]) historyTrainingProgress[targetName]={};
  return historyTrainingProgress[targetName];
}

function htDefaultProgress(){
  return {
    currentStep:'reading',
    readingCompleted:false,
    readingProgress:{viewedParagraphIds:[],confirmedParagraphIds:[],reachedBottom:false,selectedKeySentenceId:null,completed:false},
    completedTranscriptionSentenceIds:[],
    answeredQuestionIds:[],
    currentTranscriptionIndex:0,
    currentQuestionIndex:0,
    currentReviewIndex:0,
    firstScore:null,
    firstCorrectCount:0,
    firstWrongCount:0,
    firstWrongQuestionIds:[],
    remainingWrongQuestionIds:[],
    transcriptionCompleted:false,
    reviewCompleted:false,
    completed:false,
    completedAt:'',
    progressPercent:0,
    mingeonFlow:null,
    readingCheckFlow:null
  };
}

// 예전 기록이나 수기 수정 기록에서 배열 필드가 빠져 있어도
// 현재 단계만 안전하게 이어가도록 빈 배열로 보정합니다.
function htEnsureProgressArrays_(prog){
  if(!prog||typeof prog!=='object'||Array.isArray(prog))return;
  [
    'completedTranscriptionSentenceIds',
    'answeredQuestionIds',
    'firstWrongQuestionIds',
    'remainingWrongQuestionIds'
  ].forEach(key=>{
    if(!Array.isArray(prog[key]))prog[key]=[];
  });
}

function htLevenshteinDistance(a, b){
  const m=a.length, n=b.length;
  if(m===0) return n;
  if(n===0) return m;
  let prev=new Array(n+1);
  let curr=new Array(n+1);
  for(let j=0;j<=n;j++) prev[j]=j;
  for(let i=1;i<=m;i++){
    curr[0]=i;
    for(let j=1;j<=n;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      curr[j]=Math.min(
        prev[j]+1,      // 삭제
        curr[j-1]+1,     // 삽입
        prev[j-1]+cost   // 치환
      );
    }
    [prev,curr]=[curr,prev];
  }
  return prev[n];
}

function htNormalize(s){
  return (s||'').toString().replace(/\s+/g,'').replace(/[.,·!?~\-"'\u2018\u2019\u201c\u201d]/g,'').toLowerCase();
}

function htShowOnlyScreen(screenId){
  const screenIds=['start-screen','quiz-screen','result-screen','teacher-screen','parent-screen',
    'timeline-game-screen','king-order-screen','ht-list-screen','ht-part-screen','history-summary-screen','summary-screen','lecture-screen','qbank-screen',
    'map-study-list-screen','map-study-learn-screen','map-study-quiz-screen','math-concept-screen'];
  screenIds.forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display=(id===screenId?'block':'none');
  });
  window.scrollTo({top:0, behavior:'auto'});
}

const KING_ORDER_PROGRESS_STORAGE_KEY='kingOrderPractice_v1';
const KING_ORDER_ERA_IDS=['goguryeo','baekje','silla','balhae','goryeo','joseon'];
const kingOrderProgressCache={};
const kingOrderSyncPromises={};
let kingOrderEraId='';
let kingOrderReadPage=0;
let kingOrderKeyPage=0;
let kingOrderCopyPage=0;
let kingOrderQuizQuestions=[];
let kingOrderQuizIndex=0;
let kingOrderQuizScore=0;
let kingOrderQuizAnswered=false;
let kingOrderOrderItems=[];
let kingOrderSelected=[];

function kingOrderEscape(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

function kingOrderShuffle(list){
  const out=[...list];
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

function getKingOrderEra(eraId=kingOrderEraId){
  return (typeof KING_ORDER_DATA==='undefined'?[]:KING_ORDER_DATA).find(era=>era.id===eraId)||null;
}

function normalizeKingOrderProgress_(value){
  const src=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const out={};
  KING_ORDER_ERA_IDS.forEach(eraId=>{
    const item=src[eraId];
    if(!item||typeof item!=='object'||item.completed!==true)return;
    out[eraId]={completed:true,completedAt:item.completedAt||null};
  });
  return out;
}

function mergeKingOrderProgress_(...sources){
  const merged={};
  sources.forEach(source=>{
    const normalized=normalizeKingOrderProgress_(source);
    KING_ORDER_ERA_IDS.forEach(eraId=>{
      const item=normalized[eraId];
      if(!item)return;
      const current=merged[eraId];
      if(!current){
        merged[eraId]={...item};
        return;
      }
      const dates=[current.completedAt,item.completedAt].filter(Boolean).sort();
      merged[eraId]={completed:true,completedAt:dates[0]||null};
    });
  });
  return merged;
}

function readLocalKingOrderProgress_(name){
  if(!name)return {};
  try{
    const all=JSON.parse(localStorage.getItem(KING_ORDER_PROGRESS_STORAGE_KEY)||'{}');
    return normalizeKingOrderProgress_(all&&typeof all==='object'?all[name]:{});
  }catch(error){ return {}; }
}

function writeLocalKingOrderProgress_(name,progress){
  if(!name)return;
  try{
    const all=JSON.parse(localStorage.getItem(KING_ORDER_PROGRESS_STORAGE_KEY)||'{}')||{};
    all[name]=normalizeKingOrderProgress_(progress);
    localStorage.setItem(KING_ORDER_PROGRESS_STORAGE_KEY,JSON.stringify(all));
  }catch(error){
    console.warn('왕순서 로컬 저장 실패:',error);
  }
}

// v20 일회성 정리: 관리자 미리보기에서 잘못 남은 이하이의 고구려 완료만 제거한다.
// 다른 학생·다른 시대 기록은 건드리지 않으며, 같은 기기에서는 한 번만 실행한다.
const KING_ORDER_ADMIN_PREVIEW_CLEANUP_KEY='kingOrderAdminPreviewCleanup_leeHaYi_goguryeo_v20';
function cleanupLeeHaYiAdminPreviewGoguryeo_(){
  try{
    if(localStorage.getItem(KING_ORDER_ADMIN_PREVIEW_CLEANUP_KEY)==='done')return false;
    const all=JSON.parse(localStorage.getItem(KING_ORDER_PROGRESS_STORAGE_KEY)||'{}')||{};
    const student=all['이하이']&&typeof all['이하이']==='object'&&!Array.isArray(all['이하이'])
      ?{...all['이하이']}:{};
    const removed=student.goguryeo?.completed===true;
    delete student.goguryeo;
    if(Object.keys(student).length>0)all['이하이']=student;
    else delete all['이하이'];
    localStorage.setItem(KING_ORDER_PROGRESS_STORAGE_KEY,JSON.stringify(all));

    if(kingOrderProgressCache['이하이']){
      const cached={...kingOrderProgressCache['이하이']};
      delete cached.goguryeo;
      kingOrderProgressCache['이하이']=cached;
    }
    localStorage.setItem(KING_ORDER_ADMIN_PREVIEW_CLEANUP_KEY,'done');
    return removed;
  }catch(error){
    console.warn('이하이 고구려 관리자 미리보기 기록 정리 실패:',error);
    return false;
  }
}
cleanupLeeHaYiAdminPreviewGoguryeo_();

function getKingOrderProgress(name=playerName){
  if(!name)return {};
  const merged=mergeKingOrderProgress_(readLocalKingOrderProgress_(name),kingOrderProgressCache[name]);
  kingOrderProgressCache[name]=merged;
  return merged;
}

function applyKingOrderProgressMap_(map){
  const src=map&&typeof map==='object'&&!Array.isArray(map)?map:{};
  Object.keys(src).forEach(name=>{
    const merged=mergeKingOrderProgress_(readLocalKingOrderProgress_(name),src[name]);
    kingOrderProgressCache[name]=merged;
    writeLocalKingOrderProgress_(name,merged);
  });
  return src;
}

function syncKingOrderProgressToServer_(name,progress,eraIds){
  if(!name||kingOrderSyncPromises[name]||isLearningWriteBlocked())return kingOrderSyncPromises[name]||Promise.resolve(false);
  const ids=[...new Set((eraIds||[]).filter(eraId=>KING_ORDER_ERA_IDS.includes(eraId)&&progress[eraId]?.completed===true))];
  if(ids.length===0)return Promise.resolve(true);

  const promise=(async()=>{
    let allOk=true;
    for(const eraId of ids){
      const item=progress[eraId];
      const ok=await apiSetKingOrderEraComplete(name,eraId,item.completedAt);
      if(!ok)allOk=false;
    }
    return allOk;
  })().finally(()=>{delete kingOrderSyncPromises[name];});
  kingOrderSyncPromises[name]=promise;
  return promise;
}

async function loadKingOrderProgress(name=playerName,options={}){
  if(!name)return {};
  const opts=Object.assign({syncLocal:true},options);
  const serverResult=await apiGetKingOrderProgress(name);
  const server=normalizeKingOrderProgress_(serverResult.data);
  const local=readLocalKingOrderProgress_(name);
  const merged=mergeKingOrderProgress_(server,local);
  kingOrderProgressCache[name]=merged;
  writeLocalKingOrderProgress_(name,merged);

  if(opts.syncLocal&&playerName===name&&!isLearningWriteBlocked()){
    const localOnly=KING_ORDER_ERA_IDS.filter(eraId=>local[eraId]?.completed===true&&server[eraId]?.completed!==true);
    const needsMigration=[...(serverResult.needsMigration||[]),...localOnly];
    syncKingOrderProgressToServer_(name,merged,needsMigration).catch(error=>console.error('왕순서 저장 동기화 실패:',error));
  }
  return merged;
}

function saveKingOrderComplete(era){
  if(!era||!playerName||isLearningWriteBlocked()||viewerModeActive)return;
  const savedName=playerName;
  const student={...getKingOrderProgress(savedName)};
  const alreadyDone=student[era.id]?.completed===true;
  const completedAt=student[era.id]?.completedAt||new Date().toISOString();
  student[era.id]={completed:true,completedAt};
  kingOrderProgressCache[savedName]=student;
  writeLocalKingOrderProgress_(savedName,student);
  renderIncompleteUnitsSection();
  renderHomeSummaryCard();
  apiSetKingOrderEraComplete(savedName,era.id,completedAt).then(ok=>{
    if(!ok&&typeof showToast2==='function')showToast2('⚠️ 왕 통과는 기기에 보관했어요. 다음 접속 때 자동 동기화할게요.');
  });
  if(!alreadyDone&&typeof addCompletedStudyActivity==='function'){
    addCompletedStudyActivity({
      source:'history',
      key:`king_order_${era.id}_${todayLocalDate()}`,
      title:`역대 왕 계보 · ${era.title}`,
      detail:`전체 ${era.kings.length}명 읽기 · 핵심 왕 문제 완료`
    });
  }
}

function createKingOrderCard(){
  const card=document.createElement('div');
  card.className='unit-card';
  card.dataset.learningContent='kingOrder';
  card.innerHTML=`<div class="unit-icon">👑</div>
    <div class="unit-info">
      <div class="unit-title">역대 왕 계보</div>
      <div class="unit-sub">${KING_ORDER_DUE_LABEL} · 핵심 왕만 문제</div>
    </div>`;
  card.onclick=()=>showKingOrder();
  return card;
}

function showKingOrder(){
  if(!playerName){showToast2('⚠️ 먼저 이름을 선택해주세요!');return;}
  kingOrderEraId='';
  htShowOnlyScreen('king-order-screen');
  renderKingOrderList();
  loadContentVisibility(true).then(()=>{
    if(document.getElementById('king-order-screen')?.style.display==='block'&&!kingOrderEraId)renderKingOrderList();
  });
}

function renderKingOrderList(){
  kingOrderEraId='';
  const body=document.getElementById('king-order-body');
  const title=document.getElementById('king-order-title');
  const sub=document.getElementById('king-order-sub');
  if(!body)return;
  if(title)title.textContent='👑 역대 왕 계보';
  if(sub)sub.textContent=`${KING_ORDER_DUE_LABEL} · 전체 왕은 읽고, 문제는 핵심 왕만 풀어요.`;
  const all=typeof KING_ORDER_DATA==='undefined'?[]:KING_ORDER_DATA;
  const eras=all.filter(era=>isContentApproved('kingOrder',era.id));
  const progress=getKingOrderProgress();
  if(eras.length===0){
    body.innerHTML='<div class="king-order-empty">🔒 아직 공개된 시대가 없어요.<br>선생님이 공개하면 여기에서 시작할 수 있어요.</div>';
    return;
  }
  body.innerHTML=`<div class="king-era-grid">${eras.map(era=>{
    const coreCount=era.kings.filter(king=>king.core).length;
    const done=progress[era.id]?.completed===true;
    return `<button class="king-era-card ${done?'done':''}" onclick="openKingOrderEra('${era.id}')">
      <span class="king-era-icon">${era.icon}</span>
      <span class="king-era-main"><b>${kingOrderEscape(era.title)}</b><small>전체 ${era.kings.length}명 · 핵심 ${coreCount}명</small></span>
      <span class="king-era-status">${done?'완료 ✓':'시작 →'}</span>
    </button>`;
  }).join('')}</div>`;
}

function openKingOrderEra(eraId){
  const era=getKingOrderEra(eraId);
  if(!era||!isContentApproved('kingOrder',eraId)){showToast2('🔒 아직 공개되지 않은 시대예요.');return;}
  kingOrderEraId=eraId;
  kingOrderReadPage=0;
  kingOrderKeyPage=0;
  kingOrderCopyPage=0;
  renderKingOrderReading();
}

function renderKingOrderShell(heading,caption,content){
  const body=document.getElementById('king-order-body');
  const title=document.getElementById('king-order-title');
  const sub=document.getElementById('king-order-sub');
  if(title)title.textContent=heading;
  if(sub)sub.textContent=caption;
  if(body)body.innerHTML=content;
  window.scrollTo({top:0,behavior:'auto'});
}

function renderKingOrderReading(){
  const era=getKingOrderEra();
  if(!era)return renderKingOrderList();
  const pageSize=playerName==='전민건'?4:8;
  const pages=Math.ceil(era.kings.length/pageSize);
  kingOrderReadPage=Math.max(0,Math.min(kingOrderReadPage,pages-1));
  const start=kingOrderReadPage*pageSize;
  const chunk=era.kings.slice(start,start+pageSize);
  renderKingOrderShell(`👑 ${era.title} 왕 순서`,`전체 ${era.kings.length}명 중 ${start+1}~${start+chunk.length}번째`,
    `<div class="king-stage-tabs"><span class="active">1 전체 읽기</span><span>2 핵심 카드</span><span>3 따라쓰기</span><span>4 핵심 문제</span><span>5 순서</span></div>
    <div class="king-sequence-list">${chunk.map(king=>`<div class="king-sequence-item ${king.core?'core':''}">
      <span class="king-number">${king.order}</span><div><b>${kingOrderEscape(king.name)}</b>${king.core?`<small>⭐ 핵심 왕 · ${kingOrderEscape(king.fact)}</small>`:'<small>전체 왕 순서 읽기</small>'}</div>
    </div>`).join('')}</div>
    <div class="king-page-info">${kingOrderReadPage+1} / ${pages}쪽 · ⭐ 표시는 문제에 나오는 핵심 왕</div>
    <div class="king-actions">
      <button class="king-secondary" onclick="${kingOrderReadPage===0?'renderKingOrderList()':'kingOrderReadPage--;renderKingOrderReading()'}">← ${kingOrderReadPage===0?'시대 목록':'이전'}</button>
      <button class="king-primary" onclick="${kingOrderReadPage===pages-1?'kingOrderKeyPage=0;renderKingOrderKeyCards()':'kingOrderReadPage++;renderKingOrderReading()'}">${kingOrderReadPage===pages-1?'핵심 왕 카드 →':'다음 →'}</button>
    </div>
    <div class="king-source">자료 확인: ${kingOrderEscape(era.source)}</div>`);
}

function renderKingOrderKeyCards(){
  const era=getKingOrderEra();
  if(!era)return;
  const core=era.kings.filter(king=>king.core);
  const pageSize=playerName==='전민건'?4:6;
  const pages=Math.ceil(core.length/pageSize);
  kingOrderKeyPage=Math.max(0,Math.min(kingOrderKeyPage,pages-1));
  const chunk=core.slice(kingOrderKeyPage*pageSize,(kingOrderKeyPage+1)*pageSize);
  renderKingOrderShell(`⭐ ${era.title} 핵심 왕`,`업적은 짧게 읽고 왕 이름과 연결해보세요.`,
    `<div class="king-stage-tabs"><span>1 전체 읽기</span><span class="active">2 핵심 카드</span><span>3 따라쓰기</span><span>4 핵심 문제</span><span>5 순서</span></div>
    <div class="king-core-grid">${chunk.map(king=>`<article class="king-core-card"><b>${kingOrderEscape(king.name)}</b><p>${kingOrderEscape(king.fact)}</p></article>`).join('')}</div>
    <div class="king-page-info">${kingOrderKeyPage+1} / ${pages}쪽 · 핵심 왕 ${core.length}명</div>
    <div class="king-actions">
      <button class="king-secondary" onclick="${kingOrderKeyPage===0?'renderKingOrderReading()':'kingOrderKeyPage--;renderKingOrderKeyCards()'}">← 이전</button>
      <button class="king-primary" onclick="${kingOrderKeyPage===pages-1?'kingOrderCopyPage=0;renderKingOrderCopy()':'kingOrderKeyPage++;renderKingOrderKeyCards()'}">${kingOrderKeyPage===pages-1?'따라쓰기 →':'다음 →'}</button>
    </div>`);
}

function kingOrderNormalize(value){
  return String(value||'').toLowerCase().replace(/[\s.,·\-→()（）]/g,'');
}

function renderKingOrderCopy(feedback=''){
  const era=getKingOrderEra();
  if(!era)return;
  const core=era.kings.filter(king=>king.core);
  const pageSize=playerName==='전민건'?4:6;
  const pages=Math.ceil(core.length/pageSize);
  const chunk=core.slice(kingOrderCopyPage*pageSize,(kingOrderCopyPage+1)*pageSize);
  const target=chunk.map(king=>king.name).join(' → ');
  renderKingOrderShell(`✍️ ${era.title} 핵심 왕 따라쓰기`,`보이는 순서대로 왕 이름을 입력하세요. (화살표 → 는 입력하지 않아도 됩니다)`,
    `<div class="king-stage-tabs"><span>1 전체 읽기</span><span>2 핵심 카드</span><span class="active">3 따라쓰기</span><span>4 핵심 문제</span><span>5 순서</span></div>
    <div class="king-copy-card"><div class="king-copy-target">${kingOrderEscape(target)}</div>
      <textarea id="king-copy-input" class="king-copy-input" rows="3" placeholder="왕 이름을 순서대로 써보세요" onpaste="return false;" oncopy="return false;" oncut="return false;" ondragstart="return false;" ondrop="return false;"></textarea>
      <div class="king-copy-feedback ${feedback?'show':''}">${kingOrderEscape(feedback)}</div>
      <button class="king-primary full" onclick="checkKingOrderCopy()">확인하기</button>
    </div>
    <div class="king-page-info">${kingOrderCopyPage+1} / ${pages}묶음</div>
    <button class="king-secondary full" onclick="renderKingOrderKeyCards()">← 핵심 왕 카드로</button>`);
  const input=document.getElementById('king-copy-input');
  if(input)input.dataset.target=target;
}

function checkKingOrderCopy(){
  const input=document.getElementById('king-copy-input');
  if(!input)return;
  if(kingOrderNormalize(input.value)!==kingOrderNormalize(input.dataset.target)){
    input.classList.add('wrong');
    const fb=document.querySelector('.king-copy-feedback');
    if(fb){fb.textContent='순서와 이름을 다시 확인해보세요.';fb.classList.add('show');}
    SFX.wrong();
    return;
  }
  SFX.correct();
  const era=getKingOrderEra();
  const core=era.kings.filter(king=>king.core);
  const pageSize=playerName==='전민건'?4:6;
  const pages=Math.ceil(core.length/pageSize);
  if(kingOrderCopyPage<pages-1){kingOrderCopyPage++;renderKingOrderCopy('잘했어요! 다음 묶음이에요.');}
  else startKingOrderQuiz();
}

function startKingOrderQuiz(){
  const era=getKingOrderEra();
  const core=era.kings.filter(king=>king.core);
  const selected=kingOrderShuffle(core).slice(0,Math.min(5,core.length));
  kingOrderQuizQuestions=selected.map(king=>{
    const distractors=kingOrderShuffle(core.filter(item=>item.name!==king.name)).slice(0,3);
    return {fact:king.fact,answer:king.name,options:kingOrderShuffle([king,...distractors]).map(item=>item.name)};
  });
  kingOrderQuizIndex=0;
  kingOrderQuizScore=0;
  kingOrderQuizAnswered=false;
  renderKingOrderQuiz();
}

function renderKingOrderQuiz(feedback='',correctAnswer=''){
  const era=getKingOrderEra();
  const q=kingOrderQuizQuestions[kingOrderQuizIndex];
  if(!era||!q)return;
  renderKingOrderShell(`🧠 ${era.title} 핵심 왕 문제`,`${kingOrderQuizIndex+1} / ${kingOrderQuizQuestions.length} · 핵심 왕만 출제`,
    `<div class="king-stage-tabs"><span>1 전체 읽기</span><span>2 핵심 카드</span><span>3 따라쓰기</span><span class="active">4 핵심 문제</span><span>5 순서</span></div>
    <div class="king-quiz-card"><p>${kingOrderEscape(q.fact)}</p><div class="king-option-grid">${q.options.map(name=>`<button ${kingOrderQuizAnswered?'disabled':''} onclick="answerKingOrderQuiz('${kingOrderEscape(name)}')">${kingOrderEscape(name)}</button>`).join('')}</div>
      <div class="king-quiz-feedback ${feedback?'show':''}">${kingOrderEscape(feedback)}${correctAnswer?` 정답: ${kingOrderEscape(correctAnswer)}`:''}</div>
      ${kingOrderQuizAnswered?'<button class="king-primary full" onclick="nextKingOrderQuiz()">다음 문제 →</button>':''}
    </div>`);
}

function answerKingOrderQuiz(name){
  if(kingOrderQuizAnswered)return;
  const q=kingOrderQuizQuestions[kingOrderQuizIndex];
  kingOrderQuizAnswered=true;
  if(name===q.answer){kingOrderQuizScore++;SFX.correct();renderKingOrderQuiz('정답이에요!','');}
  else{SFX.wrong();renderKingOrderQuiz('다시 카드와 연결해 기억해요.',q.answer);}
}

function nextKingOrderQuiz(){
  if(kingOrderQuizIndex<kingOrderQuizQuestions.length-1){
    kingOrderQuizIndex++;
    kingOrderQuizAnswered=false;
    renderKingOrderQuiz();
    return;
  }
  const pass=kingOrderQuizScore>=Math.ceil(kingOrderQuizQuestions.length*0.8);
  if(!pass){
    renderKingOrderShell('🔁 핵심 왕 복습 필요',`${kingOrderQuizScore} / ${kingOrderQuizQuestions.length} 정답`,
      `<div class="king-result-card"><p>핵심 왕 카드부터 한 번 더 보고 다시 풀어보세요.</p><button class="king-primary full" onclick="kingOrderKeyPage=0;renderKingOrderKeyCards()">핵심 왕 다시 보기</button></div>`);
    return;
  }
  startKingOrderSequence();
}

function startKingOrderSequence(){
  const era=getKingOrderEra();
  const core=era.kings.filter(king=>king.core);
  const maxStart=Math.max(0,core.length-4);
  const start=Math.floor(Math.random()*(maxStart+1));
  kingOrderOrderItems=core.slice(start,start+Math.min(4,core.length));
  kingOrderSelected=[];
  renderKingOrderSequence();
}

function renderKingOrderSequence(feedback=''){
  const era=getKingOrderEra();
  if(!era)return;
  const remaining=kingOrderOrderItems.filter(king=>!kingOrderSelected.includes(king.name));
  const pool=kingOrderShuffle(remaining);
  renderKingOrderShell(`🔢 ${era.title} 핵심 왕 순서`,`먼저 즉위한 왕부터 차례대로 누르세요.`,
    `<div class="king-stage-tabs"><span>1 전체 읽기</span><span>2 핵심 카드</span><span>3 따라쓰기</span><span>4 핵심 문제</span><span class="active">5 순서</span></div>
    <div class="king-selected-row">${kingOrderSelected.length?kingOrderSelected.map((name,index)=>`<span>${index+1}. ${kingOrderEscape(name)}</span>`).join(''):'<small>아래 왕을 순서대로 눌러보세요.</small>'}</div>
    <div class="king-order-pool">${pool.map(king=>`<button onclick="selectKingOrderItem('${kingOrderEscape(king.name)}')">${kingOrderEscape(king.name)}</button>`).join('')}</div>
    <div class="king-quiz-feedback ${feedback?'show':''}">${kingOrderEscape(feedback)}</div>
    ${kingOrderSelected.length===kingOrderOrderItems.length?'<button class="king-primary full" onclick="checkKingOrderSequence()">순서 확인</button>':''}`);
}

function selectKingOrderItem(name){
  if(kingOrderSelected.includes(name))return;
  kingOrderSelected.push(name);
  renderKingOrderSequence();
}

function checkKingOrderSequence(){
  const correct=kingOrderOrderItems.map(king=>king.name);
  if(kingOrderSelected.join('|')!==correct.join('|')){
    kingOrderSelected=[];
    SFX.wrong();
    renderKingOrderSequence(`정답 순서: ${correct.join(' → ')} · 한 번 더 해보세요.`);
    return;
  }
  SFX.complete();
  const era=getKingOrderEra();
  saveKingOrderComplete(era);
  renderKingOrderShell(`🎉 ${era.title} 완료!`,`전체 왕은 읽고, 핵심 왕 문제와 순서까지 마쳤어요.`,
    `<div class="king-result-card"><div class="king-result-icon">👑</div><p><b>${kingOrderEscape(era.title)}</b> 전체 ${era.kings.length}명의 순서를 확인하고 핵심 왕 문제를 통과했습니다.</p>
      <button class="king-primary full" onclick="renderKingOrderList()">다른 시대 선택</button>
      <button class="king-secondary full" onclick="renderKingOrderReading()">이 시대 다시 보기</button></div>`);
}

function createHistoryTrainingCard(){
  const c=document.createElement('div');
  c.className='unit-card';
  c.dataset.learningContent='historyTraining';
  c.innerHTML=`<div class="unit-icon">🏛️</div>
    <div class="unit-info">
      <div class="unit-title">역사 훈련소</div>
      <div class="unit-sub">읽고 쓰며 완성하는 한국사 복습</div>
    </div>`;
  c.onclick=()=>showHistoryTrainingList();
  return c;
}

function showHistoryTrainingList(){
  if(!playerName){ showToast2('⚠️ 먼저 이름을 선택해주세요!'); return; }
  htShowOnlyScreen('ht-list-screen');
  renderHistoryTrainingList();
  loadContentVisibility(true).then(()=>renderHistoryTrainingList());
}


const HISTORY_SUMMARY1_ID='historySummary1';
const HISTORY_SUMMARY1_READING='\n<h3>1. 선사시대의 시작</h3>\n<p>우리 역사에서 문자가 사용되기 이전의 시대를 선사시대라고 합니다. 구석기 시대 사람들은 돌을 깨뜨려 만든 뗀석기를 사용했고, 사냥과 채집을 하며 먹을 것을 찾아 이동 생활을 했습니다. 동굴이나 바위 그늘, 강가의 막집에서 살았으며 불을 사용해 추위를 견디고 음식을 익혀 먹었습니다.</p>\n<p>약 1만 년 전부터 시작된 신석기 시대에는 돌을 갈아 만든 간석기를 사용했습니다. 사람들은 농사를 짓고 가축을 기르기 시작하면서 한곳에 머무는 정착 생활을 하게 되었습니다. 강가나 바닷가에 움집을 짓고 살았고, 빗살무늬토기에 곡식과 음식을 저장했습니다. 가락바퀴와 뼈바늘을 이용해 옷과 그물을 만들기도 했습니다.</p>\n\n<h3>2. 청동기·철기 시대와 고조선</h3>\n<p>청동기 시대에는 벼농사가 발달하고 생산량이 늘어나면서 재산이 많은 사람과 적은 사람의 차이가 생겼습니다. 힘이 강한 군장이 등장했고, 계급이 생기면서 평등했던 사회가 변했습니다. 군장의 무덤인 고인돌과 돌널무덤이 만들어졌으며, 비파형 동검과 반달 돌칼 같은 유물이 사용되었습니다.</p>\n<p>이러한 변화 속에서 우리 역사상 최초의 국가인 고조선이 등장했습니다. 고조선은 단군왕검이 세웠다고 전해지며, 단군왕검이라는 이름에는 제사와 정치를 함께 이끌었던 제정일치 사회의 특징이 담겨 있습니다. 고조선의 8조법을 통해 사유 재산과 계급이 존재했고 생명과 노동력을 중요하게 여겼음을 알 수 있습니다.</p>\n<p>철기 시대에는 단단한 철제 농기구와 무기가 널리 사용되면서 농업 생산력이 높아지고 전쟁의 규모도 커졌습니다. 중국과의 교류를 보여 주는 명도전, 붓, 중국 화폐 등의 유물도 발견되었습니다.</p>\n\n<h3>3. 여러 나라의 성장</h3>\n<p>고조선이 멸망한 뒤 만주와 한반도 곳곳에서 부여, 고구려, 옥저, 동예, 삼한 같은 여러 나라가 성장했습니다. 부여는 넓은 평야에서 농사와 목축이 발달했고, 영고라는 제천 행사를 열었습니다. 고구려는 산지가 많은 지역에서 성장해 활발하게 정복 활동을 벌였으며 동맹이라는 제천 행사가 있었습니다.</p>\n<p>옥저와 동예는 왕이 없이 읍군과 삼로가 다스렸고 고구려의 압력을 받았습니다. 옥저에는 민며느리제와 가족 공동 무덤이 있었고, 동예에는 책화와 족외혼, 무천이라는 풍습이 있었습니다. 한반도 남부의 삼한은 마한·진한·변한으로 이루어졌으며, 제정이 분리되어 제사를 담당한 천군과 신성 지역인 소도가 있었습니다. 변한에서는 철이 많이 생산되어 주변 나라와 교역했습니다.</p>\n\n<h3>4. 삼국의 성립과 발전</h3>\n<p>고구려, 백제, 신라는 중앙 집권 국가로 성장하면서 왕권을 강화하고 율령을 반포했으며 불교를 받아들였습니다. 고구려는 태조왕 때 옥저를 정복했고, 고국천왕 때 부족 중심의 5부를 행정 구역으로 바꾸고 진대법을 실시했습니다. 소수림왕은 불교를 받아들이고 태학을 세우며 율령을 반포해 국가 체제를 정비했습니다.</p>\n<p>백제는 한강 유역을 중심으로 성장했습니다. 고이왕은 관등과 관복을 정비하고 율령을 반포했으며, 근초고왕은 마한의 여러 지역을 통합하고 고구려의 평양성을 공격하여 영토를 넓혔습니다. 중국의 동진, 일본과도 활발하게 교류했습니다.</p>\n<p>신라는 내물왕 때 김씨의 왕위 세습이 확립되고 왕의 칭호로 마립간을 사용했습니다. 지증왕은 국호를 신라로 정하고 왕이라는 칭호를 사용했으며, 우산국을 정복했습니다. 법흥왕은 율령을 반포하고 불교를 공인했으며 금관가야를 병합했습니다. 진흥왕은 화랑도를 국가 조직으로 정비하고 한강 유역을 차지해 신라의 전성기를 열었습니다.</p>\n<p>고구려의 광개토대왕은 만주와 한반도 북부로 영토를 크게 넓혔습니다. 장수왕은 수도를 국내성에서 평양으로 옮기고 남진 정책을 추진해 한강 유역을 차지했습니다. 이에 백제와 신라는 동맹을 맺어 고구려에 맞섰고, 삼국은 한강 유역을 둘러싸고 치열하게 경쟁했습니다.</p>\n\n<h3>5. 가야와 삼국의 문화</h3>\n<p>낙동강 유역에서는 여러 가야 연맹이 성장했습니다. 초기에는 금관가야가, 후기에는 대가야가 중심이 되었습니다. 가야는 풍부한 철을 바탕으로 철제 무기와 농기구를 만들고 중국과 일본에 수출했습니다. 그러나 강력한 중앙 집권 국가로 발전하지 못해 결국 신라에 통합되었습니다.</p>\n<p>삼국은 불교와 유학, 한자를 받아들이면서 문화를 발전시켰습니다. 고구려의 고분 벽화, 백제의 금동대향로와 섬세한 불교 예술, 신라의 금관과 돌무지덧널무덤은 각 나라의 특징을 보여 줍니다. 삼국의 문화는 일본의 아스카 문화 형성에도 큰 영향을 주었습니다.</p>\n\n<h3>6. 삼국 통일 과정</h3>\n<p>7세기에는 고구려와 백제가 신라를 강하게 압박했습니다. 신라는 김춘추를 당나라에 보내 동맹을 맺었고, 김유신과 함께 삼국 통일을 추진했습니다. 나당 연합군은 660년 백제를 멸망시켰고, 668년에는 고구려를 멸망시켰습니다.</p>\n<p>그러나 당나라는 한반도 전체를 지배하려고 했습니다. 신라는 고구려와 백제의 유민과 힘을 합쳐 당나라와 싸웠습니다. 매소성 전투와 기벌포 전투에서 승리한 신라는 당군을 몰아내고 676년 삼국 통일을 이루었습니다. 신라의 통일은 대동강 이남에 한정되었지만, 삼국의 문화와 사람을 하나의 국가 안에 통합했다는 의미가 있습니다.</p>\n\n<h3>7. 통일 신라의 발전</h3>\n<p>통일 이후 신문왕은 귀족 세력을 약화하고 왕권을 강화했습니다. 김흠돌의 난을 진압하고, 귀족에게 주던 녹읍을 폐지한 뒤 관료전을 지급했습니다. 전국을 9주로 나누고 중요한 지역에 5소경을 설치해 수도가 동남쪽에 치우친 문제를 보완했습니다. 군사 조직으로 9서당과 10정을 정비했으며, 국학을 세워 유학 교육을 강화했습니다.</p>\n<p>통일 신라는 넓어진 영토와 인구를 바탕으로 경제와 문화가 발전했습니다. 농업 생산이 늘었고 당나라·일본·서역과 활발하게 교류했습니다. 울산항은 국제 무역항으로 성장했고, 장보고는 완도에 청해진을 설치하여 동아시아 해상 무역을 장악했습니다.</p>\n\n<h3>8. 발해와 남북국 시대</h3>\n<p>고구려가 멸망한 뒤 대조영은 고구려 유민과 말갈인을 이끌고 발해를 세웠습니다. 발해는 고구려 계승 의식을 가진 나라로 성장했고, 선왕 때에는 영토를 크게 넓혀 해동성국이라 불렸습니다. 중앙에는 3성 6부를 두었지만 6부의 명칭을 충·인·의·예·지·신으로 정하는 등 당나라 제도를 발해식으로 바꾸어 운영했습니다.</p>\n<p>발해 문화는 고구려 문화를 바탕으로 당나라와 말갈 문화를 융합한 독자적인 문화였습니다. 정혜공주 묘의 굴식 돌방무덤과 모줄임 천장은 고구려의 영향을 보여 주고, 정효공주 묘의 벽돌 구조는 당나라 문화의 영향을 보여 줍니다. 상경성은 당나라 장안성을 본떠 계획적으로 건설되었으며, 주자감에서는 유교 경전을 가르쳤습니다.</p>\n<p>남쪽의 통일 신라와 북쪽의 발해가 함께 존재한 시기를 남북국 시대라고 합니다. 두 나라는 당나라와 일본뿐 아니라 서역과도 교류했습니다. 발해는 신라도·거란도·영주도·일본도·압록도의 5도를 통해 주변 국가와 연결되었고, 신라는 신라방·신라소·신라관·신라원 등을 중심으로 당나라에서 활발하게 활동했습니다.</p>\n\n<h3>9. 통일 신라의 문화</h3>\n<p>통일 신라에서는 불교와 유학이 크게 발전했습니다. 원효는 모든 것은 마음에 달려 있다는 일심사상과 서로 다른 주장을 조화시키는 화쟁사상을 펼쳤으며, 아미타 신앙을 통해 불교를 백성들에게 널리 알렸습니다. 의상은 화엄사상을 전파하고 부석사를 세웠고, 혜초는 인도까지 여행하여 불교를 공부했습니다.</p>\n<p>불국사와 석굴암은 통일 신라의 뛰어난 불교 예술을 보여 줍니다. 석가탑에서는 세계에서 가장 오래된 목판 인쇄물인 무구정광대다라니경이 발견되었습니다. 성덕대왕신종, 승탑과 탑비 역시 통일 신라의 높은 기술과 예술 수준을 보여 줍니다.</p>\n<p>유학도 발달하여 강수는 외교 문서를 작성했고, 설총은 이두를 정리했으며, 김대문은 화랑세기와 고승전 등을 집필했습니다. 독서삼품과는 유교 경전을 이해한 수준에 따라 인재를 등용하기 위한 제도였습니다.</p>\n\n<h3>10. 통일 신라의 쇠퇴와 후삼국의 시작</h3>\n<p>8세기 후반부터 왕위 다툼이 심해지면서 중앙 정치가 흔들렸습니다. 귀족들은 서로 왕이 되기 위해 싸웠고, 왕권은 약해졌습니다. 녹읍이 다시 부활하면서 귀족의 경제력은 강해졌고 농민의 부담은 커졌습니다.</p>\n<p>지방에서는 세금 부담과 흉년 때문에 농민 봉기가 일어났습니다. 대표적으로 원종과 애노의 난이 있습니다. 중앙 정부가 지방을 제대로 통제하지 못하자 성주나 장군이라 불린 호족이 성장했습니다. 이들은 자신의 군대와 성을 가지고 지방을 실질적으로 다스렸습니다.</p>\n<p>신분 제도의 한계를 느낀 6두품 지식인들은 개혁을 요구했고, 일부는 지방의 호족과 힘을 합쳤습니다. 선종과 풍수지리설도 지방 사회에 널리 퍼졌습니다. 결국 견훤은 후백제를 세우고, 궁예는 후고구려를 세워 후삼국 시대가 시작되었습니다. 이후 왕건이 고려를 세우면서 새로운 시대가 열리게 됩니다.</p>\n\n<h3>전체 흐름</h3>\n<p>선사시대의 이동 생활과 정착 생활에서 시작한 우리 역사는 청동기 시대의 계급 발생과 고조선 건국을 거쳐 여러 나라와 삼국으로 발전했습니다. 삼국은 경쟁하며 중앙 집권 국가로 성장했고, 신라는 당나라와 연합해 삼국을 통일했습니다. 이후 남쪽의 통일 신라와 북쪽의 발해가 함께 발전한 남북국 시대가 이어졌습니다. 그러나 통일 신라는 왕위 다툼과 귀족의 성장, 농민 봉기와 호족의 등장으로 쇠퇴했고, 후삼국이라는 새로운 시대를 맞게 되었습니다.</p>\n';
const HISTORY_SUMMARY1_MINUTE=['① 구석기 → 이동 생활·뗀석기·사냥과 채집', '② 신석기 → 농경 시작·정착 생활·간석기·빗살무늬토기', '③ 청동기 → 계급 발생·군장·고인돌·비파형 동검', '④ 고조선 → 단군왕검·8조법·제정일치', '⑤ 여러 나라 → 부여·고구려·옥저·동예·삼한', '⑥ 삼국 발전 → 광개토대왕·장수왕·근초고왕·진흥왕', '⑦ 삼국 통일 → 나당 연합 → 백제·고구려 멸망 → 나당 전쟁', '⑧ 통일 신라 → 신문왕·9주 5소경·9서당 10정·관료전·국학', '⑨ 발해 → 대조영·해동성국·고구려+당+말갈 문화 융합', '⑩ 통일 신라 문화 → 원효·의상·혜초·불국사·석굴암', '⑪ 국제 교류 → 장보고·청해진·신라방·울산항·발해 5도', '⑫ 쇠퇴 → 녹읍 부활·원종과 애노의 난·6두품·호족', '⑬ 후삼국 → 견훤의 후백제·궁예의 후고구려'];

const HISTORY_SUMMARY2_ID='historySummary2';
let activeHistorySummaryId=HISTORY_SUMMARY1_ID;

function getHistorySummaryConfig_(summaryId){
  const id=summaryId||activeHistorySummaryId||HISTORY_SUMMARY1_ID;
  if(id===HISTORY_SUMMARY2_ID && window.HISTORY_SUMMARY2_DATA){
    return window.HISTORY_SUMMARY2_DATA;
  }
  return {
    id:HISTORY_SUMMARY1_ID,number:'①',title:'선사시대 ~ 통일 신라',
    subtitle:'선사시대부터 통일 신라의 쇠퇴까지',
    activityTitle:'역사총정리① 완료',activityDetail:'선사시대 ~ 통일 신라',
    flowHtml:'선사시대<br>↓<br>청동기·철기<br>↓<br>고조선<br>↓<br>여러 나라의 성장<br>↓<br>삼국<br>↓<br>삼국 통일<br>↓<br>통일 신라·발해<br>↓<br>남북국<br>↓<br>통일 신라 쇠퇴<br>↓<br>후삼국',
    reading:HISTORY_SUMMARY1_READING,minute:HISTORY_SUMMARY1_MINUTE,
    keySentences:[
      '청동기 시대의 변화 속에서 우리 역사상 최초의 국가인 고조선이 등장했습니다.',
      '신라는 당나라와 연합해 백제와 고구려를 멸망시킨 뒤 나당 전쟁을 거쳐 삼국 통일을 이루었습니다.',
      '통일 신라는 왕위 다툼과 귀족의 성장, 농민 봉기와 호족의 등장으로 쇠퇴했습니다.'
    ]
  };
}

function getHistorySummary1Progress(name,summaryId){
  const targetId=summaryId||activeHistorySummaryId||HISTORY_SUMMARY1_ID;
  const store=getHistoryTrainingProgressStore(name);
  if(!store[targetId]){
    store[targetId]={
      currentStep:'reading',
      readingCompleted:false,
      readingProgress:{viewedParagraphIds:[],confirmedParagraphIds:[],reachedBottom:false,selectedKeySentenceId:null,completed:false},
      completed:false,
      completedAt:'',
      progressPercent:0
    };
  }
  return store[targetId];
}

function renderHistorySummary1Card(){
  const targetName=parentChildViewActive?parentChildViewName:playerName;
  const summaries=[HISTORY_SUMMARY1_ID,HISTORY_SUMMARY2_ID]
    .filter(id=>isContentApproved('historySummary',id))
    .map(id=>({config:getHistorySummaryConfig_(id),prog:getHistorySummary1Progress(targetName,id)}))
    .filter(item=>!parentChildViewActive||item.prog.completed);
  if(summaries.length===0)return '';
  return `<div class="history-summary-divider">
    <div class="history-summary-heading">⭐ 역사총정리</div>
    ${summaries.map(({config,prog})=>`<div class="history-summary-card${prog.completed?' done':''}" style="margin-bottom:10px" onclick="openHistorySummary1('${config.id}')">
      <div class="history-summary-icon">${prog.completed?'🏅':'📚'}</div>
      <div class="history-summary-info">
        <b>${config.number} ${config.title}</b>
        <span>${prog.completed?'총정리 완료 · 다시 읽기 가능':'읽기 전용 · 1분 핵심요약 포함'}</span>
      </div>
      <button class="history-summary-btn" onclick="event.stopPropagation();openHistorySummary1('${config.id}')">${prog.completed?'다시 읽기':'시작하기'}</button>
    </div>`).join('')}
  </div>`;
}

let historySummaryReadingObserver=null;
let historySummaryBottomObserver=null;
let historySummaryParagraphTimers={};

function getHistorySummaryReadingParagraphs(summaryId){
  const config=getHistorySummaryConfig_(summaryId);
  const wrap=document.createElement('div');
  wrap.innerHTML=config.reading;
  const items=[];
  let currentHeading='';

  Array.from(wrap.children).forEach((node,index)=>{
    if(node.tagName==='H3'){
      currentHeading=node.textContent.trim();
      return;
    }
    if(node.tagName==='P'){
      items.push({
        id:(config.id===HISTORY_SUMMARY2_ID?'hs2_para_':'hs1_para_')+items.length,
        heading:currentHeading,
        text:node.innerHTML
      });
      currentHeading='';
    }
  });
  return items;
}

function openHistorySummary1(summaryId){
  if(!playerName){showToast2('⚠️ 먼저 이름을 선택해주세요!');return;}
  activeHistorySummaryId=summaryId||HISTORY_SUMMARY1_ID;
  const config=getHistorySummaryConfig_(activeHistorySummaryId);
  htShowOnlyScreen('history-summary-screen');
  const title=document.querySelector('#history-summary-screen .history-summary-title');
  const sub=document.querySelector('#history-summary-screen .history-summary-sub');
  const flow=document.getElementById('history-summary-flow');
  if(title)title.textContent='⭐ 역사총정리 '+config.number;
  if(sub)sub.textContent=config.subtitle;
  if(flow)flow.innerHTML=config.flowHtml;
  document.getElementById('history-summary-minute-body').innerHTML=config.minute.map(item=>`<div class="history-summary-minute-item">${item}</div>`).join('');
  renderHistorySummaryReading();
  showHistorySummaryReading();
}

function renderHistorySummaryReading(){
  const area=document.getElementById('history-summary-reading');
  const prog=getHistorySummary1Progress();
  if(!prog.readingProgress){
    prog.readingProgress={viewedParagraphIds:[],confirmedParagraphIds:[],reachedBottom:false,selectedKeySentenceId:null,completed:false};
  }
  const rp=prog.readingProgress;
  const config=getHistorySummaryConfig_();
  const paragraphs=getHistorySummaryReadingParagraphs(activeHistorySummaryId);
  const keySentenceCandidates=config.keySentences;

  let html=paragraphs.map(p=>{
    const confirmed=rp.confirmedParagraphIds.includes(p.id);
    const heading=p.heading?`<h3>${p.heading}</h3>`:'';
    return `<div class="ht-reading-paragraph" data-summary-paragraph-id="${p.id}">
      <div class="ht-reading-card">${heading}${p.text}</div>
      <button type="button" class="ht-para-confirm-btn summary-para-confirm-btn${confirmed?' confirmed':''}"
        data-summary-paragraph-id="${p.id}" disabled
        onclick="confirmHistorySummaryParagraph('${p.id}')">${confirmed?'✅ 확인했어요':'읽었어요'}</button>
    </div>`;
  }).join('');

  html+='<div id="history-summary-bottom-sentinel" style="height:2px"></div>';
  html+=`<div class="ht-key-sentence-box">
    <div class="ht-key-sentence-title">가장 중요하다고 생각하는 문장을 하나 골라보세요.</div>
    ${keySentenceCandidates.map((sentence,index)=>{
      const id=(config.id===HISTORY_SUMMARY2_ID?'hs2_key_':'hs1_key_')+index;
      const selected=rp.selectedKeySentenceId===id;
      return `<div class="ht-key-sentence-option${selected?' selected':''}"
        onclick="selectHistorySummaryKeySentence('${id}')">
        <span class="ht-key-mark">${selected?'✅':'○'}</span> ${sentence}
      </div>`;
    }).join('')}
  </div>`;
  html+='<div class="ht-reading-hint" id="history-summary-reading-hint">각 문단을 읽고 확인하면 1분 핵심요약으로 넘어갈 수 있어요.</div>';
  html+='<button class="start-btn" id="history-summary-reading-next-btn" onclick="showHistorySummaryMinute()" disabled>1분 핵심요약 보기 →</button>';

  area.innerHTML=html;

  rp.confirmedParagraphIds.forEach(id=>{
    const btn=area.querySelector(`.summary-para-confirm-btn[data-summary-paragraph-id="${id}"]`);
    if(btn){
      btn.disabled=true;
      btn.classList.add('confirmed');
    }
  });

  setupHistorySummaryReadingObservers();
  checkHistorySummaryReadingCompletion();
}

function setupHistorySummaryReadingObservers(){
  const prog=getHistorySummary1Progress();
  const rp=prog.readingProgress;
  if(historySummaryReadingObserver)historySummaryReadingObserver.disconnect();
  if(historySummaryBottomObserver)historySummaryBottomObserver.disconnect();
  Object.values(historySummaryParagraphTimers).forEach(timer=>clearTimeout(timer));
  historySummaryParagraphTimers={};

  if(typeof IntersectionObserver==='undefined'){
    document.querySelectorAll('[data-summary-paragraph-id]').forEach(el=>{
      const id=el.dataset.summaryParagraphId;
      const btn=document.querySelector(`.summary-para-confirm-btn[data-summary-paragraph-id="${id}"]`);
      if(btn&&!rp.confirmedParagraphIds.includes(id))btn.disabled=false;
    });
    return;
  }

  historySummaryReadingObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const id=entry.target.dataset.summaryParagraphId;
      if(rp.confirmedParagraphIds.includes(id))return;
      if(entry.isIntersecting&&entry.intersectionRatio>=0.7){
        if(!rp.viewedParagraphIds.includes(id))rp.viewedParagraphIds.push(id);
        if(!historySummaryParagraphTimers[id]){
          historySummaryParagraphTimers[id]=setTimeout(()=>{
            const btn=document.querySelector(`.summary-para-confirm-btn[data-summary-paragraph-id="${id}"]`);
            if(btn)btn.disabled=false;
          },1500);
        }
      }else if(historySummaryParagraphTimers[id]){
        clearTimeout(historySummaryParagraphTimers[id]);
        delete historySummaryParagraphTimers[id];
      }
    });
  },{threshold:[0,0.7]});

  document.querySelectorAll('[data-summary-paragraph-id]').forEach(el=>historySummaryReadingObserver.observe(el));

  historySummaryBottomObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        rp.reachedBottom=true;
        checkHistorySummaryReadingCompletion();
      }
    });
  },{threshold:0.1});

  const sentinel=document.getElementById('history-summary-bottom-sentinel');
  if(sentinel)historySummaryBottomObserver.observe(sentinel);
}

function confirmHistorySummaryParagraph(paragraphId){
  const prog=getHistorySummary1Progress();
  const rp=prog.readingProgress;
  if(!rp.confirmedParagraphIds.includes(paragraphId))rp.confirmedParagraphIds.push(paragraphId);

  const btn=document.querySelector(`.summary-para-confirm-btn[data-summary-paragraph-id="${paragraphId}"]`);
  if(btn){
    btn.textContent='✅ 확인했어요';
    btn.classList.add('confirmed');
    btn.disabled=true;
  }

  const paragraphs=getHistorySummaryReadingParagraphs(activeHistorySummaryId);
  prog.progressPercent=Math.min(45,Math.round((rp.confirmedParagraphIds.length/Math.max(1,paragraphs.length))*45));
  saveHistoryTrainingProgress(activeHistorySummaryId);
  if(typeof renderIncompleteUnitsSection==='function')renderIncompleteUnitsSection();
  checkHistorySummaryReadingCompletion();
}

function selectHistorySummaryKeySentence(sentenceId){
  const prog=getHistorySummary1Progress();
  prog.readingProgress.selectedKeySentenceId=sentenceId;
  saveHistoryTrainingProgress(activeHistorySummaryId);
  if(typeof renderIncompleteUnitsSection==='function')renderIncompleteUnitsSection();
  renderHistorySummaryReading();
}

function checkHistorySummaryReadingCompletion(){
  const prog=getHistorySummary1Progress();
  const rp=prog.readingProgress;
  const paragraphs=getHistorySummaryReadingParagraphs(activeHistorySummaryId);
  const allConfirmed=paragraphs.length>0&&paragraphs.every(p=>rp.confirmedParagraphIds.includes(p.id));
  const ready=allConfirmed&&rp.reachedBottom&&!!rp.selectedKeySentenceId;

  rp.completed=ready;
  prog.readingCompleted=ready;
  if(ready){
    prog.currentStep='summary';
    prog.progressPercent=Math.max(50,Number(prog.progressPercent)||0);
  }

  const nextBtn=document.getElementById('history-summary-reading-next-btn');
  const hint=document.getElementById('history-summary-reading-hint');
  if(nextBtn)nextBtn.disabled=!ready;
  if(hint){
    if(ready)hint.textContent='✅ 읽기를 모두 확인했어요. 1분 핵심요약으로 넘어가세요.';
    else if(!allConfirmed)hint.textContent='아직 확인하지 않은 문단이 있어요.';
    else if(!rp.reachedBottom)hint.textContent='읽기 내용을 끝까지 내려서 확인해주세요.';
    else hint.textContent='가장 중요하다고 생각하는 문장을 골라주세요.';
  }
  saveHistoryTrainingProgress(activeHistorySummaryId);
}

function toggleHistorySummaryFlow(){
  const flow=document.getElementById('history-summary-flow');
  const btn=document.querySelector('.history-summary-flow-btn');
  if(!flow)return;
  const hidden=flow.style.display==='none';
  flow.style.display=hidden?'block':'none';
  if(btn)btn.textContent=hidden?'🧭 시대 흐름 접기':'🧭 시대 흐름 보기';
}

function showHistorySummaryReading(){
  document.getElementById('history-summary-reading').style.display='block';
  document.getElementById('history-summary-flow').style.display='block';
  document.getElementById('history-summary-minute').classList.remove('open');
  checkHistorySummaryReadingCompletion();
  window.scrollTo({top:0,behavior:'smooth'});
}

function showHistorySummaryMinute(){
  const prog=getHistorySummary1Progress();
  if(!prog.readingCompleted){
    showToast2('📖 역사훈련소처럼 각 문단의 읽기 확인을 먼저 완료해주세요.');
    return;
  }
  document.getElementById('history-summary-reading').style.display='none';
  document.getElementById('history-summary-flow').style.display='block';
  document.getElementById('history-summary-minute').classList.add('open');
  prog.currentStep='summary';
  prog.progressPercent=Math.max(50,Number(prog.progressPercent)||0);
  saveHistoryTrainingProgress(activeHistorySummaryId);
  if(typeof renderIncompleteUnitsSection==='function')renderIncompleteUnitsSection();
  window.scrollTo({top:0,behavior:'smooth'});
}

function completeHistorySummary1(){
  const config=getHistorySummaryConfig_(activeHistorySummaryId);
  const prog=getHistorySummary1Progress();
  if(!prog.readingCompleted){
    showToast2('📖 먼저 읽기 확인을 완료해주세요.');
    return;
  }
  prog.completed=true;
  prog.currentStep='completed';
  prog.completedAt=new Date().toISOString();
  prog.progressPercent=100;
  saveHistoryTrainingProgress(activeHistorySummaryId);
  if(typeof apiAddCompletedStudyActivity==='function'){
    apiAddCompletedStudyActivity(playerName,{
      key:config.id,
      source:'historySummary',
      title:config.activityTitle,
      detail:config.activityDetail,
      completedAt:prog.completedAt
    });
  }
  SFX.complete();
  showToast2(`🏅 역사총정리${config.number}을 완료했어요!`);
  renderHistoryTrainingList();
  if(typeof renderIncompleteUnitsSection==='function')renderIncompleteUnitsSection();
  if(typeof renderHomeSummaryCard==='function')renderHomeSummaryCard();
}


function renderHistoryTrainingList(){
  const body=document.getElementById('ht-list-body');
  const visibleParts=parentChildViewActive
    ?historyTrainingData.filter(part=>isContentApproved('historyTraining',part.id) && calculateHistoryTrainingProgress(parentChildViewName,part.id).completed)
    :historyTrainingData.filter(part=>isContentApproved('historyTraining',part.id));
  body.innerHTML=visibleParts.map(part=>{
    if(part.placeholder){
      return `<div class="ht-part-card" style="opacity:.72;cursor:default">
        <div class="ht-part-num">${part.partNumber}</div>
        <div class="ht-part-info"><b>${part.title}</b><span>콘텐츠 준비 중</span></div>
        <button class="ht-part-btn" type="button" disabled style="opacity:.55;cursor:not-allowed">준비 중</button>
      </div>`;
    }

    const progress=calculateHistoryTrainingProgress(playerName, part.id);
    const done=progress.completed;
    const prog=getHistoryTrainingProgressStore()[part.id];
    const scoreText=(prog&&prog.firstScore!=null)
      ?('최초 점수 '+prog.firstScore+'점')
      :(done?'학습 완료':(progress.percent>0?(progress.percent+'% 진행중'):'아직 시작하지 않았어요'));
    const btnLabel=done?'다시 보기':getResumeButtonLabel(progress);
    const btnStep=done?", 'reading'":'';
    return `<div class="ht-part-card${done?' done':''}" onclick="openHistoryTrainingPart('${part.id}')">
      <div class="ht-part-num">${part.partNumber}</div>
      <div class="ht-part-info"><b>${part.title}</b><span>${scoreText}</span></div>
      ${done?'<div class="ht-part-check">✅</div>':''}
      <button class="ht-part-btn" onclick="event.stopPropagation();openHistoryTrainingPart('${part.id}'${btnStep})">${btnLabel}</button>
    </div>`;
  }).join('');
  body.innerHTML+=renderHistorySummary1Card();
}

function openHistoryTrainingPart(partId, requestedStep){
  if(!isContentApproved('historyTraining',partId)){
    showToast2('선생님이 아직 공개하지 않은 학습입니다.');
    return;
  }
  const part=htGetPart(partId);
  if(!part){
    console.error('역사 훈련소 PART를 찾을 수 없습니다.', partId);
    return;
  }

  htCurrentPartId=partId;

  const store=getHistoryTrainingProgressStore();
  if(!store[partId]){
    store[partId]=htDefaultProgress();
  }
  htEnsureProgressArrays_(store[partId]);
  if(!hasStartedThisSession_('historyTraining',partId)){
    enqueueLearningEvent_({contentType:'historyTraining', contentId:partId, contentTitle:part.title||'', action:'start'});
    markStartedThisSession_('historyTraining',partId);
  }

  htShowOnlyScreen('ht-part-screen');

  document.getElementById('ht-part-title').textContent='PART '+part.partNumber+' · '+part.title;

  const progress=store[partId];
  // 완료한 PART의 "다시 보기"는 완료 결과 화면이 아니라 학습 내용을 다시 여는 흐름으로 시작한다.
  // completed/점수/기존 답안 데이터는 그대로 유지하고 현재 화면 단계만 읽기로 전환한다.
  const step=requestedStep || (progress.completed?'reading':(progress.currentStep || 'reading'));
  htGoToStep(step);
}

function htHideAllStepAreas(){
  ['ht-reading-area','ht-transcription-area','ht-quiz-area','ht-first-result-area','ht-review-area','ht-final-result-area'].forEach(id=>{
    document.getElementById(id).style.display='none';
  });
}

function htUpdateStepIndicator(step){
  const part=htGetPart(htCurrentPartId);
  const labels={reading:htIsMingeonPart17(part)?'핵심카드':(htHasReadingChecks(part)?'읽기 확인':'읽기'),transcription:'필사',quiz:htIsMingeonPart17(part)?'확인 문제':'빈칸',firstResult:htIsMingeonPart17(part)?'확인 문제':'빈칸',review:'오답 복습',completed:'완료'};
  const order=['reading','transcription','quiz','review','completed'];
  const activeLabel=labels[step]||step;
  document.getElementById('ht-step-indicator').innerHTML=order.map((s,i)=>{
    const active=(labels[s]===activeLabel);
    return `<span class="${active?'active':''}">${labels[s]}</span>`+(i<order.length-1?' → ':'');
  }).join('');
}

function htGoToStep(step,eventHint){
  if(step!=='reading'&&typeof htClearMingeonGateTimer==='function') htClearMingeonGateTimer();
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  htEnsureProgressArrays_(prog);
  prog.currentStep=step;
  saveHistoryTrainingProgress(htCurrentPartId,eventHint);
  if(['reading','transcription','quiz'].includes(step)){
    const subContentId=htCurrentPartId+'_'+step;
    if(!hasStartedThisSession_('historyTraining',subContentId)){
      const partInfo=htGetPart(htCurrentPartId);
      const partForLabel=htGetPart(htCurrentPartId);
      const stepLabel=step==='reading'
        ?(htIsMingeonPart17(partForLabel)?'핵심카드':(htHasReadingChecks(partForLabel)?'읽기 확인':'읽기'))
        :(step==='transcription'?'필사':(htIsMingeonPart17(partForLabel)?'확인 문제':'빈칸 채우기'));
      enqueueLearningEvent_({contentType:'historyTraining', contentId:subContentId, contentTitle:`${(partInfo&&partInfo.title)||''} · ${stepLabel}`, action:'start'});
      markStartedThisSession_('historyTraining',subContentId);
    }
  }
  if(typeof renderIncompleteUnitsSection==='function') renderIncompleteUnitsSection();
  htHideAllStepAreas();
  const part=htGetPart(htCurrentPartId);
  htUpdateStepIndicator(step);

  if(step==='reading'){
    document.getElementById('ht-reading-area').style.display='block';
    htRenderReading(part);
  }else if(step==='transcription'){
    document.getElementById('ht-transcription-area').style.display='block';
    if(htIsMingeonPart17(part)){
      const sentences=htGetTranscriptionSentences(part);
      const completedIds=prog.completedTranscriptionSentenceIds||[];
      const firstIncomplete=sentences.findIndex((_,idx)=>!completedIds.includes(htCurrentPartId+'_sentence'+idx));
      htTranscriptionIdx=firstIncomplete<0?sentences.length:firstIncomplete;
    }else{
      htTranscriptionIdx=0;
    }
    htRenderTranscription(part);
  }else if(step==='quiz'){
    document.getElementById('ht-quiz-area').style.display='block';
    if(htIsMingeonPart17(part)){
      const questions=htGetQuestionsForStudent(part);
      const answeredIds=prog.answeredQuestionIds||[];
      const firstUnanswered=questions.findIndex(question=>!answeredIds.includes(question.id));
      htQuizIdx=firstUnanswered<0?questions.length:firstUnanswered;
    }else{
      htQuizIdx=0;
    }
    htQuizAttempt=1;
    htRenderQuiz(part);
  }else if(step==='firstResult'){
    document.getElementById('ht-first-result-area').style.display='block';
    htShowFirstResult(part);
  }else if(step==='review'){
    document.getElementById('ht-review-area').style.display='block';
    htStartReview(part);
  }else if(step==='completed'){
    document.getElementById('ht-final-result-area').style.display='block';
    htShowFinalResult(part);
  }
}

// ── 1단계: 읽기 ──
function htSplitReadingParagraphs(part){
  return part.reading.split('\n\n').map(t=>t.trim()).filter(t=>t).map((text,idx)=>({
    id: part.id+'_reading_'+idx,
    text
  }));
}

let htReadingObserver=null;
let htReadingBottomObserver=null;
let htParagraphTimers={};
let htMingeonGateTimer=null;
let htMingeonGateReady=false;

function htEscapeHtml(value){
  return String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function htCardArtHtml(card){
  const art=card&&card.art&&typeof ART!=='undefined'?ART[card.art]:null;
  if(!art) return '';
  return `<img class="summary-img" src="${art.url}" alt="${htEscapeHtml(art.cap)}"/><div class="ht-art-caption">${htEscapeHtml(art.cap)}</div>`;
}

function htClearMingeonGateTimer(){
  if(htMingeonGateTimer){
    clearInterval(htMingeonGateTimer);
    htMingeonGateTimer=null;
  }
  htMingeonGateReady=false;
}

function htGetMingeonFlow(prog,part){
  const groups=Array.isArray(part&&part.mingeonGroups)?part.mingeonGroups:[];
  if(!prog.mingeonFlow||typeof prog.mingeonFlow!=='object'){
    prog.mingeonFlow={};
  }
  const flow=prog.mingeonFlow;
  flow.groupIndex=Math.max(0,Math.min(Number(flow.groupIndex)||0,Math.max(0,groups.length-1)));
  flow.cardIndex=Math.max(0,Number(flow.cardIndex)||0);
  flow.delayedIndex=Math.max(0,Number(flow.delayedIndex)||0);
  flow.phase=['card','delayed','delayedReview','groupDone'].includes(flow.phase)?flow.phase:'card';
  flow.cardStage=['study','recall','sentence'].includes(flow.cardStage)?flow.cardStage:'study';
  flow.completedGroups=Array.isArray(flow.completedGroups)?flow.completedGroups:[];
  flow.selectedKeywordIndexes=Array.isArray(flow.selectedKeywordIndexes)?flow.selectedKeywordIndexes:[];
  flow.sentenceSelections=Array.isArray(flow.sentenceSelections)?flow.sentenceSelections:[];
  flow.cardOpenedAt=Number(flow.cardOpenedAt)||0;
  flow.feedback=typeof flow.feedback==='string'?flow.feedback:'';
  const group=groups[flow.groupIndex];
  if(group&&Array.isArray(group.cards)){
    flow.cardIndex=Math.min(flow.cardIndex,Math.max(0,group.cards.length-1));
    flow.delayedIndex=Math.min(flow.delayedIndex,Math.max(0,group.cards.length-1));
  }
  return flow;
}

function htSaveMingeonFlow(){
  saveHistoryTrainingProgress(htCurrentPartId);
  if(typeof renderIncompleteUnitsSection==='function') renderIncompleteUnitsSection();
}

function htRenderMingeonReading(part){
  htClearMingeonGateTimer();
  const area=document.getElementById('ht-reading-area');
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const groups=Array.isArray(part.mingeonGroups)?part.mingeonGroups:[];
  const flow=htGetMingeonFlow(prog,part);

  if(groups.length===0){
    area.innerHTML='<div class="ht-mingeon-retry">핵심카드를 불러오지 못했어요.</div>';
    return;
  }
  if(prog.readingCompleted){
    area.innerHTML=`<div class="ht-mingeon-wrap"><div class="ht-mingeon-group-done">
      <h3>✅ 핵심카드 확인 완료</h3>
      <p>네 묶음의 내용을 모두 떠올려 보았어요.</p>
      <button class="ht-mingeon-action" type="button" onclick="htGoToStep('transcription')">필사로 이동하기 →</button>
    </div></div>`;
    return;
  }

  const group=groups[flow.groupIndex];
  if(!group){
    htCompleteMingeonReading(part);
    return;
  }
  if(flow.phase==='groupDone'){
    htRenderMingeonGroupDone(part,group,flow);
    return;
  }
  if(flow.phase==='delayed'||flow.phase==='delayedReview'){
    htRenderMingeonDelayed(part,group,flow);
    return;
  }
  htRenderMingeonCard(part,group,flow);
}

function htMingeonHeader(group,flow){
  const cardTotal=(group.cards||[]).length||1;
  const stageIndex=flow.phase==='delayed'||flow.phase==='delayedReview'
    ? cardTotal+Math.min(flow.delayedIndex,cardTotal)
    : Math.min(flow.cardIndex,cardTotal);
  const totalSteps=cardTotal*2;
  const width=Math.max(4,Math.min(100,Math.round((stageIndex/Math.max(1,totalSteps))*100)));
  return `<div class="ht-mingeon-group-label">${htEscapeHtml(group.title)}</div>
    <div class="ht-mingeon-progress"><span style="width:${width}%"></span></div>`;
}

function htRenderMingeonCard(part,group,flow){
  const area=document.getElementById('ht-reading-area');
  const card=group.cards[flow.cardIndex];
  if(!card){
    flow.phase='delayed';
    flow.delayedIndex=0;
    flow.feedback='';
    htSaveMingeonFlow();
    htRenderMingeonReading(part);
    return;
  }

  if(flow.cardStage==='recall'){
    htRenderMingeonRecall(part,group,card,flow);
    return;
  }
  if(flow.cardStage==='sentence'){
    htRenderMingeonSentence(part,group,card,flow);
    return;
  }

  if(!flow.cardOpenedAt) flow.cardOpenedAt=Date.now();
  const selected=new Set(flow.selectedKeywordIndexes.map(Number));
  area.innerHTML=`<div class="ht-mingeon-wrap">
    ${htMingeonHeader(group,flow)}
    <div class="ht-mingeon-card">
      <h3>핵심카드 ${flow.cardIndex+1}/${group.cards.length} · ${htEscapeHtml(card.title)}</h3>
      ${htCardArtHtml(card)}
      <p>${htEscapeHtml(card.text)}</p>
      <div class="ht-mingeon-keywords">
        ${card.keywords.map((kw,i)=>`<button type="button" class="ht-mingeon-keyword${selected.has(i)?' selected':''}" onclick="htToggleMingeonKeyword(${i})">${selected.has(i)?'✅ ':''}${htEscapeHtml(kw)}</button>`).join('')}
      </div>
      <div class="ht-mingeon-guide">핵심 낱말을 모두 누르고 5초 동안 천천히 읽어보세요.</div>
      <button class="ht-mingeon-action" id="ht-mingeon-hide-btn" type="button" onclick="htMingeonHideCard()" disabled>카드 가리기</button>
    </div>
  </div>`;
  htStartMingeonGate(card,flow);
}

function htStartMingeonGate(card,flow){
  htClearMingeonGateTimer();
  const update=()=>{
    const elapsed=Math.max(0,Date.now()-Number(flow.cardOpenedAt||Date.now()));
    const remaining=Math.max(0,Math.ceil((5000-elapsed)/1000));
    const allSelected=card.keywords.every((_,i)=>flow.selectedKeywordIndexes.map(Number).includes(i));
    htMingeonGateReady=remaining===0;
    const btn=document.getElementById('ht-mingeon-hide-btn');
    if(btn){
      btn.disabled=!(allSelected&&htMingeonGateReady);
      btn.textContent=remaining>0?`카드 가리기 · ${remaining}초`:'카드 가리기';
    }
    if(remaining===0&&htMingeonGateTimer){
      clearInterval(htMingeonGateTimer);
      htMingeonGateTimer=null;
    }
  };
  update();
  if(!htMingeonGateReady) htMingeonGateTimer=setInterval(update,250);
}

function htToggleMingeonKeyword(index){
  const part=htGetPart(htCurrentPartId);
  if(!htIsMingeonPart17(part)) return;
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetMingeonFlow(prog,part);
  const group=part.mingeonGroups[flow.groupIndex];
  const card=group&&group.cards[flow.cardIndex];
  if(!card||!card.keywords[index]) return;
  const selected=new Set(flow.selectedKeywordIndexes.map(Number));
  selected.add(Number(index));
  flow.selectedKeywordIndexes=Array.from(selected);
  htSaveMingeonFlow();
  htRenderMingeonCard(part,group,flow);
}

function htMingeonHideCard(){
  const part=htGetPart(htCurrentPartId);
  if(!htIsMingeonPart17(part)) return;
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetMingeonFlow(prog,part);
  const group=part.mingeonGroups[flow.groupIndex];
  const card=group&&group.cards[flow.cardIndex];
  if(!card) return;
  const elapsed=Date.now()-Number(flow.cardOpenedAt||Date.now());
  const allSelected=card.keywords.every((_,i)=>flow.selectedKeywordIndexes.map(Number).includes(i));
  if(elapsed<5000||!allSelected){
    showToast2('핵심 낱말을 모두 누르고 잠시 천천히 읽어보세요.');
    return;
  }
  htClearMingeonGateTimer();
  flow.cardStage='recall';
  flow.feedback='';
  htSaveMingeonFlow();
  htRenderMingeonReading(part);
}

function htRenderMingeonRecall(part,group,card,flow){
  const area=document.getElementById('ht-reading-area');
  area.innerHTML=`<div class="ht-mingeon-wrap">
    ${htMingeonHeader(group,flow)}
    <div class="ht-mingeon-card">
      <h3>가린 뒤 떠올리기</h3>
      <p>${htEscapeHtml(card.recall.q)}</p>
      ${flow.feedback?`<div class="ht-mingeon-retry">${htEscapeHtml(flow.feedback)}</div>`:''}
      <div class="ht-mingeon-choice-grid">
        ${card.recall.options.map((opt,i)=>`<button type="button" class="ht-mingeon-choice" onclick="htChooseMingeonRecall(${i})">${htEscapeHtml(opt)}</button>`).join('')}
      </div>
      <div class="ht-mingeon-guide">급하게 누르지 말고, 머릿속에서 먼저 답을 떠올려 보세요.</div>
    </div>
  </div>`;
}

function htChooseMingeonRecall(optionIndex){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetMingeonFlow(prog,part);
  const group=part.mingeonGroups[flow.groupIndex];
  const card=group.cards[flow.cardIndex];
  if(Number(optionIndex)!==Number(card.recall.answer)){
    flow.feedback='조금만 더 생각해봐요. 핵심 낱말을 떠올려 보세요.';
    htSaveMingeonFlow();
    htRenderMingeonRecall(part,group,card,flow);
    return;
  }
  flow.cardStage='sentence';
  flow.feedback='';
  flow.sentenceSelections=[];
  htSaveMingeonFlow();
  htRenderMingeonReading(part);
}

function htBuildMingeonSentence(card,flow){
  const selected=flow.sentenceSelections||[];
  let html='';
  card.sentence.parts.forEach((partText,i)=>{
    html+=htEscapeHtml(partText);
    if(i<card.sentence.answers.length){
      html+=`<span class="ht-mingeon-blank">${htEscapeHtml(selected[i]||'　')}</span>`;
    }
  });
  return html;
}

function htRenderMingeonSentence(part,group,card,flow){
  const area=document.getElementById('ht-reading-area');
  const selected=flow.sentenceSelections||[];
  const complete=selected.length>=card.sentence.answers.length;
  area.innerHTML=`<div class="ht-mingeon-wrap">
    ${htMingeonHeader(group,flow)}
    <div class="ht-mingeon-card">
      <h3>핵심 문장 완성하기</h3>
      ${flow.feedback?`<div class="ht-mingeon-retry">${htEscapeHtml(flow.feedback)}</div>`:''}
      <div class="ht-mingeon-sentence">${htBuildMingeonSentence(card,flow)}</div>
      ${complete
        ? `<button class="ht-mingeon-action" type="button" style="margin-top:14px" onclick="htMingeonNextCard()">다음 핵심카드 →</button>`
        : `<div class="ht-mingeon-choice-grid">${card.sentence.choices.map((choice,i)=>{
            const used=selected.includes(choice);
            return `<button type="button" class="ht-mingeon-choice" ${used?'disabled':''} onclick="htChooseMingeonSentence(${i})">${htEscapeHtml(choice)}</button>`;
          }).join('')}</div>
          <div class="ht-mingeon-guide">빈칸 순서대로 알맞은 낱말을 골라보세요.</div>`}
    </div>
  </div>`;
}

function htChooseMingeonSentence(choiceIndex){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetMingeonFlow(prog,part);
  const group=part.mingeonGroups[flow.groupIndex];
  const card=group.cards[flow.cardIndex];
  const selected=flow.sentenceSelections||[];
  const choice=card.sentence.choices[choiceIndex];
  const expected=card.sentence.answers[selected.length];
  if(htNormalize(choice)!==htNormalize(expected)){
    flow.feedback='이 문제는 한 번 더 천천히 살펴봐요.';
    flow.sentenceSelections=[];
  }else{
    selected.push(choice);
    flow.sentenceSelections=selected;
    flow.feedback='';
  }
  htSaveMingeonFlow();
  htRenderMingeonSentence(part,group,card,flow);
}

function htMingeonNextCard(){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetMingeonFlow(prog,part);
  const group=part.mingeonGroups[flow.groupIndex];
  if(flow.cardIndex+1<group.cards.length){
    flow.cardIndex++;
    flow.cardStage='study';
    flow.selectedKeywordIndexes=[];
    flow.sentenceSelections=[];
    flow.cardOpenedAt=Date.now();
    flow.feedback='';
  }else{
    flow.phase='delayed';
    flow.delayedIndex=0;
    flow.feedback='';
  }
  htSaveMingeonFlow();
  htRenderMingeonReading(part);
}

function htRenderMingeonDelayed(part,group,flow){
  const area=document.getElementById('ht-reading-area');
  const card=group.cards[flow.delayedIndex];
  if(!card){
    htFinishMingeonGroup(part,group,flow);
    return;
  }
  if(flow.phase==='delayedReview'){
    area.innerHTML=`<div class="ht-mingeon-wrap">
      ${htMingeonHeader(group,flow)}
      <div class="ht-mingeon-card">
        <div class="ht-mingeon-retry">이 문제는 한 번 더 천천히 살펴봐요.</div>
        <h3>${htEscapeHtml(card.title)}</h3>
        <p>${htEscapeHtml(card.text)}</p>
        <div class="ht-mingeon-keywords">${card.keywords.map(kw=>`<div class="ht-mingeon-keyword selected">✅ ${htEscapeHtml(kw)}</div>`).join('')}</div>
        <button class="ht-mingeon-action" type="button" onclick="htRetryMingeonDelayed()">다시 기억해 보기 →</button>
      </div>
    </div>`;
    return;
  }
  area.innerHTML=`<div class="ht-mingeon-wrap">
    ${htMingeonHeader(group,flow)}
    <div class="ht-mingeon-card">
      <h3>조금 뒤 다시 확인 ${flow.delayedIndex+1}/${group.cards.length}</h3>
      <p>${htEscapeHtml(card.delayed.q)}</p>
      <div class="ht-mingeon-choice-grid">
        ${card.delayed.options.map((opt,i)=>`<button type="button" class="ht-mingeon-choice" onclick="htChooseMingeonDelayed(${i})">${htEscapeHtml(opt)}</button>`).join('')}
      </div>
      <div class="ht-mingeon-guide">앞에서 본 카드를 떠올린 뒤 골라보세요.</div>
    </div>
  </div>`;
}

function htChooseMingeonDelayed(optionIndex){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetMingeonFlow(prog,part);
  const group=part.mingeonGroups[flow.groupIndex];
  const card=group.cards[flow.delayedIndex];
  if(Number(optionIndex)!==Number(card.delayed.answer)){
    flow.phase='delayedReview';
    htSaveMingeonFlow();
    htRenderMingeonReading(part);
    return;
  }
  flow.delayedIndex++;
  flow.feedback='';
  if(flow.delayedIndex>=group.cards.length){
    htFinishMingeonGroup(part,group,flow);
    return;
  }
  htSaveMingeonFlow();
  htRenderMingeonReading(part);
}

function htRetryMingeonDelayed(){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetMingeonFlow(prog,part);
  flow.phase='delayed';
  htSaveMingeonFlow();
  htRenderMingeonReading(part);
}

function htFinishMingeonGroup(part,group,flow){
  if(!flow.completedGroups.includes(group.id)) flow.completedGroups.push(group.id);
  flow.phase='groupDone';
  htSaveMingeonFlow();
  htRenderMingeonGroupDone(part,group,flow);
}

function htRenderMingeonGroupDone(part,group,flow){
  const area=document.getElementById('ht-reading-area');
  const isLast=flow.groupIndex>=part.mingeonGroups.length-1;
  area.innerHTML=`<div class="ht-mingeon-wrap">
    ${htMingeonHeader(group,{...flow,phase:'groupDone'})}
    <div class="ht-mingeon-group-done">
      <h3>✅ ${htEscapeHtml(group.title)} 확인 완료</h3>
      <p>${isLast?'네 묶음의 핵심을 모두 떠올려 보았어요.':'짧게 나누어 확인하니 기억하기가 훨씬 쉬워져요.'}</p>
      <button class="ht-mingeon-action" type="button" style="margin-top:16px" onclick="htGoToNextMingeonGroup()">${isLast?'필사 시작하기 →':'다음 묶음 →'}</button>
    </div>
  </div>`;
}

function htGoToNextMingeonGroup(){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetMingeonFlow(prog,part);
  if(flow.groupIndex>=part.mingeonGroups.length-1){
    htCompleteMingeonReading(part);
    return;
  }
  flow.groupIndex++;
  flow.cardIndex=0;
  flow.delayedIndex=0;
  flow.phase='card';
  flow.cardStage='study';
  flow.selectedKeywordIndexes=[];
  flow.sentenceSelections=[];
  flow.cardOpenedAt=Date.now();
  flow.feedback='';
  htSaveMingeonFlow();
  htRenderMingeonReading(part);
}

function htCompleteMingeonReading(part){
  htClearMingeonGateTimer();
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const wasReadingCompleted=!!prog.readingCompleted;
  prog.readingCompleted=true;
  prog.readingProgress={
    viewedParagraphIds:[],
    confirmedParagraphIds:part.mingeonGroups.map(group=>part.id+'_mingeon_'+group.id),
    reachedBottom:true,
    selectedKeySentenceId:part.id+'_mingeon_completed',
    completed:true
  };
  saveHistoryTrainingProgress(htCurrentPartId,wasReadingCompleted?undefined:{
    contentType:'historyTraining',
    contentId:htCurrentPartId+'_reading',
    contentTitle:'핵심카드',
    action:'complete'
  });
  htGoToStep('transcription');
}

function htHasReadingChecks(part){
  return !!part
    && Array.isArray(part.readingCheckCards)
    && part.readingCheckCards.length>0
    && Array.isArray(part.readingCheckFinalQuestions)
    && part.readingCheckFinalQuestions.length>0;
}

function htGetReadingCheckFlow(prog,part){
  if(!prog.readingCheckFlow||typeof prog.readingCheckFlow!=='object'||Array.isArray(prog.readingCheckFlow)){
    prog.readingCheckFlow={};
  }
  const flow=prog.readingCheckFlow;
  const cards=Array.isArray(part&&part.readingCheckCards)?part.readingCheckCards:[];
  flow.cardIndex=Math.max(0,Math.min(Number(flow.cardIndex)||0,Math.max(0,cards.length-1)));
  flow.phase=['reading','review','question','finalReview','finalQuestion','keySentence'].includes(flow.phase)?flow.phase:'reading';
  flow.completedCardIds=Array.isArray(flow.completedCardIds)?flow.completedCardIds:[];
  flow.variantByCard=(flow.variantByCard&&typeof flow.variantByCard==='object'&&!Array.isArray(flow.variantByCard))?flow.variantByCard:{};
  flow.wrongCountByCard=(flow.wrongCountByCard&&typeof flow.wrongCountByCard==='object'&&!Array.isArray(flow.wrongCountByCard))?flow.wrongCountByCard:{};
  flow.finalVariantIndex=Math.max(0,Number(flow.finalVariantIndex)||0);
  flow.finalWrongCount=Math.max(0,Number(flow.finalWrongCount)||0);
  flow.finalCompleted=flow.finalCompleted===true;
  flow.feedback=typeof flow.feedback==='string'?flow.feedback:'';
  return flow;
}

function htHighlightReadingCheckText(card){
  let text=htEscapeHtml(card&&card.text||'');
  const keywords=Array.isArray(card&&card.keywords)?card.keywords.slice().sort((a,b)=>b.length-a.length):[];
  keywords.forEach(keyword=>{
    const safeKeyword=htEscapeHtml(keyword);
    text=text.split(safeKeyword).join('<b>'+safeKeyword+'</b>');
  });
  return text;
}

function htReadingCheckProgressHtml(flow,part){
  const total=part.readingCheckCards.length;
  const done=Math.min(flow.completedCardIds.length,total);
  const percent=Math.round((done/total)*100);
  return `<div class="ht-check-reading-progress-row">
    <b>${done}/${total} 읽기 확인 완료</b><span>${percent}%</span>
  </div><div class="ht-check-reading-progress"><span style="width:${percent}%"></span></div>`;
}

function htRenderCheckedReading(part){
  const area=document.getElementById('ht-reading-area');
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  if(!prog.readingProgress){
    prog.readingProgress={viewedParagraphIds:[],confirmedParagraphIds:[],reachedBottom:false,selectedKeySentenceId:null,completed:false};
  }
  const rp=prog.readingProgress;
  if(!Array.isArray(rp.viewedParagraphIds))rp.viewedParagraphIds=[];
  if(!Array.isArray(rp.confirmedParagraphIds))rp.confirmedParagraphIds=[];
  const flow=htGetReadingCheckFlow(prog,part);
  const cards=part.readingCheckCards;
  let html='<div class="ht-check-reading-wrap">'+htReadingCheckProgressHtml(flow,part);

  if(prog.readingCompleted){
    html+=`<div class="ht-check-reading-done"><div class="ht-check-reading-icon">✅</div><h3>읽기 확인을 완료했어요</h3><p>조선 건국의 흐름을 이해했어요. 이어서 필사를 시작해보세요.</p><button class="start-btn" onclick="htGoToStep('transcription')">필사 시작하기 →</button></div>`;
    area.innerHTML=html+'</div>';
    return;
  }

  if(flow.phase==='reading'||flow.phase==='review'){
    const card=cards[flow.cardIndex];
    const reviewed=flow.phase==='review';
    html+=`<div class="ht-check-reading-label">읽기 ${flow.cardIndex+1} / ${cards.length}</div>`;
    if(reviewed){
      html+=`<div class="ht-check-reading-retry">↩️ 아직 헷갈리는 부분이 있어요. 핵심 내용을 다시 읽고 다른 문제로 확인해볼게요.${flow.feedback?'<small>'+htEscapeHtml(flow.feedback)+'</small>':''}</div>`;
    }
    html+=`<article class="ht-check-reading-card"><h3>${htEscapeHtml(card.title)}</h3>${htCardArtHtml(card)}<p>${htHighlightReadingCheckText(card)}</p></article>
      <div class="ht-check-reading-guide">내용을 읽은 뒤 확인 문제를 풀어야 다음 읽기가 열려요.</div>
      <button class="start-btn" onclick="htOpenReadingCheckQuestion()">내용 확인하기 →</button>`;
  }else if(flow.phase==='question'){
    const card=cards[flow.cardIndex];
    const questions=card.questions||[];
    const variant=(Number(flow.variantByCard[card.id])||0)%Math.max(1,questions.length);
    const question=questions[variant];
    html+=`<div class="ht-check-reading-label">내용 확인 ${flow.cardIndex+1} / ${cards.length}</div>
      <section class="ht-check-question-card"><div class="ht-check-question-note">읽기 내용은 잠시 접었어요.</div><h3>${htEscapeHtml(question.q)}</h3>
      <div class="ht-check-option-grid">${question.options.map((option,index)=>`<button type="button" onclick="htSubmitReadingCheckOption(${index})">${index+1}. ${htEscapeHtml(option)}</button>`).join('')}</div></section>`;
  }else if(flow.phase==='finalReview'){
    html+=`<div class="ht-check-reading-retry">↩️ 조선 건국의 전체 흐름을 한 번 더 확인해보세요.${flow.feedback?'<small>'+htEscapeHtml(flow.feedback)+'</small>':''}</div>
      <div class="ht-check-flow-review">${cards.map((card,index)=>`<div><b>${index+1}</b><span>${htEscapeHtml(card.title)}</span></div>`).join('')}</div>
      <button class="start-btn" onclick="htContinueFinalReadingCheck()">전체 흐름 다시 확인하기 →</button>`;
  }else if(flow.phase==='finalQuestion'){
    const questions=part.readingCheckFinalQuestions;
    const question=questions[flow.finalVariantIndex%questions.length];
    html+=`<div class="ht-check-reading-label">마지막 전체 흐름 확인</div>
      <section class="ht-check-question-card"><div class="ht-check-question-note">6개 읽기의 연결 순서를 생각해보세요.</div><h3>${htEscapeHtml(question.q)}</h3>
      <div class="ht-check-option-grid">${question.options.map((option,index)=>`<button type="button" onclick="htSubmitFinalReadingCheck(${index})">${index+1}. ${htEscapeHtml(option)}</button>`).join('')}</div></section>`;
  }else if(flow.phase==='keySentence'){
    const candidates=part.transcriptionSentences.slice(0,3);
    html+=`<div class="ht-check-reading-done"><div class="ht-check-reading-icon">🎉</div><h3>모든 읽기 확인을 통과했어요</h3><p>마지막으로 가장 중요하다고 생각하는 문장을 하나 골라보세요.</p></div>
      <div class="ht-key-sentence-box"><div class="ht-key-sentence-title">핵심 문장 선택</div>
      ${candidates.map((sentence,index)=>{
        const sentenceId=part.id+'_key_'+index;
        const selected=rp.selectedKeySentenceId===sentenceId;
        return `<div class="ht-key-sentence-option${selected?' selected':''}" onclick="htSelectCheckedKeySentence(${index})"><span>${selected?'✅':'○'}</span> ${htEscapeHtml(sentence)}</div>`;
      }).join('')}</div>
      <button class="start-btn" onclick="htConfirmCheckedReading()" ${rp.selectedKeySentenceId?'':'disabled'}>필사 시작하기 →</button>`;
  }
  area.innerHTML=html+'</div>';
}

function htOpenReadingCheckQuestion(){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetReadingCheckFlow(prog,part);
  const card=part.readingCheckCards[flow.cardIndex];
  const viewedId=part.id+'_reading_'+flow.cardIndex;
  if(!prog.readingProgress.viewedParagraphIds.includes(viewedId))prog.readingProgress.viewedParagraphIds.push(viewedId);
  flow.phase='question';
  flow.feedback='';
  saveHistoryTrainingProgress(htCurrentPartId);
  htRenderCheckedReading(part);
}

function htSubmitReadingCheckOption(selectedIndex){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetReadingCheckFlow(prog,part);
  if(flow.phase!=='question')return;
  const card=part.readingCheckCards[flow.cardIndex];
  const questions=card.questions||[];
  const variant=(Number(flow.variantByCard[card.id])||0)%Math.max(1,questions.length);
  const question=questions[variant];
  if(Number(selectedIndex)===Number(question.answer)){
    SFX.correct();
    if(!flow.completedCardIds.includes(card.id))flow.completedCardIds.push(card.id);
    const confirmedId=part.id+'_reading_'+flow.cardIndex;
    if(!prog.readingProgress.confirmedParagraphIds.includes(confirmedId))prog.readingProgress.confirmedParagraphIds.push(confirmedId);
    showToast2('✅ 읽은 내용을 정확히 확인했어요!');
    if(flow.completedCardIds.length>=part.readingCheckCards.length){
      flow.phase='finalQuestion';
    }else{
      flow.cardIndex=Math.min(flow.cardIndex+1,part.readingCheckCards.length-1);
      flow.phase='reading';
    }
    flow.feedback='';
  }else{
    SFX.wrong();
    flow.wrongCountByCard[card.id]=(Number(flow.wrongCountByCard[card.id])||0)+1;
    flow.variantByCard[card.id]=(variant+1)%Math.max(1,questions.length);
    flow.feedback=question.explain||'';
    flow.phase='review';
  }
  saveHistoryTrainingProgress(htCurrentPartId);
  htRenderCheckedReading(part);
}

function htContinueFinalReadingCheck(){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetReadingCheckFlow(prog,part);
  flow.phase='finalQuestion';
  flow.feedback='';
  saveHistoryTrainingProgress(htCurrentPartId);
  htRenderCheckedReading(part);
}

function htSubmitFinalReadingCheck(selectedIndex){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetReadingCheckFlow(prog,part);
  if(flow.phase!=='finalQuestion')return;
  const questions=part.readingCheckFinalQuestions;
  const question=questions[flow.finalVariantIndex%questions.length];
  if(Number(selectedIndex)===Number(question.answer)){
    SFX.complete();
    flow.finalCompleted=true;
    flow.phase='keySentence';
    flow.feedback='';
    prog.readingProgress.reachedBottom=true;
    showToast2('✅ 전체 흐름까지 정확히 이해했어요!');
  }else{
    SFX.wrong();
    flow.finalWrongCount+=1;
    flow.finalVariantIndex=(flow.finalVariantIndex+1)%questions.length;
    flow.feedback=question.explain||'';
    flow.phase='finalReview';
  }
  saveHistoryTrainingProgress(htCurrentPartId);
  htRenderCheckedReading(part);
}

function htSelectCheckedKeySentence(index){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetReadingCheckFlow(prog,part);
  if(flow.phase!=='keySentence')return;
  prog.readingProgress.selectedKeySentenceId=part.id+'_key_'+Number(index);
  saveHistoryTrainingProgress(htCurrentPartId);
  htRenderCheckedReading(part);
}

function htConfirmCheckedReading(){
  const part=htGetPart(htCurrentPartId);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const flow=htGetReadingCheckFlow(prog,part);
  const ready=flow.finalCompleted
    && flow.completedCardIds.length>=part.readingCheckCards.length
    && !!prog.readingProgress.selectedKeySentenceId;
  if(!ready){
    showToast2('⚠️ 읽기 확인과 핵심 문장 선택을 완료해주세요!');
    return;
  }
  const wasReadingCompleted=!!prog.readingCompleted;
  prog.readingProgress.reachedBottom=true;
  prog.readingProgress.completed=true;
  prog.readingCompleted=true;
  saveHistoryTrainingProgress(htCurrentPartId,wasReadingCompleted?undefined:{
    contentType:'historyTraining',contentId:htCurrentPartId+'_reading',contentTitle:'읽기 확인',action:'complete'
  });
  htGoToStep('transcription');
}

function htRenderReading(part){
  if(htIsMingeonPart17(part)){
    htRenderMingeonReading(part);
    return;
  }
  if(htHasReadingChecks(part)){
    htRenderCheckedReading(part);
    return;
  }
  const area=document.getElementById('ht-reading-area');
  const store=getHistoryTrainingProgressStore();
  const prog=store[htCurrentPartId];
  if(!prog.readingProgress){
    prog.readingProgress={viewedParagraphIds:[],confirmedParagraphIds:[],reachedBottom:false,selectedKeySentenceId:null,completed:false};
  }
  const rp=prog.readingProgress;
  const paragraphs=htSplitReadingParagraphs(part);
  const keySentenceCandidates=part.transcriptionSentences.slice(0,3);

  let html=paragraphs.map(p=>{
    let text=p.text;
    part.keywords.slice().sort((a,b)=>b.length-a.length).forEach(kw=>{
      text=text.split(kw).join('<b>'+kw+'</b>');
    });
    const confirmed=rp.confirmedParagraphIds.includes(p.id);
    return `<div class="ht-reading-paragraph" data-paragraph-id="${p.id}">
      <div class="ht-reading-card">${text}</div>
      <button type="button" class="ht-para-confirm-btn${confirmed?' confirmed':''}" data-paragraph-id="${p.id}" ${confirmed?'disabled':'disabled'} onclick="htConfirmParagraph('${p.id}')">${confirmed?'✅ 확인했어요':'읽었어요'}</button>
    </div>`;
  }).join('');

  html+='<div id="ht-reading-bottom-sentinel" style="height:2px"></div>';

  html+=`<div class="ht-key-sentence-box">
    <div class="ht-key-sentence-title">가장 중요하다고 생각하는 문장을 하나 골라보세요.</div>
    ${keySentenceCandidates.map((s,i)=>{
      const sid=part.id+'_key_'+i;
      const selected=rp.selectedKeySentenceId===sid;
      return `<div class="ht-key-sentence-option${selected?' selected':''}" data-key-id="${sid}" onclick="htSelectKeySentence('${sid}')"><span class="ht-key-mark">${selected?'✅':'○'}</span> ${s}</div>`;
    }).join('')}
  </div>`;

  html+='<div class="ht-reading-hint" id="ht-reading-hint">읽기 내용을 끝까지 확인하면 필사를 시작할 수 있어요.</div>';
  html+='<button class="start-btn" id="ht-reading-confirm-btn" onclick="htConfirmReading()" disabled>필사 시작하기 →</button>';

  area.innerHTML=html;

  // 이미 확인된 문단은 버튼 활성 상태 유지
  rp.confirmedParagraphIds.forEach(id=>{
    const btn=area.querySelector(`.ht-para-confirm-btn[data-paragraph-id="${id}"]`);
    if(btn) btn.disabled=false;
  });

  htSetupReadingObservers(paragraphs, rp);
  htCheckReadingCompletion();

  const firstUnconfirmed=paragraphs.find(p=>!rp.confirmedParagraphIds.includes(p.id));
  if(firstUnconfirmed){
    setTimeout(()=>{
      const el=area.querySelector(`[data-paragraph-id="${firstUnconfirmed.id}"]`);
      if(el && el.scrollIntoView) el.scrollIntoView({behavior:'smooth', block:'center'});
    }, 150);
  }
}

function htSetupReadingObservers(paragraphs, rp){
  if(typeof IntersectionObserver==='undefined')return;
  if(htReadingObserver) htReadingObserver.disconnect();
  if(htReadingBottomObserver) htReadingBottomObserver.disconnect();
  Object.values(htParagraphTimers).forEach(t=>clearTimeout(t));
  htParagraphTimers={};

  htReadingObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const id=entry.target.dataset.paragraphId;
      if(rp.confirmedParagraphIds.includes(id))return;
      if(entry.isIntersecting && entry.intersectionRatio>=0.7){
        if(!rp.viewedParagraphIds.includes(id)) rp.viewedParagraphIds.push(id);
        if(!htParagraphTimers[id]){
          htParagraphTimers[id]=setTimeout(()=>{
            const btn=document.querySelector(`.ht-para-confirm-btn[data-paragraph-id="${id}"]`);
            if(btn) btn.disabled=false;
          },2000);
        }
      }else if(htParagraphTimers[id]){
        clearTimeout(htParagraphTimers[id]);
        delete htParagraphTimers[id];
      }
    });
  },{threshold:[0,0.7]});

  document.querySelectorAll('.ht-reading-paragraph').forEach(el=>htReadingObserver.observe(el));

  htReadingBottomObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        rp.reachedBottom=true;
        htCheckReadingCompletion();
      }
    });
  },{threshold:0.1});
  const sentinel=document.getElementById('ht-reading-bottom-sentinel');
  if(sentinel) htReadingBottomObserver.observe(sentinel);
}

function htConfirmParagraph(paragraphId){
  const store=getHistoryTrainingProgressStore();
  const prog=store[htCurrentPartId];
  const rp=prog.readingProgress;
  if(!rp.confirmedParagraphIds.includes(paragraphId)) rp.confirmedParagraphIds.push(paragraphId);
  const btn=document.querySelector(`.ht-para-confirm-btn[data-paragraph-id="${paragraphId}"]`);
  if(btn){ btn.classList.add('confirmed'); btn.textContent='✅ 확인했어요'; btn.disabled=true; }
  if(htParagraphTimers[paragraphId]){ clearTimeout(htParagraphTimers[paragraphId]); delete htParagraphTimers[paragraphId]; }
  saveHistoryTrainingProgress(htCurrentPartId);
  htCheckReadingCompletion();
}

function htSelectKeySentence(sentenceId){
  const store=getHistoryTrainingProgressStore();
  const rp=store[htCurrentPartId].readingProgress;
  rp.selectedKeySentenceId=sentenceId;
  document.querySelectorAll('.ht-key-sentence-option').forEach(el=>{
    const isSel=el.dataset.keyId===sentenceId;
    el.classList.toggle('selected', isSel);
    const mark=el.querySelector('.ht-key-mark');
    if(mark) mark.textContent=isSel?'✅':'○';
  });
  saveHistoryTrainingProgress(htCurrentPartId);
  htCheckReadingCompletion();
}

function htCheckReadingCompletion(){
  const store=getHistoryTrainingProgressStore();
  const prog=store[htCurrentPartId];
  if(!prog || !prog.readingProgress) return false;
  const rp=prog.readingProgress;
  const part=htGetPart(htCurrentPartId);
  const paragraphs=htSplitReadingParagraphs(part);
  const allConfirmed=paragraphs.every(p=>rp.confirmedParagraphIds.includes(p.id));
  const complete=allConfirmed && rp.reachedBottom && !!rp.selectedKeySentenceId;
  rp.completed=complete;
  const btn=document.getElementById('ht-reading-confirm-btn');
  const hint=document.getElementById('ht-reading-hint');
  if(btn) btn.disabled=!complete;
  if(hint) hint.style.display=complete?'none':'block';
  return complete;
}

function htConfirmReading(){
  if(!htCheckReadingCompletion()){
    showToast2('⚠️ 읽기 내용을 끝까지 확인해주세요!');
    return;
  }
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const wasReadingCompleted=!!prog.readingCompleted; // 실제 미완료→완료 전환인지 확인하기 위한 이전 상태
  prog.readingCompleted=true;
  saveHistoryTrainingProgress(htCurrentPartId, wasReadingCompleted?undefined:{contentType:'historyTraining',contentId:htCurrentPartId+'_reading',contentTitle:'읽기',action:'complete'});
  htGoToStep('transcription');
}

// ── 2단계: 필사하기 ──
let htCurrentSentenceTypedDirectly=false;
let htInputProtectionBound=false;

function setupHistoryTrainingInputProtection(){
  bindHistoryTrainingTranscriptionEvents();
}

function bindHistoryTrainingTranscriptionEvents(){
  const area=document.getElementById('ht-transcription-area');
  if(!area || area.dataset.pasteBound==='1')return;
  area.dataset.pasteBound='1';

  area.addEventListener('paste', (evt)=>{
    if(evt.target && evt.target.id==='ht-transcribe-input'){
      evt.preventDefault();
      showHistoryTrainingPasteWarning();
    }
  });
  area.addEventListener('cut', (evt)=>{
    if(evt.target && evt.target.id==='ht-transcribe-input'){
      evt.preventDefault();
    }
  });
  area.addEventListener('drop', (evt)=>{
    evt.preventDefault();
    showHistoryTrainingPasteWarning();
  });
  area.addEventListener('dragover', (evt)=>{ evt.preventDefault(); });
  area.addEventListener('contextmenu', (evt)=>{
    if(evt.target && evt.target.id==='ht-transcribe-input'){ evt.preventDefault(); }
  });
  area.addEventListener('input', (evt)=>{
    if(evt.target && evt.target.id==='ht-transcribe-input'){
      htCurrentSentenceTypedDirectly=true;
    }
  });
}

function showHistoryTrainingPasteWarning(){
  const fb=document.getElementById('ht-transcribe-feedback');
  if(fb){
    fb.className='ht-sentence-feedback bad';
    fb.textContent='필사는 직접 입력해야 해요. 문장을 천천히 따라 써 보세요!';
  }
}

function validateDirectTranscriptionInput(){
  return htCurrentSentenceTypedDirectly;
}

function htRenderTranscription(part){
  const area=document.getElementById('ht-transcription-area');
  const idx=htTranscriptionIdx;
  const sentences=htGetTranscriptionSentences(part);
  const total=sentences.length;
  if(idx>=total){
    const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
    const wasTranscriptionCompleted=!!prog.transcriptionCompleted;
    prog.transcriptionCompleted=true;
    htGoToStep('quiz', wasTranscriptionCompleted?undefined:{contentType:'historyTraining',contentId:htCurrentPartId+'_transcription',contentTitle:'필사',action:'complete'});
    return;
  }
  const sentence=sentences[idx];
  htCurrentSentenceTypedDirectly=false;
  area.innerHTML=`
    <div style="font-size:12px;color:var(--sand);margin-bottom:8px;font-weight:700">✍️ 필사 ${idx+1}/${total}</div>
    <div class="ht-sentence-block">
      <div class="ht-sentence-original">${sentence}</div>
      <textarea class="ht-sentence-input" id="ht-transcribe-input" placeholder="위 문장을 따라 써보세요" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
      <div class="ht-sentence-feedback" id="ht-transcribe-feedback"></div>
    </div>
    <button class="start-btn" onclick="htCheckTranscriptionSentence(${idx})">확인</button>
  `;
  setupHistoryTrainingInputProtection();
  document.getElementById('ht-transcribe-input').focus();
}

function htCheckTranscriptionSentence(idx){
  const part=htGetPart(htCurrentPartId);
  const sentence=htGetTranscriptionSentences(part)[idx];
  const input=document.getElementById('ht-transcribe-input').value.trim();
  const feedback=document.getElementById('ht-transcribe-feedback');
  if(!input){
    feedback.className='ht-sentence-feedback bad';
    feedback.textContent='문장을 입력해주세요.';
    return;
  }
  if(!validateDirectTranscriptionInput()){
    feedback.className='ht-sentence-feedback bad';
    feedback.textContent='필사는 직접 입력해야 해요. 문장을 천천히 따라 써 보세요!';
    document.getElementById('ht-transcribe-input').value='';
    return;
  }
  const normInput=htNormalize(input);
  const normOriginal=htNormalize(sentence);
  const distance=htLevenshteinDistance(normOriginal, normInput);
  if(distance>2){
    feedback.className='ht-sentence-feedback bad';
    feedback.textContent='원문과 다른 부분이 있어요. 문장을 다시 한번 확인하고 써 보세요!';
    SFX.wrong();
    return;
  }
  feedback.className='ht-sentence-feedback ok';
  feedback.textContent='✅ 통과!';
  SFX.correct();
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  htEnsureProgressArrays_(prog);
  const sentId=htCurrentPartId+'_sentence'+idx;
  if(!prog.completedTranscriptionSentenceIds.includes(sentId)) prog.completedTranscriptionSentenceIds.push(sentId);
  if(htIsMingeonPart17(part)) saveHistoryTrainingProgress(htCurrentPartId);
  htTranscriptionIdx++;
  setTimeout(()=>{ htRenderTranscription(part); }, 450);
}

// ── 3단계: 빈칸 채우기 ──
function htRenderQuiz(part){
  const area=document.getElementById('ht-quiz-area');
  const idx=htQuizIdx;
  const questions=htGetQuestionsForStudent(part);
  if(idx>=questions.length){
    const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
    const wasQuizStepDone=prog.currentStep==='firstResult'||prog.currentStep==='review'||prog.currentStep==='completed';
    htGoToStep('firstResult', wasQuizStepDone?undefined:{contentType:'historyTraining',contentId:htCurrentPartId+'_quiz',contentTitle:htIsMingeonPart17(part)?'확인 문제':'빈칸 채우기',action:'complete'});
    return;
  }
  const q=questions[idx];
  if(q.type==='mc'){
    area.innerHTML=`
      <div class="ht-quiz-card">
        <div class="ht-quiz-progress">확인 문제 ${idx+1} / ${questions.length}</div>
        <div class="ht-quiz-text">${htEscapeHtml(q.text)}</div>
        <div class="ht-mingeon-choice-grid" id="ht-mc-choice-grid">
          ${q.options.map((option,i)=>`<button type="button" class="ht-mingeon-choice" id="ht-mc-choice-${i}" onclick="htSelectQuizOption(${i})">${i+1}. ${htEscapeHtml(option)}</button>`).join('')}
        </div>
        <div class="ht-quiz-feedback" id="ht-quiz-feedback"></div>
        <div id="ht-quiz-hint-area"></div>
      </div>
    `;
    return;
  }
  area.innerHTML=`
    <div class="ht-quiz-card">
      <div class="ht-quiz-progress">문제 ${idx+1} / ${questions.length}</div>
      <div class="ht-quiz-text">${q.text}</div>
      <input type="text" class="ht-quiz-input" id="ht-quiz-input" placeholder="정답을 입력하세요"/>
      <div class="ht-quiz-feedback" id="ht-quiz-feedback"></div>
      <div id="ht-quiz-hint-area"></div>
      <button class="start-btn" id="ht-quiz-submit-btn" onclick="htSubmitQuizAnswer()">제출</button>
    </div>
  `;
  document.getElementById('ht-quiz-input').focus();
  document.getElementById('ht-quiz-input').onkeydown=(e)=>{ if(e.key==='Enter') htSubmitQuizAnswer(); };
}

function htSubmitQuizAnswer(){
  const part=htGetPart(htCurrentPartId);
  const q=htGetQuestionsForStudent(part)[htQuizIdx];
  const input=document.getElementById('ht-quiz-input').value.trim();
  const feedback=document.getElementById('ht-quiz-feedback');
  const isCorrect=q.answers.some(a=>htNormalize(a)===htNormalize(input));
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];

  if(isCorrect){
    SFX.correct();
    prog.firstCorrectCount=(prog.firstCorrectCount||0)+1;
    if(!prog.answeredQuestionIds.includes(q.id)) prog.answeredQuestionIds.push(q.id);
    feedback.className='ht-quiz-feedback ok';
    feedback.textContent='✅ 정답이에요!';
    document.getElementById('ht-quiz-submit-btn').disabled=true;
    setTimeout(()=>{ htQuizIdx++; htQuizAttempt=1; htRenderQuiz(part); }, 450);
    return;
  }

  SFX.wrong();
  if(htQuizAttempt===1){
    htQuizAttempt=2;
    feedback.className='ht-quiz-feedback bad';
    feedback.textContent='아쉬워요, 한 번 더 입력해보세요!';
    document.getElementById('ht-quiz-input').value='';
    document.getElementById('ht-quiz-input').focus();
  }else{
    prog.firstWrongCount=(prog.firstWrongCount||0)+1;
    if(!prog.firstWrongQuestionIds.includes(q.id)) prog.firstWrongQuestionIds.push(q.id);
    if(!prog.answeredQuestionIds.includes(q.id)) prog.answeredQuestionIds.push(q.id);
    feedback.className='ht-quiz-feedback bad';
    feedback.textContent='다음 문제로 넘어갈게요. 이 문제는 나중에 다시 풀어요!';
    document.getElementById('ht-quiz-hint-area').innerHTML=`<div class="ht-quiz-hint">💡 ${q.hint}</div>`;
    const btn=document.getElementById('ht-quiz-submit-btn');
    btn.textContent='다음 문제 →';
    btn.onclick=()=>{
      htQuizIdx++; htQuizAttempt=1;
      htRenderQuiz(part);
    };
  }
}

function htLockMcChoices(){
  document.querySelectorAll('#ht-mc-choice-grid .ht-mingeon-choice').forEach(btn=>{ btn.disabled=true; });
}

function htSelectQuizOption(optionIndex){
  const part=htGetPart(htCurrentPartId);
  const q=htGetQuestionsForStudent(part)[htQuizIdx];
  if(!q||q.type!=='mc') return;
  const feedback=document.getElementById('ht-quiz-feedback');
  const hintArea=document.getElementById('ht-quiz-hint-area');
  const selectedBtn=document.getElementById('ht-mc-choice-'+optionIndex);
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const isCorrect=Number(optionIndex)===Number(q.answer);

  if(isCorrect){
    SFX.correct();
    htLockMcChoices();
    if(selectedBtn) selectedBtn.classList.add('correct');
    prog.firstCorrectCount=(prog.firstCorrectCount||0)+1;
    if(!prog.answeredQuestionIds.includes(q.id)) prog.answeredQuestionIds.push(q.id);
    saveHistoryTrainingProgress(htCurrentPartId);
    feedback.className='ht-quiz-feedback ok';
    feedback.textContent='✅ 정답이에요!';
    setTimeout(()=>{ htQuizIdx++; htQuizAttempt=1; htRenderQuiz(part); },450);
    return;
  }

  SFX.wrong();
  if(selectedBtn){
    selectedBtn.classList.add('wrong');
    selectedBtn.disabled=true;
  }
  if(htQuizAttempt===1){
    htQuizAttempt=2;
    feedback.className='ht-quiz-feedback bad';
    feedback.textContent='이 문제는 한 번 더 천천히 살펴봐요.';
    if(hintArea) hintArea.innerHTML=`<div class="ht-quiz-hint">💡 ${htEscapeHtml(q.hint)}</div>`;
    return;
  }

  htLockMcChoices();
  const correctBtn=document.getElementById('ht-mc-choice-'+q.answer);
  if(correctBtn) correctBtn.classList.add('correct');
  prog.firstWrongCount=(prog.firstWrongCount||0)+1;
  if(!prog.firstWrongQuestionIds.includes(q.id)) prog.firstWrongQuestionIds.push(q.id);
  if(!prog.answeredQuestionIds.includes(q.id)) prog.answeredQuestionIds.push(q.id);
  saveHistoryTrainingProgress(htCurrentPartId);
  feedback.className='ht-quiz-feedback bad';
  feedback.textContent=`정답은 ${q.options[q.answer]}예요. 잠시 뒤 다시 확인해요.`;
  if(hintArea){
    hintArea.innerHTML=`<div class="ht-quiz-hint">💡 ${htEscapeHtml(q.hint)}</div>
      <button class="start-btn" type="button" id="ht-mc-next-btn">다음 문제 →</button>`;
    const nextBtn=document.getElementById('ht-mc-next-btn');
    if(nextBtn) nextBtn.onclick=()=>{ htQuizIdx++; htQuizAttempt=1; htRenderQuiz(part); };
  }
}

// ── 4단계: 최초 결과 확인 ──
function htShowFirstResult(part){
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const total=htGetQuestionsForStudent(part).length;
  const correct=prog.firstCorrectCount||0;
  const wrong=prog.firstWrongCount||0;
  const score=Math.round((correct/total)*100);
  prog.firstScore=score;
  prog.remainingWrongQuestionIds=prog.firstWrongQuestionIds.slice();
  saveHistoryTrainingProgress(htCurrentPartId);

  if(wrong===0){
    const wasPartCompleted=!!prog.completed;
    prog.reviewCompleted=true;
    prog.completed=true;
    prog.completedAt=new Date().toLocaleString('ko-KR');
    saveHistoryTrainingProgress(htCurrentPartId, wasPartCompleted?undefined:{contentType:'historyTraining',contentId:htCurrentPartId,contentTitle:part.title||'',action:'complete'});
    SFX.complete();
    htGoToStep('completed');
    return;
  }

  const area=document.getElementById('ht-first-result-area');
  area.innerHTML=`
    <div class="ht-result-card">
      <div class="ht-result-score">${score}점</div>
      <div class="ht-result-row">
        <div><b>${correct}</b>정답</div>
        <div><b>${wrong}</b>오답</div>
      </div>
      <p style="color:var(--sand);font-size:13px;margin:10px 0 16px">틀린 문제 ${wrong}개를 모두 맞혀야 완료돼요. 잠시 후 자동으로 시작합니다.</p>
    </div>
  `;
  setTimeout(()=>htGoToStep('review'),1000);
}

// ── 5단계: 틀린 문제 다시 풀기 ──
function htStartReview(part){
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  htReviewQueue=(prog.remainingWrongQuestionIds&&prog.remainingWrongQuestionIds.length)
    ? prog.remainingWrongQuestionIds.slice()
    : prog.firstWrongQuestionIds.slice();
  htRenderReviewQuestion(part);
}

function htRenderReviewQuestion(part){
  const area=document.getElementById('ht-review-area');
  if(htReviewQueue.length===0){
    const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
    const wasPartCompleted=!!prog.completed;
    prog.reviewCompleted=true;
    prog.completed=true;
    prog.completedAt=new Date().toLocaleString('ko-KR');
    prog.remainingWrongQuestionIds=[];
    saveHistoryTrainingProgress(htCurrentPartId, wasPartCompleted?undefined:{contentType:'historyTraining',contentId:htCurrentPartId,contentTitle:(htGetPart(htCurrentPartId)||{}).title||'',action:'complete'});
    area.innerHTML=`<div class="ht-result-card">
      <div style="font-size:15px;font-weight:900;color:#7ecb94;margin-bottom:14px">🎉 틀린 문제까지 모두 다시 맞혔어요! 학습 완료!</div>
      <button class="start-btn" onclick="htGoToStep('completed')">완료 화면 보기 →</button>
    </div>`;
    return;
  }
  const qid=htReviewQueue[0];
  const q=htGetQuestionsForStudent(part).find(x=>x.id===qid);
  if(q&&q.type==='mc'){
    area.innerHTML=`
      <div class="ht-quiz-card">
        <div class="ht-quiz-progress">다시 확인 · 남은 문제 ${htReviewQueue.length}개</div>
        <div class="ht-quiz-text">${htEscapeHtml(q.text)}</div>
        <div class="ht-mingeon-choice-grid" id="ht-review-mc-grid">
          ${q.options.map((option,i)=>`<button type="button" class="ht-mingeon-choice" id="ht-review-mc-${i}" onclick="htSelectReviewOption(${i})">${i+1}. ${htEscapeHtml(option)}</button>`).join('')}
        </div>
        <div class="ht-quiz-feedback" id="ht-review-feedback"></div>
        <div id="ht-review-hint-area"></div>
      </div>
    `;
    return;
  }
  area.innerHTML=`
    <div class="ht-quiz-card">
      <div class="ht-quiz-progress">오답 복습 · 남은 문제 ${htReviewQueue.length}개</div>
      <div class="ht-quiz-text">${q.text}</div>
      <input type="text" class="ht-quiz-input" id="ht-review-input" placeholder="정답을 입력하세요"/>
      <div class="ht-quiz-feedback" id="ht-review-feedback"></div>
      <div id="ht-review-hint-area"></div>
      <button class="start-btn" onclick="htSubmitReviewAnswer()">제출</button>
    </div>
  `;
  document.getElementById('ht-review-input').focus();
  document.getElementById('ht-review-input').onkeydown=(e)=>{ if(e.key==='Enter') htSubmitReviewAnswer(); };
}

function htSubmitReviewAnswer(){
  const part=htGetPart(htCurrentPartId);
  const qid=htReviewQueue[0];
  const q=htGetQuestionsForStudent(part).find(x=>x.id===qid);
  const input=document.getElementById('ht-review-input').value.trim();
  const feedback=document.getElementById('ht-review-feedback');
  const isCorrect=q.answers.some(a=>htNormalize(a)===htNormalize(input));
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];

  if(isCorrect){
    SFX.correct();
    htReviewQueue.shift();
    prog.remainingWrongQuestionIds=htReviewQueue.slice();
    saveHistoryTrainingProgress(htCurrentPartId);
    feedback.className='ht-quiz-feedback ok';
    feedback.textContent='✅ 정답이에요!';
    setTimeout(()=>htRenderReviewQuestion(part), 450);
  }else{
    SFX.wrong();
    feedback.className='ht-quiz-feedback bad';
    feedback.textContent='아직이에요, 힌트를 보고 다시 시도해보세요!';
    document.getElementById('ht-review-hint-area').innerHTML=`<div class="ht-quiz-hint">💡 ${q.hint}</div>`;
    document.getElementById('ht-review-input').value='';
    document.getElementById('ht-review-input').focus();
  }
}

function htSelectReviewOption(optionIndex){
  const part=htGetPart(htCurrentPartId);
  const qid=htReviewQueue[0];
  const q=htGetQuestionsForStudent(part).find(x=>x.id===qid);
  if(!q||q.type!=='mc') return;
  const feedback=document.getElementById('ht-review-feedback');
  const hintArea=document.getElementById('ht-review-hint-area');
  const selectedBtn=document.getElementById('ht-review-mc-'+optionIndex);
  const isCorrect=Number(optionIndex)===Number(q.answer);

  if(isCorrect){
    SFX.correct();
    document.querySelectorAll('#ht-review-mc-grid .ht-mingeon-choice').forEach(btn=>{ btn.disabled=true; });
    if(selectedBtn) selectedBtn.classList.add('correct');
    htReviewQueue.shift();
    const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
    prog.remainingWrongQuestionIds=htReviewQueue.slice();
    saveHistoryTrainingProgress(htCurrentPartId);
    feedback.className='ht-quiz-feedback ok';
    feedback.textContent='✅ 정답이에요!';
    setTimeout(()=>htRenderReviewQuestion(part),450);
    return;
  }

  SFX.wrong();
  if(selectedBtn){
    selectedBtn.classList.add('wrong');
    selectedBtn.disabled=true;
  }
  feedback.className='ht-quiz-feedback bad';
  feedback.textContent='이 문제는 한 번 더 천천히 살펴봐요.';
  if(hintArea) hintArea.innerHTML=`<div class="ht-quiz-hint">💡 ${htEscapeHtml(q.hint)}</div>`;
}

// ── 6단계: 최종 완료 ──
function htShowFinalResult(part){
  const prog=getHistoryTrainingProgressStore()[htCurrentPartId];
  const idx=historyTrainingData.findIndex(p=>p.id===htCurrentPartId);
  const isLast=idx===historyTrainingData.length-1;
  const area=document.getElementById('ht-final-result-area');
  SFX.complete();
  area.innerHTML=`
    <div class="ht-result-card">
      <div style="font-size:15px;font-weight:900;color:#7ecb94;margin-bottom:10px">🎉 PART ${part.partNumber} 완료!</div>
      <div class="ht-result-score">${prog.firstScore}점</div>
      <div class="ht-result-row">
        <div><b>${prog.firstCorrectCount||0}</b>최초 정답</div>
        <div><b>${prog.firstWrongCount||0}</b>최초 오답</div>
      </div>
      <p style="color:#7ecb94;font-size:12px;margin:6px 0 16px">✅ 오답 복습 완료</p>
      ${isLast
        ? `<button class="start-btn" onclick="showHistoryTrainingList()">전체 목록 보기</button>`
        : `<button class="start-btn" onclick="htGoToNextPart()">다음 PART로 이동 →</button>`}
    </div>
  `;
}

function htGoToNextPart(){
  const idx=historyTrainingData.findIndex(p=>p.id===htCurrentPartId);
  const next=historyTrainingData[idx+1];
  if(next) openHistoryTrainingPart(next.id);
}

// ── 서버 저장/불러오기 ──
async function apiSendMessage(name,from,text){
  if(isDeveloperTestMode())return {ok:false}; // 쪽지는 관리자모드에서도 실제 저장되는 예외라 isLearningWriteBlocked() 전체는 안 쓰고 테스트모드만 차단
  if(!apiConfigured())return {ok:false};
  try{
    const body=new URLSearchParams();
    body.set('action','sendMessage');
    body.set('name',name);
    body.set('from',from);
    body.set('text',text);
    const res=await fetch(API_URL,{method:'POST',body});
    return await res.json();
  }catch(e){console.error(e);return {ok:false};}
}

async function apiGetMessages(name,role,markRead){
  if(!apiConfigured())return {ok:false,items:[]};
  try{
    const url=API_URL+'?action=getMessages&name='+encodeURIComponent(name)+'&role='+encodeURIComponent(role)+'&markRead='+(markRead?'true':'false');
    const res=await fetch(url);
    return await res.json();
  }catch(e){console.error(e);return {ok:false,items:[]};}
}

async function apiDeleteMessage(name,messageId){
  if(!apiConfigured())return {ok:false,error:'api not configured'};
  try{
    const body=new URLSearchParams();
    body.set('action','deleteMessage');
    body.set('name',name);
    body.set('messageId',messageId);
    body.set('token',adminToken||'');
    const res=await fetch(API_URL,{method:'POST',body});
    const data=await res.json();
    handleAdminUnauthorized_(data);
    return data;
  }catch(e){
    console.error(e);
    return {ok:false,error:'network error'};
  }
}

async function apiSetTimelineGame(name,data){
  if(isLearningWriteBlocked())return false;
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setTimelineGame');
    body.set('name',name);
    body.set('data',JSON.stringify(data));
    body.set('isAdminMode',isAdminSessionActive()?'true':'false');

    const res=await fetch(API_URL,{method:'POST',body});
    const payload=await res.json();

    if(!res.ok||!payload||payload.ok!==true){
      console.error('setTimelineGame 저장 오류:',res.status,payload);
      return false;
    }
    return true;
  }catch(error){
    console.error('setTimelineGame 요청 실패:',error);
    return false;
  }
}

async function apiListTimelineGame(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=listTimelineGame',{cache:'no-store'});
    const payload=await res.json();

    if(!res.ok){
      console.error('listTimelineGame HTTP 오류:',res.status,payload);
      return {};
    }
    if(payload&&payload.ok===false){
      console.error('listTimelineGame 백엔드 오류:',payload.error||payload.message||payload);
      return {};
    }
    return (payload&&typeof payload==='object')?payload:{};
  }catch(error){
    console.error('listTimelineGame 요청 실패:',error);
    return {};
  }
}

async function apiSetMapStudy(name,data){
  if(isLearningWriteBlocked())return false;
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setMapStudy');
    body.set('name',name);
    body.set('data',JSON.stringify(data));
    body.set('isAdminMode', isAdminSessionActive()?'true':'false');
    const res=await fetch(API_URL,{method:'POST',body});
    const d=await res.json();
    return !!d.ok;
  }catch(e){console.error(e);return false;}
}

async function apiGetMapStudy(name){
  if(!apiConfigured()||!name)return {};
  try{
    const res=await fetch(API_URL+'?action=getMapStudy&name='+encodeURIComponent(name),{cache:'no-store'});
    const payload=await res.json();
    if(!res.ok||!payload||payload.ok===false){
      console.error('getMapStudy 오류:',res.status,payload);
      return {};
    }
    return payload.data&&typeof payload.data==='object'?payload.data:(payload.mapStudy&&typeof payload.mapStudy==='object'?payload.mapStudy:payload);
  }catch(e){console.error('getMapStudy 요청 실패:',e);return {};}
}

async function apiSetHistoryTraining(name,partId,data){
  if(isLearningWriteBlocked())return false;
  if(!apiConfigured())return false;
  try{
    const body=new URLSearchParams();
    body.set('action','setHistoryTraining');
    body.set('name',name);
    body.set('partId',partId);
    body.set('data',JSON.stringify(data));
    body.set('isAdminMode', isAdminSessionActive()?'true':'false');
    const res=await fetch(API_URL,{method:'POST',body});
    const d=await res.json();
    return !!d.ok;
  }catch(e){console.error(e);return false;}
}

async function apiListHistoryTraining(){
  if(!apiConfigured())return {};
  try{
    const res=await fetch(API_URL+'?action=listHistoryTraining');
    const data=await res.json();
    return (data&&typeof data==='object')?data:{};
  }catch(e){console.error(e);return {};}
}

// 전체 학생이 아니라 한 명(name)만 필요할 때(로그인 직후·홈 화면 진입 시) 쓰는 가벼운 조회.
// 관리자 전체현황판처럼 정말 전원이 필요한 화면은 계속 apiListHistoryTraining을 쓴다.
async function apiGetHistoryTraining(name){
  if(!apiConfigured()||!name)return {};
  try{
    const res=await fetch(API_URL+'?action=getHistoryTraining&name='+encodeURIComponent(name),{cache:'no-store'});
    const data=await res.json();
    return (data&&typeof data==='object')?data:{};
  }catch(e){console.error(e);return {};}
}

// ===== 화이트리스트 읽기 API에만 single-flight+10초 캐시 적용 =====
// verifyPin/adminLogin/verifyAdminPasswordOnly/setPin/resetPin/submit/저장·수정·삭제/
// logAccess/logLogin/logLearningEvent/correctResult/토큰 요청은 절대 포함하지 않음
apiGetContentVisibility=__wrapReadApi(apiGetContentVisibility, ()=>'getContentVisibility');
apiList=__wrapReadApi(apiList, ()=>'list');
apiGetAvatars=__wrapReadApi(apiGetAvatars, ()=>'getAvatars');
apiListNotes=__wrapReadApi(apiListNotes, ()=>'listNotes');
apiListMoods=__wrapReadApi(apiListMoods, ()=>'listMoods');
apiListAccessLog=__wrapReadApi(apiListAccessLog, ()=>'listAccessLog');
apiListHistoryTraining=__wrapReadApi(apiListHistoryTraining, ()=>'listHistoryTraining');
apiGetHistoryTraining=__wrapReadApi(apiGetHistoryTraining, (name)=>'getHistoryTraining:'+name);
apiListTimelineGame=__wrapReadApi(apiListTimelineGame, ()=>'listTimelineGame');
apiListStudyTime=__wrapReadApi(apiListStudyTime, ()=>'listStudyTime');
apiListDeadlines=__wrapReadApi(apiListDeadlines, ()=>'listDeadlines');
apiGetMapStudy=__wrapReadApi(apiGetMapStudy, (name)=>'getMapStudy:'+name);
apiGetStudyPlanner=__wrapReadApi(apiGetStudyPlanner, (name)=>'getStudyPlanner:'+name);
apiGetKingOrderProgress=__wrapReadApi(apiGetKingOrderProgress, (name)=>'getKingOrderProgress:'+name);
apiListKingOrderProgress=__wrapReadApi(apiListKingOrderProgress, ()=>'listKingOrderProgress');
// getMessages는 markRead=true(읽음처리, 부작용 있음)일 때는 캐시를 우회해야 하므로 별도 래핑
const __apiGetMessagesOriginal=apiGetMessages;
apiGetMessages=function(name,role,markRead){
  if(markRead) return __apiGetMessagesOriginal(name,role,markRead); // 부작용 있는 호출은 캐시 안 씀
  return __wrapReadApi(__apiGetMessagesOriginal, (n,r)=>'getMessages:'+n+':'+r)(name,role,markRead);
};
// 기록(감사로그) API는 화면 진입을 절대 기다리게 하지 않고, 순차 큐를 통해 1개씩만 전송(기존 eventId/재시도 로직은 그대로 유지)
function __wrapAuditApi(fn){
  return function(...args){
    return new Promise((resolve,reject)=>{
      __enqueueAuditLog(()=>fn.apply(this,args).then(resolve,reject));
    });
  };
}
// 저장 성공 후 관련 읽기캐시를 무효화(다음 조회부터 최신값 반영) — 계산식·저장로직 자체는 안 건드림
function __wrapInvalidateOnSave(fn, invalidateFn){
  return async function(...args){
    const result=await fn.apply(this,args);
    try{ invalidateFn(...args); }catch(e){}
    return result;
  };
}
apiSubmit=__wrapInvalidateOnSave(apiSubmit, ()=>__invalidateReadCache('list'));
apiCorrectResult=__wrapInvalidateOnSave(apiCorrectResult, ()=>__invalidateReadCache('list'));
apiSetTimelineGame=__wrapInvalidateOnSave(apiSetTimelineGame, ()=>__invalidateReadCache('listTimelineGame'));
apiSetHistoryTraining=__wrapInvalidateOnSave(apiSetHistoryTraining, ()=>__invalidateReadCache('listHistoryTraining'));
apiSetMapStudy=__wrapInvalidateOnSave(apiSetMapStudy, (name)=>__invalidateReadCache('getMapStudy:'+name));
apiSetStudyPlanner=__wrapInvalidateOnSave(apiSetStudyPlanner, (name)=>__invalidateReadCache('getStudyPlanner:'+name));
apiSetKingOrderEraComplete=__wrapInvalidateOnSave(apiSetKingOrderEraComplete, (name)=>{
  __invalidateReadCache('getKingOrderProgress:'+name);
  __invalidateReadCache('listKingOrderProgress');
});
apiSendMessage=__wrapInvalidateOnSave(apiSendMessage, (name)=>__invalidateReadCache('getMessages:'+name));
apiDeleteMessage=__wrapInvalidateOnSave(apiDeleteMessage, (name)=>__invalidateReadCache('getMessages:'+name));

apiLogAccess=__wrapAuditApi(apiLogAccess);
apiLogLogin=__wrapAuditApi(apiLogLogin);
apiLogLearningEvent=__wrapAuditApi(apiLogLearningEvent);

apiVerifyPin=__wrapAuthApi(apiVerifyPin);
apiAdminLogin=__wrapAuthApi(apiAdminLogin);
apiVerifyAdminPasswordOnly=__wrapAuthApi(apiVerifyAdminPasswordOnly);


function saveHistoryTrainingProgress(partId,eventHint){
  if(isLearningWriteBlocked()){
    console.log('[역사훈련소 저장 스킵: 쓰기 차단 모드]', {partId, isAdmin:isAdminSessionActive(), isDevTest:isDeveloperTestMode(), parentChildViewActive});
    return;
  }
  if(!playerName||!historyTrainingProgress[playerName]){
    console.warn('[역사훈련소 저장 스킵] playerName 또는 historyTrainingProgress[playerName]이 비어있음', {playerName, partId});
    if(typeof showToast2==='function') showToast2('⚠️ 학생 정보를 찾지 못해 저장을 건너뛰었어요.');
    return;
  }
  const prog=historyTrainingProgress[playerName][partId];
  if(!prog){
    console.warn('[역사훈련소 저장 스킵] 이 PART의 진행 데이터가 없음', {playerName, partId});
    if(typeof showToast2==='function') showToast2('⚠️ 진행 데이터를 찾지 못해 저장을 건너뛰었어요.');
    return;
  }
  const requestedName=playerName; // 저장 완료 시점에 학생이 바뀌었는지 확인하기 위한 스냅샷

  // 1) 메모리 캐시(historyTrainingProgress)는 호출 전에 이미 최신 상태 — 화면부터 즉시 갱신
  if(typeof renderHomeSummaryCard==='function') renderHomeSummaryCard();
  if(typeof renderIncompleteUnitsSection==='function') renderIncompleteUnitsSection();

  // 2) 서버 저장은 백그라운드에서 처리 (화면은 이미 갱신된 뒤라 기다리지 않음)
  // 순차 큐를 통해 한 번에 하나씩만 전송 — 병렬 전송 시 응답 순서가 뒤바뀌어
  // 최신 완료 상태가 오래된 상태로 덮어써지는 경쟁 상태를 방지한다.
  __enqueueHistoryTrainingSave(partId,()=>apiSetHistoryTraining(playerName,partId,prog).then(ok=>{
    if(ok===false){
      if(typeof showToast2==='function') showToast2('⚠️ 역사 훈련소 저장에 실패했어요. 서버 기록으로 다시 맞출게요.');
      // 실패 시에만 서버 기준으로 강제 재동기화해서, 잘못 표시된 화면이 남지 않게 함
      loadStudentDataIfStale(requestedName, true);
    }else if(eventHint){
      // 기존 저장이 성공한 것을 확인한 뒤에만 완료 이벤트를 기록 (저장 전에 미리 기록하지 않음)
      enqueueLearningEvent_(eventHint);
    }
  }));
}

async function loadHistoryTrainingProgress(){
  const map=await apiListHistoryTraining();
  if(!map){ historyTrainingProgress=historyTrainingProgress||{}; return; }
  // 전체 덮어쓰기 대신 학생×PART 단위로 병합 — 방금 완료 처리해서 로컬이 completed:true인데
  // 저장이 서버에 아직 반영되기 전에 이 함수가 겹쳐 실행되면(백그라운드 갱신 등),
  // 서버의 오래된 completed:false로 로컬 완료 상태가 되돌아가던 경합조건을 방지함
  const merged={};
  Object.keys(map).forEach(name=>{
    const serverParts=map[name]||{};
    const localParts=(historyTrainingProgress&&historyTrainingProgress[name])||{};
    merged[name]={};
    Object.keys(serverParts).forEach(partId=>{
      const serverPart=serverParts[partId];
      const localPart=localParts[partId];
      // 로컬이 이미 완료(completed:true)인데 서버가 아직 미완료(false)로 온 경우에만 로컬을 유지
      if(localPart && localPart.completed===true && serverPart && serverPart.completed!==true){
        merged[name][partId]=localPart;
      }else{
        merged[name][partId]=serverPart;
      }
    });
    // 서버에 없고 로컬에만 있는(막 생성된) PART 기록도 유지
    Object.keys(localParts).forEach(partId=>{
      if(!(partId in merged[name])) merged[name][partId]=localParts[partId];
    });
  });
  historyTrainingProgress=merged;
}

// 전체가 아니라 한 명(name)만 서버에서 새로 받아와 그 학생 슬롯만 갱신한다(다른 학생 데이터는 건드리지 않음).
// 병합 규칙은 loadHistoryTrainingProgress()와 동일 — 로컬이 이미 완료(completed:true)인데
// 서버가 아직 반영 전(false)이면 로컬을 유지해서 화면이 다시 미완료로 풀리는 걸 막는다.
async function loadHistoryTrainingProgressForName_(name){
  if(!name)return;
  const serverParts=await apiGetHistoryTraining(name)||{};
  const localParts=(historyTrainingProgress&&historyTrainingProgress[name])||{};
  const merged={};
  Object.keys(serverParts).forEach(partId=>{
    const serverPart=serverParts[partId];
    const localPart=localParts[partId];
    if(localPart && localPart.completed===true && serverPart && serverPart.completed!==true){
      merged[partId]=localPart;
    }else{
      merged[partId]=serverPart;
    }
  });
  Object.keys(localParts).forEach(partId=>{
    if(!(partId in merged)) merged[partId]=localParts[partId];
  });
  historyTrainingProgress=historyTrainingProgress||{};
  historyTrainingProgress[name]=merged;
}

function showParentMode(){
  __activatePrivilegedAuthGate_('parent');
  __cancelPendingBackgroundLoads(); // 부모님확인 진입 — 대기 중인 백그라운드 조회 취소
  document.getElementById('parent-pw-error').textContent='';
  document.getElementById('parent-pw-input').value='';
  document.getElementById('parent-pw-overlay').classList.add('show');
  setTimeout(()=>document.getElementById('parent-pw-input').focus(),100);
}

function closeParentPw(){
  __releasePrivilegedAuthGate_(window.__privilegedAuthGateState.epoch);
  document.getElementById('parent-pw-overlay').classList.remove('show');
}

function checkParentPassword(){
  const val=document.getElementById('parent-pw-input').value.trim();
  if(!val){
    document.getElementById('parent-pw-error').textContent='비밀번호를 입력해주세요.';
    return;
  }
  if(val==='1111'){
    document.getElementById('parent-pw-overlay').classList.remove('show');
    enterStudyTimeViewerMode(); // 부모님 확인에서는 공부시간·집중시간을 완전히 차단
    renderParentScreen();
  }else{
    document.getElementById('parent-pw-error').textContent='비밀번호가 틀렸어요.';
  }
}

function renderParentScreen(){
  document.getElementById('start-screen').style.display='none';
  document.getElementById('parent-screen').style.display='block';
  document.getElementById('parent-result-area').innerHTML='';
  const picker=document.getElementById('parent-student-picker');
  picker.innerHTML='';
  STUDENTS.forEach(s=>{
    const avatar=avatarMap[s.name]||s.avatar;
    const c=document.createElement('div');
    c.className='student-card';
    c.innerHTML=`<div class="student-avatar">${renderAvatarHtml(avatar,34)}</div><div class="student-name">${s.name}</div>`;
    c.onclick=()=>openParentStudentLearningView(s.name,c);
    picker.appendChild(c);
  });
}


function isUnitCompletedForParent(name,unitKey){
  const unit=UNITS[unitKey];
  if(!unit)return false;
  const progress=unit.examMode
    ? calculateSummaryQuizProgress(name,unitKey)
    : calculateUnitProgress(name,unitKey);
  return !!(progress&&progress.completed);
}

function hasCompletedHistoryTrainingForParent(name){
  return Array.isArray(historyTrainingData)&&historyTrainingData.some(part=>{
    const p=calculateHistoryTrainingProgress(name,part.id);
    return !!(p&&p.completed);
  });
}

function hasCompletedTimelineForParent(name){
  return ['easy','medium','hard'].some(key=>isDiffPassed(key,name));
}

function hasCompletedMapStudyForParent(name){
  const progress=getMapStudyProgress(name)||{};
  return Object.values(progress).some(item=>item&&item.passed);
}

function ensureParentChildViewBar(){
  const home=document.getElementById('learning-home-view');
  if(!home)return;
  let bar=document.getElementById('parent-child-view-bar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='parent-child-view-bar';
    bar.className='parent-child-view-bar';
    home.insertBefore(bar,home.firstChild);
  }
  bar.innerHTML=`<span>👨‍👩‍👧 ${parentChildViewName}의 완료 학습 화면</span>
    <button type="button" onclick="backToParentStudentPicker()">아이 목록</button>`;
  bar.style.display='flex';
}

function applyParentCompletedOnlyView(){
  if(!parentChildViewActive||!parentChildViewName)return;

  // 미완료 학습 목록은 보여주되 시작/이어하기는 잠금
  const incompleteWrap=document.getElementById('incomplete-section-wrap');
  if(incompleteWrap){
    incompleteWrap.classList.remove('parent-view-hidden');
    incompleteWrap.classList.add('parent-incomplete-locked');

    const body=document.getElementById('incomplete-units-body');
    if(body){
      body.style.display='flex';
      body.querySelectorAll('[data-action="resume-learning"],.ht-part-btn').forEach(btn=>{
        btn.setAttribute('aria-disabled','true');
        btn.setAttribute('title','미완료 학습은 부모님 화면에서 열 수 없습니다.');
      });

      if(!body.querySelector('.parent-incomplete-lock-note')){
        body.insertAdjacentHTML('afterbegin',
          '<div class="parent-incomplete-lock-note">🔒 미완료 학습은 확인만 가능하며 문제는 열리지 않습니다.</div>');
      }
    }

    const arrow=document.getElementById('incomplete-section-arrow');
    if(arrow)arrow.textContent='▾';
  }

  // 홈의 미완료 개수는 표시하되, 오늘 이어하기 버튼은 숨김
  document.querySelectorAll('.home-incomplete-count').forEach(el=>el.classList.remove('parent-view-hidden'));
  document.querySelectorAll('.home-resume-row').forEach(el=>el.classList.add('parent-view-hidden'));

  // UNIT: 완료/미완료 모두 표시. 미완료는 잠금 처리
  document.querySelectorAll('#unit-grid .unit-card[data-unit-key]').forEach(card=>{
    const key=card.dataset.unitKey;
    const completed=isUnitCompletedForParent(parentChildViewName,key);

    card.classList.remove('parent-view-hidden');
    card.classList.toggle('parent-unit-locked',!completed);
    card.dataset.parentLocked=completed?'false':'true';
    card.setAttribute('aria-disabled',completed?'false':'true');
    card.setAttribute('title',completed?'완료한 단원 다시 풀기':'미완료 단원 · 문제 열기 불가');
  });

  // UNIT 그룹은 전부 표시
  getAllUnitGroups_().map(g=>g.id).forEach(groupId=>{
    const group=document.getElementById(groupId);
    if(!group)return;
    group.style.display='flex';
    const toggle=group.previousElementSibling;
    if(toggle)toggle.classList.remove('parent-view-hidden');
    const arrow=document.getElementById(groupId+'-arrow');
    if(arrow)arrow.textContent='▾';
  });

  // 역사 학습 콘텐츠는 기존대로 완료한 콘텐츠만 체험 가능
  const section=document.getElementById('timeline-game-section');
  if(section){
    const historyCard=section.querySelector('[data-learning-content="historyTraining"]');
    const kingCard=section.querySelector('[data-learning-content="kingOrder"]');
    const mapCard=section.querySelector('[data-learning-content="mapStudy"]');
    if(historyCard)historyCard.classList.toggle('parent-view-hidden',!hasCompletedHistoryTrainingForParent(parentChildViewName));
    if(kingCard)kingCard.classList.add('parent-view-hidden');
    if(mapCard)mapCard.classList.toggle('parent-view-hidden',!hasCompletedMapStudyForParent(parentChildViewName));
  }

  // 설정·쪽지·다른 학생 로그인은 부모님 화면에서 숨김
  document.querySelectorAll('#learning-home-view .settings-btn,#learning-home-view .learning-name-mail-btn,#learning-home-view .change-student-btn')
    .forEach(el=>el.classList.add('parent-view-hidden'));

  ensureParentChildViewBar();
}

document.addEventListener('click',event=>{
  if(!parentChildViewActive)return;

  const lockedUnit=event.target.closest('.parent-unit-locked');
  if(lockedUnit){
    event.preventDefault();
    event.stopPropagation();
    if(typeof showToast2==='function')showToast2('🔒 아직 완료하지 않은 단원은 문제를 볼 수 없어요.');
    return;
  }

  const incompleteAction=event.target.closest('#incomplete-section-wrap [data-action="resume-learning"],#incomplete-section-wrap .ht-part-btn');
  if(incompleteAction){
    event.preventDefault();
    event.stopPropagation();
    if(typeof showToast2==='function')showToast2('🔒 미완료 학습은 부모님 화면에서 열 수 없어요.');
  }
},true);

async function openParentStudentLearningView(name,cardEl){
  document.querySelectorAll('#parent-student-picker .student-card').forEach(c=>c.classList.remove('selected'));
  if(cardEl)cardEl.classList.add('selected');

  parentSelectedName=name;
  const area=document.getElementById('parent-result-area');
  if(area)area.innerHTML='<div class="lb-empty">불러오는 중...</div>';

  const [, , entries, studyTimeMap] = await Promise.all([
    loadHistoryTrainingProgress(),
    loadScore(),
    apiList(),
    apiListStudyTime(),
    loadKingOrderProgress(name,{syncLocal:false})
  ]);

  if(parentSelectedName!==name)return;

  allEntriesCache=Array.isArray(entries)?entries:[];
  studyTimeServerCache=studyTimeMap||{};
  await loadMapStudyProgress(name);
  await loadStudyPlannerData(name);

  parentChildViewActive=true;
  parentChildViewName=name;
  enterStudyTimeViewerMode();
  playerName=name;
  loginTimestamp=0;
  quizActiveFlag=false;

  document.getElementById('parent-screen').style.display='none';
  document.getElementById('start-screen').style.display='block';

  renderUnitGrid();
  updateSelectedNameBanner();
  showLearningHomeView();
  updateStudyTimeDisplays();

  requestAnimationFrame(()=>{
    applyParentCompletedOnlyView();
    const banner=document.getElementById('selected-name-banner');
    if(banner&&!banner.querySelector('.parent-view-readonly-note')){
      banner.insertAdjacentHTML('beforeend','<div class="parent-view-readonly-note">완료한 학습은 다시 풀 수 있고, 미완료 학습은 목록만 확인할 수 있습니다. 학습 기록은 변경되지 않습니다.</div>');
    }
  });
}

function backToParentStudentPicker(){
  document.body.classList.remove('parent-unit-practice');
  parentChildViewActive=false;
  parentChildViewName='';
  enterStudyTimeViewerMode();
  playerName='';
  document.getElementById('parent-child-view-bar')?.remove();
  document.querySelectorAll('.parent-view-hidden').forEach(el=>el.classList.remove('parent-view-hidden'));
  document.getElementById('start-screen').style.display='none';
  renderParentScreen();
}

let parentSelectedName=null; // 학생을 빠르게 전환해도 늦게 도착한 응답이 이전 학생 화면을 덮지 않도록 하는 가드

async function renderParentResult(name,cardEl){
  enterStudyTimeViewerMode();
  document.querySelectorAll('#parent-student-picker .student-card').forEach(c=>c.classList.remove('selected'));
  if(cardEl) cardEl.classList.add('selected');
  const area=document.getElementById('parent-result-area');
  area.innerHTML='<div class="lb-empty">불러오는 중...</div>';
  parentSelectedName=name; // 이 시점 이후 이 이름이 "지금 보여줘야 할" 학생

  // GAS 통신 5개를 병렬로(성능 저하 없이) — 공부시간·왕순서도 함께 조회
  const [, , entries, studyTimeMap] = await Promise.all([
    loadHistoryTrainingProgress(),
    loadScore(),
    apiList(),
    apiListStudyTime(),
    loadKingOrderProgress(name,{syncLocal:false})
  ]);
  allEntriesCache=entries;
  studyTimeServerCache=studyTimeMap;

  if(parentSelectedName!==name) return; // 그 사이 다른 학생으로 전환됐으면 이 응답은 화면에 반영하지 않음

  const prog=getUnifiedProgressForUI(name);
  const moduleIncompleteCount=getModuleIncompleteCountForUI(prog);
  const statusText=prog.completed?'✅ 모든 학습을 완료했어요':`🟡 미완료 학습 ${moduleIncompleteCount}개`;

  area.innerHTML=`
    <div class="src-progress" style="margin-top:14px">
      <div class="src-progress-label">📊 ${name} 전체 학습 진행률 ${prog.percent}%</div>
      <div class="src-progress-bar"><div class="src-progress-fill" style="width:${prog.percent}%"></div></div>
    </div>
    <p style="text-align:center;color:var(--sand);font-size:13px;margin-top:14px">${statusText}</p>
    ${(()=>{
      const t=getStudyTimeSummary(name);
      return `<div class="src-progress" style="margin-top:14px">
        <div class="src-progress-label">⏱ 활성 학습시간</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px">
          <div class="teacher-stat-card"><div class="teacher-stat-num">${formatStudySeconds(t.todaySeconds)}</div><div class="teacher-stat-label">오늘</div></div>
          <div class="teacher-stat-card"><div class="teacher-stat-num">${formatStudySeconds(t.weekSeconds)}</div><div class="teacher-stat-label">이번 주</div></div>
          <div class="teacher-stat-card"><div class="teacher-stat-num">${formatStudySeconds(t.totalSeconds)}</div><div class="teacher-stat-label">누적</div></div>
          <div class="teacher-stat-card"><div class="teacher-stat-num">${t.focusPercent}%</div><div class="teacher-stat-label">오늘 집중도</div></div>
          <div class="teacher-stat-card"><div class="teacher-stat-num">${formatStudySeconds(t.focusModeTodaySeconds)}</div><div class="teacher-stat-label">집중모드</div></div>
          <div class="teacher-stat-card"><div class="teacher-stat-num">${t.focusModeLeaveCount}회</div><div class="teacher-stat-label">오늘 앱 이탈</div></div>
        </div>
      </div>`;
    })()}
    <button class="teacher-back" style="margin-top:14px" onclick="openStudyPlannerForViewer('${name}','parent')">📅 스터디플래너 확인</button>
  `;
}

function closePwModal(){
  document.getElementById('pw-overlay').classList.remove('show');
  setPrivilegedAuthOverlayOpen_(false);
  __releasePrivilegedAuthGate_(window.__privilegedAuthGateState.epoch);
}

document.getElementById('pw-input').addEventListener('keydown',e=>{if(e.key==='Enter')checkPassword();});

async function checkPassword(){
  window.__perfMark&&window.__perfMark('선생님 비밀번호확인 클릭');
  const pw=document.getElementById('pw-input').value.trim();
  if(!pw){
    document.getElementById('pw-error').textContent='비밀번호를 입력해주세요.';
    return;
  }
  const confirmButton=document.querySelector('#pw-overlay .pw-confirm');
  const originalButtonText=confirmButton?confirmButton.textContent:'';
  if(confirmButton){
    confirmButton.disabled=true;
    confirmButton.textContent='확인 중...';
  }
  try{
    const result=await apiVerifyAdminPasswordOnly(pw);
    if(!result || !result.ok){
      document.getElementById('pw-error').textContent = (result && result.error==='ADMIN_PASSWORD_NOT_CONFIGURED')
        ? '관리자 비밀번호가 아직 설정되지 않았어요. 관리자에게 문의해주세요.'
        : '비밀번호가 틀렸어요.';
      return;
    }
    window.__perfMark&&window.__perfMark('선생님 비밀번호창 닫힘(성공)');
    // 선생님확인은 조회 전용 화면 — adminToken은 절대 저장하지 않음(전체 관리자 권한 미부여)
    // 관리자 로그인 상태에서 전환하는 경우 기존 토큰을 그대로 남겨두지 않고 여기서 확실히 폐기함
    const previousAdminToken=adminToken;
    adminDetailAccessActive=false;
    adminToken=null;
    if(typeof closeStudentDetailPanel==='function') closeStudentDetailPanel(); // 상세패널 DOM·학생데이터·cursor 전부 초기화
    if(previousAdminToken){
      apiAdminLogout(previousAdminToken).catch(err=>console.error('기존 관리자 토큰 폐기 실패(무시하고 화면 전환 진행):',err));
    }
    if(typeof renderStudentCards==='function') renderStudentCards(); // 상세 기록 버튼 제거 확실히
    closePwModal();
    __backgroundLoadGeneration++; // 선생님 화면 위에서 이전 startup 대기작업이 재개되지 않도록(showTeacherNoAuth가 필요한 것만 새로 조회)
    document.getElementById('start-screen').style.display='none';
    document.getElementById('teacher-screen').style.display='block';
    window.__perfMark&&window.__perfMark('선생님화면표시');
    // 인증 성공 직후 화면부터 전환하고, 상세 조회 데이터는 선생님 화면의 로딩 상태에서 이어서 받습니다.
    window.__perfMark&&window.__perfMark('showTeacherNoAuth 시작');
    showTeacherNoAuth().catch(error=>console.error('선생님 확인 데이터 로드 실패:',error));
  }finally{
    if(confirmButton){
      confirmButton.disabled=false;
      confirmButton.textContent=originalButtonText;
    }
  }
}

async function resetByDateUI(btn){
  const dateInput=document.getElementById('reset-date-input');
  const dateVal=dateInput.value;
  if(!dateVal){
    showToast2('⚠️ 먼저 날짜를 선택해주세요.');
    return;
  }
  if(btn.dataset.confirming!=='1'){
    btn.dataset.confirming='1';
    btn.textContent=dateVal+' 기록 삭제할까요? 다시 눌러 확인';
    setTimeout(()=>{btn.dataset.confirming='0';btn.textContent='🗓️ 이 날짜 기록만 초기화';},4000);
    return;
  }
  btn.dataset.confirming='0';
  btn.textContent='🗓️ 이 날짜 기록만 초기화';
  const res=await apiResetByDate(dateVal);
  if(res.ok){
    showToast2(`✅ ${dateVal} 기록 ${res.count||0}건이 삭제됐어요.`);
  }else{
    showToast2('⚠️ 초기화 실패 (백엔드 연결을 확인하세요)');
  }
  showTeacherNoAuth();
}

async function resetStudentByDateUI(btn,name){
  const dateInput=document.getElementById('reset-date-'+name);
  const dateVal=dateInput.value;
  if(!dateVal){
    showToast2('⚠️ 먼저 날짜를 선택해주세요.');
    return;
  }
  if(btn.dataset.confirming!=='1'){
    btn.dataset.confirming='1';
    btn.textContent=dateVal+' 삭제? 다시 눌러 확인';
    setTimeout(()=>{btn.dataset.confirming='0';btn.textContent='🗓️ 이 날짜만';},4000);
    return;
  }
  btn.dataset.confirming='0';
  btn.textContent='🗓️ 이 날짜만';
  const res=await apiResetByDate(dateVal,name);
  if(res.ok){
    showToast2(`✅ ${name}님의 ${dateVal} 기록 ${res.count||0}건이 삭제됐어요.`);
  }else{
    showToast2('⚠️ 초기화 실패 (백엔드 연결을 확인하세요)');
  }
  showTeacherNoAuth();
}

async function resetAllRecords(btn){
  if(btn.dataset.confirming!=='1'){
    btn.dataset.confirming='1';
    btn.textContent='정말 삭제할까요? 다시 눌러 확인';
    setTimeout(()=>{btn.dataset.confirming='0';btn.textContent='🗑️ 전체 기록 초기화';},4000);
    return;
  }
  btn.dataset.confirming='0';
  btn.textContent='🗑️ 전체 기록 초기화';
  const ok=await apiReset();
  if(ok){
    showToast2('✅ 모든 기록이 초기화되었습니다.');
  }else{
    showToast2('⚠️ 초기화 실패 (백엔드 연결을 확인하세요)');
  }
  showTeacherNoAuth();
}

function showToast2(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>{t.classList.remove('show');t.textContent='✅ 결과가 제출되었습니다!';},2500);
}

function toggleWrongView(id){
  const el=document.getElementById(id);
  if(el) el.style.display = el.style.display==='none' ? 'block' : 'none';
}

function toggleAttempts(name){
  const list=document.getElementById('attempts-list-'+name);
  const arrow=document.getElementById('attempts-arrow-'+name);
  if(!list)return;
  const isHidden=list.style.display==='none';
  list.style.display=isHidden?'flex':'none';
  if(arrow) arrow.textContent=isHidden?'▴':'▾';
}

function toggleDeadlineSettings(){
  const list=document.getElementById('deadline-setting-list');
  const arrow=document.getElementById('deadline-toggle-arrow');
  if(!list)return;
  const isHidden=list.style.display==='none';
  list.style.display=isHidden?'block':'none';
  if(arrow) arrow.textContent=isHidden?'▴':'▾';
}

function toggleStudentCard(name){
  const body=document.getElementById('src-body-'+name);
  const arrow=document.getElementById('src-body-arrow-'+name);
  if(!body)return;
  const isHidden=body.style.display==='none';
  body.style.display=isHidden?'block':'none';
  if(arrow) arrow.textContent=isHidden?'▴':'▾';
}

function toggleStudentManagement(name){
  const body=document.getElementById('src-management-body-'+name);
  const arrow=document.getElementById('src-management-arrow-'+name);
  if(!body)return;
  const isHidden=body.style.display==='none';
  body.style.display=isHidden?'block':'none';
  if(arrow) arrow.textContent=isHidden?'▴':'▾';
}

function toggleTeacherGlobalManagement(){
  const body=document.getElementById('teacher-global-management-body');
  const arrow=document.getElementById('teacher-global-management-arrow');
  if(!body)return;
  const isHidden=body.style.display==='none';
  body.style.display=isHidden?'block':'none';
  if(arrow) arrow.textContent=isHidden?'▴':'▾';
}

function computeCompletionPercent(name, allEntries){
  const mine=allEntries.filter(e=>e.name===name);
  const unitKeys=getActiveUnitKeys();

  // 정리문제(시험모드)를 뺀, 기본/심화가 있는 일반 단원만 대상으로 계산
  const normalUnitKeys=unitKeys.filter(key=>!UNITS[key].examMode);

  let easyCompleted=0, hardCompleted=0;
  normalUnitKeys.forEach(key=>{
    const u=UNITS[key];
    const mineUnit=mine.filter(e=>entryMatchesUnit(e,key));
    if(mineUnit.some(e=>e.level==='기본' && e.pass)) easyCompleted++;
    if(mineUnit.some(e=>e.level==='심화' && e.pass)) hardCompleted++;
  });
  const normalTotal=normalUnitKeys.length;
  const easyPct=normalTotal>0?Math.round((easyCompleted/normalTotal)*100):0;
  const hardPct=normalTotal>0?Math.round((hardCompleted/normalTotal)*100):0;

  // 전체(정리문제 포함) 완료 단원 수 — 기존 종합 지표도 함께 유지
  let completed=0;
  unitKeys.forEach(key=>{
    const u=UNITS[key];
    const mineUnit=mine.filter(e=>entryMatchesUnit(e,key));
    let done;
    if(u.examMode){
      done=mineUnit.some(e=>e.pass);
    }else{
      const easyPass=mineUnit.some(e=>e.level==='기본' && e.pass);
      const hardPass=mineUnit.some(e=>e.level==='심화' && e.pass);
      done=easyPass && hardPass;
    }
    if(done) completed++;
  });
  const total=unitKeys.length;
  const pct=total>0?Math.round((completed/total)*100):0;

  return {completed,total,pct, easyCompleted,hardCompleted,normalTotal,easyPct,hardPct};
}

async function renderDeadlineSettings(){
  const wrap=document.getElementById('deadline-setting-list');
  if(!wrap)return;
  wrap.innerHTML='<div class="lb-empty">불러오는 중...</div>';
  const dMap=await apiListDeadlines();
  wrap.innerHTML=Object.keys(UNITS).map(key=>{
    const u=UNITS[key];
    const val=dMap[key]||'';
    return `<div class="date-reset-row">
      <span style="flex:1;color:var(--sand);font-size:12px;padding:9px 2px">${u.icon} ${u.title}</span>
      <input type="date" id="deadline-input-${key}" class="date-reset-input" style="flex:0 0 140px" value="${val}"/>
      <button class="date-reset-btn" onclick="saveDeadlineUI('${key}')">저장</button>
    </div>`;
  }).join('');
}

async function saveDeadlineUI(key){
  const val=document.getElementById('deadline-input-'+key).value;
  const ok=await apiSetDeadline(key,val);
  if(ok){
    showToast2('✅ '+UNITS[key].title+' 마감일이 저장됐어요.');
    refreshHomeHeading();
  }else{
    showToast2('⚠️ 저장 실패 (백엔드 연결을 확인하세요)');
  }
}

let teacherRenderToken=0; // 빠른 재진입/느린 응답이 이전 통계를 덮어쓰지 않도록 하는 가드

async function showTeacherNoAuth(){
  viewerModeActive=true; // 선생님 확인 화면에서는 학습시간 측정/저장 안 함
  if(focusModeState.active) endFocusMode(false,true);
  const myToken=++teacherRenderToken;
  const grid=document.getElementById('teacher-result-grid');
  grid.innerHTML='<div class="lb-empty">불러오는 중...</div>';
  await loadContentVisibility(true);
  renderContentApprovalPanel();

  if(!apiConfigured()){
    grid.innerHTML='<div class="lb-empty" style="color:#e87474">⚠️ 백엔드 설정이 필요해요 (아래 안내 참고)</div>';
    return;
  }

  const [, , allEntries, accessLog, studyTimeMap, kingOrderMap]=await Promise.all([
    loadHistoryTrainingProgress(),
    loadScore(),
    apiList(),
    apiListAccessLog(),
    apiListStudyTime(),
    apiListKingOrderProgress()
  ]);

  if(myToken!==teacherRenderToken) return; // 그 사이 다시 열렸다면 이 응답은 버림
  allEntriesCache=allEntries;
  studyTimeServerCache=studyTimeMap;
  applyKingOrderProgressMap_(kingOrderMap);
  window.__perfMark&&window.__perfMark('showTeacherNoAuth 데이터수신완료');

  // 상단 요약 통계 (실제 계산 가능한 데이터만 사용) — getUnifiedProgressForUI로 통일 (V2 오류 시 자동 폴백)
  const allProgress=STUDENTS.map(s=>getUnifiedProgressForUI(s.name));
  const totalStudentsCount=STUDENTS.length;
  const avgProgress=totalStudentsCount>0?Math.round(allProgress.reduce((a,p)=>a+p.percent,0)/totalStudentsCount):0;
  const completedCount=allProgress.filter(p=>p.completed).length;
  const noSubmitCount=STUDENTS.filter(s=>!accessLog.some(a=>a.name===s.name)).length;
  const statBox=document.getElementById('teacher-stat-summary');
  if(statBox){
    statBox.innerHTML=`
      <div class="teacher-stat-card"><div class="teacher-stat-num">${totalStudentsCount}명</div><div class="teacher-stat-label">전체 학생 수</div></div>
      <div class="teacher-stat-card"><div class="teacher-stat-num">${avgProgress}%</div><div class="teacher-stat-label">평균 진행률</div></div>
      <div class="teacher-stat-card"><div class="teacher-stat-num">${completedCount}명</div><div class="teacher-stat-label">완료한 학생</div></div>
    `;
  }

  grid.innerHTML='';
  STUDENTS.forEach((s, idx)=>{
    const myAttempts=allEntries.filter(e=>e.name===s.name)
      .sort((a,b)=>(b.ts||0)-(a.ts||0));
    const myAccess=accessLog.filter(a=>a.name===s.name).sort((a,b)=>(b.ts||0)-(a.ts||0));
    const lastAccess=myAccess.length>0?myAccess[0].time:null;
    const accessCount=myAccess.length;
    const easyDone=myAttempts.some(e=>e.level==='기본' && e.pass);
    const hardDone=myAttempts.some(e=>e.level==='심화' && e.pass);
    const completion=allProgress[idx]; // 위에서 이미 계산한 결과 재사용 (학생당 getUnifiedProgressForUI 1회만 호출)
    const completionBreakdown=getBreakdownForUI(completion);
    const c=document.createElement('div');
    c.className='src-card';
    let attemptsHtml='';
    if(myAttempts.length>0){
      // 단원별로 묶기 (최근 활동한 단원이 위로 오도록 첫 등장 순서 유지)
      const grouped={};
      const unitOrder=[];
      myAttempts.forEach(a=>{
        const u=a.unit||'(단원 미상)';
        if(!grouped[u]){ grouped[u]=[]; unitOrder.push(u); }
        grouped[u].push(a);
      });

      attemptsHtml=unitOrder.map(unitTitle=>{
        const list=grouped[unitTitle];
        const rows=list.map((a,i)=>{
          const rid='wq_'+s.name+'_'+unitTitle+'_'+i;
          const aid='aq_'+s.name+'_'+unitTitle+'_'+i;
          const hasWrong=!!(a.wrongQuestions && a.wrongQuestions.trim());
          const hasAll=!!(a.allQuestions && a.allQuestions.trim());

          if(a.pass && a.level==='정리문제'){
            return `<div class="attempt-block pass-cell">
              <div class="pass-cell-big">🎉 PASS</div>
              <div class="pass-cell-sub">합격일: ${a.time}</div>
              <div class="attempt-toggle-row">
                ${hasWrong?`<span class="attempt-wrong-toggle" onclick="toggleWrongView('${rid}')">🔍 틀린 문제</span>`:''}
                ${hasAll?`<span class="attempt-wrong-toggle" onclick="toggleWrongView('${aid}')">📋 전체 문제</span>`:''}
              </div>
              ${hasWrong?`<div class="attempt-wrong-detail" id="${rid}" style="display:none">${a.wrongQuestions.split(' | ').map(w=>'· '+w).join('<br>')}</div>`:''}
              ${hasAll?`<div class="attempt-wrong-detail" id="${aid}" style="display:none">${a.allQuestions.split(' | ').map((w,idx)=>(idx+1)+'. '+w).join('<br>')}</div>`:''}
            </div>`;
          }

          if(a.pass){
            return `<div class="attempt-block pass-cell pass-cell-small">
              <div class="pass-cell-date">✅ 합격일: ${a.time} · ${a.level}</div>
              <div class="attempt-toggle-row">
                ${hasWrong?`<span class="attempt-wrong-toggle" onclick="toggleWrongView('${rid}')">🔍 틀린 문제</span>`:''}
                ${hasAll?`<span class="attempt-wrong-toggle" onclick="toggleWrongView('${aid}')">📋 전체 문제</span>`:''}
              </div>
              ${hasWrong?`<div class="attempt-wrong-detail" id="${rid}" style="display:none">${a.wrongQuestions.split(' | ').map(w=>'· '+w).join('<br>')}</div>`:''}
              ${hasAll?`<div class="attempt-wrong-detail" id="${aid}" style="display:none">${a.allQuestions.split(' | ').map((w,idx)=>(idx+1)+'. '+w).join('<br>')}</div>`:''}
            </div>`;
          }

          return `<div class="attempt-block">
            <div class="attempt-row"><span class="attempt-idx">${list.length-i}회</span><span class="attempt-level">${a.level}</span><span class="attempt-score">${a.score}점</span><span class="attempt-detail">${a.correct}/${a.total} · ${a.time}</span><span style="color:${a.pass?'#7ecb94':'#e87474'};font-weight:700;font-size:11px">${a.pass?'합격':'불합격'}</span></div>
            <div class="attempt-toggle-row">
              ${hasWrong?`<span class="attempt-wrong-toggle" onclick="toggleWrongView('${rid}')">🔍 틀린 문제</span>`:''}
              ${hasAll?`<span class="attempt-wrong-toggle" onclick="toggleWrongView('${aid}')">📋 전체 문제</span>`:''}
            </div>
            ${hasWrong?`<div class="attempt-wrong-detail" id="${rid}" style="display:none">${a.wrongQuestions.split(' | ').map(w=>'· '+w).join('<br>')}</div>`:''}
            ${hasAll?`<div class="attempt-wrong-detail" id="${aid}" style="display:none">${a.allQuestions.split(' | ').map((w,idx)=>(idx+1)+'. '+w).join('<br>')}</div>`:''}
          </div>`;
        }).join('');
        return `<div class="unit-group-header">📖 ${unitTitle} · 총 ${list.length}회</div>${rows}`;
      }).join('');
    }else{
      attemptsHtml='<div class="src-detail" style="color:var(--wrong)">아직 퀴즈를 풀지 않았어요</div>';
    }
    c.innerHTML=`<div class="src-header" onclick="toggleStudentCard('${s.name}')" style="cursor:pointer">
        <span class="src-avatar">${renderAvatarHtml(avatarMap[s.name]||s.avatar,26)}</span>
        <span class="src-name">${s.name}</span>
        <span id="src-body-arrow-${s.name}" style="color:var(--sand);font-size:12px;margin-left:4px">▾</span>
      </div>
      <div class="src-body" id="src-body-${s.name}" style="display:none">
        <div class="src-progress${completion.percent<50?' warning':''}">
          <div class="src-progress-label">${completion.percent<50?'⚠️ 경고 · ':'📊 '}전체 진행률 ${completion.percent}%</div>
          <div class="src-progress-bar"><div class="src-progress-fill" style="width:${completion.percent}%"></div></div>
          ${completion.percent<50?'<div class="src-progress-warning-text">⚠️ 경고: 진행률이 50% 미만이에요</div>':''}
          <div class="src-progress-sub${completionBreakdown.unitLearning<50?' warning':''}">
            <span>📖 UNIT 학습 ${completionBreakdown.unitLearning}%</span>
            <div class="src-progress-bar small"><div class="src-progress-fill" style="width:${completionBreakdown.unitLearning}%"></div></div>
          </div>
          <div class="src-progress-sub${completionBreakdown.learningContent<50?' warning':''}">
            <span>📚 역사학습콘텐츠 ${completionBreakdown.learningContent}%
              <span style="opacity:0.7">(역사훈련소 ${completionBreakdown.historyTraining}% · 지도 문제 ${completionBreakdown.mapStudy}% · 왕순서 ${completionBreakdown.kingOrder||0}%)</span>
            </span>
            <div class="src-progress-bar small"><div class="src-progress-fill" style="width:${completionBreakdown.learningContent}%"></div></div>
          </div>
        </div>
        ${(()=>{
          const t=getStudyTimeSummary(s.name);
          return `<div class="src-progress" style="margin-top:10px">
            <div class="src-progress-label">⏱ 오늘 ${formatStudySeconds(t.todaySeconds)} · 이번 주 ${formatStudySeconds(t.weekSeconds)} · 누적 ${formatStudySeconds(t.totalSeconds)}</div>
          </div>`;
        })()}
        <div class="src-access">${lastAccess?`🕐 최근 접속: ${lastAccess}`:'🕐 접속 기록 없음'}</div>
        <div class="note-edit-row">
          <input type="text" class="note-input" id="note-input-${s.name}" placeholder="예: 오늘 결석, 병원 진료 등" value="${(noteMap[s.name]||'').replace(/"/g,'&quot;')}"/>
          <button class="note-save-btn" onclick="saveNoteUI('${s.name}')">저장</button>
        </div>
        <button class="teacher-back teacher-planner-row" style="margin-bottom:10px" onclick="event.stopPropagation();openStudyPlannerForViewer('${s.name}','teacher')">📅 스터디플래너 확인 <span aria-hidden="true">›</span></button>
        <div class="src-management-toggle" onclick="event.stopPropagation();toggleStudentManagement('${s.name}')">
          <span>⚙️ 관리 및 상세 기록</span><span id="src-management-arrow-${s.name}">▾</span>
        </div>
        <div class="src-management-body" id="src-management-body-${s.name}" style="display:none">
          ${(()=>{ const t=getStudyTimeSummary(s.name); return `<div class="src-detail src-management-metrics">집중도 ${t.focusPercent}% · 🎯 집중모드 ${formatStudySeconds(t.focusModeTodaySeconds)} · 이탈 ${t.focusModeLeaveCount}회 · 총 접속 ${accessCount}회</div>`; })()}
          <div class="attempts-toggle" onclick="toggleAttempts('${s.name}')">
            <span>📋 상세 기록 보기</span><span id="attempts-arrow-${s.name}">▾</span>
          </div>
          <div class="attempts-list" id="attempts-list-${s.name}" style="display:none">${attemptsHtml}</div>
          <div class="date-reset-row">
            <input type="date" id="reset-date-${s.name}" class="date-reset-input"/>
            <button class="date-reset-btn" onclick="resetStudentByDateUI(this,'${s.name}')">🗓️ 이 날짜만</button>
          </div>
          <button class="student-reset-btn" onclick="resetStudentRecords(this,'${s.name}')">🗑️ ${s.name} 기록만 초기화</button>
          <button class="student-reset-btn" style="background:rgba(90,122,165,0.12);color:#7FB0D8;border-color:rgba(90,122,165,0.3)" onclick="resetPinUI('${s.name}')">🔑 ${s.name} 비밀번호 초기화</button>
        </div>
      </div>`;
    grid.appendChild(c);
  });
  window.__perfMark&&window.__perfMark('선생님 결과화면 렌더링완료');
}

async function resetPinUI(name){
  const ok=await apiResetPin(name);
  if(ok){
    delete pinMap[name];
    showToast2(`✅ ${name} 비밀번호가 초기화됐어요. 다음에 이름 누르면 새로 만들 수 있어요.`);
  }else{
    showToast2('⚠️ 초기화 실패 (백엔드 연결을 확인하세요)');
  }
}

async function saveNoteUI(name){
  const input=document.getElementById('note-input-'+name);
  const note=input.value.trim();
  const ok=await apiSetNote(name,note);
  if(ok){
    noteMap[name]=note;
    if(!note) delete noteMap[name];
    renderStudentCards();
    showToast2(note?`✅ ${name} 메모가 저장됐어요.`:`✅ ${name} 메모가 삭제됐어요.`);
  }else{
    showToast2('⚠️ 저장 실패 (백엔드 연결을 확인하세요)');
  }
}

async function resetStudentRecords(btn,name){
  if(btn.dataset.confirming!=='1'){
    btn.dataset.confirming='1';
    btn.textContent='정말 삭제할까요? 다시 눌러 확인';
    setTimeout(()=>{btn.dataset.confirming='0';btn.textContent='🗑️ '+name+' 기록만 초기화';},4000);
    return;
  }
  btn.dataset.confirming='0';
  btn.disabled=true;
  btn.textContent='삭제 중...';
  const ok=await apiResetStudent(name);
  if(ok){
    showToast2('✅ '+name+'님 기록이 초기화되었습니다.');
  }else{
    showToast2('⚠️ 초기화 실패 (백엔드 연결을 확인하세요)');
  }
  showTeacherNoAuth();
}

function shuffle(arr){return[...arr].sort(()=>Math.random()-0.5)}

function startQuiz(){
  if(!playerName){alert('이름을 선택해주세요!');return;}
  if(parentChildViewActive&&!isUnitCompletedForParent(parentChildViewName,currentUnit)){
    showToast2('🔒 아이가 PASS하지 않은 UNIT은 부모님 화면에서 풀 수 없어요.');
    return;
  }
  updateParentUnitPracticeUI();
  if(isParentUnitPracticeMode()){
    showToast2('👨‍👩‍👧 완료한 UNIT을 기록 없이 다시 풀어봅니다.');
  }
  wrongRetryMode=false;
  resetMingeonMemoryCardFlow();
  submitted=false;
  startNewQuizAttemptContext_(); // 실제 새 퀴즈 시작 — 새 resultId 발급(재렌더링이 아니라 진짜 시작이므로)
  const unit=UNITS[currentUnit];
  if(!isParentUnitPracticeMode()){
    enqueueLearningEvent_({contentType:'unit', unitId:currentUnit, contentTitle:unit.title||'', action:'start'});
  }
  if(unit.examMode){
    startExamQuiz();
    return;
  }
  const pool=unit.questions;

  // 전민건 학생 전용: 특정 단원의 심화문제는 같은 내용의 4지선다 버전으로 대체
  if(playerName==='전민건' && currentLevel==='hard' && MINGEON_HARD_OVERRIDES[currentUnit]){
    questions=shuffle(MINGEON_HARD_OVERRIDES[currentUnit].slice());
    currentIdx=0;score=0;wrongQ=[];
    document.getElementById('q-total').textContent=questions.length;
    document.getElementById('start-screen').style.display='none';
    document.getElementById('quiz-screen').style.display='block';
    document.getElementById('exam-timer-bar').style.display='none';
    document.getElementById('exam-nav').style.display='none';
    document.getElementById('timer-circle-wrap').style.display='block';
    document.getElementById('score-badge').style.display='inline-block';
    renderQ();
    return;
  }

  const shortQ=shuffle(pool.filter(q=>q.type==='short'));
  const normalQ=shuffle(pool.filter(q=>q.type!=='short'));
  if(currentLevel==='easy'){
    questions=shuffle(normalQ.slice(0,unit.easyCount));
  }else{
    const takeShort=shortQ.slice(0, Math.min(shortQ.length, unit.hardCount));
    const remain=unit.hardCount-takeShort.length;
    questions=shuffle([...takeShort, ...normalQ.slice(0,Math.max(remain,0))]);
  }
  currentIdx=0;score=0;wrongQ=[];
  document.getElementById('q-total').textContent=questions.length;
  document.getElementById('start-screen').style.display='none';
  document.getElementById('quiz-screen').style.display='block';
  document.getElementById('exam-timer-bar').style.display='none';
  document.getElementById('exam-nav').style.display='none';
  document.getElementById('timer-circle-wrap').style.display='block';
  document.getElementById('score-badge').style.display='inline-block';
  renderQ();
}

// ══════════════ 시험 모드 (정리문제 전용) ══════════════
let examQuestions=[];
let examAnswers=[];
let examIndex=0;
let examTimeLeft=0;
let examTimerInterval=null;
let examWarned=false;

function startExamQuiz(){
  if(parentChildViewActive&&!isUnitCompletedForParent(parentChildViewName,currentUnit)){
    showToast2('🔒 아이가 PASS하지 않은 UNIT은 부모님 화면에서 풀 수 없어요.');
    return;
  }
  updateParentUnitPracticeUI();
  const unit=UNITS[currentUnit];
  examQuestions=shuffle(unit.questions.slice());
  examAnswers=new Array(examQuestions.length).fill(-1);
  examIndex=0;
  examTimeLeft=unit.duration;
  examWarned=false;
  document.getElementById('q-total').textContent=examQuestions.length;
  document.getElementById('start-screen').style.display='none';
  document.getElementById('quiz-screen').style.display='block';
  document.getElementById('exam-timer-bar').style.display='flex';
  document.getElementById('exam-nav').style.display='flex';
  document.getElementById('timer-circle-wrap').style.display='none';
  document.getElementById('score-badge').style.display='none';
  document.getElementById('exam-start-minutes').textContent=Math.floor(unit.duration/60)+'분';
  document.getElementById('exam-start-total').textContent=unit.totalQuestions+'문제';
  document.getElementById('exam-start-pass').textContent='100점 만점에 '+unit.passScore+'점 이상';
  document.getElementById('exam-start-overlay').classList.add('show');
}

function confirmExamStart(){
  document.getElementById('exam-start-overlay').classList.remove('show');
  renderExamQuestion();
  startExamTimer();
}

function startExamTimer(){
  clearInterval(examTimerInterval);
  updateExamTimerUI();
  examTimerInterval=setInterval(()=>{
    examTimeLeft--;
    updateExamTimerUI();
    if(examTimeLeft===300 && !examWarned){
      examWarned=true;
      showToast2('⏰ 5분 남았어요! 서둘러주세요');
    }
    if(examTimeLeft<=0){
      clearInterval(examTimerInterval);
      submitExam(true);
    }
  },1000);
}

function updateExamTimerUI(){
  const t=Math.max(examTimeLeft,0);
  const m=Math.floor(t/60), s=t%60;
  const text=m+':'+String(s).padStart(2,'0');
  const textEl=document.getElementById('exam-timer-text');
  if(textEl) textEl.textContent=text;
  const bar=document.getElementById('exam-timer-bar');
  if(bar) bar.classList.toggle('danger', t<=300);
}

function getQuestionTypeLabel(q){
  const typeLabels={ox:'OX 퀴즈',mc:'객관식',short:'단답형'};
  return typeLabels[q&&q.type]||'문제';
}

function renderExamQuestion(){
  const q=examQuestions[examIndex];
  document.getElementById('q-num').textContent=examIndex+1;
  document.getElementById('exam-position').textContent=(examIndex+1)+' / '+examQuestions.length;
  document.getElementById('progress-fill').style.width=((examIndex/examQuestions.length)*100)+'%';
  document.getElementById('q-type-tag').textContent=getQuestionTypeLabel(q);
  document.getElementById('question-text').textContent=q.q;
  document.getElementById('question-hint').textContent='';
  document.getElementById('artifact-wrap').style.display='none';
  document.getElementById('feedback-box').style.display='none';
  document.getElementById('next-btn').style.display='none';

  const labels=['①','②','③','④','⑤','⑥'];
  const container=document.getElementById('options-container');
  container.innerHTML=`<div class="options-grid">${q.options.map((opt,i)=>
    `<button class="option-btn${examAnswers[examIndex]===i?' exam-selected':''}" onclick="chooseExamAnswer(${i})"><span class="opt-label">${labels[i]}</span>${opt}</button>`
  ).join('')}</div>`;

  document.getElementById('exam-prev-btn').disabled = examIndex===0;
  const isLast = examIndex===examQuestions.length-1;
  document.getElementById('exam-next-btn').style.display = isLast? 'none':'inline-block';
  document.getElementById('exam-submit-btn').style.display = isLast? 'inline-block':'none';
}

function chooseExamAnswer(idx){
  examAnswers[examIndex]=idx;
  renderExamQuestion();
}

function examPrev(){
  if(examIndex>0){ examIndex--; renderExamQuestion(); }
}
function examNext(){
  if(examIndex<examQuestions.length-1){ examIndex++; renderExamQuestion(); }
}

async function submitExam(auto){
  clearInterval(examTimerInterval);
  quizActiveFlag=false;
  loginTimestamp=Date.now();
  let correct=0;
  examQuestions.forEach((q,i)=>{ if(examAnswers[i]===q.answer) correct++; });
  const total=examQuestions.length;
  const pct=Math.round((correct/total)*100);
  const isPass=pct>=UNITS[currentUnit].passScore;

  document.getElementById('quiz-screen').style.display='none';
  document.getElementById('result-screen').style.display='block';
  document.getElementById('exam-timer-bar').style.display='none';
  document.getElementById('exam-nav').style.display='none';

  let icon,grade,color,msg;
  if(pct===100){icon='🏆';grade='만점!';color='#FFD700';msg='완벽해요! 정리문제 만점입니다!';}
  else if(isPass){icon='🎉';grade=pct+'점';color='#7ecb94';msg='합격이에요! 잘했어요.';}
  else{icon='💪';grade=pct+'점';color='#e87474';msg=auto?'시간 종료로 자동 제출됐어요. 다시 도전해봐요!':'아쉬워요, 다시 도전해봐요!';}
  isPass?SFX.complete():SFX.wrong();

  document.getElementById('result-icon').textContent=icon;
  document.getElementById('result-grade').textContent=grade;
  document.getElementById('result-grade').style.color=color;
  document.getElementById('result-msg').textContent=isParentUnitPracticeMode()
    ?`완료한 정리문제 다시 풀기 결과예요. 이 결과는 ${parentChildViewName} 학생의 기록에 저장되지 않습니다.`
    :playerName+'님 [정리문제], '+msg;
  document.getElementById('res-score').textContent=pct;
  document.getElementById('res-correct').textContent=correct+'/'+total;
  document.getElementById('res-total').textContent=total;

  const passBadge=document.getElementById('pass-badge');
  passBadge.className='pass-badge '+(isPass?'pass':'fail');
  passBadge.textContent=(isPass?'✅ 합격!':'❌ 불합격')+` (${pct}점 · 합격 기준 70점 이상)`;

  const wrongList=document.getElementById('wrong-list');
  const wrongIdxs=examQuestions.map((q,i)=>i).filter(i=>examAnswers[i]!==examQuestions[i].answer);
  const wrongQs=wrongIdxs.map(i=>examQuestions[i]);
  if(wrongIdxs.length>0){
    wrongList.style.display='block';
    document.getElementById('wrong-items').innerHTML=wrongIdxs.map(i=>{
      const q=examQuestions[i];
      const myIdx=examAnswers[i];
      const myAnswerText=myIdx===-1?'(선택 안 함)':q.options[myIdx];
      return `<div class="wrong-item"><strong>Q. ${q.q}</strong>내 답: ${myAnswerText}<br>정답: ${q.options[q.answer]}</div>`;
    }).join('');
  }else wrongList.style.display='none';

  submitted=false;
  document.getElementById('submit-btn').disabled=true;
  document.getElementById('submit-btn').textContent='💾 자동으로 저장 중...';

  const wrongText=wrongQs.map(q=>q.q).join(' | ');
  const allText=examQuestions.map(q=>q.q).join(' | ');
  const attemptCtx=getOrCreateQuizAttemptContext_();
  const entry={name:playerName,score:pct,correct,total,pct,level:'정리문제',unit:UNITS[currentUnit].title,unitKey:currentUnit,pass:isPass,wrongQuestions:wrongText,allQuestions:allText,ts:Date.now(),time:new Date().toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}),resultId:attemptCtx.resultId,startedAtMs:attemptCtx.startedAtMs,completedAtMs:Date.now()};

  if(isLearningWriteBlocked()){
    submitted=true;
    document.getElementById('submit-btn').disabled=true;
    document.getElementById('submit-btn').textContent=parentChildViewActive
      ?'🔒 확인용 결과 · 학생 기록에 저장 안 함'
      :'👩‍🏫 관리자 모드 · 저장 안 함';
    const actions=document.getElementById('result-main-actions');
    if(actions)actions.style.display='flex';
    return;
  }

  const result=await apiSubmit(entry);
  const ok=!!(result&&result.resultSaved);
  if(ok){
    if(result.auditLogged===false){
      enqueueAuditRecovery_(entry);
      flushAuditRecoveryQueue_(entry.name).catch(err=>console.error('감사로그 복구 실패(무시):',err));
    }
    submitted=true;
    document.getElementById('submit-btn').textContent='✅ 자동 저장 완료';
    showToast();loadLB();
    const actions=document.getElementById('result-main-actions');
    if(actions) actions.style.display=wrongQs.length?'none':'flex';
    if(wrongQs.length>0){
      forcedReviewTimer=setTimeout(()=>beginExamWrongReview(wrongQs),1100);
    }
  }else{
    document.getElementById('submit-btn').disabled=false;
    document.getElementById('submit-btn').textContent='⚠️ 저장 실패 · 다시 시도';
  }
}

function beginExamWrongReview(wrongQuestions){
  if(!Array.isArray(wrongQuestions)||wrongQuestions.length===0)return;
  wrongRetryMode=true;
  resetMingeonMemoryCardFlow();
  submitted=true;
  questions=shuffle(wrongQuestions.slice());
  currentIdx=0;
  score=0;
  wrongQ=[];
  answered=false;
  document.getElementById('result-screen').style.display='none';
  document.getElementById('quiz-screen').style.display='block';
  document.getElementById('exam-timer-bar').style.display='none';
  document.getElementById('exam-nav').style.display='none';
  document.getElementById('timer-circle-wrap').style.display='block';
  document.getElementById('score-badge').style.display='inline-block';
  document.getElementById('q-total').textContent=questions.length;
  renderQ();
  window.scrollTo(0,0);
}

function shouldShowMingeonMemoryCard(q){
  return playerName==='전민건'
    && currentLevel==='hard'
    && Array.isArray(MINGEON_HARD_OVERRIDES[currentUnit])
    && q
    && typeof q.memoryCard==='string'
    && q.memoryCard.trim().length>0;
}

function clearMingeonMemoryCardGateTimer(){
  if(memoryCardGateTimer!==null){
    clearInterval(memoryCardGateTimer);
    memoryCardGateTimer=null;
  }
}

function resetMingeonMemoryCardFlow(){
  clearMingeonMemoryCardGateTimer();
  memoryCardStageByIndex.clear();
  memoryCardRetryIndices.clear();
}

function startMingeonMemoryCardCountdown(){
  clearMingeonMemoryCardGateTimer();
  const button=document.getElementById('memory-card-hide-btn');
  if(!button)return;
  let seconds=3;
  button.disabled=true;
  button.textContent=`핵심카드 읽는 중… ${seconds}초`;
  memoryCardGateTimer=setInterval(()=>{
    seconds--;
    if(seconds>0){
      button.textContent=`핵심카드 읽는 중… ${seconds}초`;
      return;
    }
    clearMingeonMemoryCardGateTimer();
    button.disabled=false;
    button.textContent='카드 가리기 →';
  },1000);
}

function showMingeonMemoryCheck(){
  clearMingeonMemoryCardGateTimer();
  memoryCardStageByIndex.set(currentIdx,'check');
  renderQ();
}

function reviewMingeonMemoryCardAgain(){
  memoryCardRetryIndices.add(currentIdx);
  memoryCardStageByIndex.set(currentIdx,'card');
  renderQ();
}

function answerMingeonMemoryCheck(isCorrect){
  if(isCorrect){
    memoryCardRetryIndices.delete(currentIdx);
    memoryCardStageByIndex.set(currentIdx,'question');
  }else{
    memoryCardRetryIndices.add(currentIdx);
    memoryCardStageByIndex.set(currentIdx,'card');
  }
  renderQ();
}

function renderQ(){
  clearMingeonMemoryCardGateTimer();
  answered=false;
  const q=questions[currentIdx];
  const questionCard=document.querySelector('#quiz-screen .question-card');
  const timerWrap=document.getElementById('timer-circle-wrap');
  if(questionCard)questionCard.classList.remove('memory-card-mode');
  if(timerWrap)timerWrap.style.visibility='visible';
  document.getElementById('q-num').textContent=currentIdx+1;
  document.getElementById('score-badge').textContent='점수: '+score;
  document.getElementById('progress-fill').style.width=((currentIdx/questions.length)*100)+'%';
  document.getElementById('feedback-box').className='feedback-box';
  document.getElementById('feedback-box').style.display='none';
  document.getElementById('next-btn').style.display='none';
  const con=document.getElementById('options-container');

  const memoryCardStage=shouldShowMingeonMemoryCard(q)
    ?(memoryCardStageByIndex.get(currentIdx)||'card')
    :'question';

  if(memoryCardStage==='card'){
    stopTimer();
    if(questionCard)questionCard.classList.add('memory-card-mode');
    if(timerWrap)timerWrap.style.visibility='hidden';
    document.getElementById('q-type-tag').textContent='🧠 핵심카드';
    document.getElementById('question-text').textContent=q.memoryCard;
    document.getElementById('question-hint').textContent=memoryCardRetryIndices.has(currentIdx)
      ?'이 문제는 한 번 더 천천히 살펴봐요.'
      :'핵심 내용을 천천히 읽고 머릿속에 담아보세요.';
    document.getElementById('artifact-wrap').style.display='none';
    con.innerHTML='<button type="button" class="memory-card-action" id="memory-card-hide-btn" onclick="showMingeonMemoryCheck()" disabled>핵심카드 읽는 중… 3초</button>';
    startMingeonMemoryCardCountdown();
    return;
  }

  if(memoryCardStage==='check'){
    stopTimer();
    if(questionCard)questionCard.classList.add('memory-card-mode');
    if(timerWrap)timerWrap.style.visibility='hidden';
    document.getElementById('q-type-tag').textContent='🧠 가리고 떠올리기';
    document.getElementById('question-text').textContent='방금 본 핵심카드와 맞는 답을 골라보세요.';
    document.getElementById('question-hint').textContent='준비 단계이므로 점수에는 포함되지 않아요.';
    document.getElementById('artifact-wrap').style.display='none';
    const correctOption=q.options[q.answer];
    const distractorOption=q.options.find((_,index)=>index!==q.answer);
    const checkOptions=shuffle([
      {text:correctOption,isCorrect:true},
      {text:distractorOption,isCorrect:false}
    ]);
    con.innerHTML='<div class="options-grid memory-check-grid">'+checkOptions.map((item,index)=>
      `<button type="button" class="option-btn" onclick="answerMingeonMemoryCheck(${item.isCorrect})"><span class="opt-label">${index===0?'①':'②'}</span>${item.text}</button>`
    ).join('')+'</div><button type="button" class="memory-card-review-btn" onclick="reviewMingeonMemoryCardAgain()">핵심카드 다시 보기</button>';
    return;
  }

  document.getElementById('q-type-tag').textContent=getQuestionTypeLabel(q);
  document.getElementById('question-text').textContent=q.q;
  document.getElementById('question-hint').textContent=q.hint||'';
  const wrap=document.getElementById('artifact-wrap');
  if(q.art&&ART[q.art]){
    document.getElementById('artifact-img').src=ART[q.art].url;
    wrap.style.display='block';
  }else{wrap.style.display='none';}
  if(q.type==='ox'){
    con.innerHTML='<div class="ox-grid"><button class="ox-btn" onclick="doOX(true,this)">⭕</button><button class="ox-btn" onclick="doOX(false,this)">❌</button></div>';
  }else if(q.type==='mc'){
    const labels=['①','②','③','④','⑤','⑥'];
    const idx=shuffle(q.options.map((_,i)=>i));
    const correct=q.options[q.answer];
    const opts=idx.map(i=>q.options[i]);
    const newAns=opts.indexOf(correct);
    con.innerHTML='<div class="options-grid">'+opts.map((o,i)=>`<button class="option-btn" onclick="doMC(${i},this,${newAns})"><span class="opt-label">${labels[i]}</span>${o}</button>`).join('')+'</div>';
  }else{
    con.innerHTML='<div class="short-answer-wrap"><input class="answer-input" id="si" type="text" placeholder="정답을 입력하세요"/><button class="submit-btn" onclick="doShort()">제출하기</button></div>';
    document.getElementById('si').addEventListener('keydown',e=>{if(e.key==='Enter')doShort();});
  }
  startTimer();
}

function startTimer(){
  TSEC=currentLevel==='hard'?20:10; // 심화문제는 20초, 기본문제는 기존 10초 그대로
  clearInterval(timerInt);timeLeft=TSEC;updateTimer(timeLeft);
  timerInt=setInterval(()=>{timeLeft--;updateTimer(timeLeft);if(timeLeft<=0){clearInterval(timerInt);timeUp();}},1000);
}
function stopTimer(){clearInterval(timerInt);}
function updateTimer(t){
  const ring=document.getElementById('timer-ring'),num=document.getElementById('timer-num');
  ring.style.strokeDashoffset=CIRC*(1-t/TSEC);num.textContent=t;
  ring.classList.toggle('danger',t<=3);num.classList.toggle('danger',t<=3);
}
function timeUp(){
  if(answered)return;answered=true;
  document.querySelector('.question-card').classList.add('shake');
  setTimeout(()=>document.querySelector('.question-card').classList.remove('shake'),300);
  document.getElementById('options-container').querySelectorAll('button,input').forEach(b=>b.disabled=true);
  wrongQ.push(questions[currentIdx]);
  showFB(false,'⏰ 시간 초과!',questions[currentIdx].explain);
}
function showFB(ok,title,exp){
  stopTimer();
  ok?SFX.correct():SFX.wrong();
  const box=document.getElementById('feedback-box');
  box.className='feedback-box '+(ok?'correct':'wrong');
  box.style.display='block';
  document.getElementById('feedback-title').textContent=title||(ok?'✅ 정답입니다!':'❌ 틀렸어요');
  document.getElementById('feedback-explain').textContent=exp;
  document.getElementById('next-btn').style.display='block';
}
function doOX(val,btn){
  if(answered)return;answered=true;
  const q=questions[currentIdx],ok=val===q.answer;
  const btns=btn.parentElement.querySelectorAll('.ox-btn');btns.forEach(b=>b.disabled=true);
  if(ok){btn.classList.add('correct');score+=10;}
  else{btn.classList.add('wrong');(q.answer?btns[0]:btns[1]).classList.add('correct');wrongQ.push(q);}
  showFB(ok,ok?'✅ 정답입니다!':'❌ 틀렸어요',q.explain);
}
function doMC(idx,btn,corr){
  if(answered)return;answered=true;
  const q=questions[currentIdx],ok=idx===corr;
  const btns=btn.closest('.options-grid').querySelectorAll('.option-btn');btns.forEach(b=>b.disabled=true);
  if(ok){btn.classList.add('correct');score+=10;}
  else{btn.classList.add('wrong');btns[corr].classList.add('correct');wrongQ.push(q);}
  showFB(ok,ok?'✅ 정답입니다!':'❌ 틀렸어요',q.explain);
}
function doShort(){
  if(answered)return;
  const inp=document.getElementById('si'),val=inp.value.trim();if(!val)return;answered=true;
  const q=questions[currentIdx];
  const all=[q.answer,...(q.aliases||[])].map(a=>a.replace(/\s/g,'').toLowerCase());
  const ok=all.includes(val.replace(/\s/g,'').toLowerCase());
  inp.disabled=true;inp.classList.add(ok?'correct':'wrong');inp.nextElementSibling.disabled=true;
  if(ok)score+=10;else{wrongQ.push(q);inp.value=val+'  →  정답: '+q.answer;}
  showFB(ok,ok?'✅ 정답입니다!':'❌ 틀렸어요',q.explain);
}
function nextQuestion(){currentIdx++;if(currentIdx>=questions.length)showResult();else renderQ();}

function showResult(){
  stopTimer();
  document.getElementById('quiz-screen').style.display='none';
  document.getElementById('result-screen').style.display='block';
  const total=questions.length,correct=total-wrongQ.length,pct=total>0?Math.round(correct/total*100):0;
  let icon,grade,msg,color;
  if(pct===100){icon='🏆';grade='만점!';color='#FFD700';msg='완벽해요! 삼국 문화 완전 정복!';}
  else if(pct>=80){icon='🎉';grade=pct+'점';color='#7ecb94';msg='잘했어요! 조금만 더 복습하면 완벽해요.';}
  else if(pct>=60){icon='📖';grade=pct+'점';color='var(--sand)';msg='아직 헷갈리는 부분이 있어요. 복습해봐요!';}
  else{icon='💪';grade=pct+'점';color='#e87474';msg='한 번 더 도전해봐요!';}
  document.getElementById('result-icon').textContent=icon;
  document.getElementById('result-grade').textContent=grade;
  document.getElementById('result-grade').style.color=color;
  document.getElementById('result-msg').textContent=isParentUnitPracticeMode()
    ? `완료한 UNIT 다시 풀기 결과예요. 이 결과는 ${parentChildViewName} 학생의 기록에 저장되지 않습니다.`
    :(wrongRetryMode
      ? `${playerName}님, ${UNITS[currentUnit].title} 오답 복습 결과예요.`
      : playerName+'님 ['+UNITS[currentUnit].title+' · '+(currentLevel==='easy'?'기본':'심화')+' 모드], '+msg);

  const passLine=currentLevel==='easy'?UNITS[currentUnit].passEasy:UNITS[currentUnit].passHard;
  const isPass=correct>=passLine;
  const passBadge=document.getElementById('pass-badge');
  if(wrongRetryMode){
    const allCorrect=wrongQ.length===0;
    passBadge.className='pass-badge '+(allCorrect?'pass':'fail');
    passBadge.textContent=allCorrect
      ? `✅ 오답을 모두 맞혔어요! (${correct}/${total})`
      : `🔁 아직 ${wrongQ.length}문제가 남았어요. (${correct}/${total})`;
    if(allCorrect)SFX.complete();
  }else{
    passBadge.className='pass-badge '+(isPass?'pass':'fail');
    passBadge.textContent=isPass
      ? `✅ 합격! (${correct}/${total}개 정답 · 합격 기준 ${passLine}개 이상)`
      : `❌ 불합격 (${correct}/${total}개 정답 · 합격 기준 ${passLine}개 이상)`;
    if(isPass)SFX.complete();
  }

  document.getElementById('res-score').textContent=score;
  document.getElementById('res-correct').textContent=correct+'/'+total;
  document.getElementById('res-total').textContent=total;
  submitted=false;
  document.getElementById('submit-btn').disabled=true;
  document.getElementById('submit-btn').textContent='💾 자동으로 저장 중...';
  const wl=document.getElementById('wrong-list');
  if(wrongQ.length>0){
    wl.style.display='block';
    document.getElementById('wrong-items').innerHTML=wrongQ.map(q=>{
      let a=q.answer===true?'O (맞다)':q.answer===false?'X (틀리다)':(q.options?q.options[q.answer]:q.answer);
      return`<div class="wrong-item"><strong>Q. ${q.q}</strong>정답: ${a}</div>`;
    }).join('');
  }else wl.style.display='none';

  const mainActions=document.getElementById('result-main-actions');
  if(forcedReviewTimer){ clearTimeout(forcedReviewTimer); forcedReviewTimer=null; }

  if(wrongRetryMode){
    submitted=true;
    document.getElementById('submit-btn').disabled=true;
    document.getElementById('submit-btn').textContent=wrongQ.length
      ? '🔁 남은 오답을 자동으로 다시 출제합니다'
      : '✅ 오답 복습 완료';
    if(mainActions) mainActions.style.display=wrongQ.length?'none':'flex';

    if(wrongQ.length>0){
      forcedReviewTimer=setTimeout(()=>startWrongAnswerRetry(),1100);
    }
  }else{
    if(mainActions) mainActions.style.display=wrongQ.length?'none':'flex';
    loadLB();
    submitResult().finally(()=>{
      if(wrongQ.length>0){
        forcedReviewTimer=setTimeout(()=>startWrongAnswerRetry(),1100);
      }
    });
  }
}

async function submitResult(){
  if(submitted)return;
  quizActiveFlag=false;
  loginTimestamp=Date.now();
  if(!apiConfigured()){
    document.getElementById('submit-btn').textContent='⚠️ 백엔드 설정 필요 (안내 참고)';
    return;
  }
  const total=questions.length,correct=total-wrongQ.length,pct=Math.round(correct/total*100);
  const passLine2=currentLevel==='easy'?UNITS[currentUnit].passEasy:UNITS[currentUnit].passHard;
  const wrongText=wrongQ.map(q=>q.q).join(' | ');
  const allText=questions.map(q=>q.q).join(' | ');
  const attemptCtx=getOrCreateQuizAttemptContext_();
  const entry={name:playerName,score,correct,total,pct,level:(currentLevel==='easy'?'기본':'심화'),unit:UNITS[currentUnit].title,unitKey:currentUnit,pass:correct>=passLine2,wrongQuestions:wrongText,allQuestions:allText,ts:Date.now(),time:new Date().toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}),resultId:attemptCtx.resultId,startedAtMs:attemptCtx.startedAtMs,completedAtMs:Date.now()};

  if(isLearningWriteBlocked()){
    submitted=true;
    document.getElementById('submit-btn').disabled=true;
    document.getElementById('submit-btn').textContent=parentChildViewActive
      ?'🔒 확인용 결과 · 학생 기록에 저장 안 함'
      :'👩‍🏫 관리자 모드 · 저장 안 함';
    const lb=document.getElementById('lb-rows');
    if(parentChildViewActive&&lb){
      lb.innerHTML='<div class="lb-empty">부모님 확인 중에는 순위와 학생 기록을 변경하지 않습니다.</div>';
    }
    return;
  }

  const result=await apiSubmit(entry);
  const ok=!!(result&&result.resultSaved);
  if(ok){
    if(result.auditLogged===false){
      enqueueAuditRecovery_(entry); // Results는 이미 성공 — 감사로그만 낮은 수준으로 백그라운드 재시도
      flushAuditRecoveryQueue_(entry.name).catch(err=>console.error('감사로그 복구 실패(무시):',err));
    }
    submitted=true;
    document.getElementById('submit-btn').disabled=true;
    document.getElementById('submit-btn').textContent='✅ 자동 저장 완료';
    showToast();loadLB();
  }else{
    document.getElementById('submit-btn').disabled=false;
    document.getElementById('submit-btn').textContent='⚠️ 저장 실패 · 다시 시도';
  }
}

async function loadLB(){
  document.getElementById('lb-title').textContent='🏅 '+UNITS[currentUnit].title+' 순위';
  if(!apiConfigured()){
    document.getElementById('lb-rows').innerHTML='<div class="lb-empty" style="color:#e87474">⚠️ 백엔드 설정이 필요해요</div>';
    return;
  }
  const entries=await apiList();
  if(!entries.length){
    document.getElementById('lb-rows').innerHTML='<div class="lb-empty">아직 제출된 결과가 없어요</div>';
    return;
  }

  // 현재 선택된 단원만 필터링 후, 학생별 최고 점수 기록만 남기기
  const unitEntries=entries.filter(e=>entryMatchesUnit(e,currentUnit));
  const bestByName={};
  for(const e of unitEntries){
    const cur=bestByName[e.name];
    if(!cur || e.score>cur.score || (e.score===cur.score && e.pct>cur.pct)){
      bestByName[e.name]=e;
    }
  }
  const bestEntries=Object.values(bestByName);
  bestEntries.sort((a,b)=>b.score-a.score||b.pct-a.pct);

  const medals=['🥇','🥈','🥉'];
  document.getElementById('lb-rows').innerHTML=bestEntries.slice(0,8).map((e,i)=>{
    const me=e.name===playerName;
    return`<div class="lb-row ${me?'lb-me':''}"><span class="lb-rank">${medals[i]||(i+1)}</span><span class="lb-name">${e.name}${me?' ★':''}</span><span class="lb-meta">[${e.level}${e.pass?' ✅':' ❌'}] ${e.correct}/${e.total} · ${e.time}</span><span class="lb-pts">${e.score}점</span></div>`;
  }).join('')||'<div class="lb-empty">이 단원엔 아직 제출된 결과가 없어요</div>';
}

function showToast(){const t=document.getElementById('toast');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
function startWrongAnswerRetry(){
  if(wrongQ.length===0) return;
  const retryQuestions=wrongQ.slice();
  wrongRetryMode=true;
  resetMingeonMemoryCardFlow();
  submitted=true; // 오답 복습은 서버 성적에 별도 저장하지 않음
  questions=shuffle(retryQuestions);
  currentIdx=0;
  score=0;
  wrongQ=[];
  answered=false;
  document.getElementById('result-screen').style.display='none';
  document.getElementById('quiz-screen').style.display='block';
  document.getElementById('q-total').textContent=questions.length;
  document.getElementById('exam-timer-bar').style.display='none';
  document.getElementById('exam-nav').style.display='none';
  document.getElementById('timer-circle-wrap').style.display='block';
  document.getElementById('score-badge').style.display='inline-block';
  renderQ();
  window.scrollTo(0,0);
}

function retryQuiz(){
  wrongRetryMode=false;
  document.getElementById('result-screen').style.display='none';
  document.getElementById('quiz-screen').style.display='block';
  startQuiz();
}
function goHome(){
  document.body.classList.remove('parent-unit-practice');
  parentChildViewActive=false;
  parentChildViewName='';
  document.getElementById('parent-child-view-bar')?.remove();viewerModeActive=false;stopTimer();if(forcedReviewTimer){clearTimeout(forcedReviewTimer);forcedReviewTimer=null;}quizActiveFlag=false;document.getElementById('result-screen').style.display='none';document.getElementById('teacher-screen').style.display='none';document.getElementById('parent-screen').style.display='none';document.getElementById('timeline-game-screen').style.display='none';document.getElementById('king-order-screen').style.display='none';document.getElementById('ht-list-screen').style.display='none';document.getElementById('ht-part-screen').style.display='none';document.getElementById('summary-screen').style.display='none';document.getElementById('lecture-screen').style.display='none';document.getElementById('qbank-screen').style.display='none';document.getElementById('map-study-list-screen').style.display='none';document.getElementById('map-study-quiz-screen').style.display='none';document.getElementById('map-study-learn-screen').style.display='none';document.getElementById('math-concept-screen').style.display='none';document.getElementById('start-screen').style.display='block';levelSectionVisible=false;const lw=document.getElementById('level-section-wrapper');if(lw)lw.style.display='none';renderStudentGrid({refreshData:true});updateSelectedNameBanner();if(playerName){showLearningHomeView();}else{showStudentSelectView();}}

function showSummary(){
  document.getElementById('start-screen').style.display='none';
  document.getElementById('summary-screen').style.display='block';
  document.querySelectorAll('#summary-screen .summary-img').forEach(img=>{
    const key=img.dataset.art;
    if(ART[key]){
      img.src=ART[key].url;
      img.onerror=()=>{img.style.display='none';};
    }
  });
  window.scrollTo(0,0);
}

function hideSummary(){
  document.getElementById('summary-screen').style.display='none';
  document.getElementById('start-screen').style.display='block';
}

// ══════════════ 전체 문제은행 확인 (선생님용) ══════════════
const TYPE_LABEL={ox:'OX',mc:'객관식',short:'단답형'};

function formatQBankQuestion(q,idx){
  let answerHtml='';
  if(q.type==='ox'){
    answerHtml=`<div class="qb-answer">정답: ${q.answer?'O (맞다)':'X (틀리다)'}</div>`;
  }else if(q.type==='mc'){
    const labels=['①','②','③','④'];
    answerHtml=`<div class="qb-options">${q.options.map((o,i)=>labels[i]+' '+o).join('<br>')}</div>
      <div class="qb-answer">정답: ${labels[q.answer]} ${q.options[q.answer]}</div>`;
  }else if(q.type==='short'){
    answerHtml=`<div class="qb-answer">정답: ${q.answer}</div>`;
  }
  return `<div class="qbank-q">
    <span class="qb-num">${idx+1}.</span><span class="qb-type">${TYPE_LABEL[q.type]||q.type}</span>
    <div class="qb-question">${q.q}</div>
    ${answerHtml}
    <div class="qb-explain">${q.explain||''}</div>
  </div>`;
}

function renderQuestionBank(){
  const body=document.getElementById('qbank-body');
  body.innerHTML=Object.keys(UNITS).map(key=>{
    const u=UNITS[key];
    const qs=u.questions;
    const listId='qbu_'+key;
    return `<div class="qbank-unit">
      <div class="qbank-unit-header" onclick="toggleQBankUnit('${listId}')">
        <span>${u.icon} ${u.title}</span>
        <span class="qb-count">${qs.length}문제 ▾</span>
      </div>
      <div class="qbank-unit-body" id="${listId}">
        ${qs.map((q,i)=>formatQBankQuestion(q,i)).join('')}
      </div>
    </div>`;
  }).join('');
}

function toggleQBankUnit(id){
  const el=document.getElementById(id);
  if(el) el.classList.toggle('open');
}

function showQuestionBank(){
  document.getElementById('teacher-screen').style.display='none';
  document.getElementById('qbank-screen').style.display='block';
  renderQuestionBank();
}

function hideQuestionBank(){
  document.getElementById('qbank-screen').style.display='none';
  document.getElementById('teacher-screen').style.display='block';
}

// 안전장치: 페이지를 새로 열 때 혹시 남아있을 수 있는 팝업 상태를 모두 초기화
document.querySelectorAll('.pw-overlay.show').forEach(el=>el.classList.remove('show'));

// 1) 캐시/localStorage만으로 즉시 1차 렌더링 (서버 응답도, 학습콘텐츠 로드도 기다리지 않음)
showStudentSelectView();
renderStudentGrid();
// renderUnitGrid()는 UNITS 데이터가 필요하므로 학습콘텐츠 로드 완료 후로 지연(아래 startLearningContentLoad_ 콜백에서 실행)
// renderStudentCards() 직접 재호출 제거 — renderStudentGrid() 내부에서 이미 실행되어 중복이었음

// 1-1) 첫 화면이 실제로 그려진 다음 학습 콘텐츠(learning-content.js) 로드 시작
requestAnimationFrame(()=>{ setTimeout(startLearningContentLoad_, 0); });

// 2) PIN은 가장 먼저 한 번만 조회합니다. 완료 전 학생 클릭은 ensurePinMapReady_()가 같은 요청을 기다립니다.
ensurePinMapReady_().catch(error=>console.error('PIN 목록 초기 로드 실패:',error));

function __isPrivilegedAuthOverlayActuallyOpen_(){
  const ids=['admin-login-overlay','pw-overlay','name-confirm-overlay','parent-pw-overlay'];
  return ids.some(id=>{
    const el=document.getElementById(id);
    return el && el.classList.contains('show');
  });
}

async function runStartupBackgroundLoads_(){
  const myGen=__backgroundLoadGeneration;
  const tasks=__startupTasksDef_();
  if(startupBackgroundLoadStarted && __startupTaskIndex>=tasks.length) return; // 전부 완료됨
  startupBackgroundLoadStarted=true;

  // 남은 작업을 전부 동시에 큐에 제출 — 실제 동시실행 수는 __readQueueMaxConcurrent(3)가 제한함.
  // 서로 다른 필수 읽기 요청을 강제로 순차 await하지 않음(전체 로딩시간이 늘어나지 않도록).
  const remainingStartIndex=__startupTaskIndex;
  const promises=[];
  for(let i=remainingStartIndex; i<tasks.length; i++){
    const idx=i;
    const p=(async()=>{
      // 실제로 이 작업이 "시작"되기 직전에 매번 최신 상태로 재확인(대기하다 순서가 왔을 때 이미 취소됐을 수 있음)
      if(__isBackgroundGenerationStale(myGen)) return;
      if(__isPrivilegedAuthOverlayActuallyOpen_() || __authRequestInFlight){
        scheduleStartupBackgroundLoads_(300); // 아직 안 한 나머지는 재예약으로 넘김
        return;
      }
      try{
        await tasks[idx](myGen);
      }catch(error){ console.error('초기 백그라운드 조회 실패(계속 진행):',error); }
      if(!__isBackgroundGenerationStale(myGen)) __startupTaskIndex=Math.max(__startupTaskIndex, idx+1);
    })();
    promises.push(p);
  }
  await Promise.all(promises);

  if(__isBackgroundGenerationStale(myGen)) return; // 전부 끝났어도 그 사이 취소됐으면 화면 갱신 생략
  if(__startupTaskIndex<tasks.length) return; // 인증창 때문에 중간에 재예약된 작업이 남아있으면 여기서 화면 갱신 생략(재개 후 처리)

  // setTimeout(0)으로 매크로태스크로 넘겨서, 뒤에 있는 다른 <script> 블록들(예: todayLocalDate 등)이
  // 먼저 전부 로드된 뒤에 화면 갱신이 실행되도록 함 (API가 즉시 실패하는 로컬 환경에서의 타이밍 문제 방지)
  setTimeout(()=>{
    if(__isBackgroundGenerationStale(myGen))return;
    const runProgressRefresh_=()=>{
      if(__isBackgroundGenerationStale(myGen))return;
      // 학생 카드용 서버 데이터(진행률/공부시간/접속기록)가 여기서 모두 반영됨 — 스켈레톤 해제 신호
      studentCardServerDataReady=true;
      studentCardServerDataFailed=false;
      if(studentCardDataTimeoutTimer){ clearTimeout(studentCardDataTimeoutTimer); studentCardDataTimeoutTimer=null; }
      if(playerName) scheduleHomeUiRefresh_({rebuildUnits:true});
      else renderUnitGrid();
      if(playerName) studentDataLoadedAt[playerName]=Date.now();
    };
    if(typeof UNITS==='undefined'){
      // 학습콘텐츠가 아직 준비 안 됐으면, 준비 완료 후 한 번만 실행되도록 미룸(경합 방지, 최소침습)
      loadLearningContent().then(runProgressRefresh_).catch(()=>{});
    }else{
      runProgressRefresh_();
    }
  },0);
}

// 각 작업은 myGen을 받아, 응답이 도착한 시점에 이미 취소(다른 세대)됐으면 결과를 UI/전역상태에 반영하지 않음
function __startupTasksDef_(){
  return [
    (myGen)=>loadContentVisibility(true).then(v=>{ if(__isBackgroundGenerationStale(myGen))return; return v; }),
    (myGen)=>apiGetAvatars().then(map=>{ if(__isBackgroundGenerationStale(myGen))return; avatarMap=map; }),
    (myGen)=>apiListNotes().then(map=>{ if(__isBackgroundGenerationStale(myGen))return; noteMap=map; }),
    (myGen)=>apiListMoods().then(map=>{ if(__isBackgroundGenerationStale(myGen))return; moodMap=map; }),
    (myGen)=>apiListAccessLog().then(log=>{ if(__isBackgroundGenerationStale(myGen))return; accessLogCache=log||[]; }),
    (myGen)=>refreshHomeHeading().then(v=>{ if(__isBackgroundGenerationStale(myGen))return; return v; })
  ];
}

function scheduleStartupBackgroundLoads_(delay=1200){
  if(!playerName)return;
  if(startupBackgroundLoadTimer)return;
  startupBackgroundLoadTimer=setTimeout(()=>{
    startupBackgroundLoadTimer=null;
    if(privilegedAuthOverlayOpen){
      scheduleStartupBackgroundLoads_(300);
      return;
    }
    runStartupBackgroundLoads_();
  },delay);
}

// 학생이 첫 화면(이름선택)으로 돌아왔을 때만 남은 백그라운드 작업을 안전하게 재개
function __resumeBackgroundLoadsAtStartScreen_(){
  if(playerName && __startupTaskIndex<__startupTasksDef_().length){
    scheduleStartupBackgroundLoads_(300);
  }
}
window.__resumeBackgroundLoadsAtStartScreen_=__resumeBackgroundLoadsAtStartScreen_;

// 학생 카드 서버 데이터가 늦어져도 현재 카드 DOM은 유지하고, 진행 중인 백그라운드 요청의
// 완료 결과를 기다린다. (네트워크가 끊겨도 기존 캐시 값이 오류 UI로 바뀌지 않음)
function __armStudentCardDataWatchdog_(timeoutMs=10000){
  if(studentCardDataTimeoutTimer){ clearTimeout(studentCardDataTimeoutTimer); }
  studentCardDataTimeoutTimer=setTimeout(()=>{
    studentCardDataTimeoutTimer=null;
    if(!studentCardServerDataReady){
      studentCardServerDataFailed=true;
      // 진행 중인 요청이 늦게 끝날 수 있으므로 현재 카드 DOM은 그대로 둔다.
      // 완료 시 runStartupBackgroundLoads_()가 정상 데이터로 한 번만 갱신한다.
    }
  },timeoutMs);
}
__armStudentCardDataWatchdog_();

// 기존 백그라운드 로딩 진입점(scheduleStartupBackgroundLoads_)을 재사용하는 호환용 재시도 함수.
function retryStudentCardServerData_(){
  studentCardServerDataFailed=false;
  renderStudentCards();
  __armStudentCardDataWatchdog_();
  scheduleStartupBackgroundLoads_(0);
}
window.retryStudentCardServerData_=retryStudentCardServerData_;

function closeAvatarHint(){
  document.getElementById('avatar-hint-overlay').classList.remove('show');
  try{ localStorage.setItem('avatarHintShown','1'); }catch(e){}
}
// 참고: 첫 방문 시 자동으로 뜨던 안내 팝업은 화면 전체를 막아 클릭 문제를 일으켜서 제거했어요.

updateTestModeUI();

// 접속완료 배지가 20분 경과를 반영하도록 주기적으로 갱신
setInterval(()=>{
  if(playerName && document.getElementById('start-screen').style.display!=='none'){
    renderStudentCards();
  }
}, 60000);

// PWA: 서비스워커 등록 (홈화면 설치 지원)
if ('serviceWorker' in navigator) {
  onAppWindowLoad_(() => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW 등록 실패:', err));
    if(window.__perfMark){
      window.__perfMark('SW controller 여부','controller='+(!!navigator.serviceWorker.controller));
      if('caches' in window){
        caches.keys().then(names=>{
          window.__perfMark('현재 캐시 이름목록', names.join(','));
        });
      }
      window.__perfMark('현재 app.js/콘텐츠 버전','app.js='+(window.__APP_SCRIPT_URL||'(미확인)')+' / content='+(window.LEARNING_CONTENT_VERSION||'(미확인)'));
    }
  });
}



// ===== 학생별 활성 학습시간 측정 (로컬 즉시 캐시 + 서버 병합 동기화) =====
const STUDY_IDLE_LIMIT_MS=3*60*1000;
const STUDY_TIME_SYNC_INTERVAL_MS=30*1000; // 30초마다 서버 저장
let viewerModeActive=false; // 관리자/부모님/선생님 조회 화면에 있는 동안은 측정/저장 안 함
let studyTimeState={
  timer:null,
  displayTimer:null,
  syncTimer:null,
  lastTick:Date.now(),
  lastInteraction:Date.now(),
  currentStudent:'',
  sessionElapsed:0,
  sessionActive:0,
  syncInProgress:false,
  testSessionDaily:{},
  testSessionIdleDaily:{},
  testSessionTotal:0
};
let studyTimeServerCache={}; // { 학생이름: {totalSeconds,daily,lastActiveAt,focusTime,idleTime} } — 부모님/선생님 화면용 벌크 캐시

function studyTimeStorageKey(name){
  return `studyTimeData_${String(name||'').trim()}`;
}

function todayLocalDateForStudyTime(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekDateKeys(){
  const now=new Date();
  const day=(now.getDay()+6)%7;
  const monday=new Date(now);
  monday.setDate(now.getDate()-day);
  return Array.from({length:7},(_,i)=>{
    const d=new Date(monday);
    d.setDate(monday.getDate()+i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
}

function readStudyTimeData(name){
  const safeName=String(name||'').trim();
  if(!safeName)return {total:0,daily:{},idleDaily:{},lastActiveAt:null};
  try{
    const raw=JSON.parse(localStorage.getItem(studyTimeStorageKey(safeName))||'{}');
    return {
      total:Math.max(0,Number(raw.total)||0),
      daily:(raw.daily&&typeof raw.daily==='object')?raw.daily:{},
      idleDaily:(raw.idleDaily&&typeof raw.idleDaily==='object')?raw.idleDaily:{},
      lastActiveAt:raw.lastActiveAt||null
    };
  }catch(e){
    return {total:0,daily:{},idleDaily:{},lastActiveAt:null};
  }
}

function writeStudyTimeData(name,data){
  const safeName=String(name||'').trim();
  if(!safeName)return;
  localStorage.setItem(studyTimeStorageKey(safeName),JSON.stringify(data));
}

// 날짜별/총합/lastActiveAt을 "더 큰 값·더 최근 값" 기준으로 병합 (서버 병합과 동일한 규칙, 로컬↔서버 어느 방향이든 재사용)
function mergeStudyTimeDaily(baseDaily, otherDaily){
  const merged=Object.assign({}, baseDaily);
  Object.keys(otherDaily||{}).forEach(day=>{
    merged[day]=Math.max(Number(merged[day])||0, Number(otherDaily[day])||0);
  });
  return merged;
}
function mergeLastActiveAt(a,b){
  if(!a)return b||null;
  if(!b)return a||null;
  return (new Date(b).getTime()>new Date(a).getTime())?b:a;
}

// 서버에서 받은 studyTime을 로컬 저장값과 병합 (서버 값이 없으면 손대지 않고, 있으면 더 큰 값으로 병합 — 로컬 기록 유실 없음)
function mergeServerStudyTimeIntoLocal(name,serverData){
  if(!serverData || typeof serverData!=='object')return;
  const safeName=String(name||'').trim();
  if(!safeName)return;
  const local=readStudyTimeData(safeName);
  const merged={
    total:Math.max(local.total, Number(serverData.totalSeconds)||0),
    daily:mergeStudyTimeDaily(local.daily, serverData.daily),
    idleDaily:local.idleDaily, // idleDaily(일별 유휴)는 서버에 없는 로컬 전용 세부값이라 그대로 보존
    lastActiveAt:mergeLastActiveAt(local.lastActiveAt, serverData.lastActiveAt)
  };
  writeStudyTimeData(safeName, merged);
}

// getStudyTimeSummary(name) — 시그니처/반환형태는 기존과 동일 (화면 템플릿 수정 불필요)
// 내부적으로 로컬 실시간 값 + 서버 벌크캐시(studyTimeServerCache, 부모님/선생님 화면용)를 병합해서 계산
function getStudyTimeSummary(name){
  const safeName=String(name||'').trim();
  const local=readStudyTimeData(safeName);
  const server=studyTimeServerCache[safeName];
  // 부모님 확인 화면은 "이 기기에 우연히 남아있는 로컬 기록"이 섞이면 안 되므로 서버 값만 사용
  const useServerOnly=parentChildViewActive && server;
  const daily=useServerOnly?(server.daily||{}):(server?mergeStudyTimeDaily(local.daily, server.daily):local.daily);
  let totalSeconds=useServerOnly
    ? Math.max(0, Number(server.totalSeconds)||0)
    : Math.max(0, Math.max(local.total, server?(Number(server.totalSeconds)||0):0));
  const lastActiveAt=useServerOnly
    ? (server.lastActiveAt||null)
    : (server?mergeLastActiveAt(local.lastActiveAt, server.lastActiveAt):local.lastActiveAt);

  const today=todayLocalDateForStudyTime();
  const weekKeys=getWeekDateKeys();
  let todaySeconds=Math.max(0,Number(daily[today])||0);
  let todayIdleSeconds=useServerOnly?0:Math.max(0,Number(local.idleDaily[today])||0);
  let weekSeconds=weekKeys.reduce((sum,key)=>sum+(Number(daily[key])||0),0);

  if(isDeveloperTestMode() && safeName===playerName){
    todaySeconds=Number(studyTimeState.testSessionDaily[today])||0;
    todayIdleSeconds=Number(studyTimeState.testSessionIdleDaily[today])||0;
    weekSeconds=weekKeys.reduce((sum,key)=>sum+(Number(studyTimeState.testSessionDaily[key])||0),0);
    totalSeconds=studyTimeState.testSessionTotal;
  }

  const focusBase=todaySeconds+todayIdleSeconds;
  const focusPercent=focusBase>0?Math.round((todaySeconds/focusBase)*100):0;
  const focusMode=getFocusModeSummary(safeName,server&&server.focusMode);
  return {todaySeconds,weekSeconds,totalSeconds,todayIdleSeconds,focusPercent,lastActiveAt,
    focusModeTodaySeconds:focusMode.todaySeconds,
    focusModeWeekSeconds:focusMode.weekSeconds,
    focusModeTotalSeconds:focusMode.totalSeconds,
    focusModeLeaveCount:focusMode.todayLeaveCount};
}

function formatStudySeconds(sec){
  const value=Math.max(0,Math.floor(Number(sec)||0));
  const h=Math.floor(value/3600);
  const m=Math.floor((value%3600)/60);
  if(h>0)return `${h}시간 ${m}분`;
  if(m>0)return `${m}분`;
  return `${value}초`;
}

function formatStudyClock(sec){
  const value=Math.max(0,Math.floor(Number(sec)||0));
  const h=Math.floor(value/3600);
  const m=Math.floor((value%3600)/60);
  const s=value%60;
  if(h>0){
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function isStudyTimeViewerMode(){
  return !!(
    viewerModeActive ||
    studyPlannerViewerMode ||
    parentChildViewActive ||
    document.getElementById('parent-screen')?.style.display==='block' ||
    document.getElementById('teacher-screen')?.style.display==='block'
  );
}

function enterStudyTimeViewerMode(){
  viewerModeActive=true;
  studyTimeState.lastTick=Date.now();
  studyTimeState.lastInteraction=Date.now();
  studyTimeState.sessionElapsed=0;
  studyTimeState.sessionActive=0;

  // 부모님·선생님 조회 화면에서는 집중모드 시간도 절대 누적하지 않음
  if(typeof focusModeState!=='undefined' && focusModeState.active){
    endFocusMode(false,true);
  }
}

function isStudyTimeTrackableStudent(){
  // 학생이 직접 학습하는 화면에서만 측정. 부모님·선생님·조회 화면은 완전 제외.
  return !!playerName && !isAdminSessionActive() && !isStudyTimeViewerMode();
}

function markStudyInteraction(){
  // 부모님·선생님 조회 중의 클릭·스크롤은 학생 학습 활동으로 취급하지 않음
  if(isStudyTimeViewerMode()){
    studyTimeState.lastTick=Date.now();
    return;
  }
  studyTimeState.lastInteraction=Date.now();
  if(playerName && studyTimeState.currentStudent!==playerName){
    studyTimeState.currentStudent=playerName;
    studyTimeState.lastTick=Date.now();
    studyTimeState.sessionElapsed=0;
    studyTimeState.sessionActive=0;
  }
}

function persistStudyTimeTick(activeSeconds,idleSeconds){
  // 호출 경로가 잘못 연결되어도 조회 모드에서는 로컬 기록조차 수정하지 않음
  if(!isStudyTimeTrackableStudent())return;
  const name=String(studyTimeState.currentStudent||playerName||'').trim();
  if(!name)return;
  const today=todayLocalDateForStudyTime();

  if(isDeveloperTestMode()){
    studyTimeState.testSessionDaily[today]=(Number(studyTimeState.testSessionDaily[today])||0)+activeSeconds;
    studyTimeState.testSessionIdleDaily[today]=(Number(studyTimeState.testSessionIdleDaily[today])||0)+idleSeconds;
    studyTimeState.testSessionTotal+=activeSeconds;
    return;
  }

  const data=readStudyTimeData(name);
  data.daily[today]=(Number(data.daily[today])||0)+activeSeconds;
  data.idleDaily[today]=(Number(data.idleDaily[today])||0)+idleSeconds;
  data.total=(Number(data.total)||0)+activeSeconds;
  if(activeSeconds>0)data.lastActiveAt=new Date().toISOString();
  writeStudyTimeData(name,data);
}

function updateStudyTimeDisplays(){
  const s=playerName?getStudyTimeSummary(playerName):null;
  const todayEl=document.getElementById('home-study-today');
  const weekEl=document.getElementById('home-study-week');
  const focusEl=document.getElementById('home-study-focus');
  if(s){
    if(todayEl) todayEl.innerHTML=`<span class="home-studytime-label">⏱ 오늘 공부시간</span> <span class="home-studytime-value">${formatStudyClock(s.todaySeconds)}</span>`;
    if(weekEl) weekEl.innerHTML=`<span class="home-studytime-label">📚 이번주 공부시간</span> <span class="home-studytime-value">${formatStudySeconds(s.weekSeconds)}</span>`;
    if(focusEl) focusEl.innerHTML=`<span class="home-studytime-label">🔥 집중도</span> <span class="home-studytime-value">${s.focusPercent}%</span>`;
  }
  // 구버전 마크업(한 줄 표시)이 남아있는 화면을 위한 하위호환
  const home=document.getElementById('home-study-time');
  if(home&&s){
    home.innerHTML=`<span class="home-studytime-label">⏱ 오늘</span> <span class="home-studytime-value">${formatStudyClock(s.todaySeconds)}</span> · <span class="home-studytime-label">이번 주</span> <span class="home-studytime-value">${formatStudySeconds(s.weekSeconds)}</span> · <span class="home-studytime-label">집중도</span> <span class="home-studytime-value">${s.focusPercent}%</span>`;
  }
}

// 로컬 데이터를 서버 저장 형식(StudentRecord.studyTime)으로 변환
function buildStudyTimeServerPayload(name){
  const data=readStudyTimeData(name);
  const idleTotal=Object.values(data.idleDaily||{}).reduce((sum,v)=>sum+(Number(v)||0),0);
  return {
    totalSeconds:data.total,
    daily:data.daily,
    lastActiveAt:data.lastActiveAt,
    focusTime:data.total,
    idleTime:idleTotal,
    focusMode:readFocusModeData(name)
  };
}

// 서버 저장 — 30초 주기/학생전환/visibilitychange에서 호출. 화면 전환 속도에 영향 없도록 항상 백그라운드(비대기)로 사용할 것
async function syncStudyTimeToServer(name,useBeacon){
  const safeName=String(name||'').trim();
  if(!safeName || isAdminSessionActive() || isDeveloperTestMode() || isStudyTimeViewerMode())return; // 조회모드/관리자모드는 저장 안 함
  if(studyTimeState.syncInProgress && !useBeacon)return; // 이전 저장이 진행 중이면 중복 요청 생략
  studyTimeState.syncInProgress=true;
  try{
    const payload=buildStudyTimeServerPayload(safeName);
    const ok=await apiSetStudyTime(safeName,payload,useBeacon);
    if(ok && !useBeacon){
      flushPendingLearningEvents_(safeName).catch(err=>console.error('학습이벤트 전송 실패(무시):',err)); // LearningEventLog에 sync 행 자체는 안 남김, 대기열 전송만 시도
    }
  }catch(e){
    console.error('학습시간 서버 저장 실패:',e);
  }finally{
    studyTimeState.syncInProgress=false;
  }
}

function startStudyTimeTracker(){
  if(studyTimeState.timer)return;
  studyTimeState.lastTick=Date.now();
  studyTimeState.lastInteraction=Date.now();

  ['pointerdown','keydown','scroll','touchstart','input'].forEach(type=>{
    document.addEventListener(type,markStudyInteraction,{passive:true});
  });

  studyTimeState.timer=setInterval(()=>{
    const now=Date.now();
    let seconds=Math.floor((now-studyTimeState.lastTick)/1000);
    studyTimeState.lastTick=now;
    if(seconds<=0||seconds>10)return;

    if(!isStudyTimeTrackableStudent()||document.hidden)return;

    if(studyTimeState.currentStudent!==playerName){
      studyTimeState.currentStudent=playerName;
      studyTimeState.sessionElapsed=0;
      studyTimeState.sessionActive=0;
    }

    const active=(now-studyTimeState.lastInteraction)<=STUDY_IDLE_LIMIT_MS;
    studyTimeState.sessionElapsed+=seconds;

    if(active){
      studyTimeState.sessionActive+=seconds;
      persistStudyTimeTick(seconds,0);
    }else{
      persistStudyTimeTick(0,seconds);
    }

    updateStudyTimeDisplays();
  },1000);

  // 측정과 별도로 화면을 1초마다 다시 그려 숫자가 멈추지 않게 함
  if(studyTimeState.displayTimer)clearInterval(studyTimeState.displayTimer);
  studyTimeState.displayTimer=setInterval(()=>{
    if(playerName)updateStudyTimeDisplays(); // 조회 화면에서는 값만 읽어 표시
    if(!isStudyTimeViewerMode()&&typeof focusModeState!=='undefined'&&focusModeState.active&&typeof renderFocusMode==='function'){
      renderFocusMode();
    }
  },1000);

  // 30초마다 서버로 백그라운드 저장 (화면 렌더링과 무관, await 안 함)
  studyTimeState.syncTimer=setInterval(()=>{
    if(isStudyTimeTrackableStudent()) syncStudyTimeToServer(playerName,false);
  },STUDY_TIME_SYNC_INTERVAL_MS);
}

document.addEventListener('visibilitychange',()=>{
  studyTimeState.lastTick=Date.now();
  if(document.hidden){
    // 강의 링크를 포함해 앱 밖에서는 공부시간을 측정하지 않음
    if(isStudyTimeTrackableStudent()) syncStudyTimeToServer(playerName,true);
  }else{
    markStudyInteraction();
    if(isLearningEventTrackable_()) flushPendingLearningEvents_(playerName).catch(err=>console.error('학습이벤트 전송 실패(무시):',err)); // 앱 복귀 시 대기열 재전송 시도(새 리스너 아님, 기존 리스너 재사용)
  }
});
window.addEventListener('beforeunload',()=>{
  updateStudyTimeDisplays();
  if(isStudyTimeTrackableStudent()) syncStudyTimeToServer(playerName,true); // sendBeacon 사용 — 응답을 기다릴 수 없는 시점
});
window.addEventListener('pagehide',()=>{
  if(isStudyTimeTrackableStudent()) syncStudyTimeToServer(playerName,true);
});
startStudyTimeTracker();


// ===== 기존 inline script 2 =====



// ===== 기존 inline script 3 =====
function toggleSubjectSection(header){
  const section=header.closest('.subject-section');
  section.classList.toggle('open');
}


// ===== 기존 inline script 4 =====
function toggleIncompleteSection(){
  incompleteSectionExpanded=!incompleteSectionExpanded;

  const body=document.getElementById('incomplete-units-body');
  const arrow=document.getElementById('incomplete-section-arrow');

  if(body) body.style.display=incompleteSectionExpanded?'flex':'none';
  if(arrow) arrow.textContent=incompleteSectionExpanded?'▾':'▸';
}


// ===== 기존 inline script 5 =====
function openStudentNotes(e, studentName){
  if(e)e.stopPropagation();
  const nameText=studentName?`${studentName} 학생의 `:'';
  alert(`${nameText}쪽지 기능은 준비 중입니다.`);
}


// ===== 기존 inline script 6 =====
const messageUiState={
  // 백엔드 연결 전에는 빈 대화로 시작
  messages:[]
};

function formatMessageTime(value){
  const d=value?new Date(value):new Date();
  if(Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
}

function escapeMessageHtml(value){
  return String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function renderMessages(messages=messageUiState.messages){
  const list=document.getElementById('message-list');
  if(!list) return;

  if(!Array.isArray(messages)||messages.length===0){
    list.innerHTML='<div class="message-empty">아직 쪽지가 없어요.<br>선생님께 먼저 인사를 남겨보세요 😊</div>';
    return;
  }

  const adminMode=isAdminSessionActive();
  list.innerHTML=messages.map(msg=>{
    const isStudent=msg.from==='student';
    const canDelete=adminMode && msg.from==='teacher';
    return `<div class="chat-row ${isStudent?'student':'teacher'}">
      <div class="chat-sender">${isStudent?'학생':'선생님'}</div>
      <div class="chat-bubble" style="position:relative;${canDelete?'padding-right:38px;':''}">
        ${escapeMessageHtml(msg.text)}
        ${canDelete?`<button type="button" class="msg-delete-btn" onclick="deleteTeacherMessage('${msg.id}');event.stopPropagation();" aria-label="선생님 쪽지 삭제" title="삭제">🗑️</button>`:''}
      </div>
      <div class="chat-time">${formatMessageTime(msg.createdAt)}</div>
    </div>`;
  }).join('');

  requestAnimationFrame(()=>{list.scrollTop=list.scrollHeight;});
}

async function openMessageCenter(){
  const overlay=document.getElementById('message-overlay');
  const nameEl=document.getElementById('message-chat-student');
  const roleBadge=document.getElementById('message-role-badge');
  const input=document.getElementById('message-reply-input');
  const adminMode=isAdminSessionActive();
  const role=adminMode?'teacher':'student';

  if(!playerName){ if(typeof showToast2==='function') showToast2('⚠️ 먼저 이름을 선택해주세요!'); return; }

  if(nameEl) nameEl.textContent=playerName?`${playerName} 학생`:'학생';
  if(roleBadge) roleBadge.classList.toggle('show',adminMode);
  if(input){
    input.placeholder=adminMode
      ? `${playerName||'학생'}에게 쪽지를 입력하세요`
      : '선생님께 답장을 입력하세요';
  }

  overlay?.classList.add('show');
  renderMessages([]); // 로딩 중 빈 상태로 우선 표시

  const res=await apiGetMessages(playerName, role, true); // 쪽지함을 여는 시점 = 읽음 처리
  messageUiState.messages=(res && Array.isArray(res.items))?res.items:[];
  renderMessages();
  updateMessageBadge();

  // 자동 포커스를 주지 않아 쪽지창을 열자마자 키보드와 화면 확대가 발생하지 않게 함
}

function closeMessageCenter(){
  document.getElementById('message-overlay')?.classList.remove('show');
}

function updateMessageSendButton(){
  const input=document.getElementById('message-reply-input');
  const button=document.getElementById('message-send-btn');
  if(button) button.disabled=!input?.value.trim();
}

function handleMessageReplyKeydown(event){
  // 한글 입력 조합 중에는 Enter 전송을 막아 마지막 글자 중복을 방지
  if(event.isComposing || event.keyCode===229) return;

  if(event.key==='Enter'&&!event.shiftKey){
    event.preventDefault();
    sendStudentReply();
  }
}

let messageSendInProgress=false;

async function sendStudentReply(){
  if(messageSendInProgress) return;
  if(!playerName) return;

  const input=document.getElementById('message-reply-input');
  const text=input?.value.trim();
  if(!text) return;

  messageSendInProgress=true;
  const button=document.getElementById('message-send-btn');
  if(button) button.disabled=true;

  const sender=isAdminSessionActive()?'teacher':'student'; // 관리자모드로 학생에게 보내도 from은 반드시 'teacher'

  const res=await apiSendMessage(playerName, sender, text);

  if(res && res.ok){
    messageUiState.messages.push(res.message);
    input.value='';
    renderMessages();
    updateMessageBadge();
    if(typeof showToast==='function'){
      showToast(sender==='teacher'?'쪽지를 보냈어요':'답장을 보냈어요');
    }
  }else{
    if(typeof showToast2==='function') showToast2('⚠️ 쪽지 전송에 실패했어요. 다시 시도해주세요.');
  }

  updateMessageSendButton();
  // 빠른 Enter/버튼 중복 입력 방지 후 잠금 해제
  setTimeout(()=>{ messageSendInProgress=false; }, 250);
}

async function updateMessageBadge(){
  if(!playerName)return;
  const role=isAdminSessionActive()?'teacher':'student';
  const res=await apiGetMessages(playerName, role, false); // 배지 갱신용 조회는 읽음 처리 안 함
  if(!res || !Array.isArray(res.items))return;
  const lastRead=role==='teacher'?res.lastReadByTeacher:res.lastReadByStudent;
  const otherFrom=role==='teacher'?'student':'teacher';
  const unreadCount=res.items.filter(m=>m.from===otherFrom && (!lastRead || m.createdAt>lastRead)).length;
  document.querySelectorAll('.learning-name-mail-badge').forEach(badge=>{
    if(unreadCount>0){
      badge.textContent=unreadCount>9?'9+':String(unreadCount);
      badge.style.display='flex';
    }else{
      badge.style.display='none';
    }
  });
}

async function deleteTeacherMessage(id){
  if(!isAdminSessionActive()){
    if(typeof showToast2==='function') showToast2('⚠️ 관리자모드에서만 삭제할 수 있어요.');
    return;
  }

  const target=messageUiState.messages.find(m=>m.id===id && m.from==='teacher');
  if(!target) return;
  if(!confirm('이 쪽지를 완전히 삭제하시겠습니까?')) return;

  const res=await apiDeleteMessage(playerName,id);
  if(!res || !res.ok){
    console.error('쪽지 삭제 실패:',res);
    if(typeof showToast2==='function') showToast2('⚠️ 쪽지를 삭제하지 못했어요.');
    return;
  }

  messageUiState.messages=messageUiState.messages.filter(m=>m.id!==id);
  renderMessages();
  updateMessageBadge();
  if(typeof showToast==='function') showToast('쪽지가 삭제됐어요.');
}

document.addEventListener('click',event=>{
  const overlay=document.getElementById('message-overlay');
  if(event.target===overlay) closeMessageCenter();
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape') closeMessageCenter();
});


// ===== 기존 inline script 7 =====
const studyPlannerCache={};

function studyPlannerKey(name){
  return 'studyPlanner_'+name;
}

function getStudyPlannerData(name=playerName){
  if(!name)return {};
  if(studyPlannerCache[name])return studyPlannerCache[name];

  try{
    const data=JSON.parse(localStorage.getItem(studyPlannerKey(name))||'{}');
    studyPlannerCache[name]=(data&&typeof data==='object'&&!Array.isArray(data))?data:{};
  }catch(e){
    studyPlannerCache[name]={};
  }
  return studyPlannerCache[name];
}

async function loadStudyPlannerData(name=playerName){
  if(!name)return {};

  const serverData=await apiGetStudyPlanner(name);
  let plans={};
  let activities=[];

  if(serverData&&typeof serverData==='object'){
    if(serverData.plans&&typeof serverData.plans==='object'){
      plans=serverData.plans;
    }else{
      // 이전/단순 응답 구조도 허용
      const dateKeys=Object.keys(serverData).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k));
      if(dateKeys.length){
        dateKeys.forEach(k=>{plans[k]=serverData[k];});
      }
    }

    if(Array.isArray(serverData.activities)){
      activities=serverData.activities;
    }else if(serverData.activities&&typeof serverData.activities==='object'){
      activities=Object.values(serverData.activities).flat().filter(Boolean);
    }
  }

  // 서버에 기록이 없을 때만 기존 localStorage를 폴백
  if(Object.keys(plans).length===0){
    try{
      const localPlans=JSON.parse(localStorage.getItem(studyPlannerKey(name))||'{}');
      if(localPlans&&typeof localPlans==='object'&&!Array.isArray(localPlans)){
        plans=localPlans;
      }
    }catch(e){}
  }

  if(activities.length===0){
    try{
      const localActivities=JSON.parse(localStorage.getItem(completedStudyActivityKey(name))||'[]');
      if(Array.isArray(localActivities))activities=localActivities;
    }catch(e){}
  }

  // 서버 기록과 로컬 기록 병합
  // 강의 클릭 직후 새 탭 이동으로 서버 요청이 늦어져도 로컬 진행중 기록을 보존
  try{
    const localPlans=JSON.parse(localStorage.getItem(studyPlannerKey(name))||'{}');
    if(localPlans&&typeof localPlans==='object'&&!Array.isArray(localPlans)){
      Object.keys(localPlans).forEach(date=>{
        const serverList=Array.isArray(plans[date])?[...plans[date]]:[];
        const localList=Array.isArray(localPlans[date])?localPlans[date]:[];

        localList.forEach(localItem=>{
          if(!localItem)return;
          const exists=serverList.some(serverItem=>
            serverItem&&(
              (localItem.id&&serverItem.id===localItem.id)||
              (localItem.lectureKey&&serverItem.lectureKey===localItem.lectureKey)
            )
          );
          if(!exists)serverList.push(localItem);
        });

        if(serverList.length>0)plans[date]=serverList;
      });
    }
  }catch(error){
    console.warn('스터디플래너 로컬 병합 실패:',error);
  }

  // 완료 활동도 서버/로컬 병합
  try{
    const localActivities=JSON.parse(localStorage.getItem(completedStudyActivityKey(name))||'[]');
    if(Array.isArray(localActivities)){
      localActivities.forEach(localItem=>{
        if(localItem&&!activities.some(serverItem=>serverItem&&serverItem.key===localItem.key)){
          activities.push(localItem);
        }
      });
    }
  }catch(error){
    console.warn('완료 활동 로컬 병합 실패:',error);
  }

  studyPlannerCache[name]=plans;
  completedStudyActivityCache[name]=activities;
  return {plans,activities};
}

async function saveStudyPlannerData(name,data){
  if(!name||isAdminSessionActive())return false;

  studyPlannerCache[name]=data;
  localStorage.setItem(studyPlannerKey(name),JSON.stringify(data));

  const ok=await apiSetStudyPlanner(name,data);
  if(!ok&&typeof showToast2==='function'){
    showToast2('⚠️ 스터디플래너 서버 저장에 실패했어요.');
  }
  return ok;
}


const completedStudyActivityCache={};

function completedStudyActivityKey(name){
  return 'completedStudyActivities_'+name;
}

function getCompletedStudyActivities(name=playerName){
  if(!name)return [];
  if(Array.isArray(completedStudyActivityCache[name])){
    return completedStudyActivityCache[name];
  }

  try{
    const list=JSON.parse(localStorage.getItem(completedStudyActivityKey(name))||'[]');
    completedStudyActivityCache[name]=Array.isArray(list)?list:[];
  }catch(e){
    completedStudyActivityCache[name]=[];
  }
  return completedStudyActivityCache[name];
}

async function addCompletedStudyActivity(activity){
  if(parentChildViewActive||viewerModeActive)return false;
  if(!playerName||isAdminSessionActive()||!activity)return false;

  const date=activity.date||todayLocalDate();
  const source=activity.source||'history';
  const title=String(activity.title||'').trim();
  if(!title)return false;

  const key=activity.key||`${source}_${date}_${title}`;
  const list=[...getCompletedStudyActivities(playerName)];

  if(list.some(item=>item.key===key))return false;

  const normalizedActivity={
    id:activity.id||'auto_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
    key,
    source,
    title,
    detail:activity.detail||'',
    date,
    completedAt:activity.completedAt||new Date().toISOString()
  };

  // 화면은 즉시 반영하고 서버 저장은 이어서 수행
  list.push(normalizedActivity);
  completedStudyActivityCache[playerName]=list;
  if(!isDeveloperTestMode()){
    localStorage.setItem(completedStudyActivityKey(playerName),JSON.stringify(list));
  }

  if(document.getElementById('study-planner-overlay')?.classList.contains('show')){
    renderStudyPlanner();
  }

  if(isDeveloperTestMode())return true;
  const ok=await apiAddCompletedStudyActivity(playerName,normalizedActivity);
  if(!ok&&typeof showToast2==='function'){
    showToast2('⚠️ 완료 학습기록 서버 저장에 실패했어요.');
  }
  return ok;
}

// 다른 수학 앱에서도 같은 도메인에서 아래 함수를 호출하면 자동 기록됩니다.
// 예: window.addCompletedStudyActivity({source:'math',title:'일차방정식 10문제',detail:'10/10 완료'})
window.addCompletedStudyActivity=addCompletedStudyActivity;

function renderCompletedStudyActivities(date){
  const area=document.getElementById('study-auto-list');
  if(!area)return;

  const items=getCompletedStudyActivities(playerName)
    .filter(item=>item.date===date)
    .sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)));

  if(items.length===0){
    area.innerHTML='<div class="study-planner-empty" style="padding:16px 8px">이 날짜에 앱에서 완료한 공부가 아직 없어요.</div>';
    return;
  }

  area.innerHTML=items.map(item=>{
    const isMath=item.source==='math';
    return `<div class="study-auto-item">
      <span class="study-auto-icon">${isMath?'➗':'📚'}</span>
      <div class="study-auto-main">
        <div class="study-auto-text">${escapeStudyPlannerHtml(item.title)}</div>
        <div class="study-auto-meta">${escapeStudyPlannerHtml(item.detail||'완료')} · ${formatStudyActivityTime(item.completedAt)}</div>
      </div>
      <span class="study-auto-badge">완료</span>
    </div>`;
  }).join('');
}


function getAllCompletedLearningItems(name=playerName){
  if(!name)return [];

  const items=[];

  // UNIT 및 정리문제
  if(typeof getActiveUnitKeys==='function' && typeof UNITS==='object'){
    getActiveUnitKeys().forEach(unitKey=>{
      const unit=UNITS[unitKey];
      if(!unit)return;
      const progress=unit.examMode
        ? calculateSummaryQuizProgress(name,unitKey)
        : calculateUnitProgress(name,unitKey);

      if(progress&&progress.completed){
        items.push({
          group:'UNIT',
          icon:unit.icon||'📖',
          title:unit.title,
          detail:unit.examMode?'정리문제 PASS':'기본·심화 완료',
          order:1000+Object.keys(UNITS).indexOf(unitKey)
        });
      }
    });
  }

  // 역사훈련소 PART
  if(Array.isArray(historyTrainingData)){
    historyTrainingData.forEach((part,index)=>{
      const progress=calculateHistoryTrainingProgress(name,part.id);
      if(progress&&progress.completed){
        items.push({
          group:'역사훈련소',
          icon:'🏛️',
          title:`PART ${part.partNumber} · ${part.title}`,
          detail:'오답 복습까지 완료',
          order:2000+index
        });
      }
    });
  }

  // 지도문제 PART
  if(Array.isArray(MAP_STUDY_PARTS)){
    const mapProgress=(typeof getMapStudyProgress==='function')
      ? getMapStudyProgress(name)
      : {};
    MAP_STUDY_PARTS.forEach((part,index)=>{
      const record=mapProgress&&mapProgress[part.id];
      if(record&&record.passed){
        items.push({
          group:'지도문제',
          icon:'🗺️',
          title:`${part.id.toUpperCase()} · ${part.title}`,
          detail:`${Number(record.correct)||0}/${Number(record.total)||part.questions.length} · PASS`,
          order:3000+index
        });
      }
    });
  }

  // 사건 배열 완료 기록은 보존하지만 운영 화면의 완료 목록에서는 제외
  if(TIMELINE_GAME_ENABLED && typeof getTimelineGameScoreStore==='function' &&
     typeof PASS_THRESHOLDS==='object' &&
     typeof DIFF_INFO==='object'){
    const scores=getTimelineGameScoreStore(name)||{};
    ['easy','medium','hard'].forEach((difficulty,index)=>{
      const score=scores[difficulty]||{};
      if((Number(score.correct)||0)>=(Number(PASS_THRESHOLDS[difficulty])||0)){
        items.push({
          group:'사건 배열하기',
          icon:'📜',
          title:`${DIFF_INFO[difficulty]?.label||difficulty} 난이도`,
          detail:`정답 ${Number(score.correct)||0}개 · PASS`,
          order:4000+index
        });
      }
    });
  }

  return items.sort((a,b)=>a.order-b.order);
}

function renderAllCompletedLearningItems(){
  const area=document.getElementById('study-completed-all-list');
  if(!area)return;

  const items=getAllCompletedLearningItems(playerName);
  if(items.length===0){
    area.innerHTML='<div class="study-planner-empty" style="padding:16px 8px">아직 완료한 단원이나 PART가 없어요.</div>';
    return;
  }

  let lastGroup='';
  area.innerHTML=items.map(item=>{
    const groupHeader=item.group!==lastGroup
      ? `<div class="study-auto-group-title">${escapeStudyPlannerHtml(item.group)}</div>`
      : '';
    lastGroup=item.group;

    return `${groupHeader}<div class="study-auto-item">
      <span class="study-auto-icon">${item.icon}</span>
      <div class="study-auto-main">
        <div class="study-auto-text">${escapeStudyPlannerHtml(item.title)}</div>
        <div class="study-auto-meta">${escapeStudyPlannerHtml(item.detail)}</div>
      </div>
      <span class="study-auto-badge">완료</span>
    </div>`;
  }).join('');
}

function formatStudyActivityTime(value){
  try{
    return new Date(value).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
  }catch(e){
    return '';
  }
}

function todayLocalDate(){
  const d=new Date();
  const offset=d.getTimezoneOffset();
  return new Date(d.getTime()-offset*60000).toISOString().slice(0,10);
}

let studyPlannerViewerMode=false;
let studyPlannerViewerRole='';
let studyPlannerViewerOriginalName='';

function isStudyPlannerReadOnly(){
  return studyPlannerViewerMode || isAdminSessionActive();
}

async function openStudyPlannerForViewer(name,role='teacher'){
  if(!name)return;

  studyPlannerViewerMode=true;
  studyPlannerViewerRole=role;
  studyPlannerViewerOriginalName=playerName||'';
  playerName=name;

  const dateInput=document.getElementById('study-planner-date');
  if(!dateInput.value)dateInput.value=todayLocalDate();

  const roleLabel=role==='parent'?'부모님 확인':'선생님 확인';
  document.getElementById('study-planner-title').textContent=`📅 ${name}의 스터디플래너`;
  const note=document.getElementById('study-planner-admin-note');
  note.style.display='block';
  note.textContent=`👀 ${roleLabel} · 조회 전용`;
  document.getElementById('study-planner-input-row').style.display='none';
  document.getElementById('study-planner-overlay').classList.add('show');

  const listArea=document.getElementById('study-planner-list');
  const autoArea=document.getElementById('study-auto-list');
  const completedAllArea=document.getElementById('study-completed-all-list');
  if(listArea)listArea.innerHTML='<div class="study-planner-empty">불러오는 중...</div>';
  if(autoArea)autoArea.innerHTML='<div class="study-planner-empty" style="padding:16px 8px">완료 기록을 불러오는 중...</div>';
  if(completedAllArea)completedAllArea.innerHTML='<div class="study-planner-empty" style="padding:16px 8px">누적 완료 기록을 불러오는 중...</div>';

  await loadStudyPlannerData(name);
  renderStudyPlanner();
}

async function openStudyPlanner(){
  studyPlannerViewerMode=false;
  studyPlannerViewerRole='';
  studyPlannerViewerOriginalName='';
  if(!playerName){
    showToast2('⚠️ 먼저 이름을 선택해주세요!');
    return;
  }

  const dateInput=document.getElementById('study-planner-date');
  if(!dateInput.value)dateInput.value=todayLocalDate();

  document.getElementById('study-planner-title').textContent=`📅 ${playerName}의 스터디플래너`;
  document.getElementById('study-planner-admin-note').style.display=isAdminSessionActive()?'block':'none';
  document.getElementById('study-planner-input-row').style.display=isAdminSessionActive()?'none':'grid';
  document.getElementById('study-planner-overlay').classList.add('show');

  const listArea=document.getElementById('study-planner-list');
  const autoArea=document.getElementById('study-auto-list');
  const completedAllArea=document.getElementById('study-completed-all-list');
  if(listArea)listArea.innerHTML='<div class="study-planner-empty">불러오는 중...</div>';
  if(autoArea)autoArea.innerHTML='<div class="study-planner-empty" style="padding:16px 8px">완료 기록을 불러오는 중...</div>';
  if(completedAllArea)completedAllArea.innerHTML='<div class="study-planner-empty" style="padding:16px 8px">누적 완료 기록을 불러오는 중...</div>';

  await loadStudyPlannerData(playerName);
  await carryOverMissedPlansToDate(document.getElementById('study-planner-date').value||todayLocalDate());
  renderStudyPlanner();

  if(!isAdminSessionActive()){
    setTimeout(()=>document.getElementById('study-planner-input')?.focus(),100);
  }
}

function closeStudyPlanner(){
  document.getElementById('study-planner-overlay').classList.remove('show');

  if(studyPlannerViewerMode){
    playerName=studyPlannerViewerOriginalName||playerName;
    studyPlannerViewerMode=false;
    studyPlannerViewerRole='';
    studyPlannerViewerOriginalName='';
  }

  const note=document.getElementById('study-planner-admin-note');
  if(note)note.textContent='👩‍🏫 관리자모드 · 조회 전용';
}

function closeStudyPlannerByBackdrop(event){
  if(event.target.id==='study-planner-overlay')closeStudyPlanner();
}

async function setStudyPlannerToday(){
  document.getElementById('study-planner-date').value=todayLocalDate();
  await handleStudyPlannerDateChange();
}

async function handleStudyPlannerDateChange(){
  const date=document.getElementById('study-planner-date').value||todayLocalDate();
  if(!isStudyPlannerReadOnly()){
    await carryOverMissedPlansToDate(date);
  }
  renderStudyPlanner();
}

function getPreviousLocalDate(dateString){
  const [year,month,day]=String(dateString||'').split('-').map(Number);
  if(!year||!month||!day)return '';
  const date=new Date(year,month-1,day);
  date.setDate(date.getDate()-1);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

async function carryOverMissedPlansToDate(targetDate){
  if(!playerName||isStudyPlannerReadOnly()||!targetDate)return false;

  const previousDate=getPreviousLocalDate(targetDate);
  if(!previousDate)return false;

  const data={...getStudyPlannerData(playerName)};
  const previousList=Array.isArray(data[previousDate])?data[previousDate]:[];
  const missedItems=previousList.filter(item=>item&&item.status==='missed');

  if(missedItems.length===0)return false;

  const targetList=Array.isArray(data[targetDate])?[...data[targetDate]]:[];
  let changed=false;

  missedItems.forEach(item=>{
    const alreadyCarried=targetList.some(current=>
      current&&(
        current.carriedFromId===item.id||
        (current.carriedFromDate===previousDate&&current.text===item.text)
      )
    );
    if(alreadyCarried)return;

    targetList.push({
      id:makeStudyPlanId(),
      text:item.text,
      status:'doing',
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      carriedFromId:item.id,
      carriedFromDate:previousDate
    });
    changed=true;
  });

  if(!changed)return false;

  data[targetDate]=targetList;
  await saveStudyPlannerData(playerName,data);
  return true;
}

function makeStudyPlanId(){
  return 'plan_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
}

let studyPlanAddInProgress=false;

async function addStudyPlan(){
  if(studyPlanAddInProgress||isStudyPlannerReadOnly())return;

  const input=document.getElementById('study-planner-input');
  const planText=input.value.trim();

  if(!planText){
    showToast2('✏️ 공부할 내용을 입력해주세요.');
    input.focus();
    return;
  }

  studyPlanAddInProgress=true;
  input.disabled=true;

  try{
    const date=document.getElementById('study-planner-date').value||todayLocalDate();
    const data={...getStudyPlannerData(playerName)};
    const list=Array.isArray(data[date])?[...data[date]]:[];

    list.push({
      id:makeStudyPlanId(),
      text:planText,
      status:'doing',
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });

    // 저장 요청 전에 입력값을 먼저 비워서
    // 한글 IME의 마지막 글자가 다시 추가되는 현상을 방지
    input.value='';

    data[date]=list;
    await saveStudyPlannerData(playerName,data);
    renderStudyPlanner();
  }finally{
    studyPlanAddInProgress=false;
    input.disabled=false;
    setTimeout(()=>input.focus(),0);
  }
}

async function updateStudyPlanStatus(id,status){
  if(isStudyPlannerReadOnly())return;
  const date=document.getElementById('study-planner-date').value;
  const data={...getStudyPlannerData(playerName)};
  const list=Array.isArray(data[date])?[...data[date]]:[];
  const item=list.find(x=>x.id===id);
  if(!item)return;
  const wasCompleted=item.status==='done';
  item.status=status;
  item.updatedAt=new Date().toISOString();
  data[date]=list;
  const ok=await saveStudyPlannerData(playerName,data);
  if(ok && !wasCompleted && status==='done'){
    // 실제 미완료→완료 전환이고, 서버 저장 성공이 확인된 경우에만 기록
    enqueueLearningEvent_({contentType:'studyPlanner', contentId:id, contentTitle:item.text||'', action:'complete'});
  }
  renderStudyPlanner();
}

async function deleteStudyPlan(id){
  if(isStudyPlannerReadOnly())return;
  const date=document.getElementById('study-planner-date').value;
  const data={...getStudyPlannerData(playerName)};
  const list=Array.isArray(data[date])?[...data[date]]:[];
  data[date]=list.filter(x=>x.id!==id);
  await saveStudyPlannerData(playerName,data);
  renderStudyPlanner();
}

function studyStatusLabel(status){
  return status==='done'?'완료':status==='missed'?'미완료':'진행중';
}

function renderStudyPlanner(){
  if(!playerName)return;
  const date=document.getElementById('study-planner-date').value||todayLocalDate();
  const data=getStudyPlannerData(playerName);
  const list=Array.isArray(data[date])?data[date]:[];

  const counts={
    doing:list.filter(x=>x.status==='doing').length,
    done:list.filter(x=>x.status==='done').length,
    missed:list.filter(x=>x.status==='missed').length
  };

  document.getElementById('study-planner-summary').innerHTML=`
    <span><b>${list.length}</b>전체</span>
    <span><b>${counts.doing}</b>진행중</span>
    <span><b>${counts.done}</b>완료</span>
    <span><b>${counts.missed}</b>미완료</span>`;

  const area=document.getElementById('study-planner-list');
  if(list.length===0){
    area.innerHTML='<div class="study-planner-empty">아직 작성한 공부 계획이 없어요.<br>오늘의 첫 한 줄을 적어볼까요? 🌱</div>';
    renderCompletedStudyActivities(date);
    renderAllCompletedLearningItems();
    return;
  }

  area.innerHTML=list.map(item=>`
    <div class="study-plan-item">
      <span class="study-plan-status-dot ${item.status}"></span>
      <div class="study-plan-main">
        <div class="study-plan-text">${escapeStudyPlannerHtml(item.text)}</div>
        <div class="study-plan-meta">${studyStatusLabel(item.status)}${item.carriedFromDate?` · ${item.carriedFromDate} 미완료 이월`:''}</div>
      </div>
      <div class="study-plan-controls">
        <select class="study-plan-select" onchange="updateStudyPlanStatus('${item.id}',this.value)" ${isStudyPlannerReadOnly()?'disabled':''}>
          <option value="doing" ${item.status==='doing'?'selected':''}>진행중</option>
          <option value="done" ${item.status==='done'?'selected':''}>완료</option>
          <option value="missed" ${item.status==='missed'?'selected':''}>미완료</option>
        </select>
        ${isStudyPlannerReadOnly()?'':`<button class="study-plan-delete" onclick="deleteStudyPlan('${item.id}')">삭제</button>`}
      </div>
    </div>`).join('');
  renderCompletedStudyActivities(date);
  renderAllCompletedLearningItems();
}

function escapeStudyPlannerHtml(value){
  return String(value||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && document.getElementById('study-planner-overlay')?.classList.contains('show')){
    closeStudyPlanner();
  }
  if(event.key==='Enter' && event.target?.id==='study-planner-input'){
    // 한글 입력 조합이 끝나는 Enter는 추가 동작으로 처리하지 않음
    if(event.isComposing || event.keyCode===229)return;
    event.preventDefault();
    addStudyPlan();
  }
});


// ===== 기존 inline script 8 =====
// ===== 집중모드: 25분 집중 + 5분 휴식, 전체화면, 화면 유지, 이탈 감지 =====
const FOCUS_WORK_SECONDS=25*60;
const FOCUS_BREAK_SECONDS=5*60;
let focusModeState={
  active:false,paused:false,elapsed:0,
  timer:null,wakeLock:null,student:'',lastTick:0,leftWhileActive:false,
  autoLocked:false,lastMilestone:0
};

function focusModeStorageKey(name){return `focusModeData_${String(name||'').trim()}`;}
function emptyFocusModeData(){return {totalSeconds:0,daily:{},leaveCountDaily:{},lastStartedAt:null,lastEndedAt:null};}
function readFocusModeData(name){
  const safe=String(name||'').trim();
  if(!safe)return emptyFocusModeData();
  try{
    const raw=JSON.parse(localStorage.getItem(focusModeStorageKey(safe))||'{}');
    return {
      totalSeconds:Math.max(0,Number(raw.totalSeconds)||0),
      daily:(raw.daily&&typeof raw.daily==='object')?raw.daily:{},
      leaveCountDaily:(raw.leaveCountDaily&&typeof raw.leaveCountDaily==='object')?raw.leaveCountDaily:{},
      lastStartedAt:raw.lastStartedAt||null,lastEndedAt:raw.lastEndedAt||null
    };
  }catch(e){return emptyFocusModeData();}
}
function writeFocusModeData(name,data){
  const safe=String(name||'').trim();if(!safe)return;
  localStorage.setItem(focusModeStorageKey(safe),JSON.stringify(data));
}
function mergeFocusModeData(local,server){
  if(!server||typeof server!=='object')return local;
  const merged=emptyFocusModeData();
  merged.totalSeconds=Math.max(Number(local.totalSeconds)||0,Number(server.totalSeconds)||0);
  merged.daily=mergeStudyTimeDaily(local.daily,server.daily);
  merged.leaveCountDaily=mergeStudyTimeDaily(local.leaveCountDaily,server.leaveCountDaily);
  merged.lastStartedAt=mergeLastActiveAt(local.lastStartedAt,server.lastStartedAt);
  merged.lastEndedAt=mergeLastActiveAt(local.lastEndedAt,server.lastEndedAt);
  return merged;
}
function getFocusModeSummary(name,serverData){
  const data=mergeFocusModeData(readFocusModeData(name),serverData);
  const today=todayLocalDateForStudyTime(),week=getWeekDateKeys();
  return {
    todaySeconds:Number(data.daily[today])||0,
    weekSeconds:week.reduce((s,k)=>s+(Number(data.daily[k])||0),0),
    totalSeconds:Number(data.totalSeconds)||0,
    todayLeaveCount:Number(data.leaveCountDaily[today])||0
  };
}
function addFocusSeconds(name,seconds){
  if(seconds<=0)return;
  const d=readFocusModeData(name),today=todayLocalDateForStudyTime();
  d.daily[today]=(Number(d.daily[today])||0)+seconds;
  d.totalSeconds=(Number(d.totalSeconds)||0)+seconds;
  writeFocusModeData(name,d);
}
function addFocusLeave(name){
  const d=readFocusModeData(name),today=todayLocalDateForStudyTime();
  d.leaveCountDaily[today]=(Number(d.leaveCountDaily[today])||0)+1;
  writeFocusModeData(name,d);
  // 관리자/테스트/조회모드는 leave 이벤트와 복귀대기값을 만들지 않음(기존 이탈횟수 증가는 이미 위에서 끝남, 여기는 로그만)
  if(isAdminSessionActive()||isDeveloperTestMode()||viewerModeActive)return;
  const leaveId=enqueueLearningEvent_({
    contentType:'focusMode', action:'leave',
    exitCountAfter:d.leaveCountDaily[today]
  });
  if(leaveId){
    try{ localStorage.setItem(`pendingFocusLeaveId_${name}`, leaveId); }catch(e){}
  }
}
async function requestFocusEnhancements(autoStart){
  if(!autoStart){
    try{
      if(document.documentElement.requestFullscreen&&!document.fullscreenElement)await document.documentElement.requestFullscreen();
    }catch(e){console.warn('전체화면 시작 실패:',e);}
  }
  try{
    if('wakeLock' in navigator)focusModeState.wakeLock=await navigator.wakeLock.request('screen');
  }catch(e){console.warn('화면 꺼짐 방지 실패:',e);}
}
async function releaseFocusEnhancements(){
  try{if(focusModeState.wakeLock)await focusModeState.wakeLock.release();}catch(e){}
  focusModeState.wakeLock=null;
  try{if(document.fullscreenElement)await document.exitFullscreen();}catch(e){}
}
function startFocusMode(options){
  const autoStart=!!(options&&options.autoStart);
  if(!playerName||isAdminSessionActive()||viewerModeActive||studyPlannerViewerMode){
    if(!autoStart)showToast2('⚠️ 학생으로 접속한 뒤 시작해주세요.');
    return;
  }
  focusModeState.active=true;focusModeState.paused=false;
  focusModeState.autoLocked=autoStart;
  focusModeState.elapsed=0;
  focusModeState.lastMilestone=0;
  focusModeState.student=playerName;
  focusModeState.lastTick=Date.now();
  const d=readFocusModeData(playerName);d.lastStartedAt=new Date().toISOString();writeFocusModeData(playerName,d);
  document.body.classList.add('focus-mode-active');
  document.getElementById('focus-mode-bar')?.classList.add('show');
  requestFocusEnhancements(autoStart);
  renderFocusMode();
  clearInterval(focusModeState.timer);
  focusModeState.timer=setInterval(tickFocusMode,1000);
  if(autoStart){
    // 모달/전체화면 없이 2초짜리 안내 토스트만 표시
    const t=document.getElementById('toast');
    if(t){
      t.innerHTML='🎯 집중모드가 시작되었습니다.<br>오늘도 함께 집중해서 공부해봐요!';
      t.classList.add('show');
      setTimeout(()=>{t.classList.remove('show');t.innerHTML='';},2000);
    }
  }
  enqueueLearningEvent_({contentType:'focusMode',action:'start'});
}
function tickFocusMode(){
  if(!focusModeState.active||focusModeState.paused||document.hidden)return;
  if(isStudyTimeViewerMode()){
    focusModeState.lastTick=Date.now();
    return;
  }

  const now=Date.now();
  const sec=Math.max(0,Math.min(2,Math.floor((now-focusModeState.lastTick)/1000)));
  focusModeState.lastTick=now;
  if(sec<=0)return;

  focusModeState.elapsed+=sec;
  addFocusSeconds(focusModeState.student,sec);

  // 25분마다 종료하지 않고 달성 안내만 표시
  const milestone=Math.floor(focusModeState.elapsed/FOCUS_WORK_SECONDS);
  if(milestone>focusModeState.lastMilestone){
    focusModeState.lastMilestone=milestone;
    const minutes=milestone*25;
    showToast2(`🎉 집중 ${minutes}분 달성! 계속 이어가도 좋아요.`);
  }

  renderFocusMode();
}

function renderFocusMode(){
  const elapsed=Math.max(0,Math.floor(focusModeState.elapsed||0));
  const h=Math.floor(elapsed/3600);
  const m=Math.floor((elapsed%3600)/60);
  const s=elapsed%60;

  const timerText=h>0
    ?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    :`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  const summary=getFocusModeSummary(focusModeState.student);
  const title=document.getElementById('focus-mode-title');
  if(title)title.textContent=focusModeState.paused?'집중모드 대기 중':'집중모드 진행 중';

  const timer=document.getElementById('focus-mode-timer');
  if(timer)timer.textContent=timerText;

  const meta=document.getElementById('focus-mode-meta');
  if(meta){
    const studySummary=getStudyTimeSummary(focusModeState.student);
    meta.textContent=`오늘 공부 ${formatStudyClock(studySummary.todaySeconds)} · 집중 ${formatStudyClock(summary.todaySeconds)} · 이탈 ${summary.todayLeaveCount}회`;
  }

  const homeBtn=document.getElementById('focus-mode-home-btn');
  if(homeBtn){
    homeBtn.classList.toggle('active',focusModeState.active);
    homeBtn.textContent=focusModeState.active?'🎯 집중모드 진행 중':'🎯 집중모드 시작';
  }
}
async function endFocusMode(completed,forceEnd=false){
  if(!focusModeState.active)return;

  if(focusModeState.autoLocked&&!forceEnd&&!completed){
    if(typeof showToast2==='function')showToast2('🎯 집중모드는 학습 중에는 종료할 수 없어요.');
    return;
  }

  clearInterval(focusModeState.timer);focusModeState.timer=null;
  const name=focusModeState.student,d=readFocusModeData(name);d.lastEndedAt=new Date().toISOString();writeFocusModeData(name,d);
  focusModeState.active=false;focusModeState.paused=false;focusModeState.autoLocked=false;
  document.body.classList.remove('focus-mode-active');
  document.getElementById('focus-mode-bar')?.classList.remove('show');
  document.getElementById('focus-return-overlay')?.classList.remove('show');
  await releaseFocusEnhancements();
  updateStudyTimeDisplays();
  syncStudyTimeToServer(name,false);
  if(completed){
    showToast2('🎉 집중모드를 완료했어요!');
    enqueueLearningEvent_({contentType:'focusMode',action:'complete'});
  }
}
function resumeFocusAfterLeave(){
  clearLectureExternalNavigation();
  document.getElementById('focus-return-overlay')?.classList.remove('show');
  document.getElementById('focus-mode-bar')?.classList.add('show');
  focusModeState.paused=false;
  focusModeState.lastTick=Date.now();
  requestFocusEnhancements();
  renderFocusMode();
}
document.addEventListener('visibilitychange',()=>{
  if(!focusModeState.active)return;
  focusModeState.lastTick=Date.now();

  const lectureMove=isLectureExternalNavigation();

  if(document.hidden&&!focusModeState.paused){
    focusModeState.paused=true;
    focusModeState.leftWhileActive=true;

    // 강의 링크 이동은 이탈 횟수와 집중중단 팝업에서 완전히 제외
    if(!lectureMove){
      addFocusLeave(focusModeState.student);
    }
    return;
  }

  if(!document.hidden&&focusModeState.leftWhileActive){
    focusModeState.leftWhileActive=false;
    document.getElementById('focus-mode-bar')?.classList.add('show');

    if(!isAdminSessionActive()&&!isDeveloperTestMode()&&!viewerModeActive){
      const pendingKey=`pendingFocusLeaveId_${focusModeState.student}`;
      let pendingRaw=null;
      try{ pendingRaw=localStorage.getItem(pendingKey); }catch(e){}
      if(pendingRaw){
        let pendingObj;
        try{ pendingObj=JSON.parse(pendingRaw); }catch(e){ pendingObj={leaveId:pendingRaw,returnEventId:null}; } // 이전 버전 호환(순수 문자열이었던 경우)
        const leaveId=pendingObj.leaveId;
        // 재시도해도 같은 returnEventId를 쓰도록, 없으면 한 번만 생성해서 먼저 저장해둠
        const returnEventId=pendingObj.returnEventId || generateLearningEventId_(focusModeState.student);
        try{ localStorage.setItem(pendingKey, JSON.stringify({leaveId, returnEventId})); }catch(e){}
        const resultEventId=enqueueLearningEvent_({eventId:returnEventId, contentType:'focusMode', action:'return', relatedEventId:leaveId});
        if(resultEventId){
          // 대기열에 실제로 저장된 것이 확인된 경우에만 제거 — 저장 실패 시엔 남겨서 다음에 같은 eventId로 재시도
          try{ localStorage.removeItem(pendingKey); }catch(e){}
        }
      }
    }

    if(lectureMove){
      clearLectureExternalNavigation();
      focusModeState.paused=false;
      focusModeState.lastTick=Date.now();
      requestFocusEnhancements(true);
      document.getElementById('focus-return-overlay')?.classList.remove('show');
    }else{
      document.getElementById('focus-return-overlay')?.classList.add('show');
    }

    renderFocusMode();
  }
});
document.addEventListener('fullscreenchange',()=>{
  if(focusModeState.active&&!document.fullscreenElement&&!document.hidden){
    console.warn('집중모드 전체화면이 종료되었습니다.');
  }
});


// ══════════════════════════════════════════
// 수학개념학습 — 중1 일차방정식 1차
// ══════════════════════════════════════════
const MATH_PROGRESS_STORAGE_PREFIX='mathConceptProgress_v1:';
let mathContentLoadPromise=null;
let mathActiveStudent='';
let mathActiveUnit=null;
let mathProgress=null;
let mathSelectedAnswer='';
let mathFeedback=null;
let mathEntryIntro=false;
let mathSaveSending=false;
let mathPendingServerSnapshot=null;
let mathPrerequisiteSubmitting=false;

function loadMathConceptContent(){
  if(window.MATH_CONTENT||window.MATH_CONCEPT_CONTENT)return Promise.resolve(window.MATH_CONTENT||window.MATH_CONCEPT_CONTENT);
  if(mathContentLoadPromise)return mathContentLoadPromise;
  mathContentLoadPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='math-content.js?v=20260831-math-2';
    script.onload=()=>{const content=window.MATH_CONTENT||window.MATH_CONCEPT_CONTENT;content?resolve(content):reject(new Error('수학 콘텐츠 형식 오류'));};
    script.onerror=()=>reject(new Error('수학 콘텐츠 네트워크 오류'));
    document.head.appendChild(script);
  }).catch(error=>{mathContentLoadPromise=null;throw error;});
  return mathContentLoadPromise;
}

function mathProgressKey(name){return MATH_PROGRESS_STORAGE_PREFIX+String(name||'');}
function mathUnitForStudent(student){return (window.MATH_CONTENT||window.MATH_CONCEPT_CONTENT)?.units?.[student?.mathUnitId]||null;}
function defaultMathProgress(student){
  const unit=mathUnitForStudent(student);
  const firstQuestionId=unit?.prerequisites?.[0]?.question?.id||null;
  return {schemaVersion:1,contentVersion:Number(unit?.contentVersion)||1,studentKey:student.name,grade:student.grade,unitId:student.mathUnitId,
    prerequisite:{completed:false,results:{}},core:{visitedConceptIds:[],checks:{}},
    finalAssessment:{attempts:[],latestAnswers:{},correctCount:0,wrongConceptIds:[]},
    completed:false,completedAt:null,resume:{phase:'prerequisite-check',conceptId:null,questionId:firstQuestionId},
    updatedAt:'',syncRevision:0,lastServerRevision:0,pendingSync:false};
}
function isValidMathResume(progress,unit){
  const resume=progress?.resume||{},phase=resume.phase;
  if(phase==='prerequisite-check'){
    const index=unit.prerequisites.findIndex(item=>item.question.id===resume.questionId);
    if(index<0)return false;
    return index===0||unit.prerequisites.slice(0,index).every(item=>progress.prerequisite?.results?.[item.id]);
  }
  if(phase==='prerequisite-result')return !!progress.prerequisite?.completed;
  if(phase==='prerequisite-review')return unit.prerequisites.some(item=>item.id===resume.conceptId&&(item.review?.question||item.reviewQuestion)?.id===resume.questionId);
  if(phase==='core-concept')return unit.coreConcepts.some(item=>item.id===resume.conceptId);
  if(phase==='concept-check')return unit.coreConcepts.some(item=>item.id===resume.conceptId&&item.checkQuestion.id===resume.questionId);
  if(phase==='final-check')return unit.finalQuestions.some(item=>item.id===resume.questionId);
  return phase==='result'&&progress.finalAssessment?.attempts?.length>0;
}
function normalizeMathProgress(raw,student){
  const base=defaultMathProgress(student);
  if(!raw||typeof raw!=='object'||raw.studentKey!==student.name||raw.unitId!==student.mathUnitId||Number(raw.contentVersion||1)!==base.contentVersion)return base;
  const p={...base,...raw};
  p.prerequisite={...base.prerequisite,...(raw.prerequisite||{}),results:{...((raw.prerequisite||{}).results||{})}};
  p.core={...base.core,...(raw.core||{}),visitedConceptIds:Array.isArray(raw.core?.visitedConceptIds)?raw.core.visitedConceptIds.slice():[],checks:{...(raw.core?.checks||{})}};
  p.finalAssessment={...base.finalAssessment,...(raw.finalAssessment||{}),attempts:Array.isArray(raw.finalAssessment?.attempts)?raw.finalAssessment.attempts.slice():[],latestAnswers:{...(raw.finalAssessment?.latestAnswers||{})},wrongConceptIds:Array.isArray(raw.finalAssessment?.wrongConceptIds)?raw.finalAssessment.wrongConceptIds.slice():[]};
  p.resume={...base.resume,...(raw.resume||{})};
  p.syncRevision=Math.max(0,Number(p.syncRevision)||0);
  if(!isValidMathResume(p,mathUnitForStudent(student))){
    const resetRevision=p.syncRevision,resetServerRevision=Math.max(Number(p.lastServerRevision)||0,resetRevision);
    return {...base,syncRevision:resetRevision,lastServerRevision:resetServerRevision};
  }
  return p;
}
function readRawLocalMathProgress(student){
  try{return JSON.parse(localStorage.getItem(mathProgressKey(student.name))||'null');}catch(error){return null;}
}
function readLocalMathProgress(student){
  return normalizeMathProgress(readRawLocalMathProgress(student),student);
}
function writeLocalMathProgress(){
  if(!mathProgress||isLearningWriteBlocked())return;
  try{localStorage.setItem(mathProgressKey(mathProgress.studentKey),JSON.stringify(mathProgress));}catch(error){console.warn('수학 진행 로컬 저장 실패:',error);}
}
function mathAttemptKey(a){return [a.questionId,a.source,a.attemptedAt].join('|');}
function mergeMathAttemptLists(a,b){
  const out=[],seen=new Set();
  [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])].forEach(item=>{const key=mathAttemptKey(item||{});if(!seen.has(key)){seen.add(key);out.push(item);}});
  return out.sort((x,y)=>String(x.attemptedAt||'').localeCompare(String(y.attemptedAt||'')));
}
function mergeMathProgress(local,server,student){
  const targetVersion=defaultMathProgress(student).contentVersion;
  const localCompatible=local&&Number(local.contentVersion||1)===targetVersion;
  const serverCompatible=server&&Number(server.contentVersion||1)===targetVersion;
  if(!serverCompatible){
    const fresh=normalizeMathProgress(localCompatible?local:null,student);
    fresh.syncRevision=Math.max(Number(fresh.syncRevision)||0,Number(server?.syncRevision)||0);
    fresh.lastServerRevision=Math.max(Number(fresh.lastServerRevision)||0,Number(server?.syncRevision)||0);
    fresh.pendingSync=!!(localCompatible&&local?.pendingSync);
    return fresh;
  }
  const l=normalizeMathProgress(local,student),s=normalizeMathProgress(server,student);
  const localNewer=l.syncRevision>s.syncRevision||(l.syncRevision===s.syncRevision&&String(l.updatedAt||'')>=String(s.updatedAt||''));
  const merged=normalizeMathProgress(localNewer?l:s,student);
  Object.keys({...l.prerequisite.results,...s.prerequisite.results}).forEach(id=>{
    const lr=l.prerequisite.results[id]||{},sr=s.prerequisite.results[id]||{};
    const latest=String(lr.updatedAt||'')>=String(sr.updatedAt||'')?lr:sr;
    merged.prerequisite.results[id]={...latest,attempts:mergeMathAttemptLists(lr.attempts,sr.attempts),reviewAttempts:mergeMathAttemptLists(lr.reviewAttempts,sr.reviewAttempts),reviewCompleted:!!(lr.reviewCompleted||sr.reviewCompleted)};
  });
  Object.keys({...l.core.checks,...s.core.checks}).forEach(id=>{
    const lc=l.core.checks[id]||{},sc=s.core.checks[id]||{};
    merged.core.checks[id]={...(String(lc.updatedAt||'')>=String(sc.updatedAt||'')?lc:sc),attempts:mergeMathAttemptLists(lc.attempts,sc.attempts)};
  });
  merged.core.visitedConceptIds=Array.from(new Set([...l.core.visitedConceptIds,...s.core.visitedConceptIds]));
  merged.finalAssessment.attempts=mergeMathAttemptLists(l.finalAssessment.attempts,s.finalAssessment.attempts);
  merged.completed=!!(l.completed||s.completed);
  merged.completedAt=merged.completed?(l.completedAt||s.completedAt||null):null;
  merged.syncRevision=Math.max(l.syncRevision,s.syncRevision);
  merged.lastServerRevision=Math.max(Number(l.lastServerRevision)||0,Number(s.syncRevision)||0);
  merged.pendingSync=l.pendingSync===true&&l.syncRevision>s.syncRevision;
  recalculateMathFinalResult(merged);
  return merged;
}

async function apiGetMathConceptProgress(name){
  if(!apiConfigured()||!name)return {ok:false,data:null};
  try{
    const res=await fetch(API_URL+'?action=getMathConceptProgress&name='+encodeURIComponent(name),{cache:'no-store'});
    const payload=await res.json();
    return payload&&typeof payload==='object'?payload:{ok:false,data:null};
  }catch(error){console.warn('수학 진행 서버 조회 실패:',error);return {ok:false,data:null};}
}
async function apiSaveMathConceptProgress(snapshot){
  if(isLearningWriteBlocked()||!apiConfigured())return {ok:false,blocked:true};
  try{
    const body=new URLSearchParams();
    body.set('action','saveMathConceptProgress');body.set('name',snapshot.studentKey);
    body.set('data',JSON.stringify(snapshot));body.set('isAdminMode',isAdminSessionActive()?'true':'false');
    const res=await fetch(API_URL,{method:'POST',body});
    return await res.json();
  }catch(error){console.warn('수학 진행 서버 저장 실패:',error);return {ok:false,error:'NETWORK_ERROR'};}
}
function queueMathServerSave(){
  if(!mathProgress||isLearningWriteBlocked())return;
  mathPendingServerSnapshot=JSON.parse(JSON.stringify(mathProgress));
  if(mathSaveSending)return;
  mathSaveSending=true;
  (async()=>{
    while(mathPendingServerSnapshot){
      const snapshot=mathPendingServerSnapshot;mathPendingServerSnapshot=null;
      const result=await apiSaveMathConceptProgress(snapshot);
      if(result?.ok){
        if(mathProgress&&mathProgress.studentKey===snapshot.studentKey){
          mathProgress.lastServerRevision=Math.max(Number(mathProgress.lastServerRevision)||0,Number(result.savedRevision)||snapshot.syncRevision);
          mathProgress.pendingSync=mathProgress.syncRevision>mathProgress.lastServerRevision;
          writeLocalMathProgress();
        }
      }else if(result?.error==='STALE_REVISION'&&result.data&&mathProgress){
        const student=STUDENTS.find(s=>s.name===snapshot.studentKey);
        mathProgress=mergeMathProgress(mathProgress,result.data,student);
        mathProgress.syncRevision=Math.max(mathProgress.syncRevision,Number(result.savedRevision)||0)+1;
        mathProgress.updatedAt=new Date().toISOString();mathProgress.pendingSync=true;
        writeLocalMathProgress();mathPendingServerSnapshot=JSON.parse(JSON.stringify(mathProgress));
      }else{
        console.warn('수학 진행 서버 저장 보류:',result?.error||result);
        if(mathProgress&&mathProgress.studentKey===snapshot.studentKey){mathProgress.pendingSync=true;writeLocalMathProgress();}
      }
    }
    mathSaveSending=false;
  })();
}
function commitMathProgress(resume){
  if(!mathProgress||isLearningWriteBlocked())return;
  if(resume)mathProgress.resume={...mathProgress.resume,...resume};
  mathProgress.syncRevision=(Number(mathProgress.syncRevision)||0)+1;
  mathProgress.updatedAt=new Date().toISOString();mathProgress.pendingSync=true;
  writeLocalMathProgress();queueMathServerSave();
}

function mathEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalizeMathAnswer(value){return String(value??'').toLowerCase().replace(/\s+/g,'').replace(/[×*]/g,'x').replace(/°/g,'');}
function isMathAnswerCorrect(question,value){return (question.acceptedAnswers||[question.correctAnswer]).some(a=>normalizeMathAnswer(a)===normalizeMathAnswer(value));}
function makeMathAttempt(question,value,source){return {questionId:question.id,conceptId:question.conceptId,selectedAnswer:String(value),correct:isMathAnswerCorrect(question,value),attemptedAt:new Date().toISOString(),source};}
function hasMathProgressEvidence(progress){
  return !!(progress?.completed||Object.keys(progress?.prerequisite?.results||{}).length||progress?.core?.visitedConceptIds?.length||Object.keys(progress?.core?.checks||{}).length||progress?.finalAssessment?.attempts?.length);
}
function mathProgressTrace(stage,progress,unit){
  const prerequisiteIndex=unit?.prerequisites?.findIndex(item=>item.question.id===progress?.resume?.questionId)??-1;
  const reviewQueue=unit&&progress?unit.prerequisites.filter(item=>progress.prerequisite?.results?.[item.id]?.status==='needs-review'&&!progress.prerequisite.results[item.id]?.reviewCompleted).map(item=>item.id):[];
  console.info('[MathProgress v2]',stage,{contentVersion:progress?.contentVersion??null,phase:progress?.resume?.phase??null,currentIndex:prerequisiteIndex,questionId:progress?.resume?.questionId??null,resume:progress?.resume||null,prerequisiteResults:progress?.prerequisite?.results||{},reviewQueue,syncRevision:progress?.syncRevision??null});
}
function mathQuestionHtml(question,submitFn){
  const choices=Array.isArray(question.choices)&&question.choices.length?question.choices.map((choice,i)=>`<button type="button" class="math-choice ${mathSelectedAnswer===choice?'selected':''}" onclick="selectMathAnswer(${JSON.stringify(choice).replace(/"/g,'&quot;')})">${i+1}. ${mathEscape(choice)}</button>`).join(''):`<input class="math-answer" id="math-answer-input" inputmode="text" autocomplete="off" placeholder="답을 입력하세요" value="${mathEscape(mathSelectedAnswer)}" oninput="mathSelectedAnswer=this.value">`;
  return `<div class="math-equation">${mathEscape(question.question)}</div>${choices}${mathFeedback?`<div class="math-feedback ${mathFeedback.correct?'ok':'bad'}">${mathFeedback.correct?'✓ 정답':'△ 다시 확인'} · ${mathEscape(mathFeedback.explanation)}</div>`:''}<div class="math-actions"><button type="button" class="math-primary" onclick="${submitFn}">답 확인하기</button></div>`;
}
function selectMathAnswer(value){mathSelectedAnswer=value;document.querySelectorAll('#math-concept-root .math-choice').forEach(btn=>btn.classList.toggle('selected',btn.textContent.replace(/^\d+\.\s*/, '')===value));}
function setMathPhaseLabel(text){const el=document.getElementById('math-step-label');if(el)el.textContent=text||'';}
function renderMathCard(kicker,title,body){document.getElementById('math-concept-root').innerHTML=`<section class="math-card"><div class="math-kicker">${mathEscape(kicker)}</div><h2>${mathEscape(title)}</h2>${body}</section>`;}

async function openMathConceptLearning(){
  if(!window.MathFlowV2){showToast2('⚠️ 수학 화면을 불러오지 못했어요.');return;}
  return window.MathFlowV2.open();
}
function closeMathConceptLearning(){return window.MathFlowV2?.close();}
function renderMathPhase(){
  if(!mathProgress||!mathActiveUnit)return;
  if(mathEntryIntro){renderMathIntro();window.scrollTo({top:0,behavior:'auto'});return;}
  const phase=mathProgress.resume.phase||'intro';
  const renderers={'intro':renderMathIntro,'prerequisite-check':renderMathPrerequisiteCheck,'prerequisite-result':renderMathPrerequisiteResult,'prerequisite-review':renderMathPrerequisiteReview,'core-concept':renderMathCoreConcept,'concept-check':renderMathConceptCheck,'final-check':renderMathFinalCheck,'result':renderMathResult};
  (renderers[phase]||renderMathIntro)();window.scrollTo({top:0,behavior:'auto'});
}
function renderMathIntro(){
  setMathPhaseLabel('오늘 배울 단원');
  const started=hasMathProgressEvidence(mathProgress);
  const actions=mathProgress.completed?`<button type="button" class="math-primary" onclick="showSavedMathResult()">결과 보기</button><button type="button" class="math-secondary" onclick="restartMathLearning()">다시 학습하기</button>`:`<button type="button" id="math-start-learning-button" class="math-primary">${started?'이어서 학습하기 →':'이전 개념 확인하기 →'}</button>`;
  renderMathCard(`${mathActiveUnit.gradeLabel} 수학`,mathActiveUnit.title,`<p>${mathEscape(mathActiveUnit.intro)}</p><div class="math-actions">${actions}</div>`);
  document.getElementById('math-start-learning-button')?.addEventListener('click',startOrResumeMathLearning,{once:true});
}
function startOrResumeMathLearning(){
  mathEntryIntro=false;
  if(!hasMathProgressEvidence(mathProgress)){commitMathProgress({phase:'prerequisite-check',conceptId:null,questionId:mathActiveUnit.prerequisites[0].question.id});}
  renderMathPhase();
}
function findPrerequisiteIndex(){const qid=mathProgress.resume.questionId;const idx=mathActiveUnit.prerequisites.findIndex(p=>p.question.id===qid);return idx>=0?idx:0;}
function renderMathPrerequisiteCheck(){
  const idx=findPrerequisiteIndex(),item=mathActiveUnit.prerequisites[idx];
  mathPrerequisiteSubmitting=false;
  setMathPhaseLabel(`이전 개념 ${idx+1} / ${mathActiveUnit.prerequisites.length}`);
  renderMathCard('① 이전 개념 확인',item.title,mathQuestionHtml(item.question,'submitMathPrerequisite()'));
  const root=document.getElementById('math-concept-root');
  root.querySelectorAll('.math-choice').forEach((button,choiceIndex)=>{
    button.removeAttribute('onclick');
    button.addEventListener('click',()=>{
      const choice=item.question.choices[choiceIndex];
      console.info('[MathPrerequisite v2] choice click',{index:idx,questionId:item.question.id,choice});
      selectMathAnswer(choice);
      console.info('[MathPrerequisite v2] selectedAnswer',{selectedAnswer:mathSelectedAnswer});
    });
  });
  const submitButton=root.querySelector('.math-actions .math-primary');
  if(submitButton){
    submitButton.removeAttribute('onclick');
    submitButton.addEventListener('click',submitMathPrerequisite);
  }
  console.info('[MathPrerequisite v2] render',{phase:mathProgress.resume.phase,index:idx,questionId:item.question.id,resume:{...mathProgress.resume}});
}
function submitMathPrerequisite(){
  if(!String(mathSelectedAnswer).trim()){showToast2('답을 선택하거나 입력해주세요.');return;}
  if(mathPrerequisiteSubmitting)return;
  mathPrerequisiteSubmitting=true;
  const idx=findPrerequisiteIndex(),item=mathActiveUnit.prerequisites[idx],attempt=makeMathAttempt(item.question,mathSelectedAnswer,'prerequisite');
  const submitButton=document.querySelector('#math-concept-root .math-actions .math-primary');
  if(submitButton){submitButton.disabled=true;submitButton.setAttribute('aria-disabled','true');}
  console.info('[MathPrerequisite v2] submit',{phase:mathProgress.resume.phase,index:idx,questionId:item.question.id,selectedAnswer:mathSelectedAnswer,correct:attempt.correct,syncRevision:mathProgress.syncRevision});
  const old=mathProgress.prerequisite.results[item.id]||{};
  mathProgress.prerequisite.results[item.id]={...old,status:attempt.correct?'understood':'needs-review',correct:attempt.correct,attempts:[...(old.attempts||[]),attempt],updatedAt:attempt.attemptedAt};
  console.info('[MathPrerequisite v2] result saved',{conceptId:item.id,result:mathProgress.prerequisite.results[item.id]});
  mathFeedback={correct:attempt.correct,explanation:item.question.explanation};commitMathProgress();
  setTimeout(()=>{mathSelectedAnswer='';mathFeedback=null;if(idx<mathActiveUnit.prerequisites.length-1){const nextIndex=idx+1,nextQuestionId=mathActiveUnit.prerequisites[nextIndex].question.id;console.info('[MathPrerequisite v2] advance',{fromIndex:idx,toIndex:nextIndex,nextQuestionId});commitMathProgress({phase:'prerequisite-check',questionId:nextQuestionId});}else{mathProgress.prerequisite.completed=true;commitMathProgress({phase:'prerequisite-result',questionId:null});}renderMathPhase();},500);
}
function renderMathPrerequisiteResult(){
  setMathPhaseLabel('준비도 결과');
  const rows=mathActiveUnit.prerequisites.map(item=>{const r=mathProgress.prerequisite.results[item.id]||{};return `<div class="math-status-row"><span>${r.status==='understood'||r.reviewCompleted?'✓':'△'}</span><span>${mathEscape(item.title)} · ${r.status==='understood'?'이해함':r.reviewCompleted?'다시 확인했어요':'복습 필요'}</span></div>`;}).join('');
  const needs=mathActiveUnit.prerequisites.some(item=>mathProgress.prerequisite.results[item.id]?.status==='needs-review'&&!mathProgress.prerequisite.results[item.id]?.reviewCompleted);
  renderMathCard('② 결과 확인',`${mathActiveUnit.title} 준비도`,`<div class="math-status-list">${rows}</div><div class="math-actions">${needs?'<button type="button" class="math-primary" onclick="startMathPrerequisiteReview()">필요한 개념 복습하기</button>':''}<button type="button" class="math-secondary" onclick="startMathCoreLearning()">바로 본 학습 시작하기</button></div>`);
}
function buildMathReviewQueue(forResume=false){
  const saved=mathProgress.resume.reviewQueueIds;
  if(forResume&&Array.isArray(saved)&&saved.length){
    return saved.filter(id=>mathActiveUnit.prerequisites.some(item=>item.id===id));
  }
  return mathActiveUnit.prerequisites
    .filter(item=>mathProgress.prerequisite.results[item.id]?.status==='needs-review'&&(forResume||!mathProgress.prerequisite.results[item.id]?.reviewCompleted))
    .map(item=>item.id);
}
function mathReviewQuestion(item){return item?.review?.question||item?.reviewQuestion;}
function mathReviewSummary(item){return item?.review?.summary||item?.summary||'';}
function mathReviewExample(item){return item?.review?.example||item?.example||'';}
function startMathPrerequisiteReview(){
  const reviewQueueIds=buildMathReviewQueue();
  const item=mathActiveUnit.prerequisites.find(p=>p.id===reviewQueueIds[0]);
  if(!item){startMathCoreLearning();return;}
  commitMathProgress({phase:'prerequisite-review',conceptId:item.id,questionId:mathReviewQuestion(item).id,reviewQueueIds});
  mathSelectedAnswer='';mathFeedback=null;renderMathPhase();
}
function renderMathPrerequisiteReview(){
  const reviewQueueIds=buildMathReviewQueue(true);
  const reviewIndex=Math.max(0,reviewQueueIds.indexOf(mathProgress.resume.conceptId));
  const item=mathActiveUnit.prerequisites.find(p=>p.id===reviewQueueIds[reviewIndex]);
  if(!item){commitMathProgress({phase:'prerequisite-result',conceptId:null,questionId:null,reviewQueueIds:[]});renderMathPhase();return;}
  setMathPhaseLabel(`③ 필요한 개념 복습 ${reviewIndex+1} / ${reviewQueueIds.length}`);
  renderMathCard('짧은 복습',item.title,`<p>${mathEscape(mathReviewSummary(item))}</p><div class="math-equation">${mathEscape(mathReviewExample(item))}</div>${mathQuestionHtml(mathReviewQuestion(item),'submitMathPrerequisiteReview()')}`);
}
function submitMathPrerequisiteReview(){
  if(!String(mathSelectedAnswer).trim()){showToast2('답을 선택하거나 입력해주세요.');return;}
  const reviewQueueIds=buildMathReviewQueue(true),reviewIndex=reviewQueueIds.indexOf(mathProgress.resume.conceptId);
  const item=mathActiveUnit.prerequisites.find(p=>p.id===mathProgress.resume.conceptId),question=mathReviewQuestion(item),attempt=makeMathAttempt(question,mathSelectedAnswer,'prerequisite-review');
  const result=mathProgress.prerequisite.results[item.id]||{};result.reviewAttempts=[...(result.reviewAttempts||[]),attempt];result.reviewCompleted=true;result.updatedAt=attempt.attemptedAt;mathProgress.prerequisite.results[item.id]=result;
  mathFeedback={correct:attempt.correct,explanation:question.explanation};commitMathProgress();
  setTimeout(()=>{mathSelectedAnswer='';mathFeedback=null;const nextId=reviewQueueIds.slice(reviewIndex+1).find(id=>!mathProgress.prerequisite.results[id]?.reviewCompleted);const next=mathActiveUnit.prerequisites.find(p=>p.id===nextId);if(next)commitMathProgress({phase:'prerequisite-review',conceptId:next.id,questionId:mathReviewQuestion(next).id,reviewQueueIds});else commitMathProgress({phase:'prerequisite-result',conceptId:null,questionId:null,reviewQueueIds:[]});renderMathPhase();},500);
}
function startMathCoreLearning(){const first=mathActiveUnit.coreConcepts[0];commitMathProgress({phase:'core-concept',conceptId:first.id,questionId:null});renderMathPhase();}
function currentCoreConcept(){return mathActiveUnit.coreConcepts.find(c=>c.id===mathProgress.resume.conceptId)||mathActiveUnit.coreConcepts[0];}
function renderMathCoreConcept(){
  const concept=currentCoreConcept(),idx=mathActiveUnit.coreConcepts.indexOf(concept);setMathPhaseLabel(`④ 핵심개념 ${idx+1} / ${mathActiveUnit.coreConcepts.length}`);
  if(!mathProgress.core.visitedConceptIds.includes(concept.id)){mathProgress.core.visitedConceptIds.push(concept.id);commitMathProgress();}
  const weak=(concept.prerequisiteLinks||[]).find(id=>mathProgress.prerequisite.results[id]?.status==='needs-review');
  const note=weak?`<div class="math-prereq-note">△ 여기서는 ${mathEscape(mathActiveUnit.prerequisites.find(p=>p.id===weak)?.title)} 개념이 필요해요.</div>`:'';
  const lessonLines=concept.lesson?[concept.lesson.summary,concept.lesson.keyPoint,concept.lesson.example].filter(Boolean):(concept.lines||[]);
  const lines=lessonLines.map(line=>line.includes('=')||line.includes('→')?`<div class="math-equation">${mathEscape(line)}</div>`:`<p>${mathEscape(line)}</p>`).join('');
  renderMathCard('핵심개념',concept.title,`${note}${lines}<div class="math-actions"><button class="math-primary" onclick="openMathConceptCheck()">확인문제 풀기 →</button></div>`);
}
function openMathConceptCheck(){const c=currentCoreConcept();mathSelectedAnswer='';mathFeedback=null;commitMathProgress({phase:'concept-check',conceptId:c.id,questionId:c.checkQuestion.id});renderMathPhase();}
function renderMathConceptCheck(){const c=currentCoreConcept(),idx=mathActiveUnit.coreConcepts.indexOf(c);setMathPhaseLabel(`⑤ 확인문제 ${idx+1} / ${mathActiveUnit.coreConcepts.length}`);renderMathCard('개념별 확인문제',c.title,mathQuestionHtml(c.checkQuestion,'submitMathConceptCheck()')+(mathFeedback&&!mathFeedback.correct?`<div class="math-actions"><button class="math-secondary" onclick="returnToMathConcept()">이 개념 다시 보기</button><button class="math-secondary" onclick="advanceAfterMathConceptCheck()">다음 개념으로 이동</button></div>`:''));}
function submitMathConceptCheck(){
  if(!String(mathSelectedAnswer).trim()){showToast2('답을 선택하거나 입력해주세요.');return;}
  const c=currentCoreConcept(),attempt=makeMathAttempt(c.checkQuestion,mathSelectedAnswer,'concept-check'),old=mathProgress.core.checks[c.id]||{};
  mathProgress.core.checks[c.id]={...old,correct:attempt.correct,attempts:[...(old.attempts||[]),attempt],updatedAt:attempt.attemptedAt};mathFeedback={correct:attempt.correct,explanation:attempt.correct?'잘 이해했어요!':c.checkQuestion.explanation};commitMathProgress();
  if(attempt.correct)setTimeout(()=>advanceAfterMathConceptCheck(),500);else renderMathPhase();
}
function returnToMathConcept(){mathSelectedAnswer='';mathFeedback=null;commitMathProgress({phase:'core-concept',questionId:null});renderMathPhase();}
function advanceAfterMathConceptCheck(){const c=currentCoreConcept(),idx=mathActiveUnit.coreConcepts.indexOf(c);mathSelectedAnswer='';mathFeedback=null;if(idx<mathActiveUnit.coreConcepts.length-1)commitMathProgress({phase:'core-concept',conceptId:mathActiveUnit.coreConcepts[idx+1].id,questionId:null});else commitMathProgress({phase:'final-check',conceptId:null,questionId:mathActiveUnit.finalQuestions[0].id});renderMathPhase();}
function findFinalIndex(){const idx=mathActiveUnit.finalQuestions.findIndex(q=>q.id===mathProgress.resume.questionId);return idx>=0?idx:0;}
function renderMathFinalCheck(){const idx=findFinalIndex(),q=mathActiveUnit.finalQuestions[idx];setMathPhaseLabel(`⑥ 마지막 확인 ${idx+1} / ${mathActiveUnit.finalQuestions.length}`);renderMathCard('마지막 확인문제',`${idx+1}번`,mathQuestionHtml(q,'submitMathFinalAnswer()'));}
function submitMathFinalAnswer(){
  if(!String(mathSelectedAnswer).trim()){showToast2('답을 선택하거나 입력해주세요.');return;}
  const idx=findFinalIndex(),q=mathActiveUnit.finalQuestions[idx],attempt=makeMathAttempt(q,mathSelectedAnswer,'final');mathProgress.finalAssessment.attempts.push(attempt);mathProgress.finalAssessment.latestAnswers[q.id]=attempt;recalculateMathFinalResult(mathProgress);mathFeedback={correct:attempt.correct,explanation:q.explanation};commitMathProgress();
  setTimeout(()=>{mathSelectedAnswer='';mathFeedback=null;if(idx<mathActiveUnit.finalQuestions.length-1)commitMathProgress({phase:'final-check',questionId:mathActiveUnit.finalQuestions[idx+1].id});else commitMathProgress({phase:'result',questionId:null});renderMathPhase();},500);
}
function recalculateMathFinalResult(progress){
  if(!progress||!mathActiveUnit)return;
  const latest=progress.finalAssessment.latestAnswers||{};const answers=mathActiveUnit.finalQuestions.map(q=>latest[q.id]).filter(Boolean);
  progress.finalAssessment.correctCount=answers.filter(a=>a.correct).length;
  progress.finalAssessment.wrongConceptIds=Array.from(new Set(answers.filter(a=>!a.correct).map(a=>a.conceptId)));
}
function renderMathResult(){
  recalculateMathFinalResult(mathProgress);setMathPhaseLabel('⑦ 학습 결과');
  const rows=mathActiveUnit.coreConcepts.map(c=>{const wrong=mathProgress.finalAssessment.wrongConceptIds.includes(c.id);return `<div class="math-status-row"><span>${wrong?'△':'✓'}</span><span>${mathEscape(c.title)}</span>${wrong?`<button class="math-secondary" style="width:auto;min-height:36px;margin-left:auto" onclick="reviewMathConcept('${c.id}')">다시 보기</button>`:''}</div>`;}).join('');
  const preRows=mathActiveUnit.prerequisites.map(p=>{const r=mathProgress.prerequisite.results[p.id]||{};return `<div class="math-status-row"><span>${r.status==='understood'||r.reviewCompleted?'✓':'△'}</span><span>${mathEscape(p.title)}</span></div>`;}).join('');
  renderMathCard('오늘의 수학 개념 결과',`${mathProgress.finalAssessment.correctCount} / ${mathActiveUnit.finalQuestions.length} 정답`,`<div class="math-status-list">${rows}</div><details><summary>선수개념 결과 보기</summary><div class="math-status-list">${preRows}</div></details><div class="math-actions"><button class="math-primary" onclick="completeMathLearning()">학습 완료하기</button></div>`);
}
function reviewMathConcept(id){commitMathProgress({phase:'core-concept',conceptId:id,questionId:null});renderMathPhase();}
function completeMathLearning(){mathEntryIntro=false;mathProgress.completed=true;mathProgress.completedAt=new Date().toISOString();commitMathProgress({phase:'result',conceptId:null,questionId:null});SFX.complete();showToast2('✅ 수학개념학습을 완료했어요!');renderMathPhase();}
function showSavedMathResult(){mathEntryIntro=false;commitMathProgress({phase:'result'});renderMathPhase();}
function restartMathLearning(){
  mathEntryIntro=false;
  const student=STUDENTS.find(s=>s.name===mathActiveStudent);
  const previousRevision=Math.max(Number(mathProgress?.syncRevision)||0,Number(mathProgress?.lastServerRevision)||0);
  const previousServerRevision=Number(mathProgress?.lastServerRevision)||0;
  mathProgress=defaultMathProgress(student);
  mathProgress.syncRevision=previousRevision;
  mathProgress.lastServerRevision=previousServerRevision;
  commitMathProgress({phase:'prerequisite-check',questionId:mathActiveUnit.prerequisites[0].question.id});
  renderMathPhase();
}

// ===== 기존 inline script 9 =====
onAppDomReady_(()=>{
  updateFontPickerVisibility();

  const watchedIds=[
    'start-screen','student-select-view','learning-home-view','quiz-screen','result-screen',
    'teacher-screen','parent-screen','timeline-game-screen','ht-list-screen','ht-part-screen',
    'history-summary-screen','summary-screen','lecture-screen','qbank-screen',
    'map-study-list-screen','map-study-quiz-screen','map-study-learn-screen','math-concept-screen'
  ];

  const observer=new MutationObserver(()=>updateFontPickerVisibility());
  watchedIds.forEach(id=>{
    const el=document.getElementById(id);
    if(el)observer.observe(el,{attributes:true,attributeFilter:['style','class']});
  });
});


window.__APP_MAIN_EXECUTED=true;

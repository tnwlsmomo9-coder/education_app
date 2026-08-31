/* 수학개념학습 v2 — 단원별 state / 단일 renderer / 이벤트 위임 */
(function(){
  'use strict';
  const STORAGE_PREFIX='mathConceptProgress_v1:';
  let mathState=null,unit=null,student=null,root=null,screen=null;
  let bound=false,sessionMutation=0,loadSequence=0,saveSending=false,pendingSnapshot=null;

  const clone=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalizeAnswer=value=>String(value??'').toLowerCase().replace(/\s+/g,'').replace(/[×*]/g,'x').replace(/°/g,'');
  const correct=(question,value)=>(question.acceptedAnswers||[question.correctAnswer]).some(answer=>normalizeAnswer(answer)===normalizeAnswer(value));
  const reviewQuestion=item=>item.review?.question||item.reviewQuestion;
  const legacyStorageKey=()=>STORAGE_PREFIX+student.name;
  const storageKey=()=>STORAGE_PREFIX+student.name+':'+unit.id;

  // 기존 학생별 단일 키는 삭제하지 않고, unitId가 일치하는 단원의 새 키로 한 번만 복사한다.
  function readLocalWithMigration(){
    let current=null;
    try{current=JSON.parse(localStorage.getItem(storageKey())||'null');}catch(error){}
    if(current)return current;
    let legacy=null;
    try{legacy=JSON.parse(localStorage.getItem(legacyStorageKey())||'null');}catch(error){}
    if(legacy&&legacy.studentKey===student.name&&legacy.unitId===unit.id){
      if(!isLearningWriteBlocked()){
        try{localStorage.setItem(storageKey(),JSON.stringify(legacy));}catch(error){console.warn('수학 v2 기존 기록 마이그레이션 실패:',error);}
      }
      return legacy;
    }
    return null;
  }

  function initialState(revision=0){
    return {schemaVersion:1,contentVersion:Number(unit.contentVersion)||2,studentKey:student.name,grade:student.grade,unitId:unit.id,
      phase:'prerequisite',index:0,selectedAnswer:null,reviewQueue:[],
      prerequisite:{completed:false,results:{}},core:{visitedConceptIds:[],checks:{}},
      finalAssessment:{attempts:[],latestAnswers:{},correctCount:0,wrongConceptIds:[]},
      wrongPractice:{items:{}},
      completed:false,completedAt:null,firstCompletion:null,relearning:false,relearningHistory:[],resume:{phase:'prerequisite-check',conceptId:null,questionId:unit.prerequisites[0].question.id},
      updatedAt:'',syncRevision:Number(revision)||0,lastServerRevision:Number(revision)||0,pendingSync:false};
  }

  function positionFromLegacy(progress){
    const resume=progress?.resume||{},phase=resume.phase;
    if(phase==='prerequisite-check')return {phase:'prerequisite',index:unit.prerequisites.findIndex(item=>item.question.id===resume.questionId)};
    if(phase==='prerequisite-result')return {phase:'prerequisite-result',index:0};
    if(phase==='prerequisite-review')return {phase:'review',index:(resume.reviewQueueIds||[]).indexOf(resume.conceptId)};
    if(phase==='core-concept')return {phase:'core',index:unit.coreConcepts.findIndex(item=>item.id===resume.conceptId)};
    if(phase==='concept-check')return {phase:'core-check',index:unit.coreConcepts.findIndex(item=>item.id===resume.conceptId)};
    if(phase==='final-check')return {phase:'final',index:unit.finalQuestions.findIndex(item=>item.id===resume.questionId)};
    if(phase==='result')return {phase:'result',index:0};
    return {phase:'prerequisite',index:0};
  }

  function validPosition(state){
    const limits={prerequisite:unit.prerequisites.length,'prerequisite-result':1,review:state.reviewQueue.length,core:unit.coreConcepts.length,'core-check':unit.coreConcepts.length,final:unit.finalQuestions.length,result:1};
    if(!(state.phase in limits)||!Number.isInteger(state.index)||state.index<0||state.index>=limits[state.phase])return false;
    if(state.phase==='prerequisite'&&state.index>0)return unit.prerequisites.slice(0,state.index).every(item=>state.prerequisite.results[item.id]);
    if(state.phase==='review')return state.reviewQueue.every(id=>unit.prerequisites.some(item=>item.id===id));
    return true;
  }

  function normalizeProgress(raw){
    const revision=Number(raw?.syncRevision)||0;
    if(!raw||raw.studentKey!==student.name||raw.unitId!==unit.id||Number(raw.contentVersion||1)!==Number(unit.contentVersion))return initialState(revision);
    const base=initialState(revision),legacyPosition=raw.phase?null:positionFromLegacy(raw);
    const state={...base,...raw,phase:raw.phase||legacyPosition.phase,index:Number.isInteger(raw.index)?raw.index:legacyPosition.index,selectedAnswer:null,
      reviewQueue:Array.isArray(raw.reviewQueue)?raw.reviewQueue.slice():Array.isArray(raw.resume?.reviewQueueIds)?raw.resume.reviewQueueIds.slice():[],
      prerequisite:{...base.prerequisite,...(raw.prerequisite||{}),results:{...(raw.prerequisite?.results||{})}},
      core:{...base.core,...(raw.core||{}),visitedConceptIds:[...(raw.core?.visitedConceptIds||[])],checks:{...(raw.core?.checks||{})}},
      finalAssessment:{...base.finalAssessment,...(raw.finalAssessment||{}),attempts:[...(raw.finalAssessment?.attempts||[])],latestAnswers:{...(raw.finalAssessment?.latestAnswers||{})},wrongConceptIds:[...(raw.finalAssessment?.wrongConceptIds||[])]},
      wrongPractice:{...base.wrongPractice,...(raw.wrongPractice||{}),items:{...(raw.wrongPractice?.items||{})}},
      firstCompletion:raw.firstCompletion?clone(raw.firstCompletion):null,relearning:raw.relearning===true,relearningHistory:Array.isArray(raw.relearningHistory)?clone(raw.relearningHistory):[]};
    return validPosition(state)?state:initialState(revision);
  }

  function currentQuestion(){
    if(mathState.phase==='prerequisite')return unit.prerequisites[mathState.index]?.question;
    if(mathState.phase==='review'){const id=mathState.reviewQueue[mathState.index];return reviewQuestion(unit.prerequisites.find(item=>item.id===id));}
    if(mathState.phase==='core-check')return unit.coreConcepts[mathState.index]?.checkQuestion;
    if(mathState.phase==='final')return unit.finalQuestions[mathState.index];
    return null;
  }

  function syncResume(){
    const question=currentQuestion();let phase=mathState.phase,conceptId=null,questionId=question?.id||null;
    if(phase==='prerequisite')phase='prerequisite-check';
    else if(phase==='review'){phase='prerequisite-review';conceptId=mathState.reviewQueue[mathState.index]||null;}
    else if(phase==='core'){phase='core-concept';conceptId=unit.coreConcepts[mathState.index]?.id||null;}
    else if(phase==='core-check'){phase='concept-check';conceptId=unit.coreConcepts[mathState.index]?.id||null;}
    else if(phase==='final')phase='final-check';
    mathState.resume={phase,conceptId,questionId,reviewQueueIds:mathState.reviewQueue.slice()};
  }

  function attempt(question,source){return {questionId:question.id,conceptId:question.conceptId,selectedAnswer:String(mathState.selectedAnswer),correct:correct(question,mathState.selectedAnswer),attemptedAt:new Date().toISOString(),source};}
  function recordWrongAnswer(question,answer){
    if(answer.correct)return;
    const previous=mathState.wrongPractice.items[question.id]||{};
    mathState.wrongPractice.items[question.id]={
      ...previous,questionId:question.id,unitId:unit.id,conceptId:String(question.conceptId||answer.conceptId||''),question:question.question,
      choices:Array.isArray(question.choices)?question.choices.slice():[],correctAnswer:String(question.correctAnswer),
      diagram:String(question.diagram||''),
      studentAnswer:String(answer.selectedAnswer),explanation:String(question.explanation||''),
      source:answer.source,wrongAt:answer.attemptedAt,resolved:false,resolvedAt:null
    };
  }
  function persist(){
    syncResume();mathState.syncRevision=(Number(mathState.syncRevision)||0)+1;mathState.updatedAt=new Date().toISOString();mathState.pendingSync=true;sessionMutation++;
    if(!isLearningWriteBlocked()){try{localStorage.setItem(storageKey(),JSON.stringify(mathState));}catch(error){console.warn('수학 v2 로컬 저장 실패:',error);}queueSave();}
  }
  function queueSave(){pendingSnapshot=clone(mathState);if(saveSending||isLearningWriteBlocked())return;saveSending=true;(async()=>{
    while(pendingSnapshot){const snapshot=pendingSnapshot;pendingSnapshot=null;try{const body=new URLSearchParams();body.set('action','saveMathConceptProgress');body.set('name',snapshot.studentKey);body.set('unitId',snapshot.unitId);body.set('data',JSON.stringify(snapshot));body.set('isAdminMode',isAdminSessionActive()?'true':'false');const response=await fetch(API_URL,{method:'POST',body});const result=await response.json();if(result?.ok){mathState.lastServerRevision=Math.max(Number(mathState.lastServerRevision)||0,Number(result.savedRevision)||snapshot.syncRevision);mathState.pendingSync=mathState.syncRevision>mathState.lastServerRevision;}else if(result?.error==='STALE_REVISION'){mathState.syncRevision=Math.max(mathState.syncRevision,Number(result.savedRevision)||0)+1;mathState.updatedAt=new Date().toISOString();mathState.pendingSync=true;pendingSnapshot=clone(mathState);}else throw new Error(result?.error||'SAVE_FAILED');if(!isLearningWriteBlocked())localStorage.setItem(storageKey(),JSON.stringify(mathState));}catch(error){console.warn('수학 v2 서버 저장 보류:',error);mathState.pendingSync=true;if(!isLearningWriteBlocked())localStorage.setItem(storageKey(),JSON.stringify(mathState));}}
    saveSending=false;
  })();}

  function questionHtml(question,label){return `<section class="math-card"><div class="math-kicker">${esc(label)}</div><h2>${esc(question.question)}</h2>${question.diagram?`<div class="math-diagram">${question.diagram}</div>`:''}<div class="math-options">${question.choices.map((choice,index)=>`<button type="button" class="math-choice${mathState.selectedAnswer===choice?' selected':''}" data-math-action="select" data-choice-index="${index}">${index+1}. ${esc(choice)}</button>`).join('')}</div><div class="math-actions"><button type="button" class="math-primary" data-math-action="submit"${mathState.selectedAnswer===null?' disabled aria-disabled="true"':''}>답 제출하기</button></div></section>`;}
  function renderMathScreen(){
    if(!root||!mathState)return;syncResume();const phase=mathState.phase;
    if(phase==='prerequisite'){const q=currentQuestion();setStep(`이전 개념 ${mathState.index+1} / ${unit.prerequisites.length}`);root.innerHTML=questionHtml(q,'① 이전 개념 확인');}
    else if(phase==='prerequisite-result'){const rows=unit.prerequisites.map(item=>{const r=mathState.prerequisite.results[item.id];return `<div class="math-status-row"><span>${r?.correct?'✓':'△'}</span><span>${esc(item.title)} · ${r?.correct?'이해함':'복습 필요'}</span></div>`}).join('');const hasReview=mathState.reviewQueue.length>0;setStep('② 결과 확인');root.innerHTML=`<section class="math-card"><h2>${esc(unit.title)} 준비도</h2><div class="math-status-list">${rows}</div><div class="math-actions">${hasReview?'<button type="button" class="math-primary" data-math-action="start-review">필요한 개념 복습하기</button>':''}<button type="button" class="math-secondary" data-math-action="start-core">바로 본 학습 시작하기</button></div></section>`;}
    else if(phase==='review'){const id=mathState.reviewQueue[mathState.index],item=unit.prerequisites.find(x=>x.id===id),q=currentQuestion();setStep(`③ 필요한 개념 복습 ${mathState.index+1} / ${mathState.reviewQueue.length}`);root.innerHTML=`<section class="math-card"><div class="math-kicker">짧은 복습</div><h2>${esc(item.title)}</h2><p>${esc(item.review.summary)}</p><div class="math-equation">${esc(item.review.example)}</div>${questionHtml(q,'다시 풀기').replace(/^<section class="math-card">|<\/section>$/g,'')}</section>`;}
    else if(phase==='core'){const c=unit.coreConcepts[mathState.index],lesson=c.lesson;setStep(`④ 핵심개념 ${mathState.index+1} / ${unit.coreConcepts.length}`);root.innerHTML=`<section class="math-card"><div class="math-kicker">핵심개념</div><h2>${esc(c.title)}</h2><p>${esc(lesson.summary)}</p><p><strong>${esc(lesson.keyPoint)}</strong></p><div class="math-equation">${esc(lesson.example)}</div>${lesson.diagram?`<div class="math-diagram">${lesson.diagram}</div>`:''}<div class="math-actions"><button type="button" class="math-primary" data-math-action="open-core-check">확인문제 풀기 →</button></div></section>`;}
    else if(phase==='core-check'){setStep(`⑤ 확인문제 ${mathState.index+1} / ${unit.coreConcepts.length}`);root.innerHTML=questionHtml(currentQuestion(),'개념별 확인문제');}
    else if(phase==='final'){setStep(`⑥ 마지막 확인 ${mathState.index+1} / ${unit.finalQuestions.length}`);root.innerHTML=questionHtml(currentQuestion(),`마지막 확인 ${mathState.index+1}번`);}
    else if(mathState.completed&&!mathState.relearning){setStep('학습 완료');root.innerHTML=`<section class="math-card"><div class="math-kicker">완료된 수학개념학습</div><h2>${esc(unit.title)}</h2><p>완료 기록은 그대로 유지돼요. 처음부터 다시 학습할 수 있어요.</p><div class="math-actions"><button type="button" class="math-primary" data-math-action="restart">다시 학습하기</button></div></section>`;}
    else {setStep('⑦ 학습 결과');root.innerHTML=`<section class="math-card"><div class="math-kicker">${mathState.relearning?'재학습':'오늘의 수학 개념'} 결과</div><h2>${mathState.finalAssessment.correctCount} / ${unit.finalQuestions.length} 정답</h2><div class="math-actions"><button type="button" class="math-primary" data-math-action="complete">${mathState.relearning?'재학습 완료하기':'학습 완료하기'}</button></div></section>`;}
    console.info('[MathFlow v2] render',{phase:mathState.phase,index:mathState.index,questionId:currentQuestion()?.id||null,revision:mathState.syncRevision});
  }
  function setStep(text){const el=document.getElementById('math-step-label');if(el)el.textContent=text;}

  function submit(){const q=currentQuestion();if(!q||mathState.selectedAnswer===null)return;const a=attempt(q,mathState.phase==='prerequisite'?'prerequisite':mathState.phase==='review'?'prerequisite-review':mathState.phase==='core-check'?'concept-check':'final');recordWrongAnswer(q,a);
    if(mathState.phase==='prerequisite'){const item=unit.prerequisites[mathState.index];mathState.prerequisite.results[item.id]={status:a.correct?'understood':'needs-review',correct:a.correct,attempts:[...(mathState.prerequisite.results[item.id]?.attempts||[]),a],updatedAt:a.attemptedAt};mathState.selectedAnswer=null;if(mathState.index<unit.prerequisites.length-1)mathState.index++;else{mathState.prerequisite.completed=true;mathState.reviewQueue=unit.prerequisites.filter(item=>mathState.prerequisite.results[item.id]?.status==='needs-review'&&!mathState.prerequisite.results[item.id]?.reviewCompleted).map(item=>item.id);mathState.phase='prerequisite-result';mathState.index=0;}}
    else if(mathState.phase==='review'){const id=mathState.reviewQueue[mathState.index],r=mathState.prerequisite.results[id];r.reviewCompleted=true;r.reviewAttempts=[...(r.reviewAttempts||[]),a];r.updatedAt=a.attemptedAt;mathState.selectedAnswer=null;if(mathState.index<mathState.reviewQueue.length-1)mathState.index++;else{mathState.phase='prerequisite-result';mathState.index=0;}}
    else if(mathState.phase==='core-check'){const c=unit.coreConcepts[mathState.index];mathState.core.checks[c.id]={correct:a.correct,attempts:[...(mathState.core.checks[c.id]?.attempts||[]),a],updatedAt:a.attemptedAt};mathState.selectedAnswer=null;if(mathState.index<unit.coreConcepts.length-1){mathState.phase='core';mathState.index++;}else{mathState.phase='final';mathState.index=0;}}
    else if(mathState.phase==='final'){mathState.finalAssessment.attempts.push(a);mathState.finalAssessment.latestAnswers[q.id]=a;mathState.finalAssessment.correctCount=Object.values(mathState.finalAssessment.latestAnswers).filter(x=>x.correct).length;mathState.finalAssessment.wrongConceptIds=[...new Set(Object.values(mathState.finalAssessment.latestAnswers).filter(x=>!x.correct).map(x=>x.conceptId))];mathState.selectedAnswer=null;if(mathState.index<unit.finalQuestions.length-1)mathState.index++;else{mathState.phase='result';mathState.index=0;}}
    persist();renderMathScreen();
  }

  function completionSnapshot(state,completedAt){return {completedAt:completedAt||state.completedAt||new Date().toISOString(),prerequisite:clone(state.prerequisite),core:clone(state.core),finalAssessment:clone(state.finalAssessment)};}
  function restartCompletedLearning(){
    if(!mathState?.completed)return;
    const original=mathState,firstCompletion=original.firstCompletion||completionSnapshot(original,original.completedAt);
    mathState={...initialState(original.syncRevision),completed:true,completedAt:original.completedAt,firstCompletion,relearning:true,
      relearningHistory:clone(original.relearningHistory||[]),wrongPractice:clone(original.wrongPractice),lastServerRevision:original.lastServerRevision,pendingSync:original.pendingSync};
    persist();renderMathScreen();
  }
  function handleClick(event){const button=event.target.closest('button[data-math-action]');if(!button||button.disabled)return;const action=button.dataset.mathAction;if(action==='select'){mathState.selectedAnswer=currentQuestion().choices[Number(button.dataset.choiceIndex)];renderMathScreen();}else if(action==='submit'){button.disabled=true;submit();}else if(action==='start-review'){mathState.phase='review';mathState.index=0;mathState.selectedAnswer=null;persist();renderMathScreen();}else if(action==='start-core'){mathState.phase='core';mathState.index=0;mathState.selectedAnswer=null;persist();renderMathScreen();}else if(action==='open-core-check'){const id=unit.coreConcepts[mathState.index].id;if(!mathState.core.visitedConceptIds.includes(id))mathState.core.visitedConceptIds.push(id);mathState.phase='core-check';mathState.selectedAnswer=null;persist();renderMathScreen();}else if(action==='restart'){restartCompletedLearning();}else if(action==='complete'){const completedAt=new Date().toISOString();if(mathState.relearning){mathState.relearningHistory.push(completionSnapshot(mathState,completedAt));mathState.relearning=false;}mathState.completed=true;mathState.completedAt=mathState.completedAt||completedAt;persist();renderMathScreen();}}

  async function loadServer(openMutation,sequence){try{const response=await fetch(API_URL+'?action=getMathConceptProgress&name='+encodeURIComponent(student.name)+'&unitId='+encodeURIComponent(unit.id),{cache:'no-store'}),payload=await response.json();if(sequence!==loadSequence||!payload?.ok)return;const server=payload.data,serverRevision=Number(server?.syncRevision)||0;if(sessionMutation!==openMutation){mathState.lastServerRevision=Math.max(mathState.lastServerRevision,serverRevision);if(mathState.syncRevision<=serverRevision){mathState.syncRevision=serverRevision+1;mathState.pendingSync=true;queueSave();}return;}const local=mathState,serverState=normalizeProgress(server);const serverIsV2=server?.unitId===unit.id&&Number(server?.contentVersion||1)===Number(unit.contentVersion);if(serverIsV2&&(serverState.syncRevision>local.syncRevision||(serverState.syncRevision===local.syncRevision&&String(serverState.updatedAt||'')>String(local.updatedAt||''))))mathState=serverState;else{mathState.lastServerRevision=Math.max(mathState.lastServerRevision,serverRevision);mathState.syncRevision=Math.max(mathState.syncRevision,serverRevision);}if(!isLearningWriteBlocked())localStorage.setItem(storageKey(),JSON.stringify(mathState));renderMathScreen();}catch(error){console.warn('수학 v2 서버 조회 실패:',error);}}

  async function open(requestedUnitId){student=STUDENTS.find(item=>item.name===playerName);if(!student)return;const content=await loadMathConceptContent();const gradeConfig=content.grades?.[student.grade];const unitId=requestedUnitId||gradeConfig?.activeUnit||student.mathUnitId;unit=content.units[unitId];if(!unit||unit.grade!==student.grade){showToast2('⏳ 이 학년 수학개념학습은 준비 중이에요.');return;}screen=document.getElementById('math-concept-screen');root=document.getElementById('math-concept-root');if(!bound){screen.addEventListener('click',handleClick);bound=true;}mathState=normalizeProgress(readLocalWithMigration());sessionMutation=0;const sequence=++loadSequence;htShowOnlyScreen('math-concept-screen');renderMathScreen();loadServer(sessionMutation,sequence);}
  function close(){loadSequence++;mathState=null;unit=null;student=null;goHome();}
  window.MathFlowV2={open,close,_test:{initialState:()=>initialState(),normalizeProgress,render:renderMathScreen,getState:()=>clone(mathState),setState:value=>{mathState=normalizeProgress(value);},submit,handleClick,recordWrongAnswer,restartCompletedLearning}};
})();

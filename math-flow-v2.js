/* 수학개념학습 v2 — 단원별 state / 단일 renderer / 이벤트 위임 */
(function(){
  'use strict';
  const STORAGE_PREFIX='mathConceptProgress_v1:';
  let mathState=null,unit=null,student=null,root=null,screen=null;
  let bound=false,sessionMutation=0,loadSequence=0,saveSending=false,pendingSnapshot=null;

  const clone=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalizeAnswer=value=>String(value??'').toLowerCase().replace(/\s+/g,'').replace(/[×*]/g,'x').replace(/°/g,'');
  const fractionEquivalent=(a,b)=>{const x=a.match(/^(-?\d+)\/(-?\d+)$/),y=b.match(/^(-?\d+)\/(-?\d+)$/);return !!(x&&y&&Number(x[2])&&Number(y[2])&&Number(x[1])*Number(y[2])===Number(y[1])*Number(x[2]));};
  const correct=(question,value)=>(Array.isArray(question.acceptedAnswers)&&question.acceptedAnswers.length?question.acceptedAnswers:[question.correctAnswer]).some(answer=>{const a=normalizeAnswer(answer),v=normalizeAnswer(value);return a===v||fractionEquivalent(a,v);});
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
      prerequisite:{completed:false,results:{}},requiredPrerequisite:{completed:false,results:{}},core:{visitedConceptIds:[],checks:{}},
      finalAssessment:{attempts:[],latestAnswers:{},correctCount:0,wrongConceptIds:[]},
      wrongPractice:{items:{}},
      basicConceptReview:{completed:false,completedAt:null,results:{}},
      conceptReviewLearning:{},
      completed:false,completedAt:null,firstCompletion:null,relearning:false,relearningHistory:[],
      extensionMode:false,extensionCompletedAt:null,
      resume:{phase:'prerequisite-check',conceptId:null,questionId:unit.prerequisites[0].question.id},
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
    const requiredLength=(unit.requiredPrerequisiteChecks||[]).length;
    const limits={prerequisite:unit.prerequisites.length,'prerequisite-result':1,review:state.reviewQueue.length,'required-check':requiredLength,'required-review':requiredLength,core:unit.coreConcepts.length,'core-check':unit.coreConcepts.length,final:unit.finalQuestions.length,result:1};
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
      requiredPrerequisite:{...base.requiredPrerequisite,...(raw.requiredPrerequisite||{}),results:{...(raw.requiredPrerequisite?.results||{})}},
      core:{...base.core,...(raw.core||{}),visitedConceptIds:[...(raw.core?.visitedConceptIds||[])],checks:{...(raw.core?.checks||{})}},
      finalAssessment:{...base.finalAssessment,...(raw.finalAssessment||{}),attempts:[...(raw.finalAssessment?.attempts||[])],latestAnswers:{...(raw.finalAssessment?.latestAnswers||{})},wrongConceptIds:[...(raw.finalAssessment?.wrongConceptIds||[])]},
      wrongPractice:{...base.wrongPractice,...(raw.wrongPractice||{}),items:{...(raw.wrongPractice?.items||{})}},
      basicConceptReview:{...base.basicConceptReview,...(raw.basicConceptReview||{}),results:{...(raw.basicConceptReview?.results||{})}},
      conceptReviewLearning:raw.conceptReviewLearning?clone(raw.conceptReviewLearning):{},
      firstCompletion:raw.firstCompletion?clone(raw.firstCompletion):null,relearning:raw.relearning===true,relearningHistory:Array.isArray(raw.relearningHistory)?clone(raw.relearningHistory):[]};
    const requiredChecks=unit.requiredPrerequisiteChecks||[];
    if((!state.completed||state.relearning)&&requiredChecks.length&&!state.requiredPrerequisite.completed&&['core','core-check','final','result'].includes(state.phase)){
      const firstIncomplete=requiredChecks.findIndex(item=>!state.requiredPrerequisite.results[item.id]?.passed);
      state.phase='required-check';state.index=firstIncomplete<0?0:firstIncomplete;
    }
    return validPosition(state)?state:initialState(revision);
  }

  function currentQuestion(){
    if(mathState.phase==='prerequisite')return unit.prerequisites[mathState.index]?.question;
    if(mathState.phase==='review'){const id=mathState.reviewQueue[mathState.index];return reviewQuestion(unit.prerequisites.find(item=>item.id===id));}
    if(mathState.phase==='required-check'){const item=(unit.requiredPrerequisiteChecks||[])[mathState.index],result=mathState.requiredPrerequisite.results[item?.id];return result?.needsReview?item?.retryQuestion:item?.question;}
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

  // ── 완료 후 새 문제만 이어하기 ──────────────────────────────────────────
  // "새 항목" = 현재 unit의 문제 id 중, 이미 저장된 완료 기록(prerequisite.results/core.checks/
  // finalAssessment.latestAnswers, 전부 문제·개념 id를 key로 쓰는 기존 구조)에 없는 것. id 기준이라
  // 배열 순서가 바뀌어도 오탐하지 않는다. 기존 필드는 읽기만 하고 절대 수정하지 않는다.
  function newItemIds(){
    return {
      prerequisites:unit.prerequisites.filter(p=>!(p.id in mathState.prerequisite.results)).map(p=>p.id),
      core:unit.coreConcepts.filter(c=>!(c.id in mathState.core.checks)).map(c=>c.id),
      final:unit.finalQuestions.filter(q=>!(q.id in mathState.finalAssessment.latestAnswers)).map(q=>q.id)
    };
  }
  function totalNewItemsCount(ids){ids=ids||newItemIds();return ids.prerequisites.length+ids.core.length+ids.final.length;}
  // arr에서 fromIndex(포함)부터 hasResult가 false인 첫 항목의 인덱스를 찾는다. 없으면 -1.
  function skipToNextNew_(arr,fromIndex,hasResult){for(let i=Math.max(0,fromIndex);i<arr.length;i++){if(!hasResult(arr[i]))return i;}return -1;}
  function finishExtension_(){mathState.extensionMode=false;mathState.extensionCompletedAt=new Date().toISOString();mathState.phase='result';mathState.index=0;mathState.selectedAnswer=null;}
  // 확장 학습 진입점: 선수개념→핵심개념→최종퀴즈 순서로 처음 나오는 "새 항목"을 찾아 그 위치로 이동한다.
  // 기존 completed/completedAt/prerequisite.results/core.checks/finalAssessment.latestAnswers는 전혀 건드리지 않는다.
  function startExtensionLearning(){
    if(!mathState?.completed)return;
    const ids=newItemIds();
    mathState.selectedAnswer=null;mathState.extensionMode=true;
    if(ids.prerequisites.length){mathState.phase='prerequisite';mathState.index=unit.prerequisites.findIndex(p=>p.id===ids.prerequisites[0]);}
    else if(ids.core.length){mathState.phase='core';mathState.index=unit.coreConcepts.findIndex(c=>c.id===ids.core[0]);}
    else if(ids.final.length){mathState.phase='final';mathState.index=unit.finalQuestions.findIndex(q=>q.id===ids.final[0]);}
    else{mathState.extensionMode=false;return;} // 안전장치: 새 항목이 없으면 아무 것도 하지 않음
    persist();renderMathScreen();
  }
  // submit() 끝에서 호출됨. 방금 일반 로직으로 이동한 phase/index가 이미 결과가 있는(옛) 항목을 가리키면
  // 새 항목을 찾을 때까지 건너뛰고, 그 단계에 새 항목이 더 없으면 다음 단계로 넘어간다. prerequisite-result/
  // review 화면은 그대로 두어(복습 등 기존 흐름 보존) 사용자가 직접 "start-core"로 넘어가게 한다.
  function advanceExtensionState_(){
    if(!mathState.extensionMode)return;
    for(let guard=0;guard<200;guard++){
      if(mathState.phase==='prerequisite'){
        const items=unit.prerequisites,has=id=>id in mathState.prerequisite.results;
        if(mathState.index<items.length&&!has(items[mathState.index].id))return;
        const next=skipToNextNew_(items,mathState.index,it=>has(it.id));
        if(next>=0){mathState.index=next;return;}
        return; // 새 선수개념 소진 → 일반 로직이 이미 prerequisite-result로 보냈을 것, 그대로 둠
      }
      if(mathState.phase==='core'||mathState.phase==='core-check'){
        const items=unit.coreConcepts,has=id=>id in mathState.core.checks;
        if(mathState.index<items.length&&!has(items[mathState.index].id))return;
        const next=skipToNextNew_(items,mathState.index,it=>has(it.id));
        if(next>=0){mathState.index=next;return;}
        const finalNext=skipToNextNew_(unit.finalQuestions,0,q=>q.id in mathState.finalAssessment.latestAnswers);
        if(finalNext>=0){mathState.phase='final';mathState.index=finalNext;}
        else finishExtension_();
        return;
      }
      if(mathState.phase==='final'){
        const items=unit.finalQuestions,has=id=>id in mathState.finalAssessment.latestAnswers;
        if(mathState.index<items.length&&!has(items[mathState.index].id))return;
        const next=skipToNextNew_(items,mathState.index,it=>has(it.id));
        if(next>=0){mathState.index=next;return;}
        finishExtension_();return;
      }
      return; // prerequisite-result/review/required-*/result 등은 그대로 둠
    }
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
    while(pendingSnapshot){const snapshot=pendingSnapshot;pendingSnapshot=null;try{const body=new URLSearchParams();body.set('action','saveMathConceptProgress');body.set('name',snapshot.studentKey);body.set('unitId',snapshot.unitId);body.set('data',JSON.stringify(snapshot));body.set('isAdminMode',isAdminSessionActive()?'true':'false');const response=await fetch(API_URL,{method:'POST',body});const result=await response.json();if(result?.ok){mathState.lastServerRevision=Math.max(Number(mathState.lastServerRevision)||0,Number(result.savedRevision)||snapshot.syncRevision);mathState.pendingSync=mathState.syncRevision>mathState.lastServerRevision;if(result.skipped!==true&&typeof window.onMathConceptProgressServerSaved==='function')window.onMathConceptProgressServerSaved(snapshot);}else if(result?.error==='STALE_REVISION'){mathState.syncRevision=Math.max(mathState.syncRevision,Number(result.savedRevision)||0)+1;mathState.updatedAt=new Date().toISOString();mathState.pendingSync=true;pendingSnapshot=clone(mathState);}else throw new Error(result?.error||'SAVE_FAILED');if(!isLearningWriteBlocked())localStorage.setItem(storageKey(),JSON.stringify(mathState));}catch(error){console.warn('수학 v2 서버 저장 보류:',error);mathState.pendingSync=true;if(!isLearningWriteBlocked())localStorage.setItem(storageKey(),JSON.stringify(mathState));}}
    saveSending=false;
  })();}

  function questionHtml(question,label){const hasChoices=Array.isArray(question.choices)&&question.choices.length,answer=String(mathState.selectedAnswer??''),fraction=!hasChoices&&(question.acceptedAnswers||[question.correctAnswer]).some(a=>/^[-−]?\d+\s*\/\s*[-−]?\d+$/.test(String(a||'')));const input=fraction?`<div class="math-fraction-input" role="group" aria-label="분수 정답 입력"><input class="math-fraction-number" data-math-input="numerator" inputmode="text" placeholder="분자" value="${esc(answer.split('/')[0]||'')}"><div class="math-fraction-line"></div><input class="math-fraction-number" data-math-input="denominator" inputmode="numeric" placeholder="분모" value="${esc(answer.split('/')[1]||'')}"></div>`:`<input class="math-answer" data-math-input="answer" inputmode="text" autocomplete="off" placeholder="답을 입력하세요" value="${esc(answer)}">`;return `<section class="math-card"><div class="math-kicker">${esc(label)}</div><h2>${esc(question.question)}</h2>${question.diagram?`<div class="math-diagram">${question.diagram}</div>`:''}<div class="math-options">${hasChoices?question.choices.map((choice,index)=>`<button type="button" class="math-choice${mathState.selectedAnswer===choice?' selected':''}" data-math-action="select" data-choice-index="${index}">${index+1}. ${esc(choice)}</button>`).join(''):input}</div><div class="math-actions"><button type="button" class="math-primary" data-math-action="submit"${mathState.selectedAnswer===null?' disabled aria-disabled="true"':''}>답 제출하기</button></div></section>`;}
  function renderMathScreen(){
    if(!root||!mathState)return;syncResume();const phase=mathState.phase;
    if(phase==='prerequisite'){const q=currentQuestion();setStep(`이전 개념 ${mathState.index+1} / ${unit.prerequisites.length}`);root.innerHTML=questionHtml(q,'① 이전 개념 확인');}
    else if(phase==='prerequisite-result'){const rows=unit.prerequisites.map(item=>{const r=mathState.prerequisite.results[item.id];return `<div class="math-status-row"><span>${r?.correct?'✓':'△'}</span><span>${esc(item.title)} · ${r?.correct?'이해함':'복습 필요'}</span></div>`}).join('');const hasReview=mathState.reviewQueue.length>0;setStep('② 결과 확인');root.innerHTML=`<section class="math-card"><h2>${esc(unit.title)} 준비도</h2><div class="math-status-list">${rows}</div><div class="math-actions">${hasReview?'<button type="button" class="math-primary" data-math-action="start-review">필요한 개념 복습하기</button>':''}<button type="button" class="math-secondary" data-math-action="start-core">바로 본 학습 시작하기</button></div></section>`;}
    else if(phase==='review'){const id=mathState.reviewQueue[mathState.index],item=unit.prerequisites.find(x=>x.id===id),q=currentQuestion();setStep(`③ 필요한 개념 복습 ${mathState.index+1} / ${mathState.reviewQueue.length}`);root.innerHTML=`<section class="math-card"><div class="math-kicker">짧은 복습</div><h2>${esc(item.title)}</h2><p>${esc(item.review.summary)}</p><div class="math-equation">${esc(item.review.example)}</div>${questionHtml(q,'다시 풀기').replace(/^<section class="math-card">|<\/section>$/g,'')}</section>`;}
    else if(phase==='required-check'){const checks=unit.requiredPrerequisiteChecks||[];setStep(`필수 기울기 확인 ${mathState.index+1} / ${checks.length}`);root.innerHTML=questionHtml(currentQuestion(),'필수 확인 · 설명 없이 풀기');}
    else if(phase==='required-review'){const item=(unit.requiredPrerequisiteChecks||[])[mathState.index];setStep(`필수 기울기 복습 ${mathState.index+1} / ${(unit.requiredPrerequisiteChecks||[]).length}`);root.innerHTML=`<section class="math-card"><div class="math-kicker">오답 개념 짧은 복습</div><h2>${esc(item.title)}</h2><p>${esc(item.review.summary)}</p><p><strong>${esc(item.review.keyPoint)}</strong></p><div class="math-equation">${esc(item.review.example)}</div><div class="math-actions"><button type="button" class="math-primary" data-math-action="start-required-retry">새 문제로 다시 확인하기 →</button></div></section>`;}
    else if(phase==='core'){const c=unit.coreConcepts[mathState.index],lesson=c.lesson;setStep(`④ 핵심개념 ${mathState.index+1} / ${unit.coreConcepts.length}`);root.innerHTML=`<section class="math-card"><div class="math-kicker">핵심개념</div><h2>${esc(c.title)}</h2><p>${esc(lesson.summary)}</p><p><strong>${esc(lesson.keyPoint)}</strong></p><div class="math-equation">${esc(lesson.example)}</div>${lesson.diagram?`<div class="math-diagram">${lesson.diagram}</div>`:''}<div class="math-actions"><button type="button" class="math-primary" data-math-action="open-core-check">확인문제 풀기 →</button></div></section>`;}
    else if(phase==='core-check'){setStep(`⑤ 확인문제 ${mathState.index+1} / ${unit.coreConcepts.length}`);root.innerHTML=questionHtml(currentQuestion(),'개념별 확인문제');}
    else if(phase==='final'){setStep(`⑥ 마지막 확인 ${mathState.index+1} / ${unit.finalQuestions.length}`);root.innerHTML=questionHtml(currentQuestion(),`마지막 확인 ${mathState.index+1}번`);}
    else if(mathState.completed&&!mathState.relearning){
      setStep('학습 완료');
      const newIds=newItemIds(),newCount=totalNewItemsCount(newIds);
      const justFinishedExtension=!!mathState.extensionCompletedAt&&newCount===0;
      const extraP=justFinishedExtension?'<p>새로 추가된 학습도 모두 완료했어요!</p>':newCount>0?`<p>새로 추가된 학습이 ${newCount}문제 있어요.</p>`:'';
      const extensionBtn=newCount>0?`<button type="button" class="math-primary" data-math-action="start-extension">새 학습 이어하기 (${newCount}문제)</button>`:'';
      const restartCls=newCount>0?'math-secondary':'math-primary';
      root.innerHTML=`<section class="math-card"><div class="math-kicker">완료된 수학개념학습</div><h2>${esc(unit.title)}</h2><p>완료 기록은 그대로 유지돼요. 처음부터 다시 학습할 수 있어요.</p>${extraP}<div class="math-actions">${extensionBtn}<button type="button" class="${restartCls}" data-math-action="restart">다시 학습하기</button></div></section>`;
    }
    else {setStep('⑦ 학습 결과');root.innerHTML=`<section class="math-card"><div class="math-kicker">${mathState.relearning?'재학습':'오늘의 수학 개념'} 결과</div><h2>${mathState.finalAssessment.correctCount} / ${unit.finalQuestions.length} 정답</h2><div class="math-actions"><button type="button" class="math-primary" data-math-action="complete">${mathState.relearning?'재학습 완료하기':'학습 완료하기'}</button></div></section>`;}
    console.info('[MathFlow v2] render',{phase:mathState.phase,index:mathState.index,questionId:currentQuestion()?.id||null,revision:mathState.syncRevision});
  }
  function setStep(text){const el=document.getElementById('math-step-label');if(el)el.textContent=text;}

  function submit(){if(mathState.phase==='final'&&typeof window.blockMathLearningAccess_==='function'&&window.blockMathLearningAccess_(playerName,unit?.id||'','unitQuiz'))return;const q=currentQuestion();if(!q||mathState.selectedAnswer===null)return;const a=attempt(q,mathState.phase==='prerequisite'?'prerequisite':mathState.phase==='review'?'prerequisite-review':mathState.phase==='required-check'?'required-prerequisite':mathState.phase==='core-check'?'concept-check':'final');recordWrongAnswer(q,a);
    if(mathState.phase==='prerequisite'){const item=unit.prerequisites[mathState.index];mathState.prerequisite.results[item.id]={status:a.correct?'understood':'needs-review',correct:a.correct,attempts:[...(mathState.prerequisite.results[item.id]?.attempts||[]),a],updatedAt:a.attemptedAt};mathState.selectedAnswer=null;if(mathState.index<unit.prerequisites.length-1)mathState.index++;else{mathState.prerequisite.completed=true;mathState.reviewQueue=unit.prerequisites.filter(item=>mathState.prerequisite.results[item.id]?.status==='needs-review'&&!mathState.prerequisite.results[item.id]?.reviewCompleted).map(item=>item.id);mathState.phase='prerequisite-result';mathState.index=0;}}
    else if(mathState.phase==='review'){const id=mathState.reviewQueue[mathState.index],r=mathState.prerequisite.results[id];r.reviewCompleted=true;r.reviewAttempts=[...(r.reviewAttempts||[]),a];r.updatedAt=a.attemptedAt;mathState.selectedAnswer=null;if(mathState.index<mathState.reviewQueue.length-1)mathState.index++;else{mathState.phase='prerequisite-result';mathState.index=0;}}
    else if(mathState.phase==='required-check'){const checks=unit.requiredPrerequisiteChecks||[],item=checks[mathState.index],previous=mathState.requiredPrerequisite.results[item.id]||{};mathState.requiredPrerequisite.results[item.id]={passed:a.correct,needsReview:!a.correct,attempts:[...(previous.attempts||[]),a],updatedAt:a.attemptedAt};mathState.selectedAnswer=null;if(!a.correct)mathState.phase='required-review';else if(mathState.index<checks.length-1)mathState.index++;else{mathState.requiredPrerequisite.completed=true;mathState.phase='core';mathState.index=0;}}
    else if(mathState.phase==='core-check'){const c=unit.coreConcepts[mathState.index];mathState.core.checks[c.id]={correct:a.correct,attempts:[...(mathState.core.checks[c.id]?.attempts||[]),a],updatedAt:a.attemptedAt};mathState.selectedAnswer=null;if(mathState.index<unit.coreConcepts.length-1){mathState.phase='core';mathState.index++;}else{if(typeof window.blockMathLearningAccess_==='function'&&window.blockMathLearningAccess_(playerName,unit?.id||'','unitQuiz')){renderMathScreen();return;}mathState.phase='final';mathState.index=0;}}
    else if(mathState.phase==='final'){mathState.finalAssessment.attempts.push(a);mathState.finalAssessment.latestAnswers[q.id]=a;mathState.finalAssessment.correctCount=Object.values(mathState.finalAssessment.latestAnswers).filter(x=>x.correct).length;mathState.finalAssessment.wrongConceptIds=[...new Set(Object.values(mathState.finalAssessment.latestAnswers).filter(x=>!x.correct).map(x=>x.conceptId))];mathState.selectedAnswer=null;if(mathState.index<unit.finalQuestions.length-1)mathState.index++;else if(mathState.extensionMode)finishExtension_();else{mathState.phase='result';mathState.index=0;}}
    advanceExtensionState_();
    persist();renderMathScreen();
  }

  function completionSnapshot(state,completedAt){return {completedAt:completedAt||state.completedAt||new Date().toISOString(),prerequisite:clone(state.prerequisite),requiredPrerequisite:clone(state.requiredPrerequisite),core:clone(state.core),finalAssessment:clone(state.finalAssessment)};}
  function restartCompletedLearning(){
    if(!mathState?.completed)return;
    const original=mathState,firstCompletion=original.firstCompletion||completionSnapshot(original,original.completedAt);
    mathState={...initialState(original.syncRevision),completed:true,completedAt:original.completedAt,firstCompletion,relearning:true,
      relearningHistory:clone(original.relearningHistory||[]),wrongPractice:clone(original.wrongPractice),basicConceptReview:clone(original.basicConceptReview||{}),conceptReviewLearning:clone(original.conceptReviewLearning||{}),basicConceptReviewPolicyVersion:original.basicConceptReviewPolicyVersion||null,lastServerRevision:original.lastServerRevision,pendingSync:original.pendingSync};
    persist();renderMathScreen();
  }
  function handleClick(event){const button=event.target.closest('button[data-math-action]');if(!button||button.disabled)return;const action=button.dataset.mathAction;if(action==='select'){mathState.selectedAnswer=currentQuestion().choices[Number(button.dataset.choiceIndex)];renderMathScreen();}else if(action==='submit'){button.disabled=true;submit();}else if(action==='start-review'){mathState.phase='review';mathState.index=0;mathState.selectedAnswer=null;persist();renderMathScreen();}else if(action==='start-core'){const checks=unit.requiredPrerequisiteChecks||[],firstIncomplete=checks.findIndex(item=>!mathState.requiredPrerequisite.results[item.id]?.passed);if(firstIncomplete>=0){mathState.phase='required-check';mathState.index=firstIncomplete;}else{mathState.requiredPrerequisite.completed=true;
      if(mathState.extensionMode){
        // 확장 학습 중이면 핵심개념 0번이 아니라, 그 단계의 첫 "새 항목"으로 바로 이동한다(없으면 최종퀴즈의 새 항목, 그마저 없으면 종료).
        const coreNext=skipToNextNew_(unit.coreConcepts,0,c=>c.id in mathState.core.checks);
        if(coreNext>=0){mathState.phase='core';mathState.index=coreNext;}
        else{const finalNext=skipToNextNew_(unit.finalQuestions,0,q=>q.id in mathState.finalAssessment.latestAnswers);if(finalNext>=0){mathState.phase='final';mathState.index=finalNext;}else finishExtension_();}
      }else{mathState.phase='core';mathState.index=0;}
    }mathState.selectedAnswer=null;persist();renderMathScreen();}else if(action==='start-extension'){startExtensionLearning();}else if(action==='start-required-retry'){mathState.phase='required-check';mathState.selectedAnswer=null;persist();renderMathScreen();}else if(action==='open-core-check'){const id=unit.coreConcepts[mathState.index].id;if(!mathState.core.visitedConceptIds.includes(id))mathState.core.visitedConceptIds.push(id);mathState.phase='core-check';mathState.selectedAnswer=null;persist();renderMathScreen();}else if(action==='restart'){restartCompletedLearning();}else if(action==='complete'){const completedAt=new Date().toISOString(),firstCompletion=mathState.completed!==true;if(mathState.relearning){mathState.relearningHistory.push(completionSnapshot(mathState,completedAt));mathState.relearning=false;}if(firstCompletion)mathState.basicConceptReviewPolicyVersion='next-day-v1';mathState.completed=true;mathState.completedAt=mathState.completedAt||completedAt;persist();renderMathScreen();}}

  async function loadServer(openMutation,sequence){try{const response=await fetch(API_URL+'?action=getMathConceptProgress&name='+encodeURIComponent(student.name)+'&unitId='+encodeURIComponent(unit.id),{cache:'no-store'}),payload=await response.json();if(sequence!==loadSequence||!payload?.ok)return;const server=payload.data,serverRevision=Number(server?.syncRevision)||0;if(sessionMutation!==openMutation){mathState.lastServerRevision=Math.max(mathState.lastServerRevision,serverRevision);if(mathState.syncRevision<=serverRevision){mathState.syncRevision=serverRevision+1;mathState.pendingSync=true;queueSave();}return;}const local=mathState,serverState=normalizeProgress(server);const serverIsV2=server?.unitId===unit.id&&Number(server?.contentVersion||1)===Number(unit.contentVersion);if(serverIsV2&&(serverState.syncRevision>local.syncRevision||(serverState.syncRevision===local.syncRevision&&String(serverState.updatedAt||'')>String(local.updatedAt||''))))mathState=serverState;else{mathState.lastServerRevision=Math.max(mathState.lastServerRevision,serverRevision);mathState.syncRevision=Math.max(mathState.syncRevision,serverRevision);}if(!isLearningWriteBlocked())localStorage.setItem(storageKey(),JSON.stringify(mathState));renderMathScreen();}catch(error){console.warn('수학 v2 서버 조회 실패:',error);}}

  async function open(requestedUnitId){if(typeof window.blockStudentLearningEntry_==='function'&&window.blockStudentLearningEntry_())return;student=STUDENTS.find(item=>item.name===playerName);if(!student)return;const content=await loadMathConceptContent();const gradeConfig=content.grades?.[student.grade];const unitId=requestedUnitId||gradeConfig?.activeUnit||student.mathUnitId;if(typeof window.blockMathLearningAccess_==='function'&&window.blockMathLearningAccess_(playerName,unitId,'concept'))return;unit=content.units[unitId];if(!unit||unit.grade!==student.grade){showToast2('⏳ 이 학년 수학개념학습은 준비 중이에요.');return;}screen=document.getElementById('math-concept-screen');root=document.getElementById('math-concept-root');if(!bound){screen.addEventListener('click',handleClick);bound=true;}mathState=normalizeProgress(readLocalWithMigration());if(mathState.phase==='final'&&typeof window.blockMathLearningAccess_==='function'&&window.blockMathLearningAccess_(playerName,unitId,'unitQuiz'))return;sessionMutation=0;const sequence=++loadSequence;htShowOnlyScreen('math-concept-screen');renderMathScreen();loadServer(sessionMutation,sequence);}
  function close(){loadSequence++;mathState=null;unit=null;student=null;goHome();}
  document.addEventListener('input',event=>{const input=event.target.closest?.('#math-concept-root [data-math-input]');if(!input||!mathState)return;if(input.dataset.mathInput==='answer')mathState.selectedAnswer=input.value.trim()?input.value:null;else{const wrap=input.closest('.math-fraction-input'),num=wrap.querySelector('[data-math-input=numerator]').value.trim(),den=wrap.querySelector('[data-math-input=denominator]').value.trim();mathState.selectedAnswer=num&&den?num+'/'+den:null;}const button=root?.querySelector('[data-math-action=submit]');if(button){button.disabled=mathState.selectedAnswer===null;button.setAttribute('aria-disabled',button.disabled?'true':'false');}});
  window.MathFlowV2={open,close,startExtensionLearning,_test:{initialState:()=>initialState(),normalizeProgress,render:renderMathScreen,getState:()=>clone(mathState),setState:value=>{mathState=normalizeProgress(value);},submit,handleClick,recordWrongAnswer,restartCompletedLearning,newItemIds,totalNewItemsCount,startExtensionLearning,correct}};
})();

# HANDOFF

> Claude Code와 Codex가 교대로 작업할 때 보는 현재 상태 문서다. 과거 이력을 누적하지 말고, 인수인계 시점의 저장소와 작업 트리 상태로 이 문서 전체를 갱신한다.
>
> 확인 기준: 2026-08-28 (Asia/Seoul), 로컬 작업 트리 직접 확인

## 1. 현재 Git 상태

- 브랜치: `main`
- 원격 추적: `origin/main`
- HEAD: `d94a963f5c73bda318f26ee23db5e0ad13abc86a` (`d94a963`, `.netlify 로컬 폴더를 gitignore에 추가`, 2026-08-25 18:24:12 +09:00)
- `HEAD...origin/main`: ahead 0 / behind 0
- 커밋하지 않은 추적 파일 변경:
  - `.claude/settings.local.json` — `npx vercel *` 실행 허용 항목 추가
  - `.gitignore` — `.vercel`, `.env*` 추가
  - `app.js` — 190줄 추가 / 23줄 삭제
  - `index.html` — 6줄 추가 / 6줄 삭제
  - `sw.js` — 2줄 추가 / 2줄 삭제
- 이 문서 `HANDOFF.md`는 새 미추적 파일이다.
- 현재 커밋 또는 push는 하지 않은 상태다.

현재 `app.js` 변경의 핵심은 학생 카드 서버 데이터 로딩/실패/재시도 표시, 학생 설정 전 PIN 확인, 모달 포커스 트랩·ESC·원래 버튼으로 포커스 복귀, 선택 요소의 실제 `button` 전환, 빈 비밀번호 검증 문구 보강이다. 부모님 확인 비밀번호 비교값도 현재 작업 트리에서 `신천중부교회`에서 `1111`로 바뀌어 있다.

## 2. 현재 구현 완료 기능

- 설치형 단일 페이지 PWA: `manifest.json`, 아이콘 2종, 서비스 워커 캐시가 있다.
- 고정 학생 4명(`김주하`, `전민건`, `이하이`, `최단비`) 선택 및 4자리 PIN 생성/검증, 최근 로그인 학생 우선 표시, 카드 순서 변경이 있다.
- 학생별 포인트 컬러, 글꼴 선택, 효과음/Web Audio, `bgm.mp3` 배경음악과 공통 음소거 저장이 있다.
- 학생 아바타(SVG 조합 또는 이모지), 기분, 메모, 접속 기록 관리가 있다.
- 역사 단원 학습은 기본/심화 및 정리문제 시험 모드를 지원한다. 문제 데이터와 학습 콘텐츠는 `learning-content.js`에서 관리한다.
- 역사 학습 콘텐츠:
  - UNIT1~UNIT5 및 정리문제 그룹
  - 역사 훈련소
  - 역사총정리 2개 구성
  - 지도 학습/퀴즈
  - 역대 왕 계보 학습(읽기, 핵심 카드, 따라 쓰기, 퀴즈, 순서 배열)
- 사건 배열하기 게임 코드는 존재하지만 현재 `TIMELINE_GAME_ENABLED=false`라 UI와 진행률 계산에서 비활성화돼 있다.
- 통합 진행률, 미완료 학습 목록, 오늘 이어하기, 학생 카드 진행률을 `LEARNING_MODULES` 기반으로 계산한다.
- 콘텐츠별 공개 여부와 학생별 필수 여부를 관리자 화면에서 관리한다.
- 공부 시간 자동 집계, 날짜별/주간/전체 요약, 완료 학습 활동 기록이 있다.
- 스터디플래너는 날짜별 계획 추가·상태 변경·삭제 및 서버 동기화를 지원한다.
- 집중모드는 타이머, Wake Lock, 전체화면, 이탈/복귀 기록, 25분 단위 달성 안내를 제공한다.
- 부모님 확인 화면, 선생님 확인 화면, 관리자 토큰 로그인, 학생 상세 기록/결과 정정, 날짜·학생별 기록 초기화가 있다.
- 실제 학생 데이터와 분리된 TEST USER 개발 테스트모드가 있다.
- 학생↔선생님 메시지 API와 화면이 구현돼 있다. 다만 홈의 `openStudentMessage()` 경로는 현재 “준비 중” 알림만 띄운다.
- `?perf=1` 접속 시 초기 로딩/fetch 시간, 중복 요청, 최대 동시 요청 수를 보여주고 복사할 수 있는 진단 패널이 있다.

## 3. 현재 화면/UI 및 주요 동작

- 앱은 별도 CSS 파일 없이 `index.html`의 `<style>`과 `app.js`로 구성된 SPA다. 화면은 `display` 전환으로 관리한다.
- 시작 화면은 학생 선택 뷰와 선택 후 학습 홈 뷰로 나뉜다. 로고를 눌러 부모님/선생님/관리자/테스트모드 진입 버튼줄을 노출한다.
- 학생 카드는 아바타, 이름, 진행률, 공부시간, 마지막 접속을 표시한다. 현재 미커밋 코드에서는 서버 데이터 도착 전 스켈레톤을 유지하고 10초 타임아웃 뒤 실패 문구와 “다시 시도” 버튼을 표시한다.
- 학습 홈에는 학생 요약, 미완료 학습, 오늘 이어하기, UNIT 그룹, 역사 콘텐츠, 강의, 스터디플래너, 집중모드 진입점이 있다.
- 주요 전용 화면 ID: `summary-screen`, `lecture-screen`, `timeline-game-screen`, `king-order-screen`, `map-study-list-screen`, `map-study-learn-screen`, `map-study-quiz-screen`, `ht-list-screen`, `ht-part-screen`, `history-summary-screen`, `parent-screen`, `teacher-screen`, `qbank-screen`, `quiz-screen`, `result-screen`.
- 문제 화면은 객관식/단답형, 기본·심화, 시험 타이머와 문제 이동, 마지막 제출 후 결과 화면을 지원한다.
- 부모님 화면은 읽기 전용 모드다. 미완료 학습은 목록만 보이고 열 수 없으며, 완료 학습은 다시 볼 수 있지만 학습 기록을 변경하지 않는다.
- 관리자/선생님 화면에는 학생별 결과, 공부·집중 시간, 접속/학습 로그, 메모, 메시지, 공개/필수 설정 및 정정/초기화 도구가 있다.
- 현재 미커밋 접근성 변경은 설정/PIN/기분/아바타/학생확인 모달에 Tab 포커스 트랩, ESC 닫기, 트리거 포커스 복귀를 추가하고 기분·아바타 선택 항목을 `button`으로 렌더링한다.
- 반응형 기준은 `CLAUDE.md`에 모바일 375px, 태블릿 768px, 데스크탑 1180px로 명시돼 있다. 디자인 기준은 `Design.md`, `Design-2차-흥미유발.md`다.

## 4. 데이터 저장 방식 및 주요 구조

### 서버

- 프런트엔드는 `app.js`의 단일 Google Apps Script 웹앱 `API_URL`에 GET/POST(`URLSearchParams`)로 통신한다.
- 이 저장소에는 GAS `.gs` 백엔드 파일이 없다. 서버 구현은 이 저장소만으로 확인하거나 수정할 수 없다.
- 서버 대상 데이터에는 퀴즈 결과/감사 로그, 학습 이벤트, 로그인·로그아웃/접속 로그, 공부시간, 완료 활동, 스터디플래너, 아바타, 기분, PIN, 메모, 메시지, 마감일, 콘텐츠 공개/필수 설정, 지도/왕 계보/역사훈련소/사건배열 진행률, 관리자 인증과 결과 정정이 포함된다.

### 브라우저 저장

- `localStorage`는 단순 설정뿐 아니라 서버 지연/실패를 견디기 위한 로컬 캐시와 재전송 대기열로 사용된다.
- 주요 키/키 패턴:
  - `appSoundMuted`, `appFont`, `lastLoginStudent`, `studentCardOrder`, `avatarHintShown`
  - `contentVisibility_v1`, `contentRequirement_v1`
  - 학생별 `mapStudy_<name>`, `studyTimeData_<name>`, 스터디플래너/완료 활동/집중모드 함수 생성 키
  - `kingOrderPractice_v1`
  - 학생별 감사 로그 복구 큐와 `pendingLearningEvents...` 학습 이벤트 큐
  - `pendingFocusLeaveId_<name>`
  - `testMode`
- `sessionStorage` 주요 키:
  - `appLoginSession`: `name`, `loginEventId`, `loginSessionId`, `serverLogged`를 저장해 같은 탭 새로고침에서 로그인 세션 로그를 재사용한다.
  - `startedContentThisSession`: 세션 내 콘텐츠 시작 중복 기록 방지.
  - `lectureExternalNavigation`: 외부 강의 링크 이동을 집중모드 이탈로 세지 않기 위한 표식.
- 관리자 토큰은 메모리 변수 `adminToken`에만 두며 `localStorage`에 저장하지 않는다.

### 코드 구조

- `index.html`: 전체 HTML, CSS, 초기 셸, `?perf=1` 진단, 동적 스크립트 로더.
- `app.js`: UI 상태, 이벤트, 진행률 계산, 저장/동기화, API 호출 전체.
- `learning-content.js`: `UNITS`, 역사훈련소/역사총정리/왕 계보 등 문제·정답·학습 자료.
- `LEARNING_MODULES`: `unit`, `historyTraining`, `eventOrder`, `kingOrder`, `mapStudy`, `studyPlanner`, `historySummary`. 이 중 전체 진행률 포함은 `unit`, `historyTraining`, `kingOrder`, `mapStudy`, `historySummary`이며 `eventOrder`, `studyPlanner`는 제외된다.
- 문제 없는 신규 UNIT은 `activateWhenQuestionsAdded`와 `isUnitReadyForLearning()`으로 “준비 중” 처리되고 전체 진행률/미완료/이어하기에서 제외된다.

## 5. 건드리면 안 되는 중요 로직

`CLAUDE.md`의 Scope Lock이 현재 저장소 작업 규칙이다. 다음은 사용자 승인 없이 변경하지 않는다.

- GAS 백엔드 및 모든 `.gs` 파일(현재 저장소에는 없음).
- `app.js` 비즈니스 로직: 데이터 흐름, 이벤트 핸들러, 상태 관리, 진행률/서버 통신. 디자인 작업에서는 CSS 클래스 부여/제거 같은 최소 변경만 허용된다.
- 학생 ID/이름 매핑, `LEARNING_MODULES`, 통합 진행률과 미완료/이어하기 계산.
- `MathProgress` Stage 2-A 관련 설계 및 통신.
- `SFX`, `AudioContext`, `toggleAppSound()`, `updateSoundToggleBtn_()`, `SOUND_MUTE_KEY='appSoundMuted'`와 음소거 저장 방식.
- `FONT_OPTIONS`, `applyFont()` 폰트 선택 기능과 아바타 기능.
- 사건 배열하기의 고서/두루마리 서브테마(`--ink`, `--parchment`, `--brass`, `Song Myung`, `Noto Serif KR`).
- JS가 참조하는 기존 HTML `id`/`class` 이름. 제거/변경 전 반드시 `app.js` 참조를 확인하고 승인받는다.
- 기존 결과 호환 로직: `entryMatchesUnit()`의 `unitKey` 우선 및 `title`/`legacyTitles` 폴백.
- `calculateOverallProgressLegacy()` 계열은 V2 실패 시 실제 폴백으로 사용되므로 “구버전”이라는 이유로 삭제하면 안 된다.
- 학습 결과 저장과 감사 로그, 학습 이벤트 대기열은 유실/중복 방지를 위한 순서·ID 재사용 로직이 있으므로 단순화하지 않는다.
- 관리자/TEST USER/부모님 조회 모드의 기록 차단 조건과 관리자 토큰 메모리 보관 방식을 유지한다.

디자인 작업은 한 화면씩 진행하고, 파일 수정 전 명시적 승인을 받으며, `prefers-reduced-motion: reduce`에서 애니메이션을 비활성화/최소화해야 한다.

## 6. 미완료 기능 및 테스트 필요 사항

### 명시적으로 미완료/비활성

- 수학개념학습과 수학단원퀴즈 카드는 “준비 중” 알림만 표시한다.
- 문제 데이터가 없는 UNIT/역사훈련소 placeholder는 “준비 중”으로 비활성화된다.
- 사건 배열하기는 `TIMELINE_GAME_ENABLED=false`다.
- 학생 쪽지 홈 진입 함수 `openStudentMessage()`는 현재 준비 중 알림만 표시한다.
- 민트/라벤더/레몬 학생색 tint/shade는 `color-mix()` 임시값이며 디자인 승인이 필요하다. elevation 그림자 토큰도 초안이라고 코드에 명시돼 있다.

### 현재 작업 트리의 확인 필요 문제

- `index.html`의 날짜별 기록 초기화 입력 바로 앞에 불필요한 문자 `ㅕ`가 있다(현재 약 3758행). 화면에 노출될 수 있다.
- 캐시 버전 URL이 서로 맞지 않는다.
  - `index.html` preload 및 실제 동적 로드: `app.js?v=20260825-1`
  - `sw.js` precache: `app.js?v=20260825-9`
  - `index.html` preload: `learning-content.js?v=20260825-content-16`
  - `index.html` 실제 동적 로드와 `sw.js` precache: `learning-content.js?v=20260825-content-19`
  - `index.html` 주석은 preload와 실제 `<script src>` 버전을 반드시 동일하게 유지하라고 명시한다. 현재 상태는 이 조건을 어긴다.
- 정리문제 시작 안내에서 `exam-start-minutes`, `exam-start-total`, `exam-start-pass` ID가 현재 미커밋 변경으로 제거됐지만 `app.js` 9793~9795행은 세 ID를 계속 조회해 `textContent`를 설정한다. 정리문제 팝업을 열 때 `null` 참조 오류가 발생할 수 있으므로 수정 및 브라우저 확인이 필요하다.
- 부모님 비밀번호가 현재 미커밋 코드에서 `1111`로 하드코딩돼 있다. 의도된 변경인지 확인이 필요하다.
- 학생 설정 PIN 게이트, 중첩 모달 포커스 스택, ESC/Tab 동작, 닫은 뒤 포커스 복귀를 키보드와 모바일에서 통합 테스트해야 한다.
- 학생 카드의 10초 watchdog, 실패 표시, 재시도, 늦게 도착한 응답, 학생 전환/관리자 모드에서의 상태를 테스트해야 한다.
- `sw.js`의 캐시 우선/SWR 동작은 실제 PWA 설치·업데이트·오프라인·새 버전 배포 흐름에서 확인해야 한다.
- GAS API가 필요한 로그인, PIN, 진행률, 기록 저장/복구, 관리자 정정은 실서버 통합 테스트가 필요하다.

### 이번 확인에서 실행한 검사

- `node --check app.js`: 통과
- `node --check learning-content.js`: 통과
- `node --check sw.js`: 통과
- `git diff --check`: 출력 없음(공백 오류 없음)
- 브라우저 UI, 실제 GAS, PWA 설치/오프라인, 모바일 실기기 테스트는 실행하지 않았다.
- `package.json` 및 자동 테스트 구성은 저장소 파일 목록에서 확인되지 않았다.

## 7. 다음 작업자가 알아야 할 주의사항

- 먼저 `CLAUDE.md`를 읽고 Scope Lock을 그대로 따른다. 현재 디자인 리뉴얼은 기능 100% 유지가 전제다.
- 사용자 변경이 이미 있는 dirty worktree다. `.claude/settings.local.json`, `.gitignore`, `app.js`, `index.html`, `sw.js`를 되돌리거나 덮어쓰지 않는다.
- `app.js`와 `learning-content.js`는 `index.html`에서 `requestAnimationFrame` 이후 동적 로드된다. preload, 실제 로더, `sw.js`의 버전 쿼리를 항상 함께 맞춘다.
- CSS는 `index.html` 내부에만 있다. 기존 ID/class 변경은 inline handler와 `app.js` 참조를 모두 검색한 뒤 판단한다.
- 원격 문제/진행률의 기준은 GAS이며, 로컬 저장은 캐시·낙관적 보존·재시도 역할도 한다. 서버 응답으로 로컬 완료 상태를 무조건 덮어쓰지 않도록 작성된 병합 로직을 보존한다.
- UNIT 제목을 변경할 때는 과거 결과 호환을 위해 해당 UNIT의 `legacyTitles`를 갱신한다.
- 신규 UNIT은 문제 배열이 채워지면 자동 활성화되는 구조다. 카드 노출만 보고 진행률 대상에 수동 추가하지 않는다.
- 관리자, 개발 테스트, 부모님 조회 모드는 서로 권한과 기록 정책이 다르다. 테스트모드를 관리자 세션처럼 취급하거나 조회 화면에서 학습 기록을 쓰지 않게 주의한다.
- `API_URL`과 비밀번호/PIN/토큰/학생 데이터는 진단 로그에 남기지 않는다. `?perf=1` 진단도 action·시간·상태만 기록하도록 설계돼 있다.
- 다음 변경 전에는 위의 버전 불일치, `ㅕ` 문자, 제거된 시험 안내 ID, 부모님 비밀번호 변경이 의도된 현재 작업인지 사용자에게 확인하거나 관련 코드/동작을 검증한다.

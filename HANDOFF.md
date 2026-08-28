# HANDOFF

> 인수인계 기준: 2026-08-29 (Asia/Seoul). 과거 작업일지를 누적하지 않고 현재 소스·작업 트리 상태만 기록한다.

## 1. Git 상태

- 브랜치: `main`
- 원격 추적 브랜치: `origin/main`
- `HEAD`: `c20505e7ddcd1ee5922d1e54cd7cbbbb7aca46cb`
- `origin/main`: `c20505e7ddcd1ee5922d1e54cd7cbbbb7aca46cb`
- `HEAD`와 `origin/main`: 동일 (`ahead 0 / behind 0`)
- 최근 커밋:
  - `c20505e Add current project HANDOFF`
  - `d94a963 .netlify 로컬 폴더를 gitignore에 추가`
  - `7322635 조선시대 총정리문제 추가 및 정리문제 시작 팝업 버그 수정`
  - `3693280 UNIT5 5~8단원(농민 봉기·실학과 국학·문화 교류·서민 문화) 콘텐츠 추가`
  - `7ba0b0e 역사훈련소 8~9단원·UNIT5 4단원 콘텐츠 추가, 학생선택 화면 워터마크, 캐시 버그 수정`
- 현재 미커밋 변경:
  - `.claude/settings.local.json`
  - `.gitignore`
  - `app.js`
  - `index.html`
  - `sw.js`
- `HANDOFF.md` 외 소스 변경은 기존 작업물이며 임의로 복원·폐기·덮어쓰기·커밋하지 않는다.
- 현재까지 별도 commit/push는 수행하지 않았다.

## 2. 버전 및 배포 기준

- `index.html` app.js preload/loader: `app.js?v=20260828-1`
- `app.js` learning-content 동적 loader: `learning-content.js?v=20260825-content-19`
- `sw.js` precache: 위 두 버전과 동일
- Service Worker cache: `samguk-culture-quiz-v46-perf4`
- 최근 CLI Production 배포는 `gongbuhajaapp.vercel.app` 별칭에 연결되어 있으며, 해당 별칭에서 위 버전 문자열이 제공되는 것을 확인했다.
- Git 원격에는 현재 미커밋 변경이 올라가 있지 않다. Vercel Git 연동 배포와 CLI 배포 주소가 다를 수 있으므로 브라우저 확인 시 도메인·Service Worker 캐시를 함께 확인한다.

## 3. 초기 로딩 성능 개선 현황

- 앱 초기화 직후 학생 이름 카드와 기본 아바타를 즉시 렌더링한다.
- 학생 선택 전에는 `listPins`를 최우선으로 실행한다.
- `renderStudentGrid()`의 초기 `apiList() → list` 선호출을 제거했다.
- PIN 이전에 불필요한 전체 학생 데이터 API를 자동 실행하지 않는다.
- 학생 홈 진입 후 `loadStudentDataIfStale(name)`가 학생별 핵심 데이터를 백그라운드로 조회한다.
- 나머지 공통 데이터는 인증·홈 표시 이후 낮은 우선순위 백그라운드 작업으로 처리한다.
- `scheduleHomeUiRefresh_()`를 통한 refresh batching을 적용해 짧은 시간에 도착하는 서버 응답들이 `renderHomeSummaryCard()`, `renderIncompleteUnitsSection()`, `updateProgressColors()`를 응답마다 연속 실행하지 않도록 했다.
- 진행률 공식, 완료 판정, 저장 구조, GAS API, PIN 인증 정책은 변경하지 않았다.
- `list`와 `listTimelineGame`을 학생별 API로 분리하지 않았다.

## 4. 실측 확인 상태 (`?perf=1`)

- 학생 이름 최초 표시: 약 30ms
- `listPins`: 약 2.3초
- 학생 카드 클릭 → 학생 학습홈 DOM 표시: 약 5ms (측정 사례에 따라 약 13ms)
- 학습 콘텐츠 로드: 약 18ms 수준으로 병목 아님
- 4차 구조 적용 후 학생 선택 전 비필수 API 동시 실행이 제거된 것을 `?perf=1`에서 확인했다.
- 첫 화면 DOM 표시 지연보다, 홈 표시 후 서버 데이터가 도착하면서 값이 완성되는 시간이 별도 지연 구간이다.

## 5. 현재 UX 및 미완료 검토 항목

- 성능 개선으로 초기 학생 선택 화면은 서버 데이터를 미리 기다리지 않는다.
- 따라서 서버 응답 전 진행률·공부시간·최근접속이 즉시 완성되지 않고, 로컬 캐시 또는 기본 카드 골격이 먼저 표시된다.
- `listPins` 완료 후 PIN 인증을 방해하지 않는 낮은 우선순위 방식으로 다음 카드 데이터를 복원할지 검토 필요:
  - `list`: 진행률에 필요한 퀴즈 기록
  - `listStudyTime`: 서버 공부시간
  - `listAccessLog`: 최근 접속
- 위 카드 사전 조회 복원은 아직 확정된 수정사항이 아니다.
- 진행률 전체를 서버 기준으로 정확히 보정하려면 공개·필수 설정, 역사훈련소, 왕 계보 등 관련 캐시의 도착 시점도 고려해야 한다.
- 카드 데이터 도착 시 전체 카드 깜빡임 없이 필요한 값만 갱신하는 방식이 우선 검토 대상이다.

## 6. 기능·데이터 보호 범위

- 학생 ID/이름 매핑, PIN 생성·검증, 인증 게이트를 변경하지 않는다.
- 진행률 계산 공식, 완료 판정, 미완료/이어하기 계산을 변경하지 않는다.
- GAS 요청 형식·응답 구조·저장 데이터 구조를 변경하지 않는다.
- 학습 결과, 공부시간, 접속기록, 스터디플래너, 문제 공개/필수 대상 데이터의 저장 로직을 변경하지 않는다.
- 학생 홈 UI와 선생님·관리자·부모님·TEST USER 모드의 기능을 성능 작업과 무관하게 변경하지 않는다.
- `listPins`보다 학생카드용 서버 요청을 먼저 실행하지 않는다.
- PIN 인증과 학생 홈 진입이 학생카드 백그라운드 데이터에 의해 blocking되지 않도록 유지한다.
- 서버 응답 실패 시 기존 로컬/메모리 값을 임의로 0으로 덮어쓰지 않는다.

## 7. 주요 구조

- `index.html`: 초기 셸, CSS, 동적 script loader, `?perf=1` 진단 패널
- `app.js`: UI 상태, 이벤트, 진행률 계산, API 호출·저장·동기화
- `learning-content.js`: UNIT, 역사훈련소, 역사총정리, 왕 계보 콘텐츠
- `sw.js`: PWA Service Worker와 버전별 precache
- `renderStudentGrid(options)`: 초기에는 이름/아바타만 렌더링하며 `{refreshData:true}`일 때만 전체 `list`를 갱신한다.
- `selectStudent()`: 캐시 기반 홈을 먼저 표시한 뒤 학생별 핵심 데이터를 백그라운드에서 로드한다.
- `loadStudentDataIfStale(name)`: `list`, 학생별 역사훈련소·지도·스터디플래너·왕 계보 데이터를 single-flight로 조회한다.
- `scheduleStartupBackgroundLoads_()`: 학생 홈 진입 이후 공통 저우선순위 조회를 재개한다.
- `scheduleHomeUiRefresh_()`: 홈 UI 갱신을 다음 paint 단위로 묶는다.

## 8. 검증 및 주의사항

- `node --check app.js`: 통과
- `node --check learning-content.js`: 통과
- `node --check sw.js`: 통과
- `git diff --check`: 통과
- GAS 실서버 통합, 모바일 실기기, PWA 설치·업데이트·오프라인 동작은 별도 확인이 필요하다.
- `app.js`/`learning-content.js` 버전은 `index.html` preload·loader와 `sw.js` precache를 항상 함께 변경한다.
- 기존 dirty worktree를 보존하고, 다음 작업도 파일 수정 전 `HANDOFF.md`와 `CLAUDE.md`의 Scope Lock을 먼저 확인한다.

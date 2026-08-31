const CACHE_NAME = 'samguk-culture-quiz-v48-math-layout';
const ASSETS = [
  './index.html',
  './app.js?v=20260831-math-1',
  './learning-content.js?v=20260825-content-19',
  './math-content.js?v=20260831-math-1',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

async function refreshShellInBackground_(request, cacheKey){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request,{cache:'no-cache'});
    if(response&&response.ok) await cache.put(cacheKey,response.clone());
    return response;
  }catch(error){
    return null;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // http(s)가 아닌 요청(예: 브라우저 확장 프로그램의 chrome-extension:// 요청)은
  // Cache API가 저장을 지원하지 않으므로 손대지 않고 브라우저 기본 처리에 맡깁니다.
  if(url.protocol!=='http:'&&url.protocol!=='https:')return;

  // 구글 앱스스크립트(API) 요청은 캐시하지 않고 항상 네트워크로 보냄
  if (url.hostname.includes('script.google.com')) {
    return;
  }

  // 다른 사이트의 이미지 등은 브라우저 기본 처리에 맡깁니다.
  if(url.origin!==self.location.origin)return;

  const scopeUrl=new URL(self.registration.scope);
  const indexKey=new URL('index.html',scopeUrl).href;
  const isNavigation=event.request.mode==='navigate';
  const isIndex=url.pathname.endsWith('/index.html')||url.pathname===scopeUrl.pathname;

  if(isNavigation||isIndex){
    // 재방문은 저장된 가벼운 첫 화면을 즉시 보여주고 최신 index는 뒤에서 갱신합니다.
    const networkPromise=refreshShellInBackground_(event.request,indexKey);
    event.waitUntil(networkPromise);
    event.respondWith((async()=>{
      const cached=await caches.match(indexKey);
      return cached||(await networkPromise)||Response.error();
    })());
    return;
  }

  if(url.pathname.endsWith('/learning-content.js')||url.pathname.endsWith('/math-content.js')){
    // 재실행 때는 저장된 콘텐츠를 즉시 사용하고 최신본은 뒤에서 갱신합니다.
    // 문제 파일을 새로 배포한 경우 이번 실행이 캐시를 갱신하고 다음 실행부터 새 자료가 적용됩니다.
    const contentRefreshPromise=(async()=>{
      try{
        const response=await fetch(event.request,{cache:'no-cache'});
        if(response&&response.ok){
          const cache=await caches.open(CACHE_NAME);
          await cache.put(event.request,response.clone());
        }
        return response;
      }catch(error){
        return null;
      }
    })();
    event.waitUntil(contentRefreshPromise);
    event.respondWith((async()=>{
      const cached=await caches.match(event.request);
      return cached||(await contentRefreshPromise)||Response.error();
    })());
    return;
  }

  if(url.pathname.endsWith('/app.js')){
    // 기능 코드는 버전 URL을 사용하므로 캐시 우선으로 즉시 실행합니다.
    event.respondWith((async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      try{
        const response=await fetch(event.request);
        if(response&&response.ok){
          const cache=await caches.open(CACHE_NAME);
          await cache.put(event.request,response.clone());
        }
        return response;
      }catch(error){
        return Response.error();
      }
    })());
    return;
  }

  // manifest와 아이콘 등 나머지 같은 출처 정적 파일은 캐시 우선입니다.
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const response=await fetch(event.request);
      if(response&&response.ok){
        const cache=await caches.open(CACHE_NAME);
        await cache.put(event.request,response.clone());
      }
      return response;
    }catch(error){
      return Response.error();
    }
  })());
});

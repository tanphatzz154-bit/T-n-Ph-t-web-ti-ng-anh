import {addVideo, parseYouTubeUrl} from './videos.js';
import {renderPhat,renderVideoManager} from './videos-view.js';
import {weeks} from './curriculum.js';
import {defaultStudySession} from './study-session.js';
import {isCorrectAnswer,chooseStudyStart} from './study-flow.js';
import {photo,lessonPhoto,weekPhotos,activityPhotos,photoCredits} from './imagery.js';
import {freshState,localDay,getCardId,reviewCard,dueCards,markLessonPart,lessonDone,completionCount,recordAttempt,suggestedSupport,sanitizeState} from './learning.js';

const KEY='tan-phat-english-v1';
const app=document.getElementById('app');
const allLessons=weeks.flatMap(w=>w.days);
const allWords=allLessons.flatMap(d=>d.words);
const navItems=[['home','house','Hôm nay'],['weeks','calendar','Chủ đề tuần'],['vocab','book','Từ vựng'],['grammar','pen','Ngữ pháp'],['shadow','headphones','Shadowing'],['phat','film','Tấn Phát']];
const paths={house:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M7 3v4M17 3v4M3 11h18M7 15h2M13 15h2',book:'M12 6c-3-3-7-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2v15',pen:'m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6ZM14 21h7',headphones:'M4 14v-3a8 8 0 0 1 16 0v3M4 13h3v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2ZM20 13h-3v8h3a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z',clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',check:'m5 12 4 4L19 6',volume:'m4 9 5 0 5-5v16l-5-5H4ZM18 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14',play:'m8 4 12 8-12 8Z',pause:'M8 5v14M16 5v14',repeat:'m18 2 4 4-4 4M2 11V8a2 2 0 0 1 2-2h18M6 22l-4-4 4-4M22 13v3a2 2 0 0 1-2 2H2',mic:'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',chevron:'m9 5 7 7-7 7',back:'m15 5-7 7 7 7',flag:'M5 22V3h14l-3 5 3 5H5',leaf:'M20 3C6 2 2 10 7 16s15 1 13-13ZM5 21l9-12'};
paths.film='M4 4h16v16H4ZM4 8h16M4 16h16M8 4v16M16 4v16';
paths.plus='M12 5v14M5 12h14';
paths.close='m6 6 12 12M18 6 6 18';
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
let storageOkay=true,state=freshState(),startupNotice='';
try{const raw=localStorage.getItem(KEY);if(raw){const clean=sanitizeState(JSON.parse(raw));if(clean)state=clean;else startupNotice='Dữ liệu lưu chưa đọc được. Bạn có thể khôi phục từ bản sao lưu trong Cài đặt.';}}catch{storageOkay=false;}
let page=state.lastPage||'home',weekView=Number(state.activeLesson[1]),vocabMode='learn',queue=[],vocabIndex=0,revealed=false,vocabVisited=new Set(),reviewFirst=false,reviewDoneOn='';
let quizIndex=0,quizAnswer=null,quizAnswers=[],quizScore=0,quizFinished=false,quizAttemptSaved=false,quizDraft='',writingDraft='',showWritingSample=false;
let lineIndex=0,showEnglish=true,showVietnamese=true,loop=false,shadowRating=null,usedEnglish=false,usedVietnamese=false,shadowAttemptSaved=false,shadowHasPlayed=false;
let speaking=false,speechToken=0,mediaRecorder=null,mediaStream=null,recordStarted=0,recordInterval=null,recordUrl=null,recordMime='',recording=false,recordPending=false;
let toastTimer,voiceList=[],loadRecordToken=0,selectedVideoId=state.videos[0]?.id;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const lesson=()=>allLessons.find(d=>d.id===state.activeLesson)||allLessons[0];
const week=()=>weeks.find(w=>w.days.some(d=>d.id===state.activeLesson));
const parts=()=>state.completed[state.activeLesson]||{};
const partCount=()=>['vocab','grammar','shadow','apply'].filter(k=>parts()[k]).length;
const due=()=>dueCards(state,allWords);
const button=(text,action,cls='',extra='')=>`<button class="button ${cls}" data-action="${action}" ${extra}>${text}</button>`;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOkay=true;}catch{storageOkay=false;toast('Trình duyệt chưa lưu được tiến độ. Hãy tải bản sao lưu trong Cài đặt.');}}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('toast-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('toast-visible'),4200);}
function supportLevel(){return state.preferences.shadowSupport==='auto'?suggestedSupport(state,'shadow'):state.preferences.shadowSupport;}
function applySupport(){const support=supportLevel();showEnglish=support!=='independent';showVietnamese=support==='guided';}
function saveSession(){
  const previous=state.sessions?.[state.activeLesson];
  const session={page:['vocab','grammar','shadow'].includes(page)?page:previous?.page||'home',
    vocab:{mode:vocabMode,cardIds:queue.map(getCardId),index:vocabIndex,visited:[...vocabVisited],revealed,reviewFirst,reviewDoneOn},
    grammar:{index:quizIndex,answers:quizAnswers,finished:quizFinished,attemptSaved:quizAttemptSaved,draft:quizDraft,writing:writingDraft,showSample:showWritingSample},
    shadow:{lineIndex,showEnglish,showVietnamese,usedEnglish,usedVietnamese,rating:shadowRating,attemptSaved:shadowAttemptSaved,hasPlayed:shadowHasPlayed},updatedAt:new Date().toISOString()};
  state={...state,lastPage:page,sessions:{...state.sessions,[state.activeLesson]:session}};persist();
}
function restoreSession(){
  const saved=state.sessions?.[state.activeLesson],s=saved||defaultStudySession(state.activeLesson);
  vocabMode=s.vocab.mode;vocabIndex=s.vocab.index;revealed=s.vocab.revealed;vocabVisited=new Set(s.vocab.visited);reviewFirst=s.vocab.reviewFirst;reviewDoneOn=s.vocab.reviewDoneOn;
  const words=vocabMode==='learn'?lesson().words:allWords;
  queue=s.vocab.cardIds.map(id=>words.find(w=>getCardId(w)===id)).filter(Boolean);
  quizIndex=s.grammar.index;quizAnswers=[...s.grammar.answers];quizAnswer=quizAnswers[quizIndex]??null;quizScore=lesson().grammar.questions.reduce((n,q,i)=>n+Number(isCorrectAnswer(q,quizAnswers[i])),0);
  quizFinished=s.grammar.finished;quizAttemptSaved=s.grammar.attemptSaved;quizDraft=s.grammar.draft||'';writingDraft=s.grammar.writing;showWritingSample=s.grammar.showSample;
  lineIndex=s.shadow.lineIndex;showEnglish=s.shadow.showEnglish;showVietnamese=s.shadow.showVietnamese;usedEnglish=s.shadow.usedEnglish;usedVietnamese=s.shadow.usedVietnamese;shadowRating=s.shadow.rating;shadowAttemptSaved=s.shadow.attemptSaved;shadowHasPlayed=s.shadow.hasPlayed;
  if(!saved||state.preferences.shadowSupport!=='auto')applySupport();
}
function selectLesson(id,target='home'){
  if(!allLessons.some(d=>d.id===id))return;saveSession();stopAudio();stopRecording();
  if(recordUrl)URL.revokeObjectURL(recordUrl);recordUrl=null;recordMime='';
  state={...state,activeLesson:id};weekView=Number(id[1]);restoreSession();navigate(target);
}
function navigate(target){stopAudio();if(page==='shadow'&&target!=='shadow')stopRecording();page=target;if(page==='vocab'&&!queue.length)startQueue();render(page==='phat'?'#video-heading':'h1');window.scrollTo({top:0,behavior:'instant'});}
function complete(part){const before=lessonDone(state,state.activeLesson);state=markLessonPart(state,state.activeLesson,part);persist();if(!before&&lessonDone(state,state.activeLesson))toast('Bạn đã hoàn thành buổi học! Một bước tiến nữa của Phát.');}
function startQueue(){queue=vocabMode==='review'?(reviewFirst?due().slice(0,10):due()):lesson().words;vocabIndex=0;revealed=false;vocabVisited=new Set();}
function resumePage(){
  const savedPage=state.sessions?.[state.activeLesson]?.page;
  if(savedPage==='vocab'&&vocabIndex<queue.length&&(vocabVisited.size||revealed))return 'vocab';
  if(savedPage==='grammar'&&!quizFinished&&(quizAnswers.some(a=>a!==null)||quizDraft||writingDraft))return 'grammar';
  if(savedPage==='shadow'&&!parts().shadow&&(lineIndex>0||shadowHasPlayed))return 'shadow';
  return null;
}
function beginStudy(skipReview=false){
  const continuing=skipReview?null:resumePage();
  if(continuing){navigate(continuing);return;}
  const target=chooseStudyStart({resumePage:skipReview?null:resumePage(),hasDue:due().length>0,reviewDoneToday:skipReview||reviewDoneOn===localDay(),parts:parts()});
  if(target==='review'){reviewFirst=true;vocabMode='review';startQueue();navigate('vocab');return;}
  if(target==='vocab'&&(vocabMode!=='learn'||vocabIndex>=queue.length)){vocabMode='learn';reviewFirst=false;startQueue();}
  navigate(target);if(target==='shadow'&&parts().shadow&&!parts().apply)document.getElementById('apply-section')?.scrollIntoView({behavior:'smooth'});
}
function nextLesson(){const index=allLessons.findIndex(d=>d.id===state.activeLesson);const next=allLessons.slice(index+1).find(d=>!lessonDone(state,d.id))||allLessons.find(d=>!lessonDone(state,d.id));if(next)selectLesson(next.id);else navigate('home');}
function trackShadowUse(){shadowHasPlayed=true;usedEnglish ||= showEnglish;usedVietnamese ||= showVietnamese;saveSession();}
function focusAfterRender(selector,previous){
  let target=selector?app.querySelector(selector):null;
  if(!target&&previous?.id)target=document.getElementById(previous.id);
  if(!target&&previous?.action)target=[...app.querySelectorAll('[data-action]')].find(el=>Object.entries(previous.data).every(([key,value])=>el.dataset[key]===value)&&!el.disabled);
  if(!target&&previous)target=app.querySelector('h1');
  if(target&&!target.hidden){if(!target.matches('button,input,textarea,select,a'))target.tabIndex=-1;target.focus({preventScroll:true});}
}
function backupReminder(){
  const hasProgress=Object.keys(state.vocab).length>=5||completionCount(state)>0;
  if(!hasProgress||Date.parse(state.backupDismissedUntil)>Date.now()||Date.now()-Date.parse(state.lastBackupAt)<7*86400000)return '';
  return '<section class="backup-notice" aria-label="Nhắc sao lưu"><div><strong>Giữ lại hành trình học của bạn</strong><p>Tiến độ nằm trên trình duyệt này. Tải bản sao lưu để chuyển sang thiết bị khác.</p></div><div class="row">'+button('Tải bản sao lưu','export','soft')+button('Nhắc sau 7 ngày','backup-later','ghost')+'</div></section>';
}

function lessonLabel(){return `<div class="lesson-label">${icon('calendar')}<span>Tuần ${week().id} · Ngày ${lesson().id.slice(-1)}</span><strong>${esc(lesson().title)}</strong>${button('Đổi bài','navigate','compact ghost','data-page="weeks"')}</div>`;}
function title(text,sub,extra=''){return `<div class="page-title"><div><h1>${text}</h1><p>${sub}</p></div>${extra}</div>`;}
function photoTag(p,cls='',alt=p.alt){return `<img class="${cls}" src="${p.src}" alt="${esc(alt)}" style="object-position:${p.position||'50% 50%'}" width="900" height="600" loading="lazy" decoding="async">`;}
function sceneFigure(d){return `<figure class="scene-figure">${photoTag(lessonPhoto(d.id))}<figcaption>Bối cảnh bài học · ${esc(d.title)}</figcaption></figure>`;}
function motionControl(){
  const enabled=state.preferences.oceanMotion&&!reducedMotion.matches;
  const label=reducedMotion.matches?'Chuyển động đang tắt theo cài đặt thiết bị':enabled?'Tắt chuyển động nước':'Bật chuyển động nước';
  return button(icon('spark')+'<span class="motion-toggle-label">Sóng nước</span>','motion-toggle','compact motion-toggle',
    'aria-label="'+label+'" title="'+label+'" aria-pressed="'+enabled+'" '+(reducedMotion.matches?'disabled':''));
}
function syncOceanMotion(){
  document.body.dataset.motion=state.preferences.oceanMotion?'on':'off';
  document.body.dataset.page=page;
  document.body.dataset.hidden=String(document.hidden);
  const control=app.querySelector('[data-action="motion-toggle"]');
  if(control){
    const enabled=state.preferences.oceanMotion&&!reducedMotion.matches;
    const label=reducedMotion.matches?'Chuyển động đang tắt theo cài đặt thiết bị':enabled?'Tắt chuyển động nước':'Bật chuyển động nước';
    control.setAttribute('aria-pressed',String(enabled));control.setAttribute('aria-label',label);control.title=label;control.disabled=reducedMotion.matches;
  }
}
function render(focusSelector){
  const active=document.activeElement;const previous=active&&app.contains(active)?{id:active.id,action:active.dataset.action,data:{...active.dataset}}:null;
  const dates=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  app.innerHTML=`<div class="shell"><aside class="sidebar"><a href="#" class="brand" data-action="navigate" data-page="home"><img class="brand-photo" src="./assets/app-icon-192.png" alt="Biểu tượng Tấn Phát English" width="56" height="56"><div><strong>Tấn Phát</strong><span>đang học tiếng Anh</span></div></a><div class="nav-label">GÓC HỌC CỦA BẠN</div><nav class="nav" aria-label="Điều hướng chính">${navItems.map(([id,ic,label])=>`<button data-action="navigate" data-page="${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${icon(ic)}<span>${label}</span>${id==='vocab'&&due().length?`<span class="badge">${due().length}</span>`:''}</button>`).join('')}</nav><div class="sidebar-foot"><div class="sidebar-note">${icon('leaf')}<strong>Mỗi ngày một chút.</strong><p>Không cần hoàn hảo.<br>Chỉ cần tiếp tục.</p></div><div class="sidebar-tools"><img class="avatar avatar-photo" src="./assets/app-icon-192.png" alt="Tấn Phát" width="34" height="34"><span>Góc học cá nhân</span><button class="button ghost compact" data-action="navigate" data-page="settings" aria-label="Cài đặt">${icon('settings')}</button></div></div></aside><div class="content"><header class="topbar"><span class="topbar-title">${navItems.find(n=>n[0]===page)?.[2]||'Cài đặt góc học'}</span><span class="topbar-date">${dates}</span><div class="row gap-sm"><span class="goal-pill">${icon('clock')}30 phút mỗi ngày</span>${motionControl()}<button class="button ghost compact" data-action="navigate" data-page="settings" aria-label="Cài đặt và sao lưu">${icon('settings')}</button></div></header><main class="main" id="main">${!storageOkay?'<div class="notice">Tiến độ hiện chỉ giữ trong phiên này. Bạn có thể tải bản sao lưu trong Cài đặt.</div>':''}${startupNotice?`<div class="notice">${startupNotice}</div>`:''}${({home:renderHome,weeks:renderWeeks,vocab:renderVocab,grammar:renderGrammar,shadow:renderShadow,phat:()=>renderPhat({videos:state.videos,selectedId:selectedVideoId,esc,icon,button,title}),settings:renderSettings}[page]||renderHome)()}<p class="footer-note">Góc học của Tấn Phát · Tiến độ lưu trên trình duyệt này</p></main></div></div>`;
  syncOceanMotion();if(page==='shadow'){restoreRecording();updatePlayer();}if(page==='settings')refreshVoiceOptions();saveSession();focusAfterRender(focusSelector,previous);
}
function renderHome(){
  const p=parts(),finished=lessonDone(p),activeWeek=week(),courseDone=completionCount(state)===allLessons.length;
  const steps=[['vocab','book','Từ vựng','5 phút ôn + 5 phút học'],['grammar','pen','Ngữ pháp','5 phút · hiểu và áp dụng'],['shadow','headphones','Shadowing','10 phút · nghe và nói theo'],['apply','mic','Nói câu của Phát','5 phút · tự diễn đạt']];
  return `${title('Chào Phát, mình học nhé!','Một buổi học nhỏ, một bước tự tin hơn.')}${backupReminder()}${courseDone?`<section class="card course-finish"><h2>Bạn đã hoàn thành 4 tuần!</h2><p>Tiếp tục giữ vốn từ và thử nói lại những chủ đề quen thuộc.</p><div class="row">${button('Ôn từ đến hạn','review','primary')}${button('Luyện lại chủ đề','navigate','soft','data-page="weeks"')}</div></section>`:''}<div class="home-grid"><section class="card hero"><div class="hero-copy"><span class="eyebrow">TUẦN ${activeWeek.id} · ${esc(activeWeek.subtitle)}</span><h2>Mỗi ngày một chút,<br>tự tin thêm một câu.</h2><p>Hôm nay: ${esc(lesson().title)}<br>${esc(lesson().goal)}</p>${button(`${icon(finished?'check':'play')}${courseDone?'Ôn từ đến hạn':finished?'Học bài tiếp theo':resumePage()?'Tiếp tục chỗ đang học':partCount()?'Tiếp tục buổi học':'Bắt đầu học hôm nay'}`,courseDone?'review':finished?'next-lesson':'start','primary')}</div><div class="hero-portrait"><img src="./assets/app-portrait-512.jpg" alt="Tấn Phát English: đeo tai nghe và học tiếng Anh" width="512" height="512" fetchpriority="high"><span>Góc học của Phát</span></div></section><section class="card"><div class="row between"><h2>Buổi học của bạn</h2><span class="badge neutral">${partCount()}/4 phần</span></div><div class="progress-track" role="progressbar" aria-label="Tiến độ buổi học" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${partCount()}" style="margin:17px 0 23px"><div class="progress-fill" style="width:${partCount()*25}%"></div></div><div class="today-plan">${steps.map(([id,ic,label,meta])=>`<button class="plan-row" data-action="navigate" data-page="${id==='apply'?'shadow':id}" ${id==='apply'?'data-apply="true"':id==='vocab'?'data-study="true"':''}>${photoTag(photo(activityPhotos[id]),'activity-thumb','')}<div class="detail"><strong>${label}</strong><span>${meta}</span></div><span class="check-circle ${p[id]?'done':''}">${p[id]?icon('check'):''}</span></button>`).join('')}</div></section></div><section class="card week-strip"><div class="row between"><div><span class="eyebrow">CHỦ ĐỀ TUẦN ${activeWeek.id}</span><h2 style="margin-top:5px">${esc(activeWeek.title)}</h2></div>${button('Xem lộ trình','navigate','compact ghost','data-page="weeks"')}</div><div class="week-days">${activeWeek.days.map((d,i)=>`<button class="day-cell ${d.id===state.activeLesson?'current':''} ${lessonDone(state,d.id)?'done':''}" data-action="lesson" data-id="${d.id}" aria-label="Ngày ${i+1}: ${esc(d.title)}${lessonDone(state,d.id)?', đã hoàn thành':''}" ${d.id===state.activeLesson?'aria-current="step"':''}><span>Ngày ${i+1}</span><strong>${lessonDone(state,d.id)?'✓':i+1}</strong><small>${i===6?'Thử thách':i===5?'Ôn tập':d.id===state.activeLesson?'Đang học':'Bài học'}</small></button>`).join('')}</div></section><section class="real-life-section"><div class="row between"><div><span class="eyebrow">TIẾNG ANH TRONG CUỘC SỐNG</span><h2>Học để dùng trong những khoảnh khắc thật</h2></div></div><div class="photo-topics">${weeks.map(w=>`<button class="photo-topic" data-action="explore-week" data-id="${w.id}">${photoTag(photo(weekPhotos[w.id]))}<span><small>Tuần ${w.id}</small><strong>${esc(w.title)}</strong></span></button>`).join('')}</div></section><div class="quick-grid"><button class="quick" data-action="review"><div class="icon-box warm">${icon('repeat')}</div><div><strong>${due().length} từ đến hạn ôn</strong><small>Nhớ lại trước khi xem đáp án</small></div></button><button class="quick" data-action="navigate" data-page="weeks"><div class="icon-box blue">${icon('flag')}</div><div><strong>${completionCount(state)}/28 bài hoàn thành</strong><small>Tiến từng bước theo khả năng</small></div></button><div class="quick"><div class="icon-box purple">${icon('calendar')}</div><div><strong>${state.history.length} ngày hoàn thành buổi học</strong><small>Hôm nay cũng là một khởi đầu</small></div></div></div>`;
}
function renderWeeks(){const viewed=weeks.find(w=>w.id===weekView)||week();return `${title('Mỗi tuần, một chủ đề','Từ vựng, ngữ pháp và bài nói cùng hướng đến một mục tiêu.')}<div class="weeks-grid">${weeks.map(w=>{const count=w.days.filter(d=>lessonDone(state,d.id)).length;return `<section class="card week-card ${weekView===w.id?'selected':''}">${photoTag(photo(weekPhotos[w.id]),'week-cover')}<div class="row between"><span class="eyebrow">TUẦN ${w.id}</span><span class="badge ${week().id===w.id?'':'neutral'}">${week().id===w.id?'Đang học':`${count}/7 bài`}</span></div><h2>${esc(w.title)}</h2><p>${esc(w.goal)}</p><div class="progress-track" role="progressbar" aria-label="Tuần ${w.id}" aria-valuemin="0" aria-valuemax="7" aria-valuenow="${count}"><div class="progress-fill" style="width:${count/7*100}%"></div></div>${button('Xem 7 ngày học','week',weekView===w.id?'soft':'','data-id="'+w.id+'"')}</section>`;}).join('')}</div><section class="card lesson-list" id="week-lessons"><div class="row between"><h2>Tuần ${viewed.id} · ${esc(viewed.title)}</h2><span class="small muted">30 phút / ngày</span></div>${viewed.days.map((d,i)=>`<button class="lesson-button" data-action="lesson" data-id="${d.id}"><span class="lesson-thumb">${photoTag(lessonPhoto(d.id),'','')}<span>${lessonDone(state,d.id)?'✓':i+1}</span></span><span class="lesson-name"><strong>${esc(d.title)}</strong><small>${esc(d.goal)}</small></span>${d.id===state.activeLesson?'<span class="badge">Đang học</span>':icon('chevron')}</button>`).join('')}</section><p class="support-copy">Bạn có thể học lại hoặc chọn bài phù hợp. Độ hỗ trợ giảm dần theo kết quả luyện tập, không tự tăng cấp chỉ vì đã qua một tuần.</p>`;}
function renderVocab(){
  const done=vocabIndex>=queue.length,w=queue[vocabIndex];
  return `${title('Từ nhỏ, dùng được ngay','Học theo cụm từ. Nhớ lại rồi mới mở đáp án.')} ${lessonLabel()}${reviewFirst?`<div class="resume-banner"><div><strong>Ôn trước, học mới sau</strong><p>Ôn tối đa 10 cụm từ đến hạn trong lượt này, rồi tiếp tục bài hôm nay.</p></div>${button('Bỏ qua lượt ôn','skip-review','ghost')}</div>`:''}<div class="segment" role="group" aria-label="Chế độ từ vựng"><button class="${vocabMode==='learn'?'active':''}" data-action="vocab-mode" data-mode="learn" aria-pressed="${vocabMode==='learn'}">Từ trong bài hôm nay</button><button class="${vocabMode==='review'?'active':''}" data-action="vocab-mode" data-mode="review" aria-pressed="${vocabMode==='review'}">Ôn từ đến hạn (${due().length})</button></div><div class="learning-layout"><section>${done?`<div class="card empty">${icon('check')}<h2>${queue.length?'Đã học hết lượt này!':'Chưa có từ đến hạn ôn'}</h2><p class="muted small">${queue.length?'Từ chưa nhớ sẽ trở lại sau 10 phút. Từ đã nhớ sẽ được hẹn ôn vào những ngày sau.':'Học từ mới trong bài hôm nay, rồi quay lại khi đến lịch ôn.'}</p><div class="row">${button('Học lại lượt này','restart-vocab','soft')}${button(vocabMode==='learn'?'Tiếp tục ngữ pháp':'Tiếp tục bài hôm nay',vocabMode==='learn'?'navigate':'continue-study','primary',vocabMode==='learn'?'data-page="grammar"':'')}</div></div>`:`<div class="row between small muted" style="margin-bottom:13px"><span>${vocabMode==='review'?'Ôn tập':'Từ vựng hôm nay'}</span><span>${vocabIndex+1} / ${queue.length}</span></div><div class="card flashcard"><span class="eyebrow">${revealed?'CÙNG DÙNG TRONG MỘT CÂU':'BẠN NHỚ CỤM NÀY NGHĨA LÀ GÌ?'}</span><div class="word" lang="en">${esc(w.en)}</div>${button(`${icon('volume')}Nghe phát âm`,'speak-word','ghost')}${revealed?`<div class="word-reveal"><div class="meaning">${esc(w.vi)}</div><p class="example" lang="en">${esc(w.example)}</p><p class="small muted">${esc(w.translation)}</p>${button('Nghe câu ví dụ','speak-example','compact ghost')}</div>`:button('Hiện nghĩa và ví dụ','reveal','primary')}</div>${revealed?`<div class="rating-row">${button('Chưa nhớ','rate-word','','data-rating="again"')}${button('Còn hơi khó','rate-word','','data-rating="hard"')}${button('Đã nhớ','rate-word','primary','data-rating="good"')}</div>`:'<p class="support-copy" style="text-align:center">Thử nói nghĩa hoặc đặt một câu trước khi mở đáp án.</p>'}`}</section><aside class="card" style="align-self:start">${sceneFigure(lesson())}<h3>${vocabMode==='review'?'Lượt ôn này':'Cụm từ trong bài'}</h3><div class="word-list">${queue.map((v,i)=>`<button data-action="word-select" data-index="${i}" class="${i===vocabIndex?'active':''}"><span lang="en">${esc(v.en)}</span><small>${vocabVisited.has(i)?'✓':''}</small></button>`).join('')}</div><div class="divider"></div><p class="small muted">Lịch ôn dựa trên mức bạn ghi nhớ. Hãy chọn “Chưa nhớ” nếu vừa phải xem lại đáp án.</p><p class="support-copy">${Object.keys(state.vocab).length} cụm từ trong sổ tay</p></aside></div>`;
}
function renderGrammar(){
  const g=lesson().grammar,q=g.questions[quizIndex],answered=quizAnswer!==null,correct=isCorrectAnswer(q,quizAnswer);
  const question=g.questions[quizIndex];
  const options=question.type==='fill'
    ? '<form id="fill-answer-form"><label class="field" for="fill-answer">Điền từ hoặc cụm từ còn thiếu<input id="fill-answer" type="text" maxlength="300" autocomplete="off" spellcheck="false" lang="en" value="'+esc(answered?quizAnswer:quizDraft)+'" '+(answered?'disabled':'')+'></label>'+(!answered?'<button class="button primary" type="submit">Kiểm tra đáp án</button>':'')+'</form>'
    : '<div class="quiz-options">'+q.options.map((option,i)=>'<button class="quiz-option '+(answered?(i===q.answer?'correct':i===quizAnswer?'wrong':''):'')+'" data-action="answer" data-index="'+i+'" '+(answered?'disabled':'')+'><span class="letter">'+String.fromCharCode(65+i)+'</span><span lang="en">'+esc(option)+'</span>'+(answered&&i===q.answer?icon('check'):'')+'</button>').join('')+'</div>';
  const writing=g.writing?'<section class="card stack writing-practice"><h2>Tự viết theo tình huống</h2><p>'+esc(g.writing.prompt)+'</p><label class="field" for="writing-answer">Câu trả lời của bạn<textarea id="writing-answer" rows="4" maxlength="4000" lang="en" placeholder="Viết câu của bạn tại đây…">'+esc(writingDraft)+'</textarea></label><p class="small muted">Tự lưu khi bạn viết. Phần này để tự đối chiếu, chưa chấm điểm tự động.</p><ul>'+g.writing.checklist.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>'+button(showWritingSample?'Ẩn bài mẫu':'Xem bài mẫu để đối chiếu','writing-sample','soft','aria-expanded="'+showWritingSample+'"')+(showWritingSample?'<div class="feedback" lang="en">'+esc(g.writing.sampleAnswer)+'</div>':'')+'</section>':'';
  let quiz;
  if(quizFinished){quiz='<div class="empty">'+icon(quizScore>=2?'check':'repeat')+'<h2>'+(quizScore>=2?'Bạn đã nắm được mẫu câu!':'Mình luyện thêm một lượt nhé')+'</h2><p class="muted">Đúng '+quizScore+'/'+g.questions.length+' câu. '+(quizScore>=2?'Bây giờ dùng mẫu này khi nói.':'Đọc lại ví dụ và giải thích rồi thử lại.')+'</p><div class="row">'+button('Làm lại','retry-quiz','soft')+(quizScore>=2?button('Luyện nghe và nói','navigate','primary','data-page="shadow"'):'')+'</div></div>';}
  else{quiz='<div class="row between"><h3>Thử áp dụng</h3><span class="small muted">Câu '+(quizIndex+1)+'/'+g.questions.length+'</span></div><p class="quiz-prompt">'+esc(q.prompt)+'</p>'+options+(answered?'<div class="feedback '+(!correct?'error':'')+'" role="status"><strong>'+(correct?'Đúng rồi!':'Cùng xem lại nhé.')+'</strong> '+esc(q.explanation)+(q.type==='fill'?' <span lang="en">'+esc(q.answers[0])+'</span>':'')+'</div><div class="completion-actions">'+button(quizIndex===g.questions.length-1?'Xem kết quả':'Câu tiếp theo','next-question','primary')+'</div>':'');}
  return title('Hiểu một mẫu, nói nhiều câu','Ngữ pháp ngắn gọn, gắn với điều bạn muốn nói.')+lessonLabel()+'<div class="learning-layout"><div class="stack"><section class="card stack"><div class="row between"><h2>'+esc(g.title)+'</h2><span class="badge">Mẫu câu hôm nay</span></div><p class="small muted">'+esc(g.explanation)+'</p><div class="formula" lang="en">'+esc(g.formula)+'</div><div>'+g.examples.map(ex=>'<div class="example-line"><strong lang="en">'+esc(ex.en)+'</strong><span>'+esc(ex.vi)+'</span></div>').join('')+'</div></section><section class="card" id="quiz">'+quiz+'</section>'+writing+'</div><aside class="card" style="align-self:start">'+sceneFigure(lesson())+'<h3>Gắn với cuộc sống của Phát</h3><p class="support-copy">'+esc(g.challenge)+'</p><div class="divider"></div><p class="small muted">Đúng ít nhất 2/3 câu để hoàn thành phần này. Kết quả được lưu trong tiến độ của bạn.</p>'+(parts().grammar?'<p class="success-badge">'+icon('check')+'Đã hoàn thành phần này</p>':'')+'</aside></div>';
}

function renderShadow(){const sh=lesson().shadow,line=sh.lines[lineIndex];const support=supportLevel();return `${title('Nghe một câu. Nói theo một câu.','Bắt nhịp với câu mẫu, rồi nói thành câu của chính mình.')} ${lessonLabel()}<div class="learning-layout"><div><section class="card"><div class="row between" style="margin-bottom:22px"><h2>${esc(sh.title)}</h2><span class="support-tag">${{guided:'Có hướng dẫn',balanced:'Giảm gợi ý',independent:'Tự tin thử sức'}[support]}</span></div><div class="card shadow-stage"><div class="sentence-count" id="line-count">CÂU ${lineIndex+1} / ${sh.lines.length}</div><p class="sentence" id="shadow-sentence" lang="en">${showEnglish?esc(line.en):'Nghe và thử nói không nhìn lời thoại'}</p><p class="translation" id="shadow-translation" ${showVietnamese?'':'hidden'}>${esc(line.vi)}</p><div class="audio-controls">${button(icon('back'),'prev-line','',`aria-label="Câu trước" ${lineIndex===0?'disabled':''}`)}${button(`${icon('play')}Nghe câu này`,'play-line','primary','id="play-line"')}${button(icon('chevron'),'next-line','',`aria-label="Câu tiếp theo" ${lineIndex===sh.lines.length-1?'disabled':''}`)}</div></div><div class="support-choice"><label class="field" for="support-select">Mức hỗ trợ<select class="select" id="support-select">${[['auto','Gợi ý theo lượt luyện'],['guided','Giữ cả lời thoại và nghĩa'],['balanced','Chỉ lời thoại tiếng Anh'],['independent','Tự luyện, không lời thoại']].map(([key,label])=>`<option value="${key}" ${state.preferences.shadowSupport===key?'selected':''}>${label}</option>`).join('')}</select></label><p class="small muted">Bạn quyết định mức hỗ trợ. Gợi ý chỉ giảm sau ba lượt luyện tốt với ít lời thoại hơn.</p></div><div class="player-options"><div class="row gap-sm"><label for="speech-rate" class="small muted">Tốc độ</label><select class="select" id="speech-rate" aria-label="Tốc độ đọc">${[.7,.85,1].map(r=>`<option value="${r}" ${state.preferences.rate===r?'selected':''}>${r===.7?'0.7× · Chậm':r===.85?'0.85× · Vừa':'1× · Tự nhiên'}</option>`).join('')}</select>${button(`${icon('play')}Nghe cả đoạn`,'play-all','compact ghost')}</div><label class="toggle"><input id="loop" type="checkbox" ${loop?'checked':''}>Lặp câu</label></div><div class="player-options"><label class="toggle"><input id="show-english" type="checkbox" ${showEnglish?'checked':''}>Lời thoại tiếng Anh</label><label class="toggle"><input id="show-vietnamese" type="checkbox" ${showVietnamese?'checked':''}>Nghĩa tiếng Việt</label></div><div class="transcript" id="transcript" ${showEnglish?'':'hidden'}>${sh.lines.map((l,i)=>`<button class="transcript-line ${i===lineIndex?'current':''}" data-action="line" data-index="${i}"><span class="num">${String(i+1).padStart(2,'0')}</span><span><span lang="en">${esc(l.en)}</span><small ${showVietnamese?'':'hidden'}>${esc(l.vi)}</small></span></button>`).join('')}</div><div class="divider"></div><div class="row between"><span class="small muted">Bạn cảm thấy đoạn này thế nào?</span></div><div class="self-rating" style="margin-top:12px">${[['hard','Hơi khó'],['okay','Vừa sức'],['easy','Dễ rồi']].map(([key,label])=>button(label,'shadow-rating','',`data-rating="${key}" aria-pressed="${shadowRating===key}"`)).join('')}</div><div class="completion-actions">${parts().shadow?`<span class="success-badge">${icon('check')}Đã luyện shadowing</span>`:button('Đã luyện xong đoạn này','complete-shadow','primary',shadowRating?'':'disabled')}</div></section><section class="card recording-section" id="apply-section"><div class="row between"><h2>Nói câu của Phát</h2>${photoTag(photo('speaking'),'activity-thumb','')}</div><p class="small muted" style="margin:15px 0">${esc(sh.prompt)}</p><details><summary class="small" style="cursor:pointer;color:var(--green)">Xem gợi ý mở đầu</summary><p lang="en" class="feedback">${esc(sh.hint)}</p></details>${support==='independent'?`<div class="feedback"><strong>Thử thêm một chút</strong><p lang="en">${esc(sh.stretch)}</p></div>`:''}<div class="row" style="margin-top:20px">${button(`${icon('mic')}Thu âm câu của tôi`,'record','soft','id="record-button"')}${button(`${icon('download')}Tải bản thu`,'download-recording','compact ghost','id="download-recording" hidden')}</div><p class="record-status" id="record-status" aria-live="polite">Bản thu gần nhất của bài được lưu trên trình duyệt này.</p><audio id="recording-audio" controls hidden aria-label="Nghe bản thu của Phát"></audio><p class="support-copy">Bạn có thể nói trực tiếp nếu không muốn thu âm. Phần này tự đánh giá, không chấm điểm phát âm tự động.</p><div class="completion-actions">${parts().apply?`<span class="success-badge">${icon('check')}Đã tự nói theo chủ đề</span>`:button('Tôi đã tự nói xong','complete-apply','primary')}${lessonDone(parts())?button(completionCount(state)===allLessons.length?'Xem hành trình đã hoàn thành':'Bài học tiếp theo','next-lesson','soft'):''}</div></section></div><aside class="card" style="align-self:start">${sceneFigure(lesson())}<h3>10 phút luyện nói theo</h3><div class="practice-step"><span class="step">1</span><div><strong>Nghe để hiểu</strong><p class="small muted">Nghe cả đoạn một lần, xem nghĩa khi cần.</p></div></div><div class="practice-step"><span class="step">2</span><div><strong>Nói bám theo</strong><p class="small muted">Nói gần đồng thời, trễ một nhịp nhỏ. Chú ý nhịp và trọng âm.</p></div></div><div class="practice-step"><span class="step">3</span><div><strong>Thử bỏ lời thoại</strong><p class="small muted">Nghe lại và nói khi đã quen. Bạn luôn có thể mở lại gợi ý.</p></div></div><div class="divider"></div><p class="small muted">Âm thanh dùng giọng tiếng Anh có trên thiết bị. Chọn giọng trong Cài đặt.</p>${button('Chọn giọng đọc','navigate','compact ghost','data-page="settings"')}</aside></div>`;}
function renderSettings(){return `${title('Góc học của riêng Phát','Điều chỉnh giọng đọc và giữ lại hành trình học của bạn.')}<div class="settings-grid">${renderVideoManager({videos:state.videos,selectedId:selectedVideoId,esc,icon})}<section class="card stack"><h2>Giọng đọc tiếng Anh</h2><label class="field">Giọng trên thiết bị<select class="select" id="voice-select"><option value="">Tự chọn giọng tiếng Anh</option></select></label><p class="small muted">Danh sách tùy thiết bị và trình duyệt. Nếu chưa nghe được, thử mở bằng Chrome hoặc Edge và kiểm tra âm lượng.</p>${button(`${icon('volume')}Nghe thử`,'voice-test','soft')}</section><section class="card stack"><h2>Tiến độ và bản sao lưu</h2><p class="small muted">Tiến độ lưu trên trình duyệt hiện tại, chưa tự đồng bộ giữa điện thoại và máy tính. Tải bản sao lưu trước khi đổi thiết bị hoặc xóa dữ liệu trình duyệt.</p><div class="row">${button(`${icon('download')}Tải bản sao lưu`,'export','primary')}${button('Khôi phục bản sao lưu','import','')}<input type="file" id="import-file" accept="application/json,.json" hidden></div><p class="small muted">Bản sao lưu chứa tiến độ, bài đang làm dở, câu đã viết, lịch ôn từ, danh sách video và tùy chọn sóng nước. Bản thu âm tải riêng tại mỗi bài. ${state.lastBackupAt?`Lần tạo bản sao lưu gần nhất: ${new Date(state.lastBackupAt).toLocaleDateString('vi-VN')}.`:'Bạn chưa tạo bản sao lưu.'}</p></section><section class="card stack"><h2>Lộ trình đang dùng</h2><p class="small muted">4 tuần · 28 bài · 30 phút/ngày. Khởi đầu bằng câu giao tiếp cơ bản. Từ đến hạn được ưu tiên trước bài mới. Bạn có thể tiếp tục đúng chỗ đang học dở và tự chọn mức gợi ý khi luyện nói. Đây là hỗ trợ học cá nhân, không phải kết quả xếp hạng CEFR.</p></section><section class="card stack"><h2>Hình ảnh trong góc học</h2><p class="small muted">Biểu tượng Tấn Phát English do bạn cung cấp. Ảnh tình huống từ các nhiếp ảnh gia trên Unsplash.</p><details class="photo-credits"><summary>Nguồn ảnh và tác giả</summary><ul>${photoCredits.map(p=>`<li><a href="${esc(p.sourcePage)}" target="_blank" rel="noopener noreferrer">${esc(p.alt)}</a> · ${esc(p.photographer)}</li>`).join('')}</ul></details></section></div>`;}

app.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');if(!el)return;event.preventDefault();const action=el.dataset.action;
  if(action==='navigate'){saveSession();navigate(el.dataset.page);if(el.dataset.apply)document.getElementById('apply-section')?.scrollIntoView({behavior:'smooth'});}
  else if(action==='motion-toggle'){
    if(reducedMotion.matches)return;
    state={...state,preferences:{...state.preferences,oceanMotion:!state.preferences.oceanMotion}};
    persist();syncOceanMotion();
  }
  else if(action==='video-select'){
    if(!state.videos.some(video=>video.id===el.dataset.id)||(page==='phat'&&selectedVideoId===el.dataset.id))return;
    selectedVideoId=el.dataset.id;navigate('phat');
  }
  else if(action==='video-remove'){
    const target=state.videos.find(video=>video.id===el.dataset.id);if(!target)return;
    if(!confirm('Gỡ “'+target.title+'” khỏi danh sách? Video gốc trên YouTube vẫn được giữ.'))return;
    state={...state,videos:state.videos.filter(video=>video.id!==target.id)};
    if(selectedVideoId===target.id)selectedVideoId=state.videos[0]?.id;
    render('.video-library h2');
    toast('Đã gỡ video khỏi danh sách.');
  }
  else if(action==='start')beginStudy();
  else if(action==='next-lesson')nextLesson();
  else if(action==='lesson')selectLesson(el.dataset.id);
  else if(action==='explore-week'){weekView=Number(el.dataset.id);navigate('weeks');document.getElementById('week-lessons')?.scrollIntoView({behavior:'smooth',block:'start'});}
  else if(action==='week'){weekView=Number(el.dataset.id);render();document.getElementById('week-lessons')?.scrollIntoView({behavior:'smooth',block:'start'});}
  else if(action==='review'){reviewFirst=false;vocabMode='review';startQueue();navigate('vocab');}
  else if(action==='vocab-mode'){vocabMode=el.dataset.mode;reviewFirst=false;startQueue();render('.word');}
  else if(action==='skip-review'||action==='continue-study'){reviewDoneOn=localDay();reviewFirst=false;vocabMode='learn';startQueue();beginStudy(true);}
  else if(action==='restart-vocab'){startQueue();render('.word');}
  else if(action==='reveal'){revealed=true;render('.meaning');}
  else if(action==='word-select'){stopAudio();vocabIndex=Number(el.dataset.index);revealed=false;render('.word');}
  else if(action==='speak-word')say(queue[vocabIndex]?.en);
  else if(action==='speak-example')say(queue[vocabIndex]?.example);
  else if(action==='rate-word'){
    const word=queue[vocabIndex];if(!word||!revealed)return;const id=getCardId(word);
    state={...state,vocab:{...state.vocab,[id]:reviewCard(state.vocab[id],el.dataset.rating)}};vocabVisited.add(vocabIndex);
    if(vocabMode==='learn'&&vocabVisited.size===queue.length)complete('vocab');
    if(vocabMode==='review'&&vocabVisited.size===queue.length)reviewDoneOn=localDay();
    let next=queue.findIndex((_,i)=>i>vocabIndex&&!vocabVisited.has(i));if(next<0)next=queue.findIndex((_,i)=>!vocabVisited.has(i));
    vocabIndex=next<0?queue.length:next;revealed=false;stopAudio();render(vocabIndex<queue.length?'.word':'.empty h2');
  }
  else if(action==='answer')submitAnswer(Number(el.dataset.index));
  else if(action==='next-question'){
    if(quizAnswer===null)return;
    if(quizIndex===lesson().grammar.questions.length-1){quizFinished=true;if(!quizAttemptSaved){state=recordAttempt(state,'grammar',quizScore/lesson().grammar.questions.length,0);quizAttemptSaved=true;}if(quizScore>=2)complete('grammar');}
    else{quizIndex++;quizAnswer=quizAnswers[quizIndex]??null;quizDraft='';}
    render('#quiz h3, #quiz h2');document.getElementById('quiz')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  else if(action==='retry-quiz'){quizIndex=0;quizAnswer=null;quizAnswers=lesson().grammar.questions.map(()=>null);quizScore=0;quizFinished=false;quizAttemptSaved=false;quizDraft='';render('#quiz h3');}
  else if(action==='writing-sample'){showWritingSample=!showWritingSample;render();}
  else if(action==='line'||action==='prev-line'||action==='next-line'){stopAudio();lineIndex=action==='line'?Number(el.dataset.index):Math.max(0,Math.min(lesson().shadow.lines.length-1,lineIndex+(action==='next-line'?1:-1)));updatePlayer();saveSession();}
  else if(action==='play-line'){if(speaking)stopAudio();else playShadow(false);}
  else if(action==='play-all'){if(speaking)stopAudio();lineIndex=0;playShadow(true);}
  else if(action==='shadow-rating'){shadowRating=el.dataset.rating;app.querySelectorAll('[data-action="shadow-rating"]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));const b=app.querySelector('[data-action="complete-shadow"]');if(b)b.disabled=false;saveSession();}
  else if(action==='complete-shadow'){
    if(!shadowRating||shadowAttemptSaved)return;
    const score={hard:.4,okay:.75,easy:1}[shadowRating];
    const hints=shadowHasPlayed?Number(usedEnglish)+Number(usedVietnamese):2;
    state=recordAttempt(state,'shadow',score,hints);shadowAttemptSaved=true;complete('shadow');stopRecording();stopAudio();render('#apply-section h2');toast('Đã lưu. Bây giờ thử tự nói theo chủ đề nhé!');
  }
  else if(action==='complete-apply'){complete('apply');stopRecording();stopAudio();render('#apply-section h2');}
  else if(action==='record')toggleRecording();
  else if(action==='download-recording'){if(recordUrl)download(recordUrl,state.activeLesson+'-tan-phat.'+(recordMime.includes('mp4')?'m4a':recordMime.includes('ogg')?'ogg':'webm'),false);}
  else if(action==='voice-test')say('Hello, Phat. A little practice every day makes a difference.');
  else if(action==='import')document.getElementById('import-file').click();
  else if(action==='export'){
    saveSession();state={...state,lastBackupAt:new Date().toISOString()};persist();
    download(URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),'tan-phat-tien-do-'+localDay()+'.json');render();toast('Đã tạo bản sao lưu. Hãy giữ file đã tải ở nơi dễ tìm.');
  }
  else if(action==='backup-later'){state={...state,backupDismissedUntil:new Date(Date.now()+7*86400000).toISOString()};render('h1');}
});
function submitAnswer(answer){
  if(quizAnswer!==null||quizFinished)return;
  if(typeof answer==='string'&&!answer.trim()){toast('Hãy điền câu trả lời trước khi kiểm tra.');return;}
  quizAnswer=answer;quizAnswers[quizIndex]=answer;quizDraft='';
  quizScore=lesson().grammar.questions.reduce((sum,q,i)=>sum+Number(isCorrectAnswer(q,quizAnswers[i])),0);
  render('#quiz .feedback');document.getElementById('quiz')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}
app.addEventListener('submit',event=>{
  if(event.target.id==='fill-answer-form'){event.preventDefault();submitAnswer(document.getElementById('fill-answer').value.trim());}
  if(event.target.id==='video-add-form'){
    event.preventDefault();
    const input=document.getElementById('video-url'),titleInput=document.getElementById('video-title'),status=document.getElementById('video-form-status');
    const raw=input.value.trim();
    const link=/^(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\//i.test(raw)?'https://'+raw:raw;
    if(!parseYouTubeUrl(link)){status.textContent='Link này chưa hợp lệ. Hãy dán đường link video hoặc Shorts từ YouTube.';input.setAttribute('aria-invalid','true');input.focus();return;}
    const result=addVideo(state.videos,link,titleInput.value);
    if(!result){status.textContent='Danh sách đã đủ 100 video. Gỡ một video trước khi thêm mới.';return;}
    state={...state,videos:result.videos};selectedVideoId=result.video.id;
    navigate('phat');toast(result.added?'Đã thêm video vào góc của Phát.':'Video đã có trong danh sách. Mình đã mở lại cho bạn.');
  }
});
app.addEventListener('input',event=>{
  if(event.target.id==='video-url'){event.target.removeAttribute('aria-invalid');document.getElementById('video-form-status').textContent='';}
  if(event.target.id==='writing-answer'){writingDraft=event.target.value.slice(0,4000);saveSession();}
  if(event.target.id==='fill-answer'){quizDraft=event.target.value.slice(0,300);saveSession();}
});
app.addEventListener('change',async event=>{
 const el=event.target;
 if(el.id==='speech-rate'){state={...state,preferences:{...state.preferences,rate:Number(el.value)}};saveSession();stopAudio();}
 if(el.id==='loop')loop=el.checked;
 if(el.id==='show-english'||el.id==='show-vietnamese'){
   if(el.id==='show-english')showEnglish=el.checked;else showVietnamese=el.checked;
   if(speaking){usedEnglish ||= showEnglish;usedVietnamese ||= showVietnamese;}updatePlayer();saveSession();
 }
 if(el.id==='support-select'){state={...state,preferences:{...state.preferences,shadowSupport:el.value}};stopAudio();applySupport();render('#support-select');}
 if(el.id==='voice-select'){state={...state,preferences:{...state.preferences,voice:el.value}};saveSession();stopAudio();}
 if(el.id==='import-file'){
   const file=el.files?.[0];if(!file)return;
   try{
     if(file.size>1_000_000)throw Error();const clean=sanitizeState(JSON.parse(await file.text()));if(!clean)throw Error();
     if(!confirm('Khôi phục sẽ thay tiến độ hiện tại bằng bản sao lưu này. Bạn muốn tiếp tục?')){el.value='';return;}
     stopAudio();stopRecording();state=clean;selectedVideoId=state.videos[0]?.id;startupNotice='';page=state.lastPage;weekView=Number(state.activeLesson[1]);restoreSession();render('h1');toast('Đã khôi phục tiến độ và bài đang học dở.');
   }catch{toast('File chưa đúng định dạng sao lưu của Tấn Phát. Tiến độ hiện tại được giữ nguyên.');el.value='';}
 }
});

function download(url,name,revoke=true){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();if(revoke)setTimeout(()=>URL.revokeObjectURL(url),2000);}
function voices(){voiceList=window.speechSynthesis?.getVoices().filter(v=>/^en(?:-|_)/i.test(v.lang))||[];return voiceList;}
function refreshVoiceOptions(){const select=document.getElementById('voice-select');if(!select)return;select.innerHTML='<option value="">Tự chọn giọng tiếng Anh</option>'+voices().map(v=>`<option value="${esc(v.voiceURI)}" ${v.voiceURI===state.preferences.voice?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('');}
function stopAudio(){speechToken++;window.speechSynthesis?.cancel();speaking=false;updatePlayer();}
function say(text,onDone,onStart){if(!text)return;if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){toast('Trình duyệt này chưa hỗ trợ đọc câu mẫu. Hãy mở bằng Chrome hoặc Edge.');return;}stopAudio();const token=speechToken;const utterance=new SpeechSynthesisUtterance(text);const list=voices();utterance.voice=list.find(v=>v.voiceURI===state.preferences.voice)||list.find(v=>v.lang==='en-US')||list[0]||null;utterance.lang=utterance.voice?.lang||'en-US';utterance.rate=state.preferences.rate;utterance.onstart=()=>{if(token!==speechToken)return;speaking=true;updatePlayer();onStart?.();};utterance.onend=()=>{if(token!==speechToken)return;speaking=false;updatePlayer();onDone?.();};utterance.onerror=e=>{if(token!==speechToken||e.error==='canceled'||e.error==='interrupted')return;speaking=false;updatePlayer();toast('Chưa phát được âm thanh. Kiểm tra âm lượng hoặc đổi giọng đọc trong Cài đặt.');};try{speechSynthesis.speak(utterance);}catch{toast('Không mở được giọng đọc trên thiết bị này.');}}
function playShadow(all){const id=state.activeLesson;updatePlayer();saveSession();say(lesson().shadow.lines[lineIndex].en,()=>{if(page!=='shadow'||state.activeLesson!==id)return;if(all&&lineIndex<lesson().shadow.lines.length-1){lineIndex++;playShadow(true);}else if(loop&&!all)playShadow(false);},trackShadowUse);}
function updatePlayer(){if(page!=='shadow')return;const lines=lesson().shadow.lines,l=lines[lineIndex];const sentence=document.getElementById('shadow-sentence');if(!sentence)return;sentence.textContent=showEnglish?l.en:'Nghe và thử nói không nhìn lời thoại';const count=document.getElementById('line-count');count.textContent=`CÂU ${lineIndex+1} / ${lines.length}`;const translation=document.getElementById('shadow-translation');translation.textContent=l.vi;translation.hidden=!showVietnamese;document.getElementById('transcript').hidden=!showEnglish;app.querySelectorAll('.transcript-line').forEach((el,i)=>{el.classList.toggle('current',i===lineIndex);el.querySelector('small').hidden=!showVietnamese;});const play=document.getElementById('play-line');play.innerHTML=icon(speaking?'pause':'play')+(speaking?'Dừng đọc':'Nghe câu này');app.querySelector('[data-action="prev-line"]').disabled=lineIndex===0;app.querySelector('[data-action="next-line"]').disabled=lineIndex===lines.length-1;}

let dbPromise;
function recordingDB(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('tan-phat-recordings',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('recordings'))r.result.createObjectStore('recordings');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return dbPromise;}
async function saveRecording(id,blob){const db=await recordingDB();await new Promise((resolve,reject)=>{const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').put(blob,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function getRecording(id){const db=await recordingDB();return new Promise((resolve,reject)=>{const req=db.transaction('recordings').objectStore('recordings').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function restoreRecording(){const token=++loadRecordToken,id=state.activeLesson;if(recording||recordPending){setRecordingUI();return;}try{const blob=await getRecording(id);if(token!==loadRecordToken||page!=='shadow'||id!==state.activeLesson||recording)return;if(blob)showRecording(blob);}catch{/* Recording remains optional when browser storage is unavailable. */}}
function showRecording(blob){if(recordUrl)URL.revokeObjectURL(recordUrl);recordUrl=URL.createObjectURL(blob);recordMime=blob.type;const audio=document.getElementById('recording-audio');if(audio){audio.src=recordUrl;audio.hidden=false;document.getElementById('download-recording').hidden=false;}}
function setRecordingUI(){const b=document.getElementById('record-button'),s=document.getElementById('record-status');if(!b||!s)return;b.disabled=recordPending;b.classList.toggle('danger',recording);b.innerHTML=icon(recording?'pause':'mic')+(recordPending?'Đang mở micro…':recording?'Dừng và lưu bản thu':'Thu âm câu của tôi');s.classList.toggle('is-recording',recording);if(recording)s.textContent=`Đang thu · ${Math.floor((Date.now()-recordStarted)/1000)} giây. Tự dừng sau 2 phút.`;}
async function toggleRecording(){if(recordPending)return;if(recording){stopRecording();return;}if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Thu âm cần trình duyệt hỗ trợ micro và kết nối HTTPS. Bạn vẫn có thể luyện nói trực tiếp.');return;}const id=state.activeLesson;recordPending=true;setRecordingUI();try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(page!=='shadow'||id!==state.activeLesson){stream.getTracks().forEach(t=>t.stop());return;}mediaStream=stream;stopAudio();const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));const recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);mediaRecorder=recorder;const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:recorder.mimeType||type||'audio/webm'});if(!blob.size)return;try{await saveRecording(id,blob);if(page==='shadow'&&state.activeLesson===id)document.getElementById('record-status').textContent='Đã lưu bản thu. Nghe lại và thử nói tự nhiên hơn.';}catch{toast('Bản thu chưa lưu lâu dài được. Hãy tải xuống để giữ lại.');}if(page==='shadow'&&state.activeLesson===id)showRecording(blob);};recorder.onerror=()=>{stopRecording();toast('Micro gặp lỗi. Bạn có thể thử thu lại.');};recorder.start();recordStarted=Date.now();recording=true;recordInterval=setInterval(()=>{if(Date.now()-recordStarted>=120000)stopRecording();else setRecordingUI();},500);}catch(e){mediaStream?.getTracks().forEach(t=>t.stop());mediaStream=null;toast(e.name==='NotAllowedError'?'Bạn chưa cho phép micro. Có thể cấp quyền lại hoặc luyện nói trực tiếp.':'Chưa mở được micro. Kiểm tra thiết bị và thử lại.');}finally{recordPending=false;setRecordingUI();}}
function stopRecording(){if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop();mediaStream?.getTracks().forEach(t=>t.stop());mediaStream=null;recording=false;clearInterval(recordInterval);setRecordingUI();}
window.addEventListener('pagehide',()=>{saveSession();stopAudio();stopRecording();});
document.addEventListener('visibilitychange',()=>{syncOceanMotion();if(document.visibilityState==='hidden')saveSession();});
reducedMotion.addEventListener('change',syncOceanMotion);
window.addEventListener('error',()=>toast('Có lỗi khi mở bài. Hãy tải lại trang; tiến độ đã lưu vẫn được giữ.'));
window.speechSynthesis?.addEventListener('voiceschanged',()=>{voices();refreshVoiceOptions();});
restoreSession();render();

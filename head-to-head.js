'use strict';
// Verified head-to-head stats are derived from confirmed league matches and title-series scores.
// No storage mutation. Historical records without individual opponents are not inferred.
let h2hFocus='k:佐野',h2hOpponent='',h2hScope='all',h2hLeague='all',h2hTitle='all',h2hExpand=false;
function h2hEvents(){
 const events=[],errors=[],matches=new Map();
 const typeOf=m=>m.outcome==='pending'?'pending':m.outcome==='draw'?'draw':
  (m.winnerId&&(m.winnerId===m.playerAId||m.winnerId===m.playerBId))?'completed':'invalid';
 for(const m of db.matches){
  const a=careerKeyForId(m.playerAId),b=careerKeyForId(m.playerBId);
  if(!a||!b||a===b||!normalize(m.round)||!normalize(m.term)){errors.push('対戦の選手または回戦を確認');continue;}
  const [lo,hi]=[a,b].sort();
  const key=JSON.stringify([m.league,normalize(m.term),normalize(m.round),lo,hi]);
  const old=matches.get(key);
  if(old){
   const prev=typeOf(old),curr=typeOf(m);
   if((prev==='completed'||prev==='draw') && curr!=='completed'&&curr!=='draw')continue;
   if((curr==='completed'||curr==='draw') && prev!=='completed'&&prev!=='draw'){matches.set(key,m);continue;}
   if(timeVal(old)>=timeVal(m))continue;
  }
  matches.set(key,m);
 }
 for(const m of matches.values()){
  const status=typeOf(m);if(status==='pending')continue;
  if(status==='invalid'){errors.push('未確定の対戦結果');continue;}
  const a=careerKeyForId(m.playerAId),b=careerKeyForId(m.playerBId),isDraw=status==='draw',win=careerKeyForId(m.winnerId);
  const aW=isDraw?0:win===a?1:0,bW=isDraw?0:win===b?1:0;
  events.push({type:'league',category:m.league,label:leagueDisplay(m.league,m.term),term:normalize(m.term),round:normalize(m.round),
    a,b,aW,bW,draw:isDraw?1:0,seriesWinner:null,seriesCount:0,forfeit:m.outcome==='forfeit'});
 }
 const seriesKeys=new Set();
 for(const group of TITLE_SERIES_REFERENCE)for(const [term,winner,score,loser] of group.rows){
  const id=JSON.stringify([group.title,term]);
  if(seriesKeys.has(id)){errors.push(`重複タイトル記録 ${group.title} 第${term}期`);continue;}
  seriesKeys.add(id);
  const m=/^(\d+)-(\d+)$/.exec(score),a='k:'+histKey(winner),b='k:'+histKey(loser);
  if(!m||!winner||!loser||winner==='未確認'||loser==='未確認'||a===b||+m[1]<=+m[2]){errors.push(`要確認 ${group.title} 第${term}期`);continue;}
  events.push({type:'title',category:group.title,label:group.title,term:String(term),round:'',a,b,aW:Number(m[1]),bW:Number(m[2]),draw:0,
    seriesWinner:a,seriesCount:1,forfeit:false});
 }
 return {events,errors};
}

function h2hAggregate(events,focus,opponent=null){
 const sum={w:0,l:0,d:0,leagueW:0,leagueL:0,leagueD:0,titleW:0,titleL:0,seriesW:0,seriesL:0,leagueGames:0,titleGames:0,seriesCount:0,events:[],groups:new Map()};
 for(const x of events){
  if(x.a!==focus&&x.b!==focus)continue;
  const other=x.a===focus?x.b:x.a;
  if(opponent&&other!==opponent)continue;
  const isA=x.a===focus,w=isA?x.aW:x.bW,l=isA?x.bW:x.aW;
  const seriesW=x.seriesWinner===focus?1:0,seriesL=x.seriesWinner&&x.seriesWinner!==focus?1:0;
  sum.w+=w;sum.l+=l;sum.d+=x.draw;
  if(x.type==='title'){sum.titleW+=w;sum.titleL+=l;sum.titleGames+=w+l;sum.seriesCount++;sum.seriesW+=seriesW;sum.seriesL+=seriesL;}
  else{sum.leagueW+=w;sum.leagueL+=l;sum.leagueD+=x.draw;sum.leagueGames+=1;}
  const key=x.type+':'+x.category;
  if(!sum.groups.has(key))sum.groups.set(key,{type:x.type,key,label:x.label,category:x.category,w:0,l:0,d:0,seriesW:0,seriesL:0,count:0});
  const g=sum.groups.get(key);g.w+=w;g.l+=l;g.d+=x.draw;g.seriesW+=seriesW;g.seriesL+=seriesL;g.count++;
  sum.events.push({...x,w,l,other,seriesW,seriesL});
 }
 return sum;
}

function h2hData(){
 const source=h2hEvents();
 const filtered=source.events.filter(x=>h2hScope==='all'||
  (h2hScope==='league'&&x.type==='league'&&(h2hLeague==='all'||x.category===h2hLeague))||
  (h2hScope==='title'&&x.type==='title'&&(h2hTitle==='all'||x.category===h2hTitle)));
 const names=new Map();
 for(const x of source.events)for(const k of [x.a,x.b])if(!names.has(k))names.set(k,histName(k.slice(2)));
 const roster=[...names.entries()].map(([key,name])=>({key,name})).sort((a,b)=>a.name.localeCompare(b.name,'ja'));
 const focus=roster.some(x=>x.key===h2hFocus)?h2hFocus:roster[0]?.key||'';
 const opponentsMap=new Map();
 for(const x of filtered){
  if(x.a!==focus&&x.b!==focus)continue;
  const opp=x.a===focus?x.b:x.a;
  if(!opponentsMap.has(opp))opponentsMap.set(opp,[]);
  opponentsMap.get(opp).push(x);
 }
 const opponents=[...opponentsMap.entries()].map(([key,events])=>({key,name:names.get(key)||histName(key.slice(2)),...h2hAggregate(events,focus,key)}))
  .sort((a,b)=>(b.w+b.l+b.d)-(a.w+a.l+a.d)||b.w-a.w||a.name.localeCompare(b.name,'ja'));
 const validOpponent=opponents.some(x=>x.key===h2hOpponent)?h2hOpponent:'';
 const detail=opponents.find(x=>x.key===validOpponent)||null;
 const total=h2hAggregate(filtered,focus);
 return {source,filtered,roster,focus,opponents,detail,total,validOpponent};
}

function h2hScore(w,l,d=0){
 return `${w}勝${l}敗${d?d+'分':''}`;
}

function h2hPage(){
 const d=h2hData();
 if(!d.roster.length)return `<div class="heading"><div><div class="overline">Archive / Head to head</div><h2>選手別・直接対戦成績</h2></div></div><div class="empty"><h3>集計できる対戦記録がまだありません</h3><p>対戦相手が確定しているリーグ戦、またはタイトル戦の記録を登録すると自動表示されます。</p></div>`;
 const filters=`<div class="career-filters">
  <label>注目する選手<select id="h2h-focus" class="filter" aria-label="注目する選手">${d.roster.map(p=>`<option value="${attr(p.key)}" ${d.focus===p.key?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
  <label>集計対象<select id="h2h-scope" class="filter"><option value="all" ${h2hScope==='all'?'selected':''}>リーグ＋タイトル戦</option><option value="league" ${h2hScope==='league'?'selected':''}>リーグ戦のみ</option><option value="title" ${h2hScope==='title'?'selected':''}>タイトル戦のみ</option></select></label>
  ${h2hScope==='league'?`<label>対象リーグ<select id="h2h-league" class="filter"><option value="all" ${h2hLeague==='all'?'selected':''}>全リーグ</option>${LEAGUES.map(([k,v])=>`<option value="${attr(k)}" ${h2hLeague===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`:''}
  ${h2hScope==='title'?`<label>対象タイトル<select id="h2h-title" class="filter"><option value="all" ${h2hTitle==='all'?'selected':''}>全11タイトル</option>${TITLE_SERIES_REFERENCE.map(g=>`<option value="${attr(g.title)}" ${h2hTitle===g.title?'selected':''}>${esc(g.title)}</option>`).join('')}</select></label>`:''}
 </div>`;
 const opponentList=d.opponents.length?`<div class="career-board">${d.opponents.map((p,i)=>`<button class="career-player ${d.validOpponent===p.key?'on':''}" data-h2h-opponent="${attr(p.key)}"><span class="career-place">${i+1}</span><span class="career-who"><strong>${esc(p.name)}</strong><small>リーグ ${p.leagueGames}対戦／タイトル ${p.seriesCount}番勝負</small></span><span class="career-record"><strong>${h2hScore(p.w,p.l,p.d)}</strong><small>勝率 ${careerPercent(p.w,p.l)}</small></span></button>`).join('')}</div>`:'<div class="empty"><h3>この条件の直接対戦記録はありません</h3><p>集計対象を変更してみてください。</p></div>';
 const details=d.detail?(()=>{
  const p=d.detail,n1=histName(d.focus.slice(2));
  const groups=[...p.groups.values()].sort((a,b)=>(a.type===b.type?0:a.type==='league'?-1:1)||b.count-a.count||a.label.localeCompare(b.label,'ja'));
  const hist=[...p.events].sort((a,b)=>Number(b.term)-Number(a.term)||a.label.localeCompare(b.label,'ja')||sortNum(b.round)-sortNum(a.round));
  const visible=h2hExpand?hist:hist.slice(0,25);
  return `<section class="settingbox" id="h2h-detail"><div class="career-head"><div><div class="overline">Head to head / Verified records</div><h3>${esc(n1)} vs ${esc(p.name)}</h3></div><div class="buttons"><button class="btn small ghost" data-h2h-swap="1">選手を入れ替え</button><button class="btn small ghost" data-h2h-clear="1">一覧に戻る</button></div></div>
  <div class="career-kpi"><span><strong>${p.w}</strong>勝</span><span><strong>${p.l}</strong>敗</span><span><strong>${p.d}</strong>分</span><span><strong>${careerPercent(p.w,p.l)}</strong>勝率</span></div>
  <div class="career-period"><div><strong>リーグ戦</strong><small>確定した各回戦のみ</small></div><strong>${h2hScore(p.leagueW,p.leagueL,p.leagueD)}</strong></div>
  <div class="career-period"><div><strong>タイトル戦・各対戦</strong><small>番勝負のスコアから集計</small></div><strong>${h2hScore(p.titleW,p.titleL)}</strong></div>
  <div class="career-period"><div><strong>タイトル戦・番勝負</strong><small>シリーズを勝ち抜いた回数</small></div><strong>${h2hScore(p.seriesW,p.seriesL)}</strong></div>
  <div class="section-title"><h3>大会・リーグ別内訳</h3></div>
  <div class="career-period-list">${groups.map(g=>`<div class="career-period"><div><strong>${esc(g.label)}</strong><small>${g.type==='title'?`番勝負 ${h2hScore(g.seriesW,g.seriesL)}`:`リーグ対戦 ${g.count}件`}</small></div><div class="career-period-right"><strong>${h2hScore(g.w,g.l,g.d)}</strong><small>勝率 ${careerPercent(g.w,g.l)}</small></div></div>`).join('')}</div>
  <div class="section-title"><h3>対戦履歴</h3><span class="small-pale">${visible.length}/${hist.length}件</span></div>
  <div class="career-period-list">${visible.map(e=>`<div class="career-period"><div><strong>${esc(e.label)} 第${esc(e.term)}期${e.round?`・第${esc(e.round)}回戦`:''}</strong><small>${e.type==='title'?`番勝負 ${e.seriesW?'勝利':'敗北'}（合計スコア）`:e.draw?'引分':e.forfeit?'不戦勝・不戦敗':'リーグ対戦'}</small></div><div class="career-period-right"><strong>${e.type==='title'?`${e.w}–${e.l}`:e.draw?'引分':e.w?'勝':'負'}</strong></div></div>`).join('')}</div>
  ${hist.length>25?`<button class="btn ghost" data-h2h-expand="1">${h2hExpand?'25件だけ表示':'全'+hist.length+'件を表示'}</button>`:''}</section>`;
 })():'';
 return `<div class="heading"><div><div class="overline">Archive / Head to head</div><h2>選手別・直接対戦成績</h2><p class="subtext">選手と対戦相手を選び、リーグ・タイトル戦の直接対戦を確認できます。</p></div></div>
 ${filters}<div class="stats career-summary"><div class="stat"><div class="num">${d.opponents.length}</div><div class="lbl">対戦相手</div></div><div class="stat"><div class="num">${d.total.w}</div><div class="lbl">勝利</div></div><div class="stat"><div class="num">${d.total.l}</div><div class="lbl">敗戦</div></div></div>
 <p class="mini-note"><strong>記録がある直接対戦のみ集計。</strong>リーグの期別合計だけでは対戦相手が不明なため除外し、個別に保存された確定対戦だけを使用します。タイトル戦は293番勝負のスコアを各対戦に展開した数値（暫定、原集計との2対戦差は要照合）。番勝負の勝敗は各対戦に二重加算しません。私的・非登録の対戦成績や大会優勝歴から推測していません。</p>
 ${d.source.errors.length?`<p class="mini-note">入力確認が必要な記録 ${d.source.errors.length}件（集計対象から除外）。</p>`:''}
 <div class="section-title"><h3>${esc(histName(d.focus.slice(2)))} の対戦相手</h3><span class="small-pale">${d.opponents.length}名・対戦数順</span></div>
 ${opponentList}${details}`;
}

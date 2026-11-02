'use strict';
// Read-only aggregation across registered league matches and legacy season score summaries.
// No mutation, no network requests, no inference from titles or tournament victories.
let careerLeague='all',careerMode='combined',careerPersonKey='';
function careerKeyForId(id){
 const p=db.people.find(x=>x.id===id);
 return p&&normalize(p.name)?'k:'+histKey(p.name):null;
}

function careerNameForKey(key){
 return histName(String(key||'').slice(2));
}

function careerEmptyLine(league,term,key){
 return {league,term,key,w:0,l:0,d:0,gameW:0,gameL:0,gameD:0,gameCount:0,
   summaryW:0,summaryL:0,summaryD:0,hasSummary:false,pending:0,forfeits:0,
   source:'none',disagreement:false,duplicateRoster:false};
}

function careerData(scope='all',mode='combined'){
 const included=league=>scope==='all'||league===scope;
 const people=new Map(),lines=new Map(),problems={duplicateMatches:0,invalidMatches:0,duplicateRoster:0,incompletePeriods:0};
 const lineKey=(league,term,key)=>JSON.stringify([league,normalize(term),key]);
 const getLine=(league,term,key)=>{
  const id=lineKey(league,term,key);
  if(!lines.has(id))lines.set(id,careerEmptyLine(league,normalize(term),key));
  return lines.get(id);
 };
 for(const p of db.people){
  const key=careerKeyForId(p.id);
  if(key&&!people.has(key))people.set(key,{key,name:careerNameForKey(key)});
 }
 const rosterBySlot=new Map();
 for(const r of db.leagues){
  if(!included(r.league))continue;
  const key=careerKeyForId(r.personId);
  if(!key)continue;
  const id=lineKey(r.league,r.term,key),previous=rosterBySlot.get(id);
  if(previous){
   problems.duplicateRoster++;
   getLine(r.league,r.term,key).duplicateRoster=true;
   if(timeVal(previous)>=timeVal(r))continue;
  }
  rosterBySlot.set(id,r);
 }
 for(const r of rosterBySlot.values()){
  const key=careerKeyForId(r.personId),row=getLine(r.league,r.term,key);
  const valid=x=>{
   const n=numOrNull(x);
   return n!==null&&Number.isInteger(n)&&n>=0?n:null;
  };
  const w=valid(r.wins),l=valid(r.losses),d=valid(r.draws);
  if(w!==null||l!==null||d!==null){
   row.hasSummary=true;row.summaryW=w??0;row.summaryL=l??0;row.summaryD=d??0;
  }
 }
 const matchesByKey=new Map();
 const status=m=>m.outcome==='pending'?'pending':
   m.outcome==='draw'?'draw':
   m.winnerId&&(m.winnerId===m.playerAId||m.winnerId===m.playerBId)?'win':'invalid';
 for(const m of db.matches){
  if(!included(m.league))continue;
  const a=careerKeyForId(m.playerAId),b=careerKeyForId(m.playerBId);
  if(!a||!b||a===b){problems.invalidMatches++;continue}
  const normalizedRound=normalize(m.round),term=normalize(m.term);
  if(!normalizedRound||!term){problems.invalidMatches++;continue}
  const keys=[a,b].sort();
  const id=JSON.stringify([m.league,term,normalizedRound,keys[0],keys[1]]);
  const old=matchesByKey.get(id);
  if(old){
   problems.duplicateMatches++;
   // Prefer an explicitly completed result over a pending placeholder; otherwise the latest edit.
   const oldStatus=status(old),newStatus=status(m);
   if(oldStatus==='win'||oldStatus==='draw'){
    if(newStatus!=='win'&&newStatus!=='draw')continue;
   }else if(newStatus==='win'||newStatus==='draw'){matchesByKey.set(id,m);continue}
   if(timeVal(old)>=timeVal(m))continue;
  }
  matchesByKey.set(id,m);
 }
 for(const m of matchesByKey.values()){
  const a=careerKeyForId(m.playerAId),b=careerKeyForId(m.playerBId);
  const ra=getLine(m.league,m.term,a),rb=getLine(m.league,m.term,b),state=status(m);
  if(state==='pending'){ra.pending++;rb.pending++;continue}
  if(state==='invalid'){problems.invalidMatches++;continue}
  ra.gameCount++;rb.gameCount++;
  if(state==='draw'){ra.gameD++;rb.gameD++;continue}
  const win=careerKeyForId(m.winnerId),winner=win===a?ra:rb,loser=win===a?rb:ra;
  winner.gameW++;loser.gameL++;
  if(m.outcome==='forfeit'){ra.forfeits++;rb.forfeits++}
 }
 for(const row of lines.values()){
  const summaryTotal=row.summaryW+row.summaryL+row.summaryD;
  if(row.gameCount){
   row.source='match';
   row.w=row.gameW;row.l=row.gameL;row.d=row.gameD;
   const compatible=row.summaryW>=row.gameW&&row.summaryL>=row.gameL&&row.summaryD>=row.gameD;
   if(row.hasSummary&&summaryTotal>row.gameCount&&compatible&&mode==='combined'){
    // The confirmed end-of-season score includes already logged matches; add only the missing portion.
    row.source='summary_partial';row.w=row.summaryW;row.l=row.summaryL;row.d=row.summaryD;
   }else if(row.hasSummary&&(!compatible||(summaryTotal===row.gameCount&&
       (row.summaryW!==row.gameW||row.summaryL!==row.gameL||row.summaryD!==row.gameD)))){
    row.disagreement=true;problems.incompletePeriods++;
   }
  }else if(mode==='combined'&&row.hasSummary){
   row.source='summary';row.w=row.summaryW;row.l=row.summaryL;row.d=row.summaryD;
  }
 }
 const result=new Map();
 for(const p of people.values())result.set(p.key,{...p,w:0,l:0,d:0,games:0,matchGames:0,summaryGames:0,matchPeriods:0,summaryPeriods:0,pending:0,forfeits:0,incomplete:0,periods:[]});
 for(const row of lines.values()){
  const p=result.get(row.key);
  if(!p)continue;
  p.w+=row.w;p.l+=row.l;p.d+=row.d;
  p.games+=row.w+row.l+row.d;
  p.matchGames+=row.gameCount;
  if(row.source==='summary'||row.source==='summary_partial'){
   p.summaryGames+=(row.w+row.l+row.d)-row.gameCount;p.summaryPeriods++;
  }
  if(row.gameCount)p.matchPeriods++;
  p.pending+=row.pending;p.forfeits+=row.forfeits;
  if(row.disagreement)p.incomplete++;
  if(row.gameCount||row.hasSummary||row.pending)p.periods.push(row);
 }
 const ordered=[...result.values()].filter(p=>p.games||p.pending||p.periods.length)
   .sort((a,b)=>b.w-a.w||b.games-a.games||a.name.localeCompare(b.name,'ja'));
 return {people:ordered,problems};
}

function careerPercent(w,l){
 return w+l?((100*w)/(w+l)).toFixed(1)+'%':'—';
}

function careerPeriodSort(a,b){
 return sortNum(b.term)-sortNum(a.term)||String(a.league).localeCompare(String(b.league),'ja');
}

function careerPage(){
 const data=careerData(careerLeague,careerMode),people=data.people;
 const current=people.find(p=>p.key===careerPersonKey);
 const totals=people.reduce((a,p)=>{a.w+=p.w;a.l+=p.l;a.d+=p.d;a.match+=p.matchGames;a.summary+=p.summaryGames;return a},{w:0,l:0,d:0,match:0,summary:0});
 const warnings=data.problems,hasWarnings=Object.values(warnings).some(Boolean)||people.some(p=>p.incomplete);
 const selector=`<div class="career-filters"><label>集計対象リーグ<select id="career-league" class="filter" aria-label="集計対象リーグ"><option value="all" ${careerLeague==='all'?'selected':''}>全リーグ</option>${LEAGUES.map(([k,v])=>`<option value="${attr(k)}" ${careerLeague===k?'selected':''}>${esc(k==='s'?'A級・S級':v)}</option>`).join('')}</select></label><label>計算方法<select id="career-mode" class="filter" aria-label="通算集計方法"><option value="combined" ${careerMode==='combined'?'selected':''}>対戦＋期別記録の補完</option><option value="matches" ${careerMode==='matches'?'selected':''}>確定済み対戦のみ</option></select></label></div>`;
 const leaderboard=people.length?`<div class="career-board">${people.map((p,i)=>`<button class="career-player ${p.key===careerPersonKey?'on':''}" data-career-person="${attr(p.key)}"><span class="career-place">${i+1}</span><span class="career-who"><strong>${esc(p.name)}</strong><small>${p.matchPeriods}期で対戦登録${p.summaryPeriods?` ＋ 補完${p.summaryPeriods}期`:''}</small></span><span class="career-record"><strong>${p.w}勝${p.l}敗${p.d?p.d+'分':''}</strong><small>勝率 ${careerPercent(p.w,p.l)}</small></span></button>`).join('')}</div>`:'<div class="empty"><h3>集計できる勝敗記録がまだありません</h3><p>リーグの試合結果、または各期の勝敗数を登録すると自動で表示されます。</p></div>';
 const detail=current?`<section class="settingbox" id="career-detail"><div class="career-head"><div><div class="overline">Player career / Registered records</div><h3>${esc(current.name)} の通算内訳</h3></div><button class="btn small ghost" data-career-clear="1">全選手に戻る</button></div><div class="career-kpi"><span><strong>${current.w}</strong>勝</span><span><strong>${current.l}</strong>敗</span><span><strong>${current.d}</strong>分</span><span><strong>${careerPercent(current.w,current.l)}</strong>勝率</span></div><p class="mini-note">個別対戦：${current.matchGames}局${careerMode==='combined'?`／期別成績からの補完：${current.summaryGames}局（${current.summaryPeriods}期）`:''}。${current.incomplete?'対戦の登録数と期別成績に差がある期は、二重計上せず対戦記録を優先しています。':''}</p><div class="career-period-list">${current.periods.slice().sort(careerPeriodSort).map(r=>{
  const shown=r.source==='match'?`${r.gameW}勝${r.gameL}敗${r.gameD?r.gameD+'分':''}`:(r.source==='summary'||r.source==='summary_partial')?`${r.summaryW}勝${r.summaryL}敗${r.summaryD?r.summaryD+'分':''}`:'未集計';
  const source=r.source==='match'?'対戦から自動計算':r.source==='summary_partial'?'期別最終成績（確定対戦を含む）':r.source==='summary'?'期別勝敗数で補完':'確定対戦なし';
  return `<div class="career-period"><div><strong>${esc(termDisplay(r.term))} ${esc(leagueDisplay(r.league,r.term))}</strong><small>${source}${r.disagreement?'／期別成績との差あり':''}${r.pending?`／未対戦${r.pending}局`:''}</small></div><div class="career-period-right"><strong>${shown}</strong><button class="btn small ghost" data-career-season="1" data-league="${attr(r.league)}" data-term="${attr(r.term)}">期を開く</button></div></div>`;
 }).join('')}</div></section>`:'';
 return `<div class="heading"><div><div class="overline">Archive / Career standings</div><h2>通算勝敗・勝率</h2><p class="subtext">登録した記録から自動計算。入力・編集・削除した結果は、次の表示時に反映されます。</p></div></div>
 ${selector}
 <div class="stats career-summary"><div class="stat"><div class="num">${totals.w}</div><div class="lbl">延べ勝利数</div></div><div class="stat"><div class="num">${totals.l}</div><div class="lbl">延べ敗戦数</div></div><div class="stat"><div class="num">${careerPercent(totals.w,totals.l)}</div><div class="lbl">集計勝率</div></div></div>
 <p class="mini-note">ここに表示するのは<strong>アプリに登録済みの範囲</strong>の通算成績であり、全公式戦の生涯通算とは限りません。勝率＝勝数÷（勝数＋敗数）、引分は分母から除外。対象は確定したリーグ対戦（不戦勝を含む）と、個別対戦のない期に入力された勝敗数のみ。タイトル保持・大会優勝・在籍記録から勝敗は推測しません。</p>
 <p class="mini-note">集計根拠：確定済み対戦の選手延べ${totals.match}件${careerMode==='combined'?`、期別記録による補完の選手延べ${totals.summary}件`:''}。同じリーグ・期・回戦・選手組の重複対戦は1局として扱います。</p>
 ${hasWarnings?`<div class="mini-note">要確認：重複対戦 ${warnings.duplicateMatches}件、無効／結果未確定の記録 ${warnings.invalidMatches}件、同一期・同一選手の重複在籍 ${warnings.duplicateRoster}件、個別対戦と期別勝敗数の差 ${warnings.incompletePeriods}期。集計の際、重複は除外しています。</div>`:''}
 <div class="section-title"><h3>選手別ランキング</h3><span class="small-pale">${people.length}名・勝数順</span></div>
 ${leaderboard}${detail}`;
}

'use strict';
// Derived-only career stats from verified championship series. Never writes state or double-counts db.titles.
let careerKind='all',careerTitle='all',careerTitleExpanded=false;
function careerTitleRecords(filter='all'){
 const unique=new Set(),records=[],invalid=[];
 for(const group of TITLE_SERIES_REFERENCE){
  if(filter!=='all'&&group.title!==filter)continue;
  for(const item of group.rows){
   const [term,winner,score,loser]=item;
   const id=JSON.stringify([group.title,term]);
   if(unique.has(id)){invalid.push(`重複 ${group.title} 第${term}期`);continue}
   unique.add(id);
   const parts=/^(\d+)-(\d+)$/.exec(score);
   if(!parts){invalid.push(`スコア不正 ${group.title} 第${term}期`);continue}
   const a=Number(parts[1]),b=Number(parts[2]);
   if(!winner||!loser||winner==='未確認'||loser==='未確認'||histKey(winner)===histKey(loser)||a<=b||b<0){
    invalid.push(`勝者・敗者不正 ${group.title} 第${term}期`);continue;
   }
   records.push({title:group.title,term:Number(term),winner:histKey(winner),loser:histKey(loser),winnerName:histName(winner),loserName:histName(loser),winnerW:a,winnerL:b,score,valid:true});
  }
 }
 return {records,invalid};
}

function careerTitleSummary(filter='all'){
 const source=careerTitleRecords(filter),people=new Map();
 for(const r of source.records){
  for(const side of ['winner','loser']){
   const key='k:'+r[side],isWinner=side==='winner',a=isWinner?r.winnerW:r.winnerL,b=isWinner?r.winnerL:r.winnerW;
   if(!people.has(key))people.set(key,{key,name:histName(r[side]),w:0,l:0,sw:0,sl:0,records:[],byTitle:new Map()});
   const p=people.get(key);p.w+=a;p.l+=b;p.sw+=isWinner?1:0;p.sl+=isWinner?0:1;
   const entry={...r,w:a,l:b,won:isWinner,opponent:isWinner?r.loserName:r.winnerName};
   p.records.push(entry);
   if(!p.byTitle.has(r.title))p.byTitle.set(r.title,{title:r.title,w:0,l:0,sw:0,sl:0});
   const t=p.byTitle.get(r.title);t.w+=a;t.l+=b;t.sw+=isWinner?1:0;t.sl+=isWinner?0:1;
  }
 }
 const total=source.records.reduce((s,r)=>s+r.winnerW+r.winnerL,0);
 return {people,seriesCount:source.records.length,totalGames:total,invalid:source.invalid};
}

function careerCombinedData(){
 const useLeague=careerKind!=='title';
 const useTitle=careerKind!=='league';
 const league=careerData(useLeague?careerLeague:'__no_league__',careerMode);
 const title=careerTitleSummary(useTitle&&careerKind==='title'?careerTitle:'all');
 const people=new Map();
 for(const p of league.people)people.set(p.key,{...p,leagueW:p.w,leagueL:p.l,leagueD:p.d,titleW:0,titleL:0,seriesW:0,seriesL:0,titleSeries:[],byTitle:new Map()});
 if(useTitle)for(const t of title.people.values()){
  if(!people.has(t.key))people.set(t.key,{
   key:t.key,name:t.name,w:0,l:0,d:0,games:0,matchGames:0,summaryGames:0,matchPeriods:0,summaryPeriods:0,pending:0,forfeits:0,incomplete:0,periods:[],
   leagueW:0,leagueL:0,leagueD:0,titleW:0,titleL:0,seriesW:0,seriesL:0,titleSeries:[],byTitle:new Map()
  });
  const p=people.get(t.key);
  p.name=t.name||p.name;p.titleW=t.w;p.titleL=t.l;p.seriesW=t.sw;p.seriesL=t.sl;p.titleSeries=t.records;p.byTitle=t.byTitle;
  p.w+=t.w;p.l+=t.l;p.games+=t.w+t.l;
 }
 const ordered=[...people.values()].filter(p=>p.w||p.l||p.d||p.pending||p.periods.length||p.titleSeries.length)
   .sort((a,b)=>b.w-a.w||b.games-a.games||a.name.localeCompare(b.name,'ja'));
 return {people:ordered,leagueProblems:league.problems,titleProblems:title.invalid,titleSeriesCount:useTitle?title.seriesCount:0,titleGameCount:useTitle?title.totalGames:0};
}

function careerTitleRows(p){
 const titles=[...(p.byTitle?.values()||[])].sort((a,b)=>b.w-a.w||a.title.localeCompare(b.title,'ja'));
 if(!titles.length)return '';
 const cards=titles.map(t=>`<div class="career-period"><div><strong>${esc(t.title)}</strong><small>番勝負 ${t.sw}勝${t.sl}敗</small></div><div class="career-period-right"><strong>${t.w}勝${t.l}敗</strong><small>各対戦・勝率 ${careerPercent(t.w,t.l)}</small></div></div>`).join('');
 const recorded=[...p.titleSeries].sort((a,b)=>b.term-a.term||a.title.localeCompare(b.title,'ja'));
 const shown=careerTitleExpanded?recorded:recorded.slice(0,16);
 const entries=shown.map(x=>`<div class="career-period"><div><strong>${esc(x.title)} 第${x.term}期</strong><small>相手：${esc(x.opponent)} ／ ${x.won?'番勝負 勝ち':'番勝負 負け'}</small></div><div class="career-period-right"><strong>${x.w}勝${x.l}敗</strong><small>各対戦</small></div></div>`).join('');
 return `<div class="section-title"><h3>タイトル別・対戦成績</h3><span class="small-pale">番勝負 ${p.seriesW+p.seriesL}回</span></div>
 <div class="career-period-list">${cards}</div>
 <div class="section-title"><h3>タイトル戦の期別内訳</h3><span class="small-pale">${shown.length}/${recorded.length}件</span></div>
 <div class="career-period-list">${entries}</div>
 ${recorded.length>16?`<button class="btn ghost" data-career-title-more="1">${careerTitleExpanded?'最初の16件だけ表示':'全'+recorded.length+'件を表示'}</button>`:''}`;
}

function careerCombinedPage(){
 const data=careerCombinedData(),people=data.people,current=people.find(p=>p.key===careerPersonKey);
 const sum=people.reduce((x,p)=>{x.w+=p.w;x.l+=p.l;x.d+=p.d;x.lw+=p.leagueW;x.ll+=p.leagueL;x.tw+=p.titleW;x.tl+=p.titleL;x.sw+=p.seriesW;x.sl+=p.seriesL;x.m+=p.matchGames;x.summary+=p.summaryGames;return x},{w:0,l:0,d:0,lw:0,ll:0,tw:0,tl:0,sw:0,sl:0,m:0,summary:0});
 const withLeagues=careerKind!=='title',withTitles=careerKind!=='league';
 const filters=`<div class="career-filters">
  <label>集計する競技<select class="filter" id="career-kind"><option value="all" ${careerKind==='all'?'selected':''}>全競技（リーグ＋タイトル戦）</option><option value="league" ${careerKind==='league'?'selected':''}>リーグ戦だけ</option><option value="title" ${careerKind==='title'?'selected':''}>タイトル戦だけ</option></select></label>
  ${withLeagues?`<label>リーグ区分<select id="career-league" class="filter"><option value="all" ${careerLeague==='all'?'selected':''}>全リーグ</option>${LEAGUES.map(([k,v])=>`<option value="${attr(k)}" ${careerLeague===k?'selected':''}>${esc(k==='s'?'A級・S級':v)}</option>`).join('')}</select></label><label>リーグの集計方法<select id="career-mode" class="filter"><option value="combined" ${careerMode==='combined'?'selected':''}>対戦＋期別記録の補完</option><option value="matches" ${careerMode==='matches'?'selected':''}>登録された対戦のみ</option></select></label>`:''}
  ${careerKind==='title'?`<label>タイトル区分<select class="filter" id="career-title"><option value="all" ${careerTitle==='all'?'selected':''}>11タイトルすべて</option>${TITLE_SERIES_REFERENCE.map(g=>`<option value="${attr(g.title)}" ${careerTitle===g.title?'selected':''}>${esc(g.title)}</option>`).join('')}</select></label>`:''}
 </div>`;
 const leaderboard=people.length?`<div class="career-board">${people.map((p,i)=>`<button class="career-player ${p.key===careerPersonKey?'on':''}" data-career-person="${attr(p.key)}"><span class="career-place">${i+1}</span><span class="career-who"><strong>${esc(p.name)}</strong><small>${withLeagues?`リーグ ${p.leagueW}勝${p.leagueL}敗`:''}${withLeagues&&withTitles?' ／ ':''}${withTitles?`タイトル戦 ${p.titleW}勝${p.titleL}敗`:''}</small></span><span class="career-record"><strong>${p.w}勝${p.l}敗${p.d?p.d+'分':''}</strong><small>勝率 ${careerPercent(p.w,p.l)}</small></span></button>`).join('')}</div>`:'<div class="empty"><h3>集計対象に記録がありません</h3><p>リーグまたはタイトル戦の集計対象を選んでください。</p></div>';
 const titleSummary=withTitles?`<div class="settingbox"><h3>タイトル戦の番勝負（シリーズ）成績</h3><div class="career-kpi"><span><strong>${data.titleSeriesCount}</strong>番勝負</span><span><strong>${data.titleGameCount}</strong>対戦</span><span><strong>${sum.sw}</strong>勝</span><span><strong>${sum.sl}</strong>敗</span></div><p class="mini-note">勝・敗は番勝負単位（1シリーズにつき勝者1勝、敗者1敗）。上の通算勝敗とは異なり、こちらの勝敗は「番勝負の勝ち抜き」を表します。各対戦の勝敗はスコアから別途集計します。${data.titleSeriesCount===293&&data.titleGameCount===1428?'なお、以前の総合分析資料の1426対戦と、今回の293番勝負のスコア合計1428対戦には2対戦の差があり、個人別の旧集計とも差があるため、正式な確定値としてではなく要照合の集計値として扱ってください。':''}</p></div>`:'';
 const leagueRows=current?.periods?.length?`<div class="section-title"><h3>リーグ別・期別内訳</h3></div><div class="career-period-list">${current.periods.slice().sort(careerPeriodSort).map(r=>{
  const score=r.source==='match'?`${r.gameW}勝${r.gameL}敗${r.gameD?r.gameD+'分':''}`:r.source==='summary'?`${r.summaryW}勝${r.summaryL}敗${r.summaryD?r.summaryD+'分':''}`:'未集計';
  const note=r.source==='match'?'登録済み対戦から集計':r.source==='summary'?'期別勝敗数から補完':'確定対戦なし';
  return `<div class="career-period"><div><strong>${esc(termDisplay(r.term))} ${esc(leagueDisplay(r.league,r.term))}</strong><small>${note}${r.disagreement?' ／ 記録差あり':''}</small></div><div class="career-period-right"><strong>${score}</strong><button class="btn small ghost" data-career-season="1" data-league="${attr(r.league)}" data-term="${attr(r.term)}">期を開く</button></div></div>`;
 }).join('')}</div>`:'';
 const detail=current?`<section class="settingbox" id="career-detail">
 <div class="career-head"><div><div class="overline">Player / Career record</div><h3>${esc(current.name)} の通算成績</h3></div><button class="btn small ghost" data-career-clear="1">全選手に戻る</button></div>
 <div class="career-kpi"><span><strong>${current.w}</strong>勝</span><span><strong>${current.l}</strong>敗</span><span><strong>${current.d}</strong>分</span><span><strong>${careerPercent(current.w,current.l)}</strong>勝率</span></div>
 ${withLeagues&&withTitles?`<div class="career-period"><div><strong>リーグ戦</strong><small>登録済みの範囲</small></div><strong>${current.leagueW}勝${current.leagueL}敗${current.leagueD?' '+current.leagueD+'分':''}</strong></div><div class="career-period"><div><strong>タイトル戦（各対戦）</strong><small>画像から転記したスコアに基づく</small></div><strong>${current.titleW}勝${current.titleL}敗</strong></div>`:''}
 ${withTitles?`<div class="career-period"><div><strong>タイトル戦（番勝負）</strong><small>番勝負単位・各対戦とは別カウント</small></div><strong>${current.seriesW}勝${current.seriesL}敗</strong></div>`:''}
 ${withLeagues?leagueRows:''}
 ${withTitles&&current.titleSeries.length?careerTitleRows(current):''}
 </section>`:'';
 return `<div class="heading"><div><div class="overline">Archive / Career record</div><h2>選手の通算勝敗・勝率</h2><p class="subtext">リーグ戦とタイトル戦を区別して、自動で集計します。</p></div></div>
 ${filters}
 <div class="stats career-summary"><div class="stat"><div class="num">${sum.w}</div><div class="lbl">延べ勝利数</div></div><div class="stat"><div class="num">${sum.l}</div><div class="lbl">延べ敗戦数</div></div><div class="stat"><div class="num">${careerPercent(sum.w,sum.l)}</div><div class="lbl">集計勝率</div></div></div>
 <p class="mini-note"><strong>上の勝敗数は各対戦単位。</strong> リーグ戦は登録済みの対戦（または期別成績）、タイトル戦は提供画像から転記した番勝負スコアの各勝敗を数えています（照合中の暫定集計）。番勝負の勝敗をさらに通算へ加算することはありません。タイトル保持者記録を別経路で登録しても二重集計しません。</p>
 ${titleSummary}
 ${withLeagues?`<p class="mini-note">リーグ集計：確定対戦の選手延べ${sum.m}件${careerMode==='combined'?`、期別成績による補完の選手延べ${sum.summary}件`:''}。${data.leagueProblems.incompletePeriods?'登録対戦数と期別成績が異なる期があります。':''}</p>`:''}
 ${data.titleProblems.length?`<p class="mini-note">タイトル戦に確認が必要な記録 ${data.titleProblems.length}件（集計から除外）。</p>`:''}
 <div class="section-title"><h3>選手別ランキング</h3><span class="small-pale">${people.length}名・勝数順</span></div>${leaderboard}${detail}`;
}

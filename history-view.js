let historyMode='season',historyTerm=30,historyPerson='佐野',historyRange='23-30';
// Known historical abbreviations, not an automatic surname match (different people may share a surname).
const HISTORICAL_CONFIRMED_NAME_ALIASES={
 "一ノ瀬光樹":"一ノ瀬",
 "中原伊也":"中原",
 "平野涼太":"平野"
};
function histKey(name){
 const clean=s=>normalize(s).replace(/[\s\u200b-\u200d\ufeff]/g,'');
 const n=clean(name);
 if(Object.prototype.hasOwnProperty.call(HISTORICAL_CONFIRMED_NAME_ALIASES,n))return HISTORICAL_CONFIRMED_NAME_ALIASES[n];
 if(Object.prototype.hasOwnProperty.call(HISTORICAL_NAME_EXPANSIONS,n))return n;
 const match=Object.entries(HISTORICAL_NAME_EXPANSIONS).find(([,full])=>clean(full)===n);
 return match?match[0]:n;
}
function histName(key){const k=histKey(key);return HISTORICAL_NAME_EXPANSIONS[k]||k}
function histTerms(){const stored=db.leagues.filter(x=>x.league==='s').map(x=>sortNum(x.term));return [...new Set([...HISTORICAL_S_CLASS.map(x=>x.term),...stored].filter(n=>n>0))].sort((a,b)=>a-b)}
function histPeriod(term){
 const src=HISTORICAL_S_CLASS.find(x=>x.term===term)||{term,names:[],promoted:[],champion:'',type:'presence'};
 const rows=src.names.map((key,i)=>({key,name:histName(key),rank:src.type==='ranked'?i+1:null,opening:src.type==='ongoing'?i+1:null,promoted:src.promoted.includes(key)}));
 for(const r of db.leagues.filter(x=>x.league==='s'&&sortNum(x.term)===term)){
  const name=getName(r.personId),key=histKey(name),a=rows.find(x=>x.key===key),rank=numOrNull(r.rank),opening=numOrNull(r.startRank);
  if(a){a.name=name;if(rank!==null)a.rank=rank;if(opening!==null)a.opening=opening;}
  else rows.push({key,name,rank,opening,promoted:false});
 }
 const order=x=>src.type==='ongoing'?x.opening:x.rank;
 rows.sort((a,b)=>(order(a)??Infinity)-(order(b)??Infinity)||a.name.localeCompare(b.name,'ja'));
 return {...src,rows};
}
function histPeople(){
 const map=new Map();
 for(const t of histTerms()){
  const s=histPeriod(t);
  for(const r of s.rows){if(!map.has(r.key))map.set(r.key,new Set());map.get(r.key).add(t)}
  if(s.champion){if(!map.has(s.champion))map.set(s.champion,new Set());map.get(s.champion).add(t)}
 }
 return [...map.entries()].map(([key,ts])=>({key,terms:[...ts]})).sort((a,b)=>b.terms.length-a.terms.length||histName(a.key).localeCompare(histName(b.key),'ja'));
}
function histSeason(){
 const terms=histTerms(),t=terms.includes(historyTerm)?historyTerm:terms.at(-1),s=histPeriod(t);
 const state=s.type==='ranked'?'最終順位':s.type==='ongoing'?'開幕順位（進行中）':'掲載のみ・順位不明';
 return `<div class="history-select"><label for="history-term-choice">期</label><select class="filter" id="history-term-choice">${terms.map(v=>`<option value="${v}" ${v===t?'selected':''}>第${v}期（${v<=22?'A級':'S級'}）</option>`).join('')}</select></div>
 <section class="history-surface"><div class="history-head"><h3>第${t}期 ${t<=22?'A級':'S級'}</h3><span class="history-chip">${state}</span></div>
 ${s.champion?`<div class="history-champion">名人：${esc(histName(s.champion))} <small>（順位戦とは別枠）</small></div>`:''}
 ${s.rows.map(p=>`<div class="history-entry"><span class="history-position">${s.type==='ranked'&&p.rank?esc(p.rank+'位'):s.type==='ongoing'&&p.opening?esc('開'+p.opening):'·'}</span><button class="history-namebtn" data-history-person="${attr(p.key)}">${esc(p.name)}</button>${p.promoted?'<span class="history-promoted">昇級</span>':''}</div>`).join('')}
 <p class="history-legend">${s.type==='presence'?'第1〜12期の横位置から順位を推測していません。':s.type==='ongoing'?'進行中のため、正式な最終順位はまだありません。':'挑戦者＝1位、続く選手＝2位以下の順位です。'} 名前を押すと選手別の推移を開きます。</p></section>`;
}
function histPlayer(){
 const people=histPeople(),key=people.some(p=>p.key===historyPerson)?historyPerson:people[0]?.key;
 if(!key)return '<p>選手がいません。</p>';
 const terms=histTerms(),found=[];
 for(const t of terms){
  const s=histPeriod(t),row=s.rows.find(x=>x.key===key),champ=s.champion===key;
  if(row||champ)found.push({term:t,rank:row?.rank??null,opening:row?.opening??null,champ,type:s.type});
 }
 const ranks=found.filter(x=>x.type==='ranked'&&x.rank!=null).map(x=>x.rank);
 let longest=0,streak=0,prev=-999;for(const a of found){streak=prev===a.term-1?streak+1:1;longest=Math.max(longest,streak);prev=a.term}
 const byTerm=new Map(found.map(x=>[x.term,x]));
 return `<div class="history-select"><label for="history-player-choice">選手</label><select class="filter" id="history-player-choice">${people.map(p=>`<option value="${attr(p.key)}" ${p.key===key?'selected':''}>${esc(histName(p.key))}</option>`).join('')}</select></div>
 <section class="history-surface"><div class="history-head"><h3>${esc(histName(key))} の歩み</h3></div>
 <div class="history-stats"><div><strong>${found.length}</strong><small>登場・掲載期数</small></div><div><strong>${longest}</strong><small>最長連続掲載</small></div><div><strong>${ranks.length?Math.min(...ranks)+'位':'—'}</strong><small>最高公式順位</small></div></div>
 <div class="history-track">${terms.map(t=>{
  const p=byTerm.get(t),cls=p?(p.champ?'champ':p.type==='ongoing'?'future':'in'):'';
  const result=p?(p.champ?'名人':p.type==='ranked'&&p.rank?p.rank+'位':p.type==='ongoing'&&p.opening?'開'+p.opening:'在籍'):'·';
  return `<button class="history-tile ${cls}" data-history-season="${t}" title="第${t}期"><small>${t}期</small><strong>${esc(result)}</strong></button>`;
 }).join('')}</div>
 <p class="history-legend">金＝名人／緑＝掲載・公式順位／青灰＝進行中。掲載期数は正式な順位戦在籍数とは必ずしも一致しません。</p></section>`;
}
function histMatrix(){
 const people=histPeople(),all=histTerms(),[min,max]=historyRange==='all'?[1,Infinity]:historyRange.split('-').map(Number),terms=all.filter(t=>t>=min&&t<=max),snap=new Map(terms.map(t=>[t,histPeriod(t)]));
 return `<div class="history-select"><label for="history-period-range">表示範囲</label><select class="filter" id="history-period-range">${[['23-30','23〜30期'],['13-22','13〜22期'],['1-12','1〜12期'],['all','全期']].map(([v,label])=>`<option value="${v}" ${v===historyRange?'selected':''}>${label}</option>`).join('')}</select></div>
 <div class="history-matrix-wrap"><table class="history-matrix"><thead><tr><th class="history-person-col">選手</th>${terms.map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>
 ${people.map(person=>`<tr><th class="history-person-col"><button data-history-person="${attr(person.key)}">${esc(histName(person.key))} <small>(${person.terms.length})</small></button></th>${terms.map(t=>{
  const s=snap.get(t),r=s.rows.find(x=>x.key===person.key),champ=s.champion===person.key;
  const value=champ?'名':r?(s.type==='ranked'&&r.rank?r.rank:s.type==='ongoing'&&r.opening?'開'+r.opening:'○'):'·';
  return `<td><button class="${champ?'hist-champion':r?s.type==='ongoing'?'hist-ongoing':'hist-on':''} ${r?.promoted?'hist-promo':''}" data-history-season="${t}" title="第${t}期 ${esc(histName(person.key))} ${esc(value)}">${esc(value)}</button></td>`;
 }).join('')}</tr>`).join('')}</tbody></table></div>
 <p class="history-legend">名＝名人／数字＝公式順位／開数字＝開幕順位／○＝掲載／·＝掲載なし／赤枠＝昇級。横スクロール対応。</p>`;
}
function leagueHistoryPage(){
 return `<button class="btn ghost small" data-history-back="1">← リーグ一覧へ</button>
 <div class="heading" style="margin-top:15px"><div class="overline">A / S league historical archive</div><h2>歴代A級・S級選手記録</h2></div>
 <p class="history-intro">2枚の画像を参考に第1〜30期を整理。第1〜12期は掲載のみ、13〜29期は公式順位、30期は進行中の開幕順位。保存済みの記録は上書きしません。</p>
 <div class="history-tools">${[['season','期別順位表'],['player','選手別の歩み'],['matrix','全期在籍マップ']].map(([m,n])=>`<button class="btn ${historyMode===m?'chosen':'ghost'}" data-history-mode="${m}">${n}</button>`).join('')}</div>
 ${historyMode==='player'?histPlayer():historyMode==='matrix'?histMatrix():histSeason()}
 <p class="tip">2026年11月1日のご提供画像から転記した参考資料です。未確認のフルネームは原画像の略称のまま表示します。赤太字は昇級者として記録。第1〜12期の固定横位置を順位とは扱いません。アプリの登録済み順位がある選手はその情報を優先表示します。</p>`;
}
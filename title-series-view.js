'use strict';
// Source screenshots are kept as read-only evidence; explicit user tap persists missing holder records.
let titleSeriesSelected='名人';
function seriesTitleKey(name){
 const n=normalize(name).replace(/[\s　]/g,'').replace(/戦$/,'');
 return n==='宗刀'?'宗刀座':n;
}

function seriesSourceRows(){
 return TITLE_SERIES_REFERENCE.flatMap(g=>g.rows.map(([edition,winner,score,loser])=>({title:g.title,edition:String(edition),winner,score,loser,holder:histName(winner)})));
}

function seriesExistingState(row){
 const entries=db.titles.filter(r=>seriesTitleKey(r.title)===seriesTitleKey(row.title)&&titleEditionKey(r.edition)===titleEditionKey(row.edition));
 if(!entries.length)return 'new';
 if(entries.some(r=>histKey(getName(r.personId))===histKey(row.winner)))return 'saved';
 return 'conflict';
}

function titleSeriesPage(){
 const total=TITLE_SERIES_REFERENCE.reduce((s,g)=>s+g.rows.length,0);
 const chosen=TITLE_SERIES_REFERENCE.find(g=>g.title===titleSeriesSelected)||TITLE_SERIES_REFERENCE[0];
 const all=seriesSourceRows();
 const saved=all.filter(r=>seriesExistingState(r)==='saved').length;
 const conflicts=all.filter(r=>seriesExistingState(r)==='conflict').length;
 const flagged=all.filter(r=>r.loser==='未確認').length;
 const canAdd=all.some(r=>seriesExistingState(r)==='new');
 const corrections=confirmedSeriesCandidates();
 const rows=[...chosen.rows].sort((a,b)=>b[0]-a[0]);
 return `<div class="heading"><div><div class="overline">Archive / Historical series</div><h2>タイトル戦・歴代番勝負</h2><p class="subtext">提供された4枚の画像を基に、11タイトルの期別勝者・敗者・スコアを確認できます。</p></div><div class="heading-actions"><button class="btn primary" data-title-series-import="1" ${canAdd?'':'disabled'}>未登録の期を追加</button><button class="btn ghost" data-title-series-correct="1" ${corrections.titles.length||corrections.names.length?"":"disabled"}>確認済み訂正・氏名を反映</button></div></div>
 <div class="tab-controls"><button class="btn ghost" data-title-mode="chronology">歴代保持者</button><button class="btn primary" data-title-mode="series">番勝負の結果</button><button class="btn ghost" data-title-mode="holders">選手別</button><button class="btn ghost" data-title-mode="edit">保存済み記録の編集</button></div>
 <div class="stats th-stats"><div class="stat"><div class="num">${TITLE_SERIES_REFERENCE.length}</div><div class="lbl">収録タイトル</div></div><div class="stat"><div class="num">${total}</div><div class="lbl">画像から転記した番勝負</div></div><div class="stat"><div class="num">${saved}</div><div class="lbl">保存済みの保持記録</div></div></div>
 <p class="mini-note">これは画像を転記した参照データです。アプリの個人記録へ反映するには「未登録の期を追加」を押してください。既存のタイトル記録は一切上書きせず、登録済みの同一保持者・同一期はスキップします。${conflicts?`<strong>既存記録と保持者が異なる期：${conflicts}件。これらは自動登録しません。</strong>`:''}${flagged?`<strong>判読保留の敗者名：${flagged}件。</strong>`:''} ユーザー確認済みの修正は最新版の参照表に反映しています。保存済み記録の該当部分は「確認済み訂正・氏名を反映」で安全に更新できます。${corrections.conflicts.length?`保存済みの要確認データ：${corrections.conflicts.length}件。`:``} 2026年の進行中・結果未掲載の期は含みません。</p>
 <div class="th-toolbar"><label for="title-series-select">タイトル</label><select id="title-series-select" class="filter">${TITLE_SERIES_REFERENCE.map(g=>`<option value="${attr(g.title)}" ${chosen.title===g.title?'selected':''}>${esc(g.title)}（${g.rows.length}期）</option>`).join('')}</select></div>
 <div class="section-title"><h3>${esc(chosen.title)}・番勝負の結果</h3><span class="small-pale">${rows.length}件</span></div>
 <div class="th-timeline">${rows.map(([n,w,score,l])=>{
  const row={title:chosen.title,edition:String(n),winner:w},status=seriesExistingState(row),name=histName(w),loser=l==='未確認'?'氏名要確認':histName(l);
  return `<article class="th-entry"><div class="th-edition">第${n}期</div><div class="th-info"><strong>${esc(name)}</strong><div class="th-meta">番勝負 ${esc(score)} ／ 対戦相手：${esc(loser)}</div>${l==='未確認'?'<div class="th-warning">原画像の文字が不鮮明・敗者名要確認</div>':''}${status==='conflict'?'<div class="th-warning">登録済みの保持者と不一致・確認が必要</div>':''}</div><div class="th-action">${status==='saved'?'<span class="tag">登録済み</span>':status==='conflict'?'<span class="tag">要確認</span>':'<span class="tag">未登録</span>'}</div></article>`;
 }).join('')}</div><p class="mini-note">注：番勝負の結果は「シリーズ単位」の成績です。対戦ゲームごとの勝敗や別大会の通算成績には自動加算しません。氏名を確認できていない相手は推測せず表示します。</p>`;
}

async function importHistoricalTitles(){
 const source=seriesSourceRows(),inserts=[],conflicts=[],skipped=[];
 const existing=db.titles||[],indexed=new Map();
 for(const r of existing){
  const key=JSON.stringify([seriesTitleKey(r.title),titleEditionKey(r.edition)]);
  if(!indexed.has(key))indexed.set(key,[]);
  indexed.get(key).push(r);
 }
 for(const r of source){
  const key=JSON.stringify([seriesTitleKey(r.title),titleEditionKey(r.edition)]),records=indexed.get(key)||[];
  if(records.length){
   if(records.some(x=>histKey(getName(x.personId))===histKey(r.winner)))skipped.push(r);
   else conflicts.push(r);
  }else inserts.push(r);
 }
 if(!inserts.length){alert(conflicts.length?`追加できる記録はありません。${conflicts.length}件の既存の保持者不一致を確認してください。`:'全ての歴代保持者がすでに登録されています。');return}
 const approved=confirm(`11タイトルの歴代表から、未登録の ${inserts.length} 期を追加しますか？\n登録済みの同一保持者：${skipped.length}件（スキップ）\n保持者が異なる期：${conflicts.length}件（スキップ・確認必要）\n\nタイトル・期・勝者・シリーズ勝敗・敗者を保存します。既存記録は変更しません。`);
 if(!approved)return;
 // Revalidate after confirmation, then add; do not permit duplicate inserts.
 const stamp=new Date().toISOString();
 for(const r of inserts){
  if(db.titles.some(x=>seriesTitleKey(x.title)===seriesTitleKey(r.title)&&titleEditionKey(x.edition)===titleEditionKey(r.edition)))continue;
  const p=db.people.find(x=>histKey(x.name)===histKey(r.winner));
  const personId=p?.id||ensurePerson(r.holder);
  const note=r.loser==='未確認'?`番勝負 ${r.score}、敗者名は原画像を再確認`:`番勝負 ${r.score}、対戦相手：${histName(r.loser)}`;
  db.titles.push({id:uid(),title:r.title,edition:r.edition,personId,defenses:'',start:'',end:'',notes:note,createdAt:stamp,updatedAt:stamp});
 }
 await persist();
 titleHistoryMode='chronology';
 titleHistoryChoice=titleKey(inserts[0].title);
 render();
 toast(`歴代保持者 ${inserts.length}期を追加しました`);
 if(conflicts.length)alert(`保持者が一致しない既存記録 ${conflicts.length}件は自動変更していません。「番勝負の結果」タブから確認してください。`);
}


const SERIES_CORRECTED_IMPORTS=[
 {title:'王位',edition:'26',oldWinner:'新藤',newWinner:'新藤',oldNote:'番勝負 4-1、対戦相手：佐野貴史',newNote:'番勝負 4-1、対戦相手：泉谷一樹'},
 {title:'竜王',edition:'22',oldWinner:'佐野',newWinner:'行室',oldNote:'番勝負 4-1、対戦相手：天童陸',newNote:'番勝負 4-1、対戦相手：天童陸'},
 {title:'師聖',edition:'32',oldWinner:'佐野',newWinner:'佐野',oldNote:'番勝負 3-0、敗者名は原画像を再確認',newNote:'番勝負 3-0、対戦相手：犬養奏聖'},
 {title:'本丸',edition:'19',oldWinner:'佐野',newWinner:'佐野',oldNote:'番勝負 3-0、対戦相手：大叢',newNote:'番勝負 3-0、対戦相手：犬養奏聖'}
];
const TITLE_CONFIRMED_PERSON_KEYS=["夏目","上川","宮地","立峰","片岡","神代","近藤","門平","丸井","宇田","斎藤","名護","柳生","逢瀬","鈴谷","原田","中村","久慈川","水上","稲田","村上","医崎","蓮見","佐藤","遠藤","千葉"];
function confirmedSeriesCandidates(){
 const titles=[],names=[],conflicts=[];
 for(const fix of SERIES_CORRECTED_IMPORTS){
  const records=db.titles.filter(r=>seriesTitleKey(r.title)===seriesTitleKey(fix.title)&&titleEditionKey(r.edition)===titleEditionKey(fix.edition));
  if(!records.length)continue;
  if(records.length!==1){conflicts.push(fix.title+' 第'+fix.edition+'期（複数の保存記録）');continue}
  const r=records[0];
  if(histKey(getName(r.personId))===histKey(fix.oldWinner)&&String(r.notes||'')===fix.oldNote&&
     !r.start&&!r.end&&(r.defenses===''||r.defenses==null)){
   const needed=histKey(fix.oldWinner)!==histKey(fix.newWinner)||fix.oldNote!==fix.newNote;
   if(needed)titles.push({record:r,fix});
  }else if(histKey(getName(r.personId))!==histKey(fix.newWinner)||String(r.notes||'')!==fix.newNote){
   conflicts.push(fix.title+' 第'+fix.edition+'期（手入力・変更済みの可能性）');
  }
 }
 const targetMap=new Map(TITLE_CONFIRMED_PERSON_KEYS.map(k=>[k,HISTORICAL_NAME_EXPANSIONS[k]]));
 targetMap.set('連見',HISTORICAL_NAME_EXPANSIONS['蓮見']);
 for(const p of db.people){
  const key=normalize(p.name).replace(/[\s　]/g,''),official=targetMap.get(key);
  if(!official||normalize(p.name)===official)continue;
  if(db.people.some(other=>other.id!==p.id&&normalize(other.name)===official)){
   conflicts.push(key+'（正式名の別IDがすでに存在）');
  }else names.push({record:p,official});
 }
 return {titles,names,conflicts};
}
async function applyConfirmedSeriesUpdates(){
 const found=confirmedSeriesCandidates();
 if(!found.titles.length&&!found.names.length){
  alert(found.conflicts.length?'自動修正できる記録はありません。既存の記録と食い違う部分は個別に確認してください。':'確認済みの訂正・氏名は反映済みです。');
  return;
 }
 const message='ユーザー確認済みの訂正を保存します。\n\n番勝負の保存済み記録：'+found.titles.length+'件\n人物名簿の略称から正式名への変更：'+found.names.length+'名\n保護する要確認記録：'+found.conflicts.length+'件\n\n自動登録時の形式が確認できるものだけ更新し、他の記録は上書きしません。続けますか？';
 if(!confirm(message))return;
 const now=new Date().toISOString();
 let titleUpdates=0,nameUpdates=0;
 for(const {record,fix} of found.titles){
  const still=db.titles.find(x=>x.id===record.id);
  if(!still||String(still.notes||'')!==fix.oldNote||histKey(getName(still.personId))!==histKey(fix.oldWinner))continue;
  const person=db.people.find(x=>histKey(x.name)===histKey(fix.newWinner));
  if(!person&&fix.newWinner!==fix.oldWinner)still.personId=ensurePerson(histName(fix.newWinner));
  else if(person)still.personId=person.id;
  still.notes=fix.newNote;still.updatedAt=now;titleUpdates++;
 }
 for(const {record,official} of found.names){
  const still=db.people.find(x=>x.id===record.id);
  if(!still||normalize(still.name)!==normalize(record.name))continue;
  if(db.people.some(x=>x.id!==still.id&&normalize(x.name)===official))continue;
  still.name=official;still.updatedAt=now;nameUpdates++;
 }
 if(titleUpdates||nameUpdates)await persist();
 render();toast('番勝負の修正 '+titleUpdates+'件・氏名の統一 '+nameUpdates+'名');
 if(found.conflicts.length)alert(found.conflicts.length+'件は自動変更せず保護しました。必要に応じて「保存済み記録の編集」で確認してください。');
}

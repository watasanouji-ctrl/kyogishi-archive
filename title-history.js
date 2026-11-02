'use strict';
// Title-holder history is derived from db.titles, keeping the user's records untouched.
let titleHistoryMode='chronology',titleHistoryChoice='',titleHistoryOrder='asc';
function titleKey(value){return normalize(value).replace(/\s+/g,'').toLocaleLowerCase('ja-JP')}

function titleEditionNo(value){const m=normalize(value).match(/^(?:第)?([0-9]+)(?:期)?$/);return m?Number(m[1]):null}

function titleEditionKey(value){const n=titleEditionNo(value);return n===null?'raw:'+titleKey(value):'num:'+n}

function titleHolderKey(id){const p=db.people.find(x=>x.id===id);return p?'person:'+histKey(p.name):'unknown:'+String(id||'')}

function titleHolderName(id){const name=getName(id);return histName(name)}

function titleGroups(){
 const groups=new Map();
 for(const r of db.titles||[]){
  const title=normalize(r.title)||'（タイトル名未設定）',key=titleKey(title);
  if(!groups.has(key))groups.set(key,{key,title,rows:[]});
  groups.get(key).rows.push(r);
 }
 const compare=(a,b)=>{
  const an=titleEditionNo(a.edition),bn=titleEditionNo(b.edition);
  if(an!==null&&bn!==null&&an!==bn)return an-bn;
  if(an!==null&&bn===null)return -1;
  if(an===null&&bn!==null)return 1;
  return String(a.edition||'').localeCompare(String(b.edition||''),'ja', {numeric:true})||
    String(a.start||'').localeCompare(String(b.start||''))||timeVal(a)-timeVal(b);
 };
 return [...groups.values()].map(g=>{
  g.rows.sort(compare);
  const keys=new Set(),duplicateKeys=new Set(),uniqueHolders=new Set();
  for(const r of g.rows){
   const edition=titleEditionKey(r.edition);
   if(keys.has(edition))duplicateKeys.add(edition);
   keys.add(edition);uniqueHolders.add(titleHolderKey(r.personId));
  }
  g.periodCount=keys.size;g.holderCount=uniqueHolders.size;
  g.duplicates=duplicateKeys;
  return g;
 }).sort((a,b)=>a.title.localeCompare(b.title,'ja'));
}

function titleStatsPeople(groups){
 const people=new Map(),byTitleEdition=new Set();
 for(const g of groups)for(const r of g.rows){
  const unique=JSON.stringify([g.key,titleEditionKey(r.edition),titleHolderKey(r.personId)]);
  if(byTitleEdition.has(unique))continue;
  byTitleEdition.add(unique);
  const key=titleHolderKey(r.personId);
  if(!people.has(key))people.set(key,{name:titleHolderName(r.personId),key,periods:0,titles:new Set()});
  const p=people.get(key);p.periods++;p.titles.add(g.title);
 }
 return [...people.values()].sort((a,b)=>b.periods-a.periods||b.titles.size-a.titles.size||a.name.localeCompare(b.name,'ja'));
}

function titleHistoryPage(){
 const groups=titleGroups();
 const selected=groups.find(g=>g.key===titleHistoryChoice)||groups[0];
 const selectedKey=selected?.key||'';
 const allRows=groups.reduce((n,g)=>n+g.rows.length,0);
 const actions=`<div class="heading-actions"><button class="btn ghost" data-title-bulk="1">＋ まとめて登録</button><button class="btn primary" data-open="titles">＋ 1件登録</button></div>`;
 const tabs=`<div class="tab-controls"><button class="btn ${titleHistoryMode==='chronology'?'primary':'ghost'}" data-title-mode="chronology">タイトル別の歴代</button><button class="btn ${titleHistoryMode==='holders'?'primary':'ghost'}" data-title-mode="holders">選手別の保持記録</button><button class="btn ${titleHistoryMode==='edit'?'primary':'ghost'}" data-title-mode="edit">登録一覧・編集</button></div>`;
 const intro=`<div class="heading"><div><div class="overline">Archive / Championship history</div><h2>歴代タイトルホルダー</h2><p class="subtext">保存済みのタイトル保持記録を、タイトル別・人物別に振り返ります。未登録の歴史は推測で埋めません。</p></div>${actions}</div>${tabs}`;
 if(titleHistoryMode==='edit')return intro+recordsPage('titles');
 if(!groups.length)return intro+`<div class="empty"><div class="symbol">♜</div><h3>タイトル保持記録がまだありません</h3><p>1件ずつ登録するか、CSV形式の一覧をまとめて貼り付けると、歴代表が自動作成されます。</p><button class="btn primary" data-title-bulk="1">歴代保持者をまとめて登録</button></div>`;
 const duplicates=groups.reduce((n,g)=>n+g.duplicates.size,0);
 const note=`<p class="mini-note">表示は登録済みの範囲のみです。連覇数・通算獲得回数・現在の保持者は、欠落した期があると確定できないため推測しません。${duplicates?`同じタイトル・同一期に複数記録がある箇所が ${duplicates} 件あります。原本を確認してください。`:''}</p>`;
 if(titleHistoryMode==='holders'){
  const people=titleStatsPeople(groups);
  return intro+`<div class="stats th-stats"><div class="stat"><div class="num">${groups.length}</div><div class="lbl">登録タイトル種類</div></div><div class="stat"><div class="num">${allRows}</div><div class="lbl">保持記録</div></div><div class="stat"><div class="num">${people.length}</div><div class="lbl">保持者数</div></div></div><div class="section-title"><h3>選手別・保持期数</h3></div>${people.map((p,i)=>`<div class="th-person"><span class="th-rank">${i+1}</span><div class="th-person-name"><strong>${esc(p.name)}</strong><small>${esc([...p.titles].sort((a,b)=>a.localeCompare(b,'ja')).join('・'))}</small></div><strong>${p.periods}期</strong></div>`).join('')}<p class="mini-note">「保持期数」は登録されたタイトル・期の数です。タイトル獲得回数・防衛回数とは異なります。同じ期の同一人物の重複レコードは集計から除いています。</p>`+note;
 }
 const rows=titleHistoryOrder==='desc'?[...selected.rows].reverse():selected.rows;
 const entries=rows.map((r,i)=>{
  const number=titleEditionNo(r.edition),duplicate=selected.duplicates.has(titleEditionKey(r.edition));
  const date=(r.start||r.end)?`<div class="th-meta">${r.start?`開始 ${esc(r.start)}`:''}${r.end?` ・ 終了 ${esc(r.end)}`:''}</div>`:'';
  const def=String(r.defenses??'').trim()?`<span class="tag">防衛 ${esc(r.defenses)} 回</span>`:'';
  return `<article class="th-entry"><div class="th-edition">${number!==null?`第${number}期`:esc(r.edition||'期数未設定')}</div><div class="th-info"><strong>${esc(titleHolderName(r.personId))}</strong>${date}${r.notes?`<div class="th-note">${esc(r.notes)}</div>`:''}${duplicate?'<div class="th-warning">同一期に複数の保持記録があります</div>':''}</div><div class="th-action">${def}<button class="btn small ghost" data-edit="titles" data-id="${attr(r.id)}">編集</button></div></article>`;
 }).join('');
 const choice=`<div class="th-toolbar"><label for="title-history-choice">タイトルを選択</label><select id="title-history-choice" class="filter" aria-label="タイトルを選択">${groups.map(g=>`<option value="${attr(g.key)}" ${g.key===selectedKey?'selected':''}>${esc(g.title)}（${g.periodCount}期）</option>`).join('')}</select><label for="title-history-order">表示順</label><select id="title-history-order" class="filter"><option value="asc" ${titleHistoryOrder==='asc'?'selected':''}>古い期から</option><option value="desc" ${titleHistoryOrder==='desc'?'selected':''}>新しい期から</option></select></div>`;
 return intro+`<div class="stats th-stats"><div class="stat"><div class="num">${groups.length}</div><div class="lbl">登録タイトル種類</div></div><div class="stat"><div class="num">${selected.periodCount}</div><div class="lbl">${esc(selected.title)}の登録期数</div></div><div class="stat"><div class="num">${selected.holderCount}</div><div class="lbl">歴代保持者</div></div></div>${choice}<div class="section-title"><h3>${esc(selected.title)}・歴代保持記録</h3><span class="small-pale">${selected.rows.length}件</span></div><div class="th-timeline">${entries}</div>${note}`;
}

function titleBulkForm(){
 $('#modal-root').innerHTML=`<div class="modaloverlay" data-overlay="1"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="title-bulk-heading"><div class="modal-top"><h2 id="title-bulk-heading">歴代タイトル保持者・まとめて登録</h2><button class="iconbtn" type="button" data-close="1">×</button></div><form id="title-bulk-form"><p class="subtext">1行につき1期。列の順番は「タイトル名,期,保持者名,防衛回数,開始日,終了日,備考」。段位や現在の保持タイトルは人物名に付けず、氏名のみ入力してください。</p>${f('rows','歴代保持記録','',{wide:true,required:true,kind:'textarea',placeholder:'タイトルA,1,選手A,2,2020-01-01,2020-12-31,\\nタイトルA,2,選手B,,,,',help:'カンマまたはタブ区切り。日付と防衛数と備考は空欄可。列名のヘッダー行は自動でスキップします。'})}<p class="mini-note">既存の同タイトル・同期は追加せずスキップ。異なる保持者が同じ期に指定された場合は全件を中止し、修正を促します。まとめて登録しても既存データは置き換えません。</p><div class="formfoot"><button class="btn ghost" type="button" data-close="1">キャンセル</button><button class="btn primary" type="submit">確認して一括登録</button></div></form></section></div>`;
}

async function saveTitleBulk(form){
 const rows=String(new FormData(form).get('rows')||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
 if(!rows.length)throw Error('記録を入力してください');
 const staged=[],seen=new Map();
 for(const r of db.titles||[]){
  const key=JSON.stringify([titleKey(r.title),titleEditionKey(r.edition)]);
  if(!seen.has(key))seen.set(key,{holder:titleHolderKey(r.personId),existing:true});
 }
 let skipped=0;
 for(let i=0;i<rows.length;i++){
  const cols=parseLine(rows[i]), [rawTitle='',rawEdition='',rawHolder='',rawDef='',rawStart='',rawEnd='',...noteParts]=cols;
  const title=normalize(rawTitle).replace(/^\uFEFF/,'');
  if(['タイトル名','タイトル','title'].includes(title.toLowerCase())&&['期','期数','edition','回'].includes(normalize(rawEdition).toLowerCase()))continue;
  const edition=normalize(rawEdition),person=normalize(rawHolder);
  if(!title||!edition||!person)throw Error(`${i+1}行目：タイトル名・期数・保持者名は必須です`);
  if(titleEditionNo(edition)===null||titleEditionNo(edition)<1)throw Error(`${i+1}行目：期数は1以上の数字で指定してください`);
  const defense=normalize(rawDef);
  if(defense&&(!/^\d+$/.test(defense)))throw Error(`${i+1}行目：防衛回数は0以上の整数で指定してください`);
  const validDate=x=>{
   if(!x)return true;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
   const d=new Date(x+'T00:00:00Z');
   return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===x;
  };
  const start=normalize(rawStart),end=normalize(rawEnd);
  if(!validDate(start)||!validDate(end))throw Error(`${i+1}行目：日付はYYYY-MM-DD形式で入力してください`);
  if(start&&end&&start>end)throw Error(`${i+1}行目：終了日が開始日より前です`);
  const key=JSON.stringify([titleKey(title),titleEditionKey(edition)]),holder='person:'+histKey(person);
  if(seen.has(key)){
   const old=seen.get(key);
   if(old.holder!==holder)throw Error(`${i+1}行目：${title} 第${titleEditionNo(edition)}期は別の保持者で登録済みです。既存記録を確認してください`);
   skipped++;continue;
  }
  seen.set(key,{holder,existing:false});
  staged.push({title,edition:String(titleEditionNo(edition)),person,defenses:defense,start,end,notes:normalize(noteParts.join(','))});
 }
 if(!staged.length){closeModal();render();toast(`重複 ${skipped} 件：追加はありません`);return}
 for(const r of staged){
  // Reuse a known existing person ID for confirmed name variants only.
  const matches=db.people.filter(p=>histKey(p.name)===histKey(r.person));
  const id=matches.length?matches[0].id:ensurePerson(histName(r.person));
  db.titles.push({id:uid(),title:r.title,edition:r.edition,personId:id,defenses:r.defenses,start:r.start,end:r.end,notes:r.notes,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
 }
 await persist();titleHistoryMode='chronology';titleHistoryChoice=titleKey(staged[0].title);closeModal();render();toast(`${staged.length}件追加${skipped?`・${skipped}件スキップ`:''}`);
}

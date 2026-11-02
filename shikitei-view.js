'use strict';
// Read-only preview; explicit user confirmation is needed before safe import into db.
let stkTerm=42,stkRound='all';
function stkValidate(p){
 const errors=[],byCode=new Map(p.rows.map(row=>[row.key,row])),fixtures=new Map();
 if(p.rows.length!==9||byCode.size!==9)errors.push('9名の選手キーに不一致');
 for(const row of p.rows){
  const parts=row.fixture.split(',');
  if(parts.length!==9)errors.push(row.name+'の回戦数不一致');
  const w=parts.filter(v=>v[0]==='W').length,l=parts.filter(v=>v[0]==='L').length,bye=parts.filter(v=>v==='-').length;
  if(row.w!==w||row.l!==l||bye!==1)errors.push(row.name+'の勝敗または休場に不一致');
  for(const [i,token] of parts.entries()){
   if(token==='-')continue;
   const code=token.slice(1),other=byCode.get(code);
   if(!other||code===row.key||!['W','L'].includes(token[0])){errors.push(row.name+'の第'+(i+1)+'回戦の相手が不正');continue}
   const k=JSON.stringify([i+1,...[row.key,other.key].sort()]);
   if(!fixtures.has(k))fixtures.set(k,[]);
   fixtures.get(k).push({row,other,outcome:token[0],round:i+1});
  }
 }
 const matches=[];
 for(const [key,found] of fixtures){
  if(found.length!==2||found[0].row.key!==found[1].other.key||found[1].row.key!==found[0].other.key||
     found[0].outcome===found[1].outcome){errors.push('双方の勝敗が不一致 '+key);continue}
  const x=found[0],winner=x.outcome==='W'?x.row:x.other,loser=x.outcome==='L'?x.row:x.other;
  matches.push({round:x.round,a:x.row.name,b:x.other.name,winner:winner.name,loser:loser.name});
 }
 if(matches.length!==36)errors.push('確定対戦の件数が36と一致しません');
 for(let round=1;round<=9;round++)if(matches.filter(m=>m.round===round).length!==4)errors.push('第'+round+'回戦の試合数が不一致');
 const total=p.rows.reduce((acc,r)=>{acc.w+=r.w;acc.l+=r.l;return acc},{w:0,l:0});
 if(total.w!==36||total.l!==36)errors.push('期の総勝敗が一致しません');
 return {matches:matches.sort((a,b)=>a.round-b.round||a.a.localeCompare(b.a,'ja')),errors};
}

function stkExistingPerson(name){
 const key=histKey(name),found=db.people.filter(x=>histKey(x.name)===key);
 return found.find(x=>normalize(x.name)===histName(key))||(found.length===1?found[0]:null);
}

function stkPrepared(terms){
 const chosen=SHIKITEI_HISTORIES.filter(p=>terms.includes(p.term)),roster=[],matches=[],problems=[],known={roster:0,matches:0};
 for(const p of chosen){
  const data=stkValidate(p);
  if(data.errors.length){problems.push(...data.errors.map(e=>`第${p.term}期：${e}`));continue}
  const existingRoster=db.leagues.filter(r=>r.league==='shikitei'&&sortNum(r.term)===p.term);
  const existingMatches=db.matches.filter(m=>m.league==='shikitei'&&sortNum(m.term)===p.term);
  for(const row of p.rows){
   const key=histKey(row.name),found=existingRoster.filter(x=>histKey(getName(x.personId))===key);
   if(found.length>1){problems.push(`第${p.term}期 ${row.name}：同一人物の重複在籍`);continue}
   const old=found[0];
   const expected={startRank:String(row.seed),wins:String(row.w),losses:String(row.l),result:row.result};
   const fields={};
   if(old){
    known.roster++;
    for(const [field,value] of Object.entries(expected)){
     if(!value)continue;
     if(old[field]==null||String(old[field]).trim()==='')fields[field]=value;
     else if(String(old[field]).trim()!==value)problems.push(`第${p.term}期 ${row.name}：既存の${field}と提供表が不一致`);
    }
   }
   roster.push({period:p,row,old,fields});
  }
  for(const fixture of data.matches){
   const keyA=histKey(fixture.a),keyB=histKey(fixture.b);
   const same=existingMatches.filter(m=>sortNum(m.round)===fixture.round&&
     [histKey(getName(m.playerAId)),histKey(getName(m.playerBId))].sort().join('|')===[keyA,keyB].sort().join('|'));
   if(same.length>1){problems.push(`第${p.term}期 第${fixture.round}回戦 ${fixture.a}―${fixture.b}：重複対戦`);continue}
   const conflict=existingMatches.some(m=>!same.some(s=>s.id===m.id)&&
      sortNum(m.round)===fixture.round&&
      [m.playerAId,m.playerBId].some(id=>[keyA,keyB].includes(histKey(getName(id)))));
   if(conflict){problems.push(`第${p.term}期 第${fixture.round}回戦 ${fixture.a}―${fixture.b}：保存済みの対戦相手と不一致`);continue}
   const old=same[0];
   if(old){
    if(old.outcome==='pending'||old.outcome==='draw'||histKey(getName(old.winnerId))!==histKey(fixture.winner)){
     problems.push(`第${p.term}期 第${fixture.round}回戦 ${fixture.a}―${fixture.b}：保存済み勝敗と不一致`);continue;
    }
    known.matches++;continue;
   }
   matches.push({period:p,fixture});
  }
 }
 return {chosen,roster,matches,problems,known};
}

async function stkImport(terms){
 const pendingNames=confirmedNamePlan();
 if(pendingNames.moves.size||pendingNames.renames.length){alert('保存済みの人物名に旧表記があります。先に「正式氏名を保存データへ反映」を実行してください。');return}
 const plan=stkPrepared(terms);
 if(plan.problems.length){alert('既存の記録と食い違いがあるため、上書きせず中止しました。\n'+plan.problems.slice(0,7).join('\n'));return}
 const newRoster=plan.roster.filter(x=>!x.old).length;
 const updatedRoster=plan.roster.filter(x=>x.old&&Object.keys(x.fields).length).length;
 if(!newRoster&&!updatedRoster&&!plan.matches.length){toast('対象の記録はすべて登録済みです');return}
 const label=plan.chosen.map(x=>'第'+x.term+'期').join('・');
 if(!confirm(label+'の式帝戦リーグ結果を保存します。\n参加者新規 '+newRoster+'人／空欄補完 '+updatedRoster+'人／確定対戦新規 '+plan.matches.length+'件\n\n選手名はユーザー確認済みの正式名で登録します。既存の勝敗は上書きしません。続けますか？'))return;
 const stamp=new Date().toISOString();
 for(const {period:p,row,old,fields} of plan.roster){
  if(old){if(Object.keys(fields).length){Object.assign(old,fields);old.updatedAt=stamp}continue}
  const person=stkExistingPerson(row.name),personId=person?.id||ensurePerson(row.name);
  db.leagues.push({id:uid(),league:'shikitei',term:String(p.term),personId,
    startRank:String(row.seed),rank:'',wins:String(row.w),losses:String(row.l),draws:'',
    result:row.result,notes:`第${p.term}期式帝戦・提供画像から転記。順位番号は画像の記載を保持（最終順位とは未確認）。${p.playoff&&row.key===p.champion?'挑戦権はプレーオフ勝利。':''}`,
    createdAt:stamp,updatedAt:stamp});
 }
 for(const {period:p,fixture:m} of plan.matches){
  const a=stkExistingPerson(m.a),b=stkExistingPerson(m.b),winner=stkExistingPerson(m.winner);
  if(!a||!b||!winner)throw Error(`人物が未登録：第${p.term}期 ${m.a} / ${m.b}`);
  db.matches.push({id:uid(),league:'shikitei',term:String(p.term),round:String(m.round),
   playerAId:a.id,playerBId:b.id,winnerId:winner.id,outcome:'normal',
   notes:'提供画像の双方の勝敗から照合済み',createdAt:stamp,updatedAt:stamp});
 }
 await persist();render();toast(label+'：参加者'+newRoster+'名・対戦'+plan.matches.length+'件を追加');
}

function stkPage(){
 const p=SHIKITEI_HISTORIES.find(x=>x.term===stkTerm)||SHIKITEI_HISTORIES[0],data=stkValidate(p),plan=stkPrepared([p.term]),namePlan=confirmedNamePlan();
 const names=new Map(p.rows.map(x=>[x.key,x.name]));
 const matches=data.matches.filter(x=>stkRound==='all'||x.round===Number(stkRound));
 const table=p.rows.map(row=>`<tr><td>${row.seed}</td><td><strong>${esc(row.name)}</strong></td><td>${row.w}勝${row.l}敗</td><td>${row.result?`<strong>${esc(row.result)}</strong>`:'—'}</td></tr>`).join('');
 const rounds=Array.from({length:9},(_,n)=>n+1).filter(n=>stkRound==='all'||Number(stkRound)===n).map(n=>{
  const list=matches.filter(x=>x.round===n);
  const bye=p.rows.find(x=>x.fixture.split(',')[n-1]==='-');
  return `<section class="settingbox"><div class="career-head"><h3>第${n}回戦</h3><span class="small-pale">休み：${esc(bye?.name||'要確認')}</span></div>
   <div class="career-period-list">${list.map(m=>`<div class="career-period"><div><strong>${esc(m.winner)}</strong><small>○ 勝ち</small></div><div class="career-period-right"><strong>○―●</strong><span>${esc(m.loser)}</span></div></div>`).join('')}</div></section>`;
 }).join('');
 return `<div class="heading"><div><div class="overline">Archive / Shikitei qualifying league</div>
 <h2>式帝戦・第42〜45期</h2><p class="subtext">9名制・各期36対戦。提供された4枚の順位戦表から、双方の○●を照合して復元。</p></div></div>
 <div class="career-filters"><label>期を選択<select id="stk-term" class="filter">${SHIKITEI_HISTORIES.map(x=>`<option value="${x.term}" ${p.term===x.term?'selected':''}>第${x.term}期</option>`).join('')}</select></label>
 <label>回戦<select id="stk-round" class="filter"><option value="all" ${stkRound==='all'?'selected':''}>すべて</option>${Array.from({length:9},(_,i)=>i+1).map(n=>`<option value="${n}" ${Number(stkRound)===n?'selected':''}>第${n}回戦</option>`).join('')}</select></label></div>
 <div class="stats career-summary"><div class="stat"><div class="num">${p.rows.length}</div><div class="lbl">参加者</div></div><div class="stat"><div class="num">${data.matches.length}</div><div class="lbl">照合済み対戦</div></div><div class="stat"><div class="num">${plan.known.matches}</div><div class="lbl">アプリ登録済み</div></div></div>
 <div class="notice"><strong>第${p.term}期 挑戦権：</strong>${esc(names.get(p.champion)||p.champion)} ${p.playoff?'（6勝2敗の3人同率からプレーオフ勝利。POの個別対戦は未登録）':'（7勝1敗）'}。
 『順位』の数字は画像記載の番号で、同じ数字の選手もいます。正式な最終順位とはみなさず、順位戦データの開幕順位欄へ仮登録します。</div>
 <div class="section-title"><h3>出場者と勝敗</h3><span class="small-pale">全9名・各8対戦</span></div>
 <table class="stk-table"><thead><tr><th>順位番号</th><th>氏名</th><th>成績</th><th>結果</th></tr></thead><tbody>${table}</tbody></table>
 <div class="a21-savebar">${namePlan.moves.size||namePlan.renames.length?'<button class="btn primary" data-stk-names="1">正式氏名を保存データへ反映</button>':''}<button class="btn primary" data-stk-import="${p.term}">この期を保存</button><button class="btn ghost" data-stk-import="all">4期まとめて保存</button><button class="btn ghost" data-stk-open="${p.term}">通常のリーグ表を開く</button></div>
 ${plan.problems.length?`<p class="mini-note">要確認：${esc(plan.problems.slice(0,3).join('／'))}。保存済みデータを上書きせず保護します。</p>`:''}
 <p class="mini-note"><strong>原画像の注意点：</strong>第45期・鈴村の第2回戦の相手は「鈴村」と印字されていますが、同回戦の中井の記録「● 鈴村」と組み合わせて「鈴村○―●中井」と復元しています。ユーザーの確認により、「菅原理鳥→菅原璃烏」「乙葉凛珊→乙葉莉胡」「中原伊也→中原吉哉」に統一しました。保存済みの旧表記は「正式氏名を保存データへ反映」で対戦・保持記録の参照を保ったまま統合できます。</p>
 <div class="section-title"><h3>回戦別結果</h3></div>${rounds}
 <p class="mini-note">第44期のプレーオフは勝利者のみ確定しているため、リーグの36対戦に試合を追加していません。現在のデータは端末・クラウドに保存するまで参照専用です。</p>`;
}

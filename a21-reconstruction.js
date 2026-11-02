'use strict';
// A-class period 21: user-confirmed final scores and Sano order; 36 fixtures are a non-historical provisional pairing draw.
let a21Round='all',a21Draft={};
const A21_PLAYERS=[{"name":"佐野貴史","rank":1,"wins":8,"losses":1,"result":"挑戦"},{"name":"海部彩人","rank":2,"wins":3,"losses":6,"result":""},{"name":"行室翔","rank":3,"wins":6,"losses":3,"result":""},{"name":"河村伸之","rank":4,"wins":3,"losses":6,"result":""},{"name":"泉谷一樹","rank":5,"wins":5,"losses":4,"result":""},{"name":"榎本春彦","rank":6,"wins":5,"losses":4,"result":""},{"name":"高橋幸雄","rank":7,"wins":2,"losses":7,"result":"降級"},{"name":"新藤栄太","rank":8,"wins":4,"losses":5,"result":""},{"name":"天童陸","rank":9,"wins":5,"losses":4,"result":""},{"name":"一ノ瀬光樹","rank":10,"wins":4,"losses":5,"result":""}];
const A21_SANO=[["榎本春彦","佐野貴史"],["新藤栄太","新藤栄太"],["河村伸之","佐野貴史"],["泉谷一樹","佐野貴史"],["一ノ瀬光樹","佐野貴史"],["天童陸","佐野貴史"],["行室翔","佐野貴史"],["海部彩人","佐野貴史"],["高橋幸雄","佐野貴史"]];
function a21Games(){
 const arr=A21_SANO.map(x=>x[0]),out=[];
 for(let r=0;r<9;r++){
  const rotated=[...arr.slice(r),...arr.slice(0,r)];
  out.push({round:r+1,a:'佐野貴史',b:rotated[0],confirmedWinner:A21_SANO[r][1]});
  for(let i=1;i<=4;i++)out.push({round:r+1,a:rotated[i],b:rotated[9-i],confirmedWinner:''});
 }
 return out;
}

function a21GameKey(game){return JSON.stringify([game.round,histKey(game.a),histKey(game.b)].join('|'))}

function a21SavedGame(game){
 const a=histKey(game.a),b=histKey(game.b);
 return db.matches.filter(m=>m.league==='s'&&sortNum(m.term)===21&&sortNum(m.round)===game.round&&
  ((histKey(getName(m.playerAId))===a&&histKey(getName(m.playerBId))===b)||(histKey(getName(m.playerAId))===b&&histKey(getName(m.playerBId))===a)));
}

function a21SavedWinner(match){
 if(!match||match.outcome==='pending')return '';
 if(match.outcome==='draw')return '引分';
 return match.winnerId?histKey(getName(match.winnerId)):'';
}

function a21Prepared(){
 const games=a21Games(),existing=db.matches.filter(m=>m.league==='s'&&sortNum(m.term)===21),proposals=[],issues=[],seen=new Set();
 for(const g of games){
  const proposed=g.confirmedWinner||a21Draft[a21GameKey(g)]||'';
  if(!proposed)continue;
  const winner=histKey(proposed),a=histKey(g.a),b=histKey(g.b);
  if(winner!==a&&winner!==b){issues.push(`第${g.round}回戦：勝者が対戦者と一致しません`);continue;}
  const same=a21SavedGame(g);
  if(same.length>1){issues.push(`第${g.round}回戦：${g.a}対${g.b}が重複登録されています`);continue;}
  const collision=existing.some(m=>{
   if(same.some(x=>x.id===m.id))return false;
   const ma=histKey(getName(m.playerAId)),mb=histKey(getName(m.playerBId));
   return (sortNum(m.round)===g.round&&(ma===a||ma===b||mb===a||mb===b))||
     ((ma===a&&mb===b)||(ma===b&&mb===a));
  });
  if(collision){issues.push(`第${g.round}回戦：${g.a}対${g.b}と既存の対戦表に食い違いがあります`);continue;}
  const previous=same[0],old=a21SavedWinner(previous);
  if(old&&old!==winner){issues.push(`第${g.round}回戦：${g.a}対${g.b}の保存済み勝者と異なります`);continue;}
  if(!old){const key=a21GameKey(g);if(!seen.has(key)){proposals.push({game:g,winner,old:previous});seen.add(key)}}
 }
 const rosters=A21_PLAYERS.map(p=>{
  const r=db.leagues.find(x=>x.league==='s'&&sortNum(x.term)===21&&histKey(getName(x.personId))===histKey(p.name));
  const fields={};
  if(r){
   for(const [k,value] of [['startRank',p.rank],['wins',p.wins],['losses',p.losses],['result',p.result]]){
    if(k==='result'&&!value)continue;
    if(r[k]==null||String(r[k]).trim()===''){fields[k]=String(value);continue;}
    if(String(r[k]).trim()!==String(value))issues.push(`${p.name}：登録済みの${k}が提供データと異なります`);
   }
  }
  return {player:p,record:r,fields};
 });
 // Never convert a provisional draw into a historical result: only explicitly selected winners are staged.
 const extra=proposals.filter(x=>!x.game.confirmedWinner);
 const counts=new Map(A21_PLAYERS.map(x=>[histKey(x.name),{w:0,l:0,goalW:x.wins,goalL:x.losses}]));
 const proposedEvents=games.map(g=>{
  const match=a21SavedGame(g)[0];
  const winner=a21SavedWinner(match)||g.confirmedWinner||a21Draft[a21GameKey(g)]||'';
  return winner?{g,winner:histKey(winner)}:null;
 }).filter(Boolean);
 for(const {g,winner} of proposedEvents){
  const a=counts.get(histKey(g.a)),b=counts.get(histKey(g.b));
  if(!a||!b)continue;
  const aWin=winner===histKey(g.a);a.w+=aWin?1:0;a.l+=aWin?0:1;b.w+=aWin?0:1;b.l+=aWin?1:0;
 }
 for(const [key,c] of counts){
  if(c.w>c.goalW||c.l>c.goalL)issues.push(`${histName(key)}：入力結果が最終成績 ${c.goalW}勝${c.goalL}敗を超過します`);
 }
 return {games,proposals,rosters,issues,counts,extras:extra};
}

function a21Sheet(){
 const prep=a21Prepared(),games=prep.games;
 const completed=games.filter(g=>a21SavedGame(g).some(m=>a21SavedWinner(m))).length;
 const chosen=games.filter(g=>a21Draft[a21GameKey(g)]).length;
 const scope=a21Round==='all'?games:games.filter(g=>g.round===Number(a21Round));
 const seasonSaved=prep.rosters.filter(p=>p.record).length;
 const summary=A21_PLAYERS.map(p=>{
  const c=prep.counts.get(histKey(p.name)),remainingW=Math.max(0,p.wins-c.w),remainingL=Math.max(0,p.losses-c.l);
  return `<div class="a21-person"><span class="a21-start">${p.rank}</span><strong>${esc(p.name)}</strong><span class="a21-goal">${p.wins}勝${p.losses}敗</span><span class="a21-progress">${c.w}勝${c.l}敗 入力済み${remainingW+remainingL?`／残り${remainingW}勝${remainingL}敗`:''}</span>${p.result?`<span class="tag">${esc(p.result)}</span>`:''}</div>`;
 }).join('');
 const schedules=Array.from({length:9},(_,n)=>n+1).filter(n=>a21Round==='all'||Number(a21Round)===n).map(n=>{
  const fixtures=games.filter(g=>g.round===n),ready=fixtures.filter(g=>a21SavedGame(g).some(m=>a21SavedWinner(m))).length;
  const rows=fixtures.map(g=>{
   const saved=a21SavedGame(g),stored=saved[0],winner=a21SavedWinner(stored),locked=!!g.confirmedWinner;
   const selected=a21Draft[a21GameKey(g)]||winner||'';
   const classes=a=>`a21-win ${selected===histKey(a)?'on':''}`;
   const badge=locked?'<span class="tag">佐野の結果確認済み</span>':winner?'<span class="tag">保存済み</span>':selected?'<span class="tag">保存前・選択中</span>':'<span class="a21-provisional">仮組合せ・結果未確認</span>';
   return `<div class="a21-fixture"><div class="a21-team">${esc(g.a)}</div><div class="a21-buttons">${locked?
    `<span class="a21-fixed">${histKey(g.confirmedWinner)===histKey(g.a)?'○':'●'} － ${histKey(g.confirmedWinner)===histKey(g.b)?'○':'●'}</span>`:
    `<button class="${classes(g.a)}" type="button" data-a21-pick="${attr(a21GameKey(g))}" data-a21-winner="${attr(histKey(g.a))}" ${winner?'disabled':''}>○</button><button class="${classes(g.b)}" type="button" data-a21-pick="${attr(a21GameKey(g))}" data-a21-winner="${attr(histKey(g.b))}" ${winner?'disabled':''}>○</button>${selected&&!winner?`<button class="btn small ghost" data-a21-clear="${attr(a21GameKey(g))}">取消</button>`:''}`
   }</div><div class="a21-team">${esc(g.b)}</div><div class="a21-state">${badge}</div></div>`;
  }).join('');
  return `<section class="settingbox a21-round"><div class="career-head"><h3>第${n}回戦</h3><span class="small-pale">保存済み ${ready}/5対戦</span></div><div class="a21-fixtures">${rows}</div></section>`;
 }).join('');
 return `<div class="heading"><div><div class="overline">Archive / A-class season 21</div><h2>第21期 A級・復元用リーグ表</h2><p class="subtext">10名総当たり・9回戦。最終勝敗と佐野の対戦順はユーザー確認済み。</p></div><div class="heading-actions"><button class="btn ghost" data-a21-open-season="1">通常の順位戦画面</button></div></div>
 <div class="notice"><strong>史実と仮抽選を区別しています。</strong>佐野の9試合だけは対戦順・勝敗が確定。残る36試合の回戦組み合わせは、総当たりになるよう作った<strong>仮の抽選</strong>です。史実と確かめた組み合わせ・勝者だけ「○」で選択してください。未確認の36試合は保存しません。</div>
 <div class="stats career-summary"><div class="stat"><div class="num">10</div><div class="lbl">参加者</div></div><div class="stat"><div class="num">${completed}/45</div><div class="lbl">保存済み対戦</div></div><div class="stat"><div class="num">${chosen}</div><div class="lbl">今回の追加候補</div></div></div>
 <div class="section-title"><h3>参加者・最終成績</h3><span class="small-pale">開幕順位は仮扱い／公式最終順位は未登録</span></div><div class="a21-roster">${summary}</div>
 <div class="a21-savebar"><button class="btn primary" data-a21-save="1">確認済み記録を保存</button><span class="small-pale">保存済み参加者 ${seasonSaved}/10名、佐野の9対戦は自動補完の対象</span></div>
 ${prep.issues.length?`<p class="mini-note a21-warn">要確認 ${prep.issues.length}件：${prep.issues.slice(0,5).map(esc).join('／')}${prep.issues.length>5?' ほか':''}。食い違いがある場合は、既存記録を保護するため保存を中止します。</p>`:''}
 <div class="section-title"><h3>9回戦の対戦組合せ</h3></div>
 <div class="a21-round-select"><label for="a21-round">表示する回戦</label><select id="a21-round" class="filter"><option value="all" ${a21Round==='all'?'selected':''}>1〜9回戦すべて</option>${Array.from({length:9},(_,i)=>i+1).map(n=>`<option value="${n}" ${String(a21Round)===String(n)?'selected':''}>第${n}回戦</option>`).join('')}</select></div>
 ${schedules}
 <p class="mini-note">この表は戦績復元用。勝敗が不明な対戦は「未確認」のまま。勝敗が決まったら○を押し、保存ボタンを押して確定します。既存の試合を編集するときは「通常の順位戦画面」から行ってください。</p>`;
}

async function a21Save(){
 const p=a21Prepared();
 if(p.issues.length){alert('既存記録と異なる内容があります。保存は行いません。\\n'+p.issues.slice(0,7).join('\\n'));return;}
 const newRoster=p.rosters.filter(r=>!r.record).length,updatedRoster=p.rosters.filter(r=>r.record&&Object.keys(r.fields).length).length,
  news=p.proposals.filter(x=>!x.old).length,update=p.proposals.filter(x=>!!x.old).length;
 if(!(newRoster||updatedRoster||news||update)){toast('追加する記録はありません。保存済みです。');return}
 if(!confirm(`第21期A級へ次の記録を保存します。\\n参加者新規 ${newRoster}名／既存情報の空欄補完 ${updatedRoster}名\\n確定対戦新規 ${news}件／未結果の対戦更新 ${update}件\\n\\n佐野以外の対戦は、○を選んだものだけ登録します。仮抽選そのものは保存しません。続けますか？`))return;
 const now=new Date().toISOString(),ids=new Map();
 for(const {player,record,fields} of p.rosters){
  let pid=record?.personId;
  if(!pid){const person=db.people.find(x=>histKey(x.name)===histKey(player.name));pid=person?.id||ensurePerson(player.name);}
  ids.set(histKey(player.name),pid);
  if(record){
   for(const [k,value] of Object.entries(fields))if(record[k]==null||String(record[k]).trim()==='')record[k]=value;
   if(Object.keys(fields).length)record.updatedAt=now;
  }else db.leagues.push({id:uid(),league:'s',term:'21',personId:pid,startRank:String(player.rank),rank:'',result:player.result,wins:String(player.wins),losses:String(player.losses),draws:'',notes:'第21期A級・最終勝敗のユーザー提供記録。開幕順位は暫定扱い。',createdAt:now,updatedAt:now});
 }
 for(const {game,winner,old} of p.proposals){
  const a=ids.get(histKey(game.a)),b=ids.get(histKey(game.b)),wid=ids.get(winner);
  if(old){
   if(old.outcome!=='pending'||old.winnerId)continue;
   old.winnerId=wid;old.outcome='normal';old.updatedAt=now;
  }else db.matches.push({id:uid(),league:'s',term:'21',round:String(game.round),playerAId:a,playerBId:b,winnerId:wid,outcome:'normal',
    notes:game.confirmedWinner?'提供された佐野の対戦記録（確定）':'復元表から結果を確認して入力',createdAt:now,updatedAt:now});
 }
 await persist();a21Draft={};render();toast(`第21期A級：参加者${newRoster}名、確定対戦${news+update}件を反映`);
}

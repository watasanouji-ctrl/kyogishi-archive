'use strict';
// A-class period 20: final scores, known final ranks, and Sano opponent order are user-confirmed. All game winners remain unknown; other fixtures are a hypothetical round robin.
let a20Round='all',a20Draft={};
const A20_PLAYERS=[{"name":"佐野貴史","rank":1,"wins":7,"losses":2,"result":"挑戦","finalRank":""},{"name":"高橋幸雄","rank":2,"wins":3,"losses":6,"result":"","finalRank":"7"},{"name":"新藤栄太","rank":3,"wins":3,"losses":6,"result":"","finalRank":"8"},{"name":"泉谷一樹","rank":4,"wins":5,"losses":4,"result":"","finalRank":"5"},{"name":"榎本春彦","rank":5,"wins":5,"losses":4,"result":"","finalRank":"6"},{"name":"海部彩人","rank":6,"wins":6,"losses":3,"result":"","finalRank":"2"},{"name":"国松智己","rank":7,"wins":2,"losses":7,"result":"降級","finalRank":""},{"name":"葉山千尋","rank":8,"wins":2,"losses":7,"result":"降級","finalRank":""},{"name":"行室翔","rank":9,"wins":6,"losses":3,"result":"","finalRank":"3"},{"name":"河村伸之","rank":10,"wins":6,"losses":3,"result":"","finalRank":"4"}];
const A20_SANO=[["河村伸之",""],["国松智己",""],["海部彩人",""],["泉谷一樹",""],["榎本春彦",""],["行室翔",""],["葉山千尋",""],["新藤栄太",""],["高橋幸雄",""]];

function a20Games(){
 const arr=A20_SANO.map(x=>x[0]),out=[];
 for(let r=0;r<9;r++){
  const rotated=[...arr.slice(r),...arr.slice(0,r)];
  out.push({round:r+1,a:'佐野貴史',b:rotated[0],confirmedWinner:A20_SANO[r][1]});
  for(let i=1;i<=4;i++)out.push({round:r+1,a:rotated[i],b:rotated[9-i],confirmedWinner:''});
 }
 return out;
}

function a20GameKey(game){return JSON.stringify([game.round,histKey(game.a),histKey(game.b)].join('|'))}

function a20SavedGame(game){
 const a=histKey(game.a),b=histKey(game.b);
 return db.matches.filter(m=>m.league==='s'&&sortNum(m.term)===20&&sortNum(m.round)===game.round&&
  ((histKey(getName(m.playerAId))===a&&histKey(getName(m.playerBId))===b)||(histKey(getName(m.playerAId))===b&&histKey(getName(m.playerBId))===a)));
}

function a20SavedWinner(match){
 if(!match||match.outcome==='pending')return '';
 if(match.outcome==='draw')return '引分';
 return match.winnerId?histKey(getName(match.winnerId)):'';
}

function a20Prepared(){
 const games=a20Games(),existing=db.matches.filter(m=>m.league==='s'&&sortNum(m.term)===20),proposals=[],issues=[],seen=new Set();
 for(const g of games){
  const proposed=g.confirmedWinner||a20Draft[a20GameKey(g)]||'';
  if(!proposed)continue;
  const winner=histKey(proposed),a=histKey(g.a),b=histKey(g.b);
  if(winner!==a&&winner!==b){issues.push(`第${g.round}回戦：勝者が対戦者と一致しません`);continue;}
  const same=a20SavedGame(g);
  if(same.length>1){issues.push(`第${g.round}回戦：${g.a}対${g.b}が重複登録されています`);continue;}
  const collision=existing.some(m=>{
   if(same.some(x=>x.id===m.id))return false;
   const ma=histKey(getName(m.playerAId)),mb=histKey(getName(m.playerBId));
   return (sortNum(m.round)===g.round&&(ma===a||ma===b||mb===a||mb===b))||
     ((ma===a&&mb===b)||(ma===b&&mb===a));
  });
  if(collision){issues.push(`第${g.round}回戦：${g.a}対${g.b}と既存の対戦表に食い違いがあります`);continue;}
  const previous=same[0],old=a20SavedWinner(previous);
  if(old&&old!==winner){issues.push(`第${g.round}回戦：${g.a}対${g.b}の保存済み勝者と異なります`);continue;}
  if(!old){const key=a20GameKey(g);if(!seen.has(key)){proposals.push({game:g,winner,old:previous});seen.add(key)}}
 }
 const rosters=A20_PLAYERS.map(p=>{
  const r=db.leagues.find(x=>x.league==='s'&&sortNum(x.term)===20&&histKey(getName(x.personId))===histKey(p.name));
  const fields={};
  if(r){
   for(const [k,value] of [['startRank',p.rank],['rank',p.finalRank],['wins',p.wins],['losses',p.losses],['result',p.result]]){
    if((k==='result'||k==='rank')&&!value)continue;
    if(r[k]==null||String(r[k]).trim()===''){fields[k]=String(value);continue;}
    if(String(r[k]).trim()!==String(value))issues.push(`${p.name}：登録済みの${k}が提供データと異なります`);
   }
  }
  return {player:p,record:r,fields};
 });
 // Only manually confirmed winners are staged; no individual result (including Sano's) is supplied.
 const extra=proposals.filter(x=>!x.game.confirmedWinner);
 const counts=new Map(A20_PLAYERS.map(x=>[histKey(x.name),{w:0,l:0,goalW:x.wins,goalL:x.losses}]));
 const proposedEvents=games.map(g=>{
  const match=a20SavedGame(g)[0];
  const winner=a20SavedWinner(match)||g.confirmedWinner||a20Draft[a20GameKey(g)]||'';
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

function a20Sheet(){
 const prep=a20Prepared(),games=prep.games;
 const completed=games.filter(g=>a20SavedGame(g).some(m=>a20SavedWinner(m))).length;
 const chosen=games.filter(g=>a20Draft[a20GameKey(g)]).length;
 const scope=a20Round==='all'?games:games.filter(g=>g.round===Number(a20Round));
 const seasonSaved=prep.rosters.filter(p=>p.record).length;
 const summary=A20_PLAYERS.map(p=>{
  const c=prep.counts.get(histKey(p.name)),remainingW=Math.max(0,p.wins-c.w),remainingL=Math.max(0,p.losses-c.l);
  return `<div class="a20-person"><span class="a20-start">${p.rank}</span><strong>${esc(p.name)}</strong><span class="a20-goal">${p.wins}勝${p.losses}敗</span>${p.finalRank?`<span class="tag">最終${p.finalRank}位</span>`:''}<span class="a20-progress">${c.w}勝${c.l}敗 入力済み${remainingW+remainingL?`／残り${remainingW}勝${remainingL}敗`:''}</span>${p.result?`<span class="tag">${esc(p.result)}</span>`:''}</div>`;
 }).join('');
 const schedules=Array.from({length:9},(_,n)=>n+1).filter(n=>a20Round==='all'||Number(a20Round)===n).map(n=>{
  const fixtures=games.filter(g=>g.round===n),ready=fixtures.filter(g=>a20SavedGame(g).some(m=>a20SavedWinner(m))).length;
  const rows=fixtures.map(g=>{
   const saved=a20SavedGame(g),stored=saved[0],winner=a20SavedWinner(stored),locked=!!g.confirmedWinner;
   const selected=a20Draft[a20GameKey(g)]||winner||'';
   const classes=a=>`a20-win ${selected===histKey(a)?'on':''}`;
   const badge=locked?'<span class="tag">結果確認済み</span>':winner?'<span class="tag">保存済み</span>':selected?'<span class="tag">保存前・選択中</span>':(g.a==='佐野貴史'?'<span class="a20-provisional">相手順確定・勝敗未確認</span>':'<span class="a20-provisional">仮組合せ・結果未確認</span>');
   return `<div class="a20-fixture"><div class="a20-team">${esc(g.a)}</div><div class="a20-buttons">${locked?
    `<span class="a20-fixed">${histKey(g.confirmedWinner)===histKey(g.a)?'○':'●'} － ${histKey(g.confirmedWinner)===histKey(g.b)?'○':'●'}</span>`:
    `<button class="${classes(g.a)}" type="button" data-a20-pick="${attr(a20GameKey(g))}" data-a20-winner="${attr(histKey(g.a))}" ${winner?'disabled':''}>○</button><button class="${classes(g.b)}" type="button" data-a20-pick="${attr(a20GameKey(g))}" data-a20-winner="${attr(histKey(g.b))}" ${winner?'disabled':''}>○</button>${selected&&!winner?`<button class="btn small ghost" data-a20-clear="${attr(a20GameKey(g))}">取消</button>`:''}`
   }</div><div class="a20-team">${esc(g.b)}</div><div class="a20-state">${badge}</div></div>`;
  }).join('');
  return `<section class="settingbox a20-round"><div class="career-head"><h3>第${n}回戦</h3><span class="small-pale">保存済み ${ready}/5対戦</span></div><div class="a20-fixtures">${rows}</div></section>`;
 }).join('');
 return `<div class="heading"><div><div class="overline">Archive / A-class season 21</div><h2>第20期 A級・復元用リーグ表</h2><p class="subtext">10名総当たり・9回戦。最終勝敗・一部最終順位と佐野の対戦相手順は確認済み。各回戦の勝敗は未入力。</p></div><div class="heading-actions"><button class="btn ghost" data-a20-open-season="1">通常の順位戦画面</button></div></div>
 <div class="notice"><strong>史実と仮抽選を区別しています。</strong>佐野の9試合は対戦相手の順番のみ確定（勝敗は未確認）。残る36試合の回戦組み合わせは、総当たりになるよう作った<strong>仮の抽選</strong>です。史実と照合できた勝者だけ「○」で選択してください。未確認の36試合は保存しません。</div>
 <div class="stats career-summary"><div class="stat"><div class="num">10</div><div class="lbl">参加者</div></div><div class="stat"><div class="num">${completed}/45</div><div class="lbl">保存済み対戦</div></div><div class="stat"><div class="num">${chosen}</div><div class="lbl">今回の追加候補</div></div></div>
 <div class="section-title"><h3>参加者・最終成績</h3><span class="small-pale">開幕順位は提供された01〜10／確認できた公式最終順位のみ登録</span></div><div class="a20-roster">${summary}</div>
 <div class="a20-savebar"><button class="btn primary" data-a20-save="1">確認済み記録を保存</button><span class="small-pale">保存済み参加者 ${seasonSaved}/10名、佐野も含め、結果が確認できた対戦だけを保存</span></div>
 ${prep.issues.length?`<p class="mini-note a20-warn">要確認 ${prep.issues.length}件：${prep.issues.slice(0,5).map(esc).join('／')}${prep.issues.length>5?' ほか':''}。食い違いがある場合は、既存記録を保護するため保存を中止します。</p>`:''}
 <div class="section-title"><h3>9回戦の対戦組合せ</h3></div>
 <div class="a20-round-select"><label for="a20-round">表示する回戦</label><select id="a20-round" class="filter"><option value="all" ${a20Round==='all'?'selected':''}>1〜9回戦すべて</option>${Array.from({length:9},(_,i)=>i+1).map(n=>`<option value="${n}" ${String(a20Round)===String(n)?'selected':''}>第${n}回戦</option>`).join('')}</select></div>
 ${schedules}
 <p class="mini-note">この表は戦績復元用。勝敗が不明な対戦は「未確認」のまま。勝敗が決まったら○を押し、保存ボタンを押して確定します。既存の試合を編集するときは「通常の順位戦画面」から行ってください。</p>`;
}

async function a20Save(){
 const p=a20Prepared();
 if(p.issues.length){alert('既存記録と異なる内容があります。保存は行いません。\\n'+p.issues.slice(0,7).join('\\n'));return;}
 const newRoster=p.rosters.filter(r=>!r.record).length,updatedRoster=p.rosters.filter(r=>r.record&&Object.keys(r.fields).length).length,
  news=p.proposals.filter(x=>!x.old).length,update=p.proposals.filter(x=>!!x.old).length;
 if(!(newRoster||updatedRoster||news||update)){toast('追加する記録はありません。保存済みです。');return}
 if(!confirm(`第20期A級へ次の記録を保存します。\\n参加者新規 ${newRoster}名／既存情報の空欄補完 ${updatedRoster}名\\n確定対戦新規 ${news}件／未結果の対戦更新 ${update}件\\n\\n佐野を含む全試合について、○を選んだものだけ登録します。仮抽選そのものは保存しません。続けますか？`))return;
 const now=new Date().toISOString(),ids=new Map();
 for(const {player,record,fields} of p.rosters){
  let pid=record?.personId;
  if(!pid){const person=db.people.find(x=>histKey(x.name)===histKey(player.name));pid=person?.id||ensurePerson(player.name);}
  ids.set(histKey(player.name),pid);
  if(record){
   for(const [k,value] of Object.entries(fields))if(record[k]==null||String(record[k]).trim()==='')record[k]=value;
   if(Object.keys(fields).length)record.updatedAt=now;
  }else db.leagues.push({id:uid(),league:'s',term:'20',personId:pid,startRank:String(player.rank),rank:player.finalRank||'',result:player.result,wins:String(player.wins),losses:String(player.losses),draws:'',notes:'第20期A級・ユーザー提供の最終勝敗と一部公式順位。佐野の対戦相手順は確定、各試合結果は未確認。仮抽選は未登録。',createdAt:now,updatedAt:now});
 }
 for(const {game,winner,old} of p.proposals){
  const a=ids.get(histKey(game.a)),b=ids.get(histKey(game.b)),wid=ids.get(winner);
  if(old){
   if(old.outcome!=='pending'||old.winnerId)continue;
   old.winnerId=wid;old.outcome='normal';old.updatedAt=now;
  }else db.matches.push({id:uid(),league:'s',term:'20',round:String(game.round),playerAId:a,playerBId:b,winnerId:wid,outcome:'normal',
    notes:game.confirmedWinner?'提供された佐野の対戦記録（確定）':'復元表から結果を確認して入力',createdAt:now,updatedAt:now});
 }
 await persist();a20Draft={};render();toast(`第20期A級：参加者${newRoster}名、確定対戦${news+update}件を反映`);
}

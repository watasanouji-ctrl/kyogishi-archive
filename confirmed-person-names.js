'use strict';
// Exact spelling unification explicitly confirmed by the user on 2026-11-02.
// Changes to saved IDs occur ONLY after the user explicitly confirms an import/merge action.
const CONFIRMED_NAME_GROUPS=[
 {official:'菅原璃烏',aliases:['菅原理鳥']},
 {official:'乙葉莉胡',aliases:['乙葉凛珊']},
 {official:'中原吉哉',aliases:['中原伊也']}
];
function confirmedFullName(name){
 const clean=normalize(name).replace(/[\s　]/g,'');
 for(const item of CONFIRMED_NAME_GROUPS){
  if([item.official,...item.aliases].some(n=>normalize(n).replace(/[\s　]/g,'')===clean))return item.official;
 }
 return normalize(name);
}
function confirmedNamePlan(){
 const moves=new Map(),renames=[],deletes=[],issues=[],changes=[];
 const clean=s=>normalize(s).replace(/[\s　]/g,'');
 for(const item of CONFIRMED_NAME_GROUPS){
  const matches=db.people.filter(p=>[item.official,...item.aliases].some(n=>clean(n)===clean(p.name)));
  if(!matches.length)continue;
  const official=matches.filter(p=>clean(p.name)===clean(item.official)).sort((a,b)=>timeVal(a)-timeVal(b));
  const keep=official[0]||matches.slice().sort((a,b)=>timeVal(a)-timeVal(b))[0];
  if(matches.length>1||normalize(keep.name)!==item.official)changes.push(item.official);
  if(normalize(keep.name)!==item.official)renames.push({id:keep.id,newName:item.official});
  for(const p of matches)if(p.id!==keep.id){moves.set(p.id,keep.id);deletes.push(p.id);}
 }
 const id=x=>moves.get(x)||x;
 const key=s=>normalize(s).replace(/[\s　]/g,'');
 // Block any newly introduced duplicate or self-play on canonical-ID consolidation.
 for(const section of ['leagues']){
  const seen=new Map();
  for(const r of db[section]){
   const k=JSON.stringify([r.league,key(r.term),id(r.personId)]);
   if(seen.has(k)&&(moves.has(r.personId)||moves.has(seen.get(k).personId))){
    issues.push('同一期・同一人物の参加記録が重複：'+r.league+' 第'+r.term+'期');
   }
   if(!seen.has(k))seen.set(k,r);
  }
 }
 const seenMatches=new Map();
 for(const m of db.matches){
  if(id(m.playerAId)===id(m.playerBId))issues.push('同一人物同士の対戦に変化：'+m.league+' 第'+m.term+'期');
  const pair=[id(m.playerAId),id(m.playerBId)].sort();
  const k=JSON.stringify([m.league,key(m.term),key(m.round),...pair]);
  if(seenMatches.has(k)&&(moves.has(m.playerAId)||moves.has(m.playerBId)||
    moves.has(seenMatches.get(k).playerAId)||moves.has(seenMatches.get(k).playerBId)))issues.push('同一期・回戦の対戦が重複：'+m.league+' 第'+m.term+'期 第'+m.round+'回戦');
  if(!seenMatches.has(k))seenMatches.set(k,m);
 }
 for(const [oldId,newId] of moves)if(!db.people.some(p=>p.id===newId))issues.push('移行先の人物IDが見つかりません：'+oldId);
 return {moves,renames,deletes,issues:[...new Set(issues)],changes,affected:db.matches.filter(m=>[m.playerAId,m.playerBId,m.winnerId].some(x=>moves.has(x))).length};
}
async function applyConfirmedNameUnification(){
 const plan=confirmedNamePlan();
 if(plan.issues.length){alert('氏名統一は安全のため実行しません。保存済み記録に重複があるため、先に人物・順位戦の記録を確認してください。\n'+plan.issues.slice(0,7).join('\n'));return}
 if(!plan.renames.length&&!plan.moves.size){toast('確認済みの3名はすでに正式名に統一されています');return}
 const message='ユーザー確認済みの正式名へ、人物名簿と関連記録を統一します。\n\n'+
  '菅原璃烏／乙葉莉胡／中原吉哉\n人物名の書換：'+plan.renames.length+'名\n重複人物IDの統合：'+plan.moves.size+'件\n対戦記録の参照更新：'+plan.affected+'件\n\n勝敗・元の対戦結果は変更しません。保存前にJSONバックアップを取っておくと安心です。続けますか？';
 if(!confirm(message))return;
 // Revalidate on click so no stale plan is applied after another edit/sync.
 const fresh=confirmedNamePlan();
 if(fresh.issues.length){alert('保存前の再検査で問題が見つかりました。氏名統一は行いません。');return}
 const now=new Date().toISOString(),newId=x=>fresh.moves.get(x)||x;
 for(const p of db.people){const rename=fresh.renames.find(x=>x.id===p.id);if(rename){p.name=rename.newName;p.updatedAt=now}}
 for(const section of ['titles','tournaments','leagues','officers']){
  for(const record of db[section]){
   if(fresh.moves.has(record.personId)){record.personId=newId(record.personId);record.updatedAt=now}
  }
 }
 for(const match of db.matches){
  let changed=false;
  for(const field of ['playerAId','playerBId','winnerId']){
   if(fresh.moves.has(match[field])){match[field]=newId(match[field]);changed=true}
  }
  if(changed)match.updatedAt=now;
 }
 db.people=db.people.filter(p=>!fresh.deletes.includes(p.id));
 await persist();render();
 toast('3名の正式名を反映。人物統合 '+fresh.moves.size+'件・対戦参照更新 '+fresh.affected+'件');
}

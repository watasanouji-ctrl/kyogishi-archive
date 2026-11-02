'use strict';
// Derived league ranks are previews until explicitly persisted. Historic rules vary by season.
function rankLeagueMode(league,term){
 if(league==='s')return 's';
 if(league==='shikitei')return 'shikitei';
 if(league==='oui-last')return 'oui-last';
 if(league==='oui-final')return db.leagueRules?.['oui-final:'+normalize(term)]||'unselected';
 return 'general';
}

function rankLeagueScore(person,seasonMatches,expected){
 const id=person.personId,complete=seasonMatches.filter(m=>m.playerAId===id||m.playerBId===id);
 const completed=complete.filter(m=>m.outcome!=='pending');
 let w=0,l=0,d=0;
 for(const m of completed){if(m.outcome==='draw'||!m.winnerId)d++;else if(m.winnerId===id)w++;else l++}
 const mw=numOrNull(person.wins),ml=numOrNull(person.losses),md=numOrNull(person.draws)||0;
 const summary=mw!==null&&ml!==null;
 const compatible=!summary||(mw>=w&&ml>=l&&md>=d);
 const fromSummary=summary&&compatible&&(mw+ml+md>=w+l+d);
 const values=fromSummary?{w:mw,l:ml,d:md}:{w,l,d};
 const total=values.w+values.l+values.d;
 return {...values,total,complete:expected!==null&&total===expected&&compatible,
  expected,summary,compatible,recorded:completed.length,pending:complete.length-completed.length,
  source:fromSummary?'期別記録':'個別対戦'};
}

function rankLeagueCompute(league,term){
 const mode=rankLeagueMode(league,term),records=seasonRoster(league,term),matches=seasonMatches(league,term),issues=[];
 const people=records.map(r=>({...r,name:getName(r.personId),group:normalize(r.group||'').toUpperCase(),seed:numOrNull(r.startRank),
   official:numOrNull(r.rank)}));
 if(!people.length)return {mode,rows:[],issues:['この期の選手が登録されていません'],complete:false,publishable:false,groups:[]};
 const isGroup=league==='oui-final'&&(mode==='modern'||mode==='legacy');
 const byGroup=new Map();
 for(const person of people){const group=isGroup?person.group:'all';if(!byGroup.has(group))byGroup.set(group,[]);byGroup.get(group).push(person)}
 if((mode==='s'&&people.length!==11)||(mode==='shikitei'&&people.length!==9)||
   mode==='general')
  issues.push('この期の定員・昇降級規則は未確認のため、計算は参考表示のみです（公式順位は保存できません）');
 if(league==='oui-final'&&mode==='unselected')issues.push('王位リーグは、この期の方式（現行／旧方式）を選んでください');
 if(isGroup&&(byGroup.has('')||byGroup.size!==2||[...byGroup.values()].some(x=>x.length<(mode==='modern'?3:2))))
  issues.push('王位リーグは各選手の所属組（例：A／B）を登録し、2組に分けてください');
 const infos=[],groups=[];
 for(const [group,persons] of byGroup){
  const expected=persons.length-1,groupIds=new Set(persons.map(x=>x.personId));
  const otherGames=matches.filter(m=>(groupIds.has(m.playerAId)||groupIds.has(m.playerBId))&&
    (!groupIds.has(m.playerAId)||!groupIds.has(m.playerBId)));
  if(isGroup&&otherGames.length)issues.push(`${group||'組未設定'}：異なる組の対戦が同じリーグ記録に混在しています`);
  const scored=persons.map(p=>({...p,...rankLeagueScore(p,matches,expected)}));
  for(const p of scored){
   if(!p.compatible)issues.push(`${p.name}：登録済み対戦と期別勝敗が矛盾しています`);
   if(p.total>expected)issues.push(`${p.name}：対戦数が定員から計算した${expected}試合を超えています`);
   if(p.recorded&&p.recorded>expected)issues.push(`${p.name}：対戦が重複している可能性があります`);
  }
  const complete=scored.every(x=>x.complete);
  if(complete){
   const ww=scored.reduce((n,x)=>n+x.w,0),ll=scored.reduce((n,x)=>n+x.l,0),dd=scored.reduce((n,x)=>n+x.d,0);
   const should=persons.length*(persons.length-1)/2;
   if(ww!==ll||ww+dd/2!==should)issues.push(`${group}：勝敗・対戦数の合計が整合しません`);
  }
  const prevScore=id=>db.leagues.find(r=>r.league===league&&sortNum(r.term)===sortNum(term)-1&&r.personId===id);
  const stagePriority=p=>{
   const t=String(p.result||'');
   if(/PO勝利|プレーオフ勝利/.test(t)&&/挑戦|優勝/.test(t))return 0;
   if(/降級|陥落/.test(t))return 2;
   return 1;
  };
  const prevTie=(a,b)=>{
   if(league!=='s')return 0;
   const pa=prevScore(a.personId),pb=prevScore(b.personId);
   if(pa&&pb){
    const pRank=(numOrNull(pa.rank)??Infinity)-(numOrNull(pb.rank)??Infinity);
    if(pRank)return pRank;
    return (numOrNull(pb.wins)??0)-(numOrNull(pa.wins)??0)||
      (numOrNull(pa.losses)??0)-(numOrNull(pb.losses)??0);
   }
   return 0;
  };
  scored.sort((a,b)=>b.w-a.w||a.l-b.l||
   (mode==='shikitei'?stagePriority(a)-stagePriority(b):0)||
   (a.seed??Infinity)-(b.seed??Infinity)||prevTie(a,b)||a.name.localeCompare(b.name,'ja'));
  for(let i=0;i<scored.length;i++){
   const p=scored[i],q=scored[i-1];
   const tied=!!q&&p.w===q.w&&p.l===q.l&&p.seed===q.seed&&
    (mode!=='shikitei'||stagePriority(p)===stagePriority(q));
   if(league==='s'&&tied&&prevTie(p,q)!==0){p.calculatedRank=i+1;p.tied=false}
   else{p.calculatedRank=tied?q.calculatedRank:i+1;p.tied=tied}
   p.status='—';p.statusSource='computed';p.group=group;
   if(p.seed===null&&i&&p.w===q.w&&p.l===q.l)issues.push(`${p.name}：同成績の序列を決める開幕順位がありません`);
   if(league==='s'){
    if(persons.length===11){p.status=p.calculatedRank>=9?'降級':'残留';if(p.calculatedRank===1)p.status='首位（挑戦候補）'}
    else p.status='降級人数は期別設定を要確認';
   }else if(mode==='shikitei'){
    const relegated=persons.length===9?5:null,cutoff=relegated?persons.length-relegated:null;
    if(cutoff){
     p.status=p.calculatedRank>cutoff?'降級圏':'残留圏';
     if(p.calculatedRank===1)p.status='首位（挑戦候補）';
    }else p.status='残留枠・降級枠を要確認';
    if(/降級|陥落/.test(p.result||''))p.status='降級（記録確認済み）';
    else if(/挑戦/.test(p.result||''))p.status='挑戦（記録確認済み）';
    else if(/残留/.test(p.result||''))p.status='残留（記録確認済み）';
   }else if(mode==='modern'&&isGroup){p.status=p.calculatedRank<=3?'上位3名：残留・最終リーグ進出':'次期残留は未確定'}
   else if(mode==='legacy'&&isGroup){p.status=p.calculatedRank===1?'組優勝：挑戦者決定戦へ':'組優勝以外'}
   else if(mode==='oui-last'){p.status=p.calculatedRank===1?'最終リーグ優勝':'優勝以外（最終順位なし）';if(p.calculatedRank!==1)p.calculatedRank=null}
   else p.status='順位のみ算出';
   if(mode==='shikitei'&&/降級|陥落/.test(String(p.result||''))&&p.official===null){
    // A player's relegation can be known without a uniquely defined final position.
    p.persistRank=false;p.displayRank='降級帯';
   }else p.persistRank=true;
   if(!complete)p.status='途中経過：'+p.status;
  }
  // If tied with no distinguishable previous-season priority, the final rank cannot be certified for S class.
  if(mode==='s')for(let i=1;i<scored.length;i++)if(scored[i].calculatedRank===scored[i-1].calculatedRank)
   issues.push(`${scored[i-1].name}・${scored[i].name}：前期成績から同順位を解消できません`);
  // Shikitei ranks may repeat, but a tie spanning relegation/residency boundary needs explicit playoff evidence.
  if(mode==='shikitei'&&persons.length===9)for(const rank of [...new Set(scored.map(p=>p.calculatedRank))]){
   const tied=scored.filter(p=>p.calculatedRank===rank);
   if(tied.length>1&&rank<=4&&rank+tied.length-1>4){
    const known=tied.every(p=>/降級|陥落|残留|挑戦/.test(p.result||''));
    if(!known)issues.push(`式帝戦 ${tied.map(x=>x.name).join('・')}：残留境界の同順位につきPO結果が必要`);
   }
  }
  // Only the stated tournament format is known. Never invent a playoff or tiebreak outside S/A.
  const sameScore=(a,b)=>a&&b&&a.w===b.w&&a.l===b.l;
  if(complete&&mode==='modern'&&isGroup&&scored.length>3&&sameScore(scored[2],scored[3]))
   issues.push(`${group}組：上位3名の境界で同成績のため、進出判定の確認が必要`);
  if(complete&&mode==='legacy'&&isGroup&&scored.length>1&&sameScore(scored[0],scored[1]))
   issues.push(`${group}組：組首位が同成績のため、優勝者決定方法を確認してください`);
  if(complete&&mode==='oui-last'&&scored.length>1&&sameScore(scored[0],scored[1]))
   issues.push('王位・最終リーグ：首位が同成績のため、優勝者を確認してください');
  if(complete&&mode==='shikitei'&&scored.length>1&&sameScore(scored[0],scored[1])&&
    !/挑戦|優勝/.test(String(scored[0].result||'')))
   issues.push('式帝戦：首位が同成績です。挑戦PO勝者を確認してください');
  const manualConflicts=scored.filter(p=>p.official!==null&&p.calculatedRank!==null&&p.official!==p.calculatedRank);
  for(const r of manualConflicts)issues.push(`${r.name}：既存の公式順位${r.official}位と計算順位${r.calculatedRank}位が相違（上書きなし）`);
  groups.push({name:group,complete,rows:scored,expected});
  infos.push(...scored);
 }
 const fullyComplete=groups.every(g=>g.complete)&&!issues.length;
 return {mode,rows:infos,groups,issues:[...new Set(issues)],complete:groups.every(g=>g.complete),publishable:fullyComplete,
  calculatedCount:infos.filter(x=>x.calculatedRank!==null).length};
}

function rankLeaguePage(league,term){
 const data=rankLeagueCompute(league,term),oui=league==='oui-final';
 const opt=oui?`<div class="career-filters"><label>第${esc(term)}期の王位リーグ方式<select class="filter" id="rank-oui-mode">
  <option value="unselected" ${data.mode==='unselected'?'selected':''}>方式未指定（保存不可）</option>
  <option value="modern" ${data.mode==='modern'?'selected':''}>現行：2組上位3名→6名の最終リーグ</option>
  <option value="legacy" ${data.mode==='legacy'?'selected':''}>旧方式：各組1位→挑戦者決定戦</option>
 </select></label></div>`:'';
 const table=data.groups.map(g=>`<div class="section-title"><h3>${oui?esc(g.name||'所属組未設定')+' 組':'計算順位'}</h3><span class="small-pale">${g.complete?'期別成績・確認済み':'途中経過／未完了'}</span></div>
 <div class="table-scroll"><table class="standings rank-auto-table"><thead><tr><th>計算順位</th><th>選手</th><th>成績</th><th>開幕</th><th>公式</th><th>扱い（参考）</th></tr></thead><tbody>${g.rows.map(r=>`<tr><td><strong>${r.displayRank||(r.calculatedRank??'—')}</strong></td><td>${esc(r.name)}</td><td>${r.w}勝${r.l}敗${r.d?r.d+'分':''}</td><td>${r.seed??'—'}</td><td>${r.official??'—'}</td><td>${esc(r.status)}</td></tr>`).join('')}</tbody></table></div>`).join('');
 const info=league==='s'?'S級（11名）は同成績で開幕順位を優先し、9〜11位を降級と計算。人数が異なる過去の期は降級人数を自動確定しません。':
 league==='shikitei'?'式帝戦は同成績・同開幕順位なら同順位にできます。PO勝利や既存の降級・残留記録がある場合は順位序列へ反映。降級選手の細かな最終順位は確証がない限り「降級帯」として表示し、数値保存しません。残留境界が未解決なら確定保存しません。':
 league==='oui-final'?'王位リーグの2組は所属組を人物編集画面で設定します。現行方式は各組上位3名が最終リーグ進出、旧方式は各組1位が挑戦者決定戦へ。挑戦者決定戦の勝敗は推測しません。':
 league==='oui-last'?'王位の最終リーグは優勝者のみ確定し、その他の最終順位は自動確定しません。':'勝敗から参考順位を計算します。';
 return `<section class="settingbox" id="rank-auto"><div class="career-head"><div><div class="overline">League / Ranking calculator</div><h3>最終順位の自動計算</h3></div><button class="btn small ghost" data-rank-refresh="1">再計算</button></div>
 <p class="mini-note">${info} 計算結果は、明示的に保存しない限り既存の公式最終順位を変更しません。</p>
 ${opt}<div class="stats career-summary"><div class="stat"><div class="num">${data.rows.length}</div><div class="lbl">集計選手</div></div><div class="stat"><div class="num">${data.groups.filter(g=>g.complete).length}/${data.groups.length}</div><div class="lbl">成績確定組</div></div><div class="stat"><div class="num">${data.issues.length}</div><div class="lbl">確認事項</div></div></div>
 ${data.issues.length?`<p class="mini-note" style="color:var(--red)"><strong>要確認：</strong>${data.issues.slice(0,6).map(esc).join('／')}${data.issues.length>6?' ほか':''}</p>`:''}
 ${table}
 <div class="buttons"><button class="btn primary" data-rank-save="1" ${data.publishable?'':'disabled'}>空欄の最終順位を保存</button><span class="mini-note">${data.complete?'全員の期別勝敗が登録済み':'期別の全対戦成績が揃うと確定保存できます'}。手入力済みの順位は上書きしません。</span></div>
 </section>`;
}

async function rankLeagueSave(){
 if(!currentSeason)return;
 const {league,term}=currentSeason,data=rankLeagueCompute(league,term);
 if(!data.publishable){alert('計算順位を確定できません。必要な対戦・期別結果、開幕順位、王位の方式・所属組、PO結果などを確認してください。\\n'+data.issues.slice(0,5).join('\\n'));return}
 const edits=data.rows.filter(r=>r.id&&r.calculatedRank!==null&&r.persistRank!==false&&(r.rank==null||String(r.rank).trim()===''));
 if(!edits.length){toast('公式順位はすでに登録されています。変更していません');return}
 if(!confirm(`${leagueDisplay(league,term)} 第${term}期の最終順位を、空欄の${edits.length}名へ登録しますか？\\n手入力済みの公式順位と対戦記録は変更しません。`))return;
 const recheck=rankLeagueCompute(league,term);
 if(!recheck.publishable){alert('保存直前の確認で矛盾が見つかりました。変更していません。');return}
 const stamp=new Date().toISOString();let updates=0;
 for(const r of recheck.rows){
  const original=db.leagues.find(x=>x.id===r.id);
  if(original&&(original.rank==null||String(original.rank).trim()==='')&&r.calculatedRank!==null&&r.persistRank!==false){
   original.rank=String(r.calculatedRank);original.updatedAt=stamp;updates++;
  }
 }
 if(updates){await persist();render();toast(`最終順位を${updates}名へ反映`)}
}

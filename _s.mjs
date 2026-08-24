import fs from 'fs';
const prop=JSON.parse(fs.readFileSync('_proposed.json','utf8'));
const src=fs.readFileSync('config/project.ts','utf8');
const i=src.indexOf('"virtualTour":'); let s=src.indexOf('{',i),d=0,e=-1;
for(let k=s;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d){e=k;break;}}}
const vt=JSON.parse(src.slice(s,e+1));
const all=Object.keys(vt.nodes), given=Object.keys(prop);
console.log('nodes in project :',all.length);
console.log('nodes in proposal:',given.length);
console.log('OMITTED ENTIRELY :',all.filter(n=>!given.includes(n)).join(', ')||'none');
// reachability using ONLY the proposed graph
const seen=new Set([vt.defaultNode]),q=[vt.defaultNode];
while(q.length){const c=q.pop(); for(const l of (prop[c]?.links||[])) if(!seen.has(l.nodeId)){seen.add(l.nodeId);q.push(l.nodeId);}}
console.log('UNREACHABLE from foyer:',all.filter(x=>!seen.has(x)).join(', ')||'none');
// one-way links
console.log('\nONE-WAY (no return path):');
for(const [id,n] of Object.entries(prop))
  for(const l of n.links)
    if(!(prop[l.nodeId]?.links||[]).some(b=>b.nodeId===id)) console.log(`  ${id} -> ${l.nodeId}`);

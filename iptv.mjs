import fs from 'node:fs/promises';
import path from 'node:path';

export const playlistUrls=[1,2,3,4,5].map(n=>`https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/master/CanaisBR0${n}.m3u8`);
const source='https://github.com/Ramys/Iptv-Brasil-2026';
const groups={News:'Notícias',General:'Geral',Entertainment:'Entretenimento',Religious:'Religiosos',Legislative:'Legislativos',Education:'Educação',Culture:'Cultura',Sports:'Esportes',Music:'Música',Kids:'Infantil',Movies:'Filmes',Undefined:'Outros'};
function httpUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}

export function withoutAdult(result){
 const adult=/(?:\badultos?\b|\badults?\b|\bxxx\b|\bxxl\b|\bdorcel\b|\bpenthouse\b|\bvixen\b|\bpink\s*tv\b|\bprivate\s*tv\b|\bporn\w*|\bplayboy\b|\bsexy\s*hot\b|\bsex(?:treme|prive|privê|zone|y)\b|\bvenus\b|\bhustler\b|\bbrazzers\b|\bpriv[eê]\b|\+\s*18|18\+)/i;
 const categories=new Map(result.category_list.map(c=>[String(c.id),c.category_name]));
 const channel_list=result.channel_list.filter(c=>!adult.test(categories.get(String(c.category_id))||'')&&!adult.test((c.title||'').replace(/Adult Swim/ig,'')));
 const used=new Set(channel_list.map(c=>String(c.category_id)));
 return {...result,channel_list,category_list:result.category_list.filter(c=>used.has(String(c.id))),total:channel_list.length};
}

export function parseM3u(text){
 if(!text.trimStart().startsWith('#EXTM3U'))throw new Error('A fonte IPTV Brasil 2026 não retornou uma lista M3U.');
 const channel_list=[],category_list=[],seen=new Set(),categories=new Map();let pending=null;
 for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();
  if(line.startsWith('#EXTINF:')){
   let quoted=false,comma=-1;
   for(let i=0;i<line.length;i++){if(line[i]==='"')quoted=!quoted;else if(line[i]===','&&!quoted){comma=i;break;}}
   if(comma<0){pending=null;continue;}
   const attrs=Object.fromEntries([...line.slice(0,comma).matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
   pending={title:line.slice(comma+1).trim()||attrs['tvg-name']||'Canal',attrs};
  }else if(line&&!line.startsWith('#')&&pending){
   const url=httpUrl(line),{title,attrs}=pending;pending=null;
   if(!url||seen.has(url))continue;seen.add(url);
   const group=(attrs['group-title']||'Undefined').split(';').map(g=>groups[g]||g).join(' e ');
   if(!categories.has(group)){const id='iptv-'+categories.size;categories.set(group,id);category_list.push({id,category_name:group});}
   channel_list.push({id:'iptv-'+channel_list.length,title,url,tvg_id:attrs['tvg-id']||'',icon:httpUrl(attrs['tvg-logo']),category_id:categories.get(group)});
  }
 }
 if(!channel_list.length)throw new Error('A lista IPTV Brasil 2026 veio sem canais reproduzíveis.');
 return withoutAdult({origem:'ramys',source,category_list,channel_list,total:channel_list.length});
}

async function livePrefix(response){
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',lines=[];
 // Nas listas desta fonte, os canais precedem o bloco de filmes e episódios.
 // Cancelar nesse limite evita transferir centenas de MB de VOD para a aba TV.
 try{
  while(true){
   const {done,value}=await reader.read();pending+=decoder.decode(value,{stream:!done});
   const chunks=pending.split(/\r?\n/);pending=done?'':chunks.pop();
   for(const line of chunks){
    const group=line.match(/group-title="([^"]*)"/)?.[1]||'';
    if(line.startsWith('#EXTINF:')&&/^(?:filmes|s[eé]ries|novelas|cursos|shows|document[aá]rios|reels|stand up|colet[aâ]nea|programas de tv|nacional|esportes(?:$))\b/i.test(group))return lines.join('\n');
    lines.push(line);
   }
   if(done)return lines.join('\n');
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

export async function loadIptv({cacheFile,refresh=false,fetchImpl=fetch}){
 let cached;
 try{const data=JSON.parse(await fs.readFile(cacheFile,'utf8'));if(data.result?.origem==='ramys'&&data.result.source===source&&data.result.channel_list?.length)cached={...data,result:withoutAdult(data.result)};}catch{}
 if(cached&&!refresh&&Date.now()-cached.saved<6*3600000)return cached.result;
 try{
  const responses=await Promise.allSettled(playlistUrls.map(async url=>{
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const text=await livePrefix(response);parseM3u(text);return text;
  }));
  const texts=responses.filter(r=>r.status==='fulfilled').map(r=>r.value);
  if(!texts.length)throw new Error('Nenhuma das cinco listas respondeu com canais válidos.');
  const result=parseM3u(texts.join('\n'));
  if(texts.length<playlistUrls.length)result.warning=`${playlistUrls.length-texts.length} de 5 listas indisponíveis. Mostrando os canais das listas que responderam.`;
  try{await fs.mkdir(path.dirname(cacheFile),{recursive:true});await fs.writeFile(cacheFile,JSON.stringify({saved:Date.now(),result}));}catch{}
  return result;
 }catch(error){
  if(cached)return {...cached.result,stale:true,warning:'Mostrando a lista salva: não foi possível atualizar a fonte IPTV Brasil 2026 agora.'};
  throw new Error('Não foi possível carregar os canais IPTV Brasil 2026: '+error.message);
 }
}

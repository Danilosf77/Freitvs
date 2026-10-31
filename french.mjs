import fs from 'node:fs/promises';
import path from 'node:path';
import {parseM3u,withoutAdult} from './iptv.mjs';

export const frenchSources=[
 'https://raw.githubusercontent.com/famelack/famelack-data/main/tv/raw/countries/fr.json',
 'https://iptv-org.github.io/iptv/languages/fra.m3u',
 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_france.m3u8'
];
const category={id:'french',category_name:'Canais franceses'};
function valid(raw){try{const u=new URL(raw);return !/(?:^|\.)(?:youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com)$/.test(u.hostname)&&/^https?:$/.test(u.protocol)&&!u.username&&!u.password&&(!u.port||['80','443','7000','8000','8080'].includes(u.port))?u.href:'';}catch{return '';}}
function name(title){return title.replace(/\([^)]*\)|\[[^\]]*\]/g,'').replace(/\b(?:French|Fran[cç]ais|FHD|HD|SD|4K)\b/gi,'').replace(/\s+/g,' ').trim();}
function key(title){return name(title).replace(/TV5\s*Monde\s*FBS/i,'TV5MondeFranceBelgiumSwitzerlandMonaco').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}

export function mergeFrench(entries){
 const safe=withoutAdult({category_list:[category],channel_list:entries.map(c=>({...c,category_id:category.id}))});
 const byName=new Map(),byUrl=new Map();
 for(const c of safe.channel_list){
  const url=valid(c.url);if(!url||/English|Arabic|Spanish|Deutsch|Espa[nñ]ol/i.test(c.title))continue;
  const id=key(c.title);if(!id)continue;
  const knownUrl=byUrl.get(url),knownName=byName.get(id);
  if(knownUrl&&knownName&&knownUrl!==knownName){
   for(const source of knownName.sources)if(!knownUrl.sources.includes(source))knownUrl.sources.push(source);
   for(const [alias,item] of byName)if(item===knownName)byName.set(alias,knownUrl);
   for(const source of knownName.sources)byUrl.set(source,knownUrl);
  }
  const existing=byUrl.get(url)||byName.get(id);
  if(existing){if(!existing.icon&&valid(c.icon))existing.icon=valid(c.icon);if(!existing.sources.includes(url))existing.sources.push(url);byName.set(id,existing);byUrl.set(url,existing);continue;}
  const item={...c,id:'french-'+id,title:name(c.title),url,sources:[url],category_id:category.id};
  byName.set(id,item);byUrl.set(url,item);
 }
 const channel_list=[...new Set(byName.values())].sort((a,b)=>a.title.localeCompare(b.title,'fr'));
 return {category_list:channel_list.length?[category]:[],channel_list,total:channel_list.length};
}

export async function loadFrench({cacheFile,refresh=false,fetchImpl=fetch}){
 let cached;
 try{cached=JSON.parse(await fs.readFile(cacheFile,'utf8'));if(cached.version!==1||!cached.result?.channel_list?.length)cached=null;}catch{}
 if(cached&&!refresh&&Date.now()-cached.saved<6*3600000)return cached.result;
 const responses=await Promise.allSettled(frenchSources.map(async(url,index)=>{
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('HTTP '+response.status);
  if(index===0){
   const data=await response.json();if(!Array.isArray(data))throw new Error('Lista francesa incompatível.');
   return data.filter(c=>!c.isGeoBlocked&&(!c.languages?.length||c.languages.includes('fra'))).flatMap(c=>(c.sources?.streams||[]).map(url=>({title:c.name,url,icon:'',tvg_id:''})));
  }
  const parsed=parseM3u(await response.text());
  return parsed.channel_list.filter(c=>!(/Geo-blocked/i.test(c.title))&&(index===2||/\.fr(?:@|$)/i.test(c.tvg_id)));
 }));
 const entries=responses.filter(r=>r.status==='fulfilled').flatMap(r=>r.value);
 if(!entries.length)return cached?{...cached.result,warning:'Canais franceses: usando a lista salva.'}:{category_list:[],channel_list:[],total:0,warning:'Não foi possível atualizar as listas francesas agora.'};
 const result={...mergeFrench(entries),listSources:frenchSources};
 if(responses.some(r=>r.status==='rejected'))result.warning='Uma das listas francesas está indisponível; as demais foram carregadas.';
 try{await fs.mkdir(path.dirname(cacheFile),{recursive:true});await fs.writeFile(cacheFile,JSON.stringify({version:1,saved:Date.now(),result}));}catch{}
 return result;
}

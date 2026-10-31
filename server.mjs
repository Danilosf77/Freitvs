import http from 'node:http';
import {prepareCastSource} from './cast-media.mjs';
import {fetchStream} from './stream.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {loadIptv} from './iptv.mjs';
import {loadFrench} from './french.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8787);
const nativeClient=JSON.parse(await fs.readFile(path.join(root,'native-client.json'),'utf8'));
const sessions=new Map();
const decrypt3=crypto.createDecipheriv('des-ede3-cbc',Buffer.from('dsawdf634eebGFHITR5UT9kS0').subarray(0,24),Buffer.from('32456738'));
const signing=Buffer.concat([decrypt3.update(Buffer.from('MxASAkl/yHTGg+/Tw1R7u96nGqkWsOZ2','base64')),decrypt3.final()]).toString();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png'};
const apiRoutes={'categories':'type/get_list','channels':'channel/get_list','catalog':'search/screen','search':'search/result','detail':'vod/info_new','live':'live/get_list'};
function decode(text){
 if(text.trim().startsWith('{'))return JSON.parse(text);
 try{const dc=crypto.createDecipheriv('aes-128-cbc',Buffer.from('0123456789123456'),Buffer.from('2015030120123456'));return JSON.parse(Buffer.concat([dc.update(Buffer.from(text.trim(),'base64')),dc.final()]).toString());}
 catch{throw new Error(text.trim()==='system err-or'?'O servidor não liberou esta solicitação. A reprodução pode exigir a biblioteca nativa do APK.':'O servidor retornou uma resposta incompatível.');}
}
async function call(s,route,body={}){
 const t=String(Date.now());const headers={app_id:'fordbrowser',package_name:'com.ford.fordbrowser',version:'30000',sys_platform:'2',mob_mfr:'web',mobmodel:'Desktop',sysrelease:'14',device_id:s.device,gaid:'',androidid:'',channel_code:'fordbrowsera_1000',cur_time:t,token:s.token||'',sign:crypto.createHash('md5').update(signing+s.device+t).digest('hex').toUpperCase(),is_vvv:'0',is_language:'pt',is_display:'BRT',app_language:'pt',en_al:'0','Content-Type':'application/x-www-form-urlencoded'};
 const r=await fetch(s.base+'/api/'+route,{method:'POST',headers,body:new URLSearchParams(body),signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!r.ok)throw new Error('O serviço retornou HTTP '+r.status);
 const j=decode(await r.text());if(j.code!==10000)throw new Error(j.message||'Solicitação recusada pelo serviço.');return j.result;
}
async function init(s){
 if(s.ready)return;if(s.pending)return s.pending;
 s.pending=(async()=>{const data=await call(s,'public/init',{is_install:'0'});s.token=data?.user_info?.token||'';const candidate=new URL(data?.sys_conf?.api_url2||s.base);if(candidate.protocol!=='https:'||!['household.wnezyh.com','u0t0.9a6j.com'].includes(candidate.hostname))throw new Error('O serviço informou um endereço novo. É necessária revisão da integração.');s.base=candidate.origin;s.ready=true;})();
 try{await s.pending;}finally{s.pending=null;}
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function privateIp(ip){return ip==='::1'||ip.startsWith('fc')||ip.startsWith('fd')||ip.startsWith('fe80:')||ip.startsWith('::ffff:')||/^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|224\.|255\.)/.test(ip);}
async function publicUrl(raw,registered=false){const u=new URL(raw);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('Use um endereço HTTP ou HTTPS sem credenciais.');if(u.port&&!['80','443',...(registered?['7000','8000','8080']:[])].includes(u.port))throw new Error('Porta de mídia não permitida.');const addresses=net.isIP(u.hostname)?[{address:u.hostname}]:await dns.lookup(u.hostname,{all:true});if(!addresses.length||addresses.some(a=>privateIp(a.address)))throw new Error('Endereços privados não são aceitos como mídia remota.');return u;}
function mediaLink(s,raw){const u=new URL(raw);s.media.add(u.href);return '/media?url='+encodeURIComponent(u.href);}
function registerSources(s,result){for(const ep of result?.vod_collection||[]){try{const u=new URL(ep.vod_url||ep.play_url);if(['http:','https:'].includes(u.protocol))s.signedFolders.add(new URL('.',u).href);}catch{}}}
function liveUrls(result){const out=[];for(const c of result?.channel_list||[])for(const raw of [c.url,...(c.sources||[])]){try{const u=new URL(raw);if(['http:','https:'].includes(u.protocol)){out.push(u.href);if(/\.ts$/i.test(u.pathname)){u.pathname=u.pathname.replace(/\.ts$/i,'.m3u8');out.push(u.href);}}}catch{}}return out;}
function registerLive(s,result){for(const href of liveUrls(result))s.media.add(href);}
function signedMediaUrl(s,input){const u=new URL(input);if([...s.signedFolders].some(folder=>u.href.startsWith(folder))){u.search='';const timestamp=Math.floor(Date.now()/1000).toString(16);u.searchParams.set('wsSecret',crypto.createHash('md5').update(nativeClient.mediaKey+u.pathname+timestamp).digest('hex'));u.searchParams.set('wsTime',timestamp);}return u;}
async function media(s,raw,req,res){
 if(!s.media.has(raw))throw new Error('Este link não foi selecionado nesta sessão.');
 const controller=new AbortController();res.once('close',()=>controller.abort());
 let u=await publicUrl(raw,true),r;
 for(let i=0;i<4;i++){r=await fetchStream(signedMediaUrl(s,u),{headers:{'User-Agent':'Mozi',...(req.headers.range?{Range:req.headers.range}:{})},redirect:'manual',signal:controller.signal});if(r.status>=300&&r.status<400&&r.headers.get('location')){await r.body?.cancel();u=await publicUrl(new URL(r.headers.get('location'),u).href,true);continue;}break;}
 if(!r.ok&&r.status!==206)throw Object.assign(new Error('Mídia indisponível: HTTP '+r.status),{statusCode:r.status});
 const ct=r.headers.get('content-type')||'application/octet-stream';
 if(u.pathname.endsWith('.m3u8')||/mpegurl/i.test(ct)){
  const text=await r.text();if(!text.trimStart().startsWith('#EXTM3U'))throw new Error('A fonte não retornou uma playlist HLS padrão.');
  const rewritten=text.split(/\r?\n/).map(line=>{if(line.startsWith('#'))return line.replace(/URI="([^"]+)"/g,(_,v)=>'URI="'+mediaLink(s,new URL(v,u).href)+'"');return line.trim()?mediaLink(s,new URL(line.trim(),u).href):line;}).join('\n');
  res.writeHead(200,{'Content-Type':'application/vnd.apple.mpegurl','Cache-Control':'no-store'});res.end(rewritten);return;
 }
 const headers={'Content-Type':u.pathname.endsWith('.ts')?'video/mp2t':ct,'Cache-Control':'no-store'};for(const h of ['content-length','content-range','accept-ranges'])if(r.headers.has(h))headers[h]=r.headers.get(h);res.writeHead(r.status,headers);
 const reader=r.body.getReader();res.on('close',()=>reader.cancel().catch(()=>{}));try{while(true){const {done,value}=await reader.read();if(done)break;if(!res.write(value))await new Promise(resolve=>res.once('drain',resolve));}res.end();}finally{reader.releaseLock();}
}
const server=http.createServer(async(req,res)=>{
 try{
 if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){json(res,403,{error:'Host não permitido.'});return;}
 const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin)){json(res,403,{error:'Origem não permitida.'});return;}
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method==='GET'&&req.url==='/health'){json(res,200,{app:'freitas-tv',protocol:1});return;}
 let sid=req.headers.cookie?.match(/(?:^|;\s*)fb_session=([a-f0-9]{48})/)?.[1];let s=sessions.get(sid);
 if(!s){sid=crypto.randomBytes(24).toString('hex');s={device:crypto.randomBytes(11).toString('hex'),base:'https://u0t0.9a6j.com',media:new Set(),signedFolders:new Set(),used:Date.now()};sessions.set(sid,s);res.setHeader('Set-Cookie','fb_session='+sid+'; HttpOnly; SameSite=Strict; Path=/');}s.used=Date.now();
 const url=new URL(req.url,'http://localhost:'+port);
 if(url.pathname==='/media'){await media(s,url.searchParams.get('url'),req,res);return;}
 if(url.pathname.startsWith('/api/')){
 if(req.method!=='POST'){json(res,405,{error:'Use POST.'});return;}
 let buf='';for await(const chunk of req){buf+=chunk;if(buf.length>16384)throw new Error('Solicitação muito grande.');}const body=JSON.parse(buf||'{}');const name=url.pathname.slice(5);
 if(name==='cast-source'){const result=await prepareCastSource(body.url,{registered:s.media,validate:publicUrl,sign:u=>signedMediaUrl(s,u)});json(res,200,{result});return;}
 if(name==='source'){const u=await publicUrl(body.url,s.media.has(body.url));json(res,200,{result:{url:mediaLink(s,u.href)}});return;}
 if(!apiRoutes[name]){json(res,404,{error:'Rota não encontrada.'});return;}
 if(name==='live'){
  const [br,fr]=await Promise.all([loadIptv({cacheFile:path.join(root,'.runtime','iptv-cache.json'),refresh:body.refresh===true}),loadFrench({cacheFile:path.join(root,'.runtime','french-cache.json'),refresh:body.refresh===true})]);
  const result={...br,category_list:[...fr.category_list,...br.category_list],channel_list:[...fr.channel_list,...br.channel_list],total:br.total+fr.total,warning:[br.warning,fr.warning].filter(Boolean).join(' ')};
  registerLive(s,result);json(res,200,{result});return;
 }
 await init(s);
 const args={};for(const key of ['pn','kw','type_id','type','year','area','sort','vod_id','audio_type'])if(body[key]!==undefined)args[key]=String(body[key]).slice(0,250);
 if(name==='detail'){const t=String(Date.now());args.cur_time=t;args.sign=crypto.createHash('md5').update(nativeClient.playerKey+s.device+args.vod_id+t).digest('hex').toUpperCase();}
 const result=await call(s,apiRoutes[name],args);if(name==='detail')registerSources(s,result);json(res,200,{result});return;
 }
 if(req.method!=='GET'){json(res,405,{error:'Método não permitido.'});return;}
 const filename=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!['index.html','app.js','style.css','hls.min.js','mpegts.min.js','wireless.js','pip.js','live-quality.js','live-audit.js','freitas-logo.png'].includes(filename)){res.writeHead(404);res.end();return;}
 const data=await fs.readFile(path.join(root,'public',filename));res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache, no-store, must-revalidate'});res.end(data);
 }catch(e){if(!res.headersSent)json(res,Number.isInteger(e.statusCode)&&e.statusCode>=400&&e.statusCode<=599?e.statusCode:e.name==='AbortError'?504:502,{error:e.name==='AbortError'?'A fonte demorou demais para responder.':e.message});else res.destroy();}
});
setInterval(()=>{for(const [id,s]of sessions)if(Date.now()-s.used>3600000)sessions.delete(id);},300000).unref();
server.listen(port,'127.0.0.1',()=>console.log('FordBrowser PC: http://127.0.0.1:'+port));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'A porta '+port+' já está em uso. Feche a outra instância ou defina PORT.':e.message);process.exit(1);});

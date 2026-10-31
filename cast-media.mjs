export async function prepareCastSource(raw,{registered,validate,sign}){
 if(typeof raw!=='string')throw new Error('Selecione um vídeo para transmitir.');
 let target=raw;
 if(raw.startsWith('/')){
  const proxy=new URL(raw,'http://localhost');
  if(proxy.pathname!=='/media')throw new Error('Este endereço local não pode ser enviado para a TV.');
  target=proxy.searchParams.get('url');
 }
 if(!target||!registered.has(target))throw new Error('Selecione um vídeo remoto no player antes de transmitir.');
 const publicUrl=await validate(target,true),url=sign(publicUrl);
 if(!/^https?:$/.test(url.protocol)||['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname))throw new Error('A TV precisa de um endereço público de vídeo.');
 const extension=url.pathname.split('.').pop().toLowerCase();
 const types={m3u8:'application/vnd.apple.mpegurl',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',ts:'video/mp2t',mp3:'audio/mpeg',mpd:'application/dash+xml'};
 return {url:url.href,contentType:types[extension]||'video/mp4'};
}

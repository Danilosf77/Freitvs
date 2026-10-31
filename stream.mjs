// O prazo vale só até receber os cabeçalhos; TV ao vivo não tem duração máxima.
export async function fetchStream(url,options={},connectTimeout=8000){
 const controller=new AbortController();
 const signal=options.signal?AbortSignal.any([controller.signal,options.signal]):controller.signal;
 const timer=setTimeout(()=>controller.abort(),connectTimeout);
 try{return await fetch(url,{...options,signal});}
 finally{clearTimeout(timer);}
}

# FordBrowser PC

Abra `Iniciar.cmd`. A interface fica em http://127.0.0.1:8787. Use `Parar.cmd` para encerrar.

## TV ao vivo — IPTV Brasil 2026

A fonte principal usa as cinco listas CanaisBR01 a CanaisBR05 de https://github.com/Ramys/Iptv-Brasil-2026. A importação inicial encontrou 7.979 entradas de TV, incluindo qualidades e fontes alternativas, não canais únicos. Filmes e episódios presentes nas listas não são importados para a aba TV. A transferência das listas maiores é cancelada no início do bloco VOD, conforme a organização atual da fonte.

A lista é atualizada ao abrir a aba após seis horas; Atualizar força uma consulta. Se uma lista falhar, são usados os canais das demais com aviso. Se todas falharem, é usada a última cópia desta fonte em `.runtime/iptv-cache.json`. O cache da fonte IPTV-com anterior é ignorado. Assistir continua exigindo internet e disponibilidade do servidor de origem.

O menu Categoria de canais filtra a grade. A grade mostra60 cartões por vez e oferece Mostrar mais canais. A unica fonte de TV ativa e IPTV Brasil2026. O seletor antigo e a integracao UniTV foram removidos.

O player aceita HTTP/HTTPS e, para mídia previamente registrada na sessão, também as portas7000,8000 e8080 usadas pela quinta lista. Endereços privados continuam bloqueados. Não foi desativada validação TLS. Vídeo TS direto usa mpegts.js1.8.2, incluído localmente a partir do pacote NPM oficial com integridade SHA512 verificada; licença em MPEGTS-LICENSE.txt. Alguns links podem estar vencidos, fora do ar, limitados pelo servidor ou usar codecs incompatíveis.

O EPG anteriormente indicado em iptv-com/epg estava indisponível. Esta integração não inclui grade de programação nem altera o catálogo de filmes e séries.

Validação: `node --test teste-iptv.mjs teste-portas-iptv.mjs teste-player-ts.mjs`. Backup anterior à troca em `.runtime/backup-antes-ramys/`.

## O que funciona

- Catálogo e busca reais do serviço do APK, em português.
- Filmes e séries, filtros, paginação, cartazes e descrição.
- Episódios, seleção de áudio dublado/legendado e reprodução HLS.
- Player para MP4/HLS por link e arquivo local escolhido por você.
- Minha lista e histórico de títulos consultados, salvos no navegador.
- Interface adaptada ao PC e a telas menores.

## Acesso ao serviço original

O backend reproduz a inicialização de visitante, os cabeçalhos de compatibilidade, a assinatura de requisições e a decodificação AES recuperados do APK. A resposta de inicialização informa o endereço atual da API.

A biblioteca nativa `libpp_hls.so` foi inicializada em emulação para recuperar a verificação de reprodução. A chamada de detalhes exige MD5 hexadecimal MAIÚSCULO associado à chave do player, ao identificador da sessão e do vídeo e ao horário. O servidor então retorna episódios e links normalmente.

Os hosts de mídia exigem outra assinatura: `wsSecret` e `wsTime`. O backend reproduz o cálculo do player e trata os metadados `sz`/`m8` dos segmentos como o APK. As playlists são reescritas para o proxy local e os segmentos MPEG-TS chegam ao HLS.js.

Catálogo, episódios, playlists e segmentos reais retornaram HTTP 200 usando o fetch normal do Node.js. A reprodução de um vídeo do catálogo foi confirmada no navegador, com avanço de tempo, duração completa e ausência de erro. Não é necessário instalar APK, Java, emulador ou curl_cffi para usar.

Os parâmetros do cliente ficam em `native-client.json`, lido apenas pelo backend; esse arquivo não é servido ao navegador. Tokens de visitante permanecem em memória e não são registrados nos logs.

## Privacidade

Não há SDKs de publicidade ou analytics. Câmera, microfone, localização, USB, serial e Bluetooth estão desabilitados por Permissions-Policy. Nenhum identificador real de hardware é lido. O serviço recebe um identificador aleatório por sessão, idioma, consultas e metadados de compatibilidade. O serviço e os hosts de mídia podem registrar IP e uso conforme suas próprias políticas.

Arquivos locais ficam no navegador. Favoritos e histórico usam localStorage e podem ser apagados em Conexão. O servidor escuta somente em 127.0.0.1, valida Host/Origin, mantém verificação TLS e não é um proxy público. Links privados não são aceitos como mídia remota. Controles de assinatura/VIP não são alterados.

## Execução

O launcher usa o Node.js fornecido pelo Codex ou o Node.js do sistema. Em outro computador, instale Node.js 22 ou superior. Não é necessário instalar pacotes.

Execução manual: `node server.mjs`. Para outra porta, defina PORT antes de executar; o launcher padrão usa 8787. O iniciador mantém o servidor em segundo plano e registra logs em `.runtime/`.

- `public/index.html`, `style.css`, `app.js`: interface.
- `server.mjs`: integração, assinaturas e proxy de mídia.
- `native-client.json`: parâmetros recuperados do cliente.
- `public/hls.min.js`: HLS.js 1.6.13, Apache-2.0, licença incluída.

## Limites

Nem todos os títulos, formatos e navegadores foram testados. A disponibilidade e os codecs variam conforme o serviço. Mudanças nas APIs, chaves ou protocolo podem exigir atualização. Não há vínculo oficial com Ford ou Tekmods.

# FordBrowser PC - inicializador corrigido

Este pacote inclui Node.js e os players HLS/MPEG-TS. Destinado a PCs Windows de 64 bits, sem instalar Node, Python, ADB, emulador ou conectar celular.

Copie FordBrowser_PC_Portatil.zip para o outro PC, extraia todo o ZIP para uma pasta onde seu usuario possa gravar e abra `Iniciar.cmd`. Nao execute de dentro do ZIP. O navegador abre http://127.0.0.1:8787/.

Internet e necessaria para assistir e atualizar as listas. A disponibilidade de filmes e canais depende dos servidores externos. Use um navegador atualizado com suporte ao codec do canal. A unica fonte de TV ativa e IPTV Brasil 2026, com filtro Categoria de canais e Mostrar mais canais.

Historico e favoritos ficam no navegador de cada PC e nao sao transferidos pelo ZIP. O pacote nao inclui cookies UniTV, capturas, APKs, logs ou arquivos da investigacao. Mantenha as pastas public e node e os arquivos de licenca junto dos inicializadores. A pasta .runtime guarda somente os dados locais desta execucao e o cache inicial de canais.

O servidor escuta somente no proprio computador. Se a porta 8787 estiver ocupada, execute no PowerShell: `./Iniciar.ps1 -Porta 8788`. Parar.cmd usa a porta registrada para essa execucao.

Validacao: extracao e execucao em outra pasta neste computador. Nao foi testado fisicamente em outro PC.

Para encerrar, use `Parar.cmd`.


## Canais e reprodução

As entradas adultas são filtradas tanto nas atualizações quanto na lista salva.
O proxy não interrompe transmissões em 30 segundos. Fontes sem vídeo são substituídas após 12 segundos, quando existe outra fonte do mesmo canal e qualidade. A última fonte que reproduziu tem prioridade durante a sessão. A disponibilidade depende dos servidores das listas.

A reprodução agora prioriza playlists HLS contínuas nas fontes TS compatíveis. Isso permite atualizar os segmentos ao vivo em vez de tocar apenas o trecho TS entregue por uma conexão. A fonte que funcionou é reutilizada durante a sessão para evitar repetir tentativas ruins.


## Canais franceses

A categoria reúne canais da França das listas públicas Famelack (antigo TV Garden), iptv-org e Free-TV. Canais repetidos são agrupados e suas fontes ficam como alternativas. Listas são atualizadas a cada seis horas ou pelo botão Atualizar; o cache permite abrir sem refazer a consulta. Fontes exclusivas de YouTube não são importadas. A presença na lista não garante disponibilidade em todos os países.

Fontes:
- https://github.com/famelack/famelack-data
- https://github.com/iptv-org/iptv
- https://github.com/Free-TV/IPTV

As licenças da base Famelack e iptv-org acompanham o pacote.


## Favoritos

Use o coração nos cartões da TV ao vivo para guardar canais. Em Minha lista, Canais favoritos ficam separados de Filmes e séries favoritos. Os favoritos são salvos somente no navegador deste computador e podem ser removidos pelo mesmo coração.

# AUTO RECAP STUDIO V6

Versão mobile-first e leve para criar um mapa de cenas a partir de filme + roteiro + narração.

## O que mudou
- Sem Transformers/CLIP: evita baixar um modelo grande no iPhone.
- Sem cache persistente do app: reduz problemas de versão antiga no Safari.
- Filme: dois caminhos separados no iPhone — Arquivos (extensões de vídeo) e Fototeca (vídeo). Isso evita depender de um único seletor genérico.
- Narração: botão para adicionar partes repetidamente, sem substituir os áudios já escolhidos.
- Biblioteca visual opcional: seleção múltipla de vídeos e imagens para organizar a sessão.
- Extração de frames em resolução reduzida.
- Amostragem configurável de 8/12/15/20 s.
- Detecção leve de mudanças visuais.
- Mapeamento temporal do roteiro para o filme, usando a duração da narração quando disponível.
- Exportação JSON, CSV e plano TXT para CapCut.

## Limitação importante
O V6 é um **mapa leve**, não uma IA semântica que entende o conteúdo de cada cena. Ele sugere timestamps por posição temporal + mudanças visuais. O usuário deve confirmar a cena no filme antes de editar.

## Publicação no GitHub Pages
Substitua os arquivos `index.html`, `app.js`, `styles.css`, `manifest.json`, `sw.js` e `README.md` do repositório pelos arquivos desta pasta e faça commit direto na branch principal.


## V6
- Seleção do filme separada do processamento.
- Mostra nome, tamanho, tipo e, quando possível, duração do vídeo.
- Aceita formatos de vídeo comuns no iPhone (MP4/MOV/M4V/WebM/MKV/AVI).
- Narração aceita MP3, WAV, M4A, AAC, OGG/OGA, OPUS, FLAC e WEBM.
- Roteiro sem maxlength: o texto completo é preservado. A opção de trechos apenas organiza o mapa; não apaga o roteiro original.
- Não carrega o filme inteiro para a memória de uma vez.
- Se o Safari não conseguir ler o codec, o app mantém o arquivo como selecionado e mostra o diagnóstico em vez de simplesmente apagar a seleção.


## V6 — múltiplas narrações
- Aceita vários arquivos de áudio de uma vez.
- Mantém a ordem escolhida e cria uma linha do tempo virtual contínua.
- Mostra duração de cada parte e duração total quando o Safari consegue ler os metadados.
- Permite mover ou remover partes antes da análise.
- O roteiro continua sem limite artificial de caracteres.
- Os arquivos de áudio não são enviados para um servidor; o processamento continua no navegador.

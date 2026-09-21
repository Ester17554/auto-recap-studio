# AUTO RECAP STUDIO V1

Aplicativo web/PWA experimental para o fluxo de criação de resumos de filmes.

## Fluxo

1. Criar projeto
2. Adicionar filme
3. Colar roteiro
4. Adicionar narração
5. Analisar filme
6. Detectar cortes/segmentos
7. Relacionar trechos do roteiro com frames do filme
8. Revisar candidatos
9. Aprovar cenas
10. Exportar mapa CSV/JSON
11. Gerar um plano para levar ao CapCut

## Uso no celular

Abra `index.html` em um navegador que aceite módulos JavaScript e armazenamento local.

Para um uso mais confortável:
- publique os arquivos em um host estático;
- adicione à tela inicial;
- use um trecho de 5–10 minutos para o primeiro teste;
- intervalo de 5 segundos é recomendado para celulares mais lentos.

## Privacidade

O aplicativo não possui backend próprio nesta versão. O filme é processado localmente no navegador. O modelo visual é baixado do CDN/Hugging Face na primeira análise.

## Limitações

- A correspondência roteiro → cena é uma sugestão baseada em visão/texto, não uma garantia de que a cena é a correta.
- A detecção de cortes é aproximada.
- O navegador pode ficar pesado com filmes longos.
- A narração é usada para duração/organização; esta V1 não faz transcrição avançada da narração.
- O exportador gera mapa/plano, não um MP4 final.
- A etapa de corte físico dos clipes fica para a próxima versão.

## Estrutura

- index.html — interface
- styles.css — interface responsiva
- app.js — lógica
- manifest.json — PWA
- sw.js — cache básico do aplicativo

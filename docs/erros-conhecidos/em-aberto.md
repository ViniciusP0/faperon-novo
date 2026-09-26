# Em aberto

Itens que ainda precisam de ação, de decisão ou de confirmação do cliente. Atualizado em 25/09/2026.

## Conteúdo

| Item | Situação | Próximo passo |
| --- | --- | --- |
| Banners do SENAR desatualizados | Dois dos três banners copiados do site atual falam de prazos que já passaram ("Credenciamento ATeG 07/2025", inscrições até 30/11/2025, e "Processo Seletivo Senar e-Tec 2026.1: inscrições abertas"). | Confirmar com o SENAR quais banners valem e trocar os arquivos em `apps/web/public/senar/` e o texto em `src/content/senar.ts`. |
| Letreiro de terceiros na foto do hero | Na foto do slide 1 aparece o nome de uma empresa no prédio ao fundo, mais visível no celular. Hoje o topo da imagem é escurecido. | Trocar a foto ou recortá-la. |
| Textos do hero | Os textos dos slides da FAPERON e do SENAR são sugestão, escritos a partir das notícias e do site do SENAR. | O cliente revisar `src/content/hero.ts`. |
| Bloco "Nosso Agro" | O plano não define o que é. Foi interpretado como um resumo do campo em números (culturas, cabeças de gado, municípios). No site atual, "Nosso Agro" é um programa do Sistema FAPERON/SENAR com vídeo. | Confirmar com o cliente qual conteúdo o bloco deve ter. |
| Links para o site atual | Sobre, Informativos Técnicos e Fale Conosco agora são páginas internas com conteúdo real. Só Notícias, o Portal da Transparência, as páginas do Sistema FAPERON (SENAR, IPAGRO, mapa de sindicatos, Comissão Mulheres) e os PDFs (informativos e calendário) ainda dependem do Wix (`/blog`, `/portaldatransparência`, `/blank-12`, `/mapa-sindicatos`, `/blank-14`, `_files/ugd/...`). | Repetir a conferência antes de cada demonstração importante; quando o Wix for desligado (Fase 2), decidir o que fazer com esses links restantes (ADR 0012). |
| Notícias sem publicação própria | Publicar uma notícia exige rodar `npm run importar:noticias` (ou editar o JSON) e refazer o build. | Avaliar na Fase 2 se um CMS volta a fazer sentido (ADR 0020). |
| Informativos Técnicos: lista copiada em 25/09/2026 | Os 23 informativos mensais e os 2 boletins em `src/content/informativos.ts` apontam para PDFs reais do Wix, conferidos nessa data. | Quando a FAPERON publicar novos informativos, atualizar `src/content/informativos.ts` à mão; não há importação automática. |
| Fale Conosco envia pelo WhatsApp | Não há e-mail público da FAPERON nem backend de contato, então o formulário monta a mensagem e abre `wa.me/556932247620`; nada é armazenado. | Confirmar com o cliente se querem e-mail e/ou CRM na Fase 2. |
| Subpáginas do "Sobre" no Wix não replicadas | Histórico, Áreas de atuação e Representações não entraram na página `/sobre` por falta de conteúdo verificável (as páginas do Wix não trazem texto publicado). O Calendário do Sistema entrou como cartão com o PDF. | Se o cliente tiver esse conteúdo por fora, incluir como novas seções ou páginas. |

## Qualidade e operação

| Item | Situação | Próximo passo |
| --- | --- | --- |
| Linha de tendência no PDF | O desenho é testado como SVG e o PDF é gerado, mas ninguém conferiu visualmente a linha dentro do PDF. | Abrir um PDF de exemplo e conferir; depois criar o teste de regressão visual. |
| Teste visual do PDF | O plano prevê snapshot visual do relatório; não existe. | Implementar. |
| Teste de contrato com schemathesis | Previsto no plano; não existe. | Implementar contra o OpenAPI. |
| Lighthouse CI | Previsto no plano (meta de 90 em desempenho, SEO e acessibilidade); não existe no CI. | Adicionar ao workflow. |
| Observabilidade e backup | Sentry, alerta de falha de ingestão, backup diário do Postgres e monitor de disponibilidade estão só no plano. | Fase 2. |
| Aviso do `next start` | O E2E imprime "next start does not work with output: standalone". O teste funciona, mas o aviso permanece. | Trocar o servidor do E2E por `node .next/standalone/server.js`. |
| Identidade do Git | O `git config user.name` está vazio no notebook. | Configurar o nome de cada pessoa. |
| Demo dependente do notebook | O link cai se o notebook dormir ou perder a rede. Em 26/09/2026 foram contadas 22 suspensões em 7 dias (cerca de 93 h fora do ar). O Tailscale não desliga sozinho, é o notebook que suspende. | Aplicar as configurações de energia do `infra/demo-checklist.md` e colocar um monitor de disponibilidade externo. Fase 2: infraestrutura da FAPERON (ou o `dt-server`, já na tailnet). |
| Funnel sem receber acessos de fora | Já aconteceu de o `tailscale funnel status` dizer "Funnel on" e a entrada pública não chegar ao notebook (ver `dificuldades.md`). A causa nunca foi identificada e não foi provado que tenha relação com a suspensão. | Se voltar, ler os logs do serviço Tailscale (`C:\ProgramData\Tailscale`, exige administrador) e usar o monitor externo para detectar. |
| Acesso externo | O usuário informou que liberou o acesso externo de forma temporária. | Reverter quando a demonstração terminar (`tailscale funnel --https=8443 off`). |

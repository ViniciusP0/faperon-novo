# Continuidade: reunião de 18/10/2026 com Tiago Martins (analista da FAPERON)

Estado salvo em 17/10/2026 para retomar o trabalho na reunião. Tudo está no branch local
`feat/sistema-prototipo`: 70 commits à frente do `main` local, ainda sem push (veja "Pendências").

## Como abrir o sistema para a reunião

```bash
docker compose up -d --build api web      # site em http://localhost:3000
```

- **Login:** acesso de demonstração em http://localhost:3000/login (`user@faperon.br`, senha combinada com a equipe). Depois, escolha um dos 5 funcionários fictícios. **Marcos Oliveira** é o gestor e coordenador e vê tudo.
- **Tour:** "Tour guiado", na barra do sistema, percorre todas as áreas em 14 passos. Bom roteiro para a apresentação.
- **Dados:** são fictícios e ficam só no navegador. "Restaurar dados de exemplo" volta ao início.

## O que existe hoje na área logada (protótipo)

| Área | O que faz |
|---|---|
| Início | Próximos 7 dias, atalhos por área, convite para o tour na primeira visita |
| Agenda | Mês com legenda de cores (meus eventos, FAPERON, frota, espaços), painel do dia, lista; agendar por voz |
| Frotas | Veículos, reservas (com conflito e manutenção), saída e retorno com km, abastecimento, manutenção, revisão, custos |
| Espaços | Pedido (por voz também), painel de 7 dias, fila; o gestor aprova, recusa ou **devolve para correção com observação**; o solicitante corrige e reenvia |
| Contas | Despesas por centro de custo com comprovante, envio, aprovação e devolução pelo gestor, totais por centro |
| Atividades | Registro de atividades realizadas (também por voz), visão da equipe para o coordenador, **histórico automático** de todas as ações |
| Relatórios | Frota, Espaços, Agenda, Prestação de contas e Atividades; PDF com **capa e contracapa do boletim da FAPERON**, personalizáveis por tipo; CSV para Excel |
| Zétele | Em todas as telas, com base de conhecimento (RAG), banco e limite próprios (250/dia, voz incluída), separado do Zétele do site (200/dia) |

Também entraram as atualizações do Vinicius: mapa dos sindicatos, Galeria, capa do PDF do Painel e as figuras do fundo. Os cartões do mapa foram ajustados para caber no painel.

## Para validar com o Tiago

1. **Créditos da contracapa dos relatórios:** o padrão traz "Presidência: Hélio Dias de Souza" e "Elaboração: quem gerou". Confirmar se entra a equipe técnica, como no boletim.
2. **Notas metodológicas** de cada tipo de relatório (texto padrão em `apps/web/src/lib/sistema/documento.ts`).
3. **Centros de custo e categorias** da prestação de contas: hoje são Presidência, Administrativo, Técnica, Comunicação e Sindical.
4. **Tipos de atividade:** visita técnica, atendimento ao produtor, reunião, capacitação, evento, viagem, administrativo e outro.
5. **Textos do tour,** passo a passo (`apps/web/src/content/sistema/tour.ts`).
6. **Mapa dos sindicatos:** a foto de Porto Velho mostra fachada de "Sindicato dos Trabalhadores Rurais". Conferir o cadastro.

## Pendências (na ordem combinada)

1. **Legenda de cores e tags.** O usuário pediu:
   - um padrão único de legenda de cores para os tipos de evento (hoje cada módulo tem a sua);
   - um sistema de tags para classificar os itens da administração (eventos, reservas, pedidos, despesas, atividades).
   
   Decidir com o Tiago a lista de tags e quem pode criá-las.
2. **Fork no GitHub.** Subir o nosso código num fork do `ViniciusP0/faperon-novo`, sem tocar no repositório dele, para o Vinicius analisar e incorporar a área de administração. Um push no `main` dele dispara deploy, então o envio vai só para o fork. Abrir pull request para ele? Confirmar.
3. **Google Agenda nos dois sentidos.** Os e-mails da equipe são Gmail. O que cada funcionário registrar no Google Agenda aparece na agenda do sistema, e vice-versa. Antes de construir, falta definir:
   - **Projeto no Google Cloud:** um projeto com a Google Calendar API ativada e a tela de consentimento OAuth publicada. Quem cria e administra?
   - **Credenciais:** cliente OAuth Web (ID e segredo) e endereço de retorno do domínio definitivo.
   - **Servidor:** a sincronização exige login real e banco no servidor. O protótipo de hoje guarda tudo no navegador, então a integração entra junto com a passagem do sistema para o backend (nova ADR).
   - **Escopo:** que calendário sincronizar (o principal ou um "FAPERON" criado pelo sistema) e o que fazer em conflito de edição.

## Estado técnico

- **Testes:** 495 testes unitários no front e 429 no backend, todos aprovados. O e2e passou nas rodadas de 17/10; a rodada da madrugada foi interrompida porque a máquina hibernou.
- **Golden do Zétele:** 34 de 35 contra a API real (meta de 95%).
- **Decisões:** ADR 0029 a 0032, sobre o Zétele, o registro anônimo, o protótipo no front e os dois canais com RAG.
- **Logs de erros:** `docs/erros-conhecidos/` (do projeto) e o log global do Claude Code.

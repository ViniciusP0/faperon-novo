# ADR 0031: Protótipo do sistema interno só no front, com dados fictícios no navegador

Status: Aceita

## Contexto

A FAPERON quer validar três módulos do sistema interno atrás do botão "Acessar o sistema": agenda individual de cada funcionário, gestão de frotas (veículos, reservas, abastecimento, manutenção e custos) e agendamento de espaços (auditório, hub, sala de reuniões, núcleo técnico e sala da presidência), com fila de pedidos e aviso de conflitos. Ainda não há decisão sobre contas, permissões nem infraestrutura do sistema definitivo.

## Opções

- **Escolhida:** protótipo navegável no Next.js (`/login` e `/sistema/*`), com 5 funcionários fictícios e dados de exemplo gerados a partir da data de hoje; o que a pessoa cria fica só no navegador (`localStorage`, com a sessão no `sessionStorage`), com fallback em memória.
- **Descartadas:** protótipo fora do site (Figma ou HTML solto), que não reaproveita nada; backend real no Django já agora, que exigiria contas, LGPD e decisões de permissão antes da validação.

## Decisão

- O `/login` passa a ser a escolha de um funcionário fictício; não há e-mail nem senha.
- Papel único de gestor (Marcos, Administrativo) para cadastrar veículos, registrar manutenção e aprovar ou recusar pedidos de espaço.
- As regras ficam em funções puras e testadas em `apps/web/src/lib/sistema/` (conflito de reserva, revisão por km e data, custos por mês, períodos e conflitos de espaço), prontas para migrar para o backend.
- Toda tela mostra a faixa "Protótipo: dados fictícios, salvos só neste navegador"; as rotas são `noindex` e ficam fora do sitemap.

## Consequências

- Nada sai do navegador: a política de privacidade continua verdadeira (o texto do login cita o protótipo).
- Os dados não são compartilhados entre pessoas nem máquinas; a fila de espaços e a frota só fazem sentido numa demonstração no mesmo navegador.
- O sistema definitivo precisa de uma nova ADR: autenticação real, modelo de permissões, persistência no Postgres e migração das regras de `lib/sistema/` para o Django.

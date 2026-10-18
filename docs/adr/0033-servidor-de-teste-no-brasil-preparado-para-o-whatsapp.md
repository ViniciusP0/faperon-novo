# ADR 0033: Servidor de teste próprio no Brasil, preparado para a integração com o WhatsApp

Status: Aceita (18/10/2026)

## Contexto

Hoje o site só fica no ar na `vinicin`, o computador do Vinicius exposto pelo Tailscale Funnel. Quando ela desliga, o site sai do ar. A DATA-RO precisa de um ambiente de teste próprio, sempre ligado e hospedado no Brasil.

O usuário também registrou a direção do produto: **a área administrativa e o Zétele serão completamente integrados ao WhatsApp**. Pelo WhatsApp, a equipe vai mandar demandas, enviar documentos e consultar o banco de dados. Esse plano muda o que o servidor precisa ter:
- um endereço HTTPS público e estável, para o webhook;
- armazenamento de arquivos no Brasil;
- folga de memória para uma fila e um trabalhador;
- cópias de segurança.

## Stack analisada (medida em 18/10/2026)

| Peça | Tecnologia | Consumo medido |
|---|---|---|
| Front | Next.js 15 (standalone), React 19, Node 22 | ~100 MB de RAM; o build pede ~1,5–2 GB |
| API | Django 5.2 + DRF, Gunicorn (3 processos × 4 threads), WeasyPrint (PDF), SDK Anthropic | ~360 MB de RAM; imagem de 528 MB |
| Agendador | o mesmo código da API (`run_scheduler`: carga do SIDRA/IBGE e expurgo do Zétele) | um processo Python |
| Banco | PostgreSQL 16 | ~100 MB de RAM; 68 MB de dados |
| Cache | FileBasedCache em disco (limites e disjuntor do Zétele; o contador diário fica no Postgres) | desprezível |
| Webhook de deploy | `infra/webhook_listener.py` (só na vinicin; ocioso no servidor de teste) | desprezível |
| IA | Claude Sonnet 5.5 pela API da Anthropic (Zétele público e do sistema, voz) | externo |

Com tudo no ar, a pilha usa cerca de 0,6 GB. O pico vem do build do Next.

## Decisão

### Servidor de teste: AWS da DATA-RO, região São Paulo (`sa-east-1`)

| Item | Escolha | Por quê |
|---|---|---|
| Região | `sa-east-1` (São Paulo), fixa nos scripts | Banco, arquivos e cópias ficam em território brasileiro |
| Máquina | EC2 **t3.medium**: 2 vCPU, 4 GB de RAM, mais 4 GB de swap | Comporta a pilha atual e o build. Também deixa espaço para o Redis e o trabalhador do WhatsApp. A t3.small (2 GB) só cabe sem o WhatsApp. |
| Sistema | Ubuntu 24.04 LTS, atualizações de segurança automáticas, fuso America/Porto_Velho | Base suportada até 2029 |
| Disco | 40 GB gp3, **cifrado** | As imagens, o cache de build e os documentos de teste cabem, com folga |
| Rede | Elastic IP; firewall só com 80 e 443; **sem SSH**, com manutenção pelo Session Manager; IMDSv2 obrigatório | Superfície mínima |
| HTTPS | Caddy com Let's Encrypt em `<ip>.sslip.io` | O webhook do WhatsApp exige HTTPS válido. Em produção, o endereço passa a ser um domínio próprio. |
| Arquivos e cópias | Bucket S3 em `sa-east-1`: privado, cifrado e versionado. Prefixo `backups/` com `pg_dump` diário guardado por 30 dias; prefixo `whatsapp/` reservado para a mídia recebida. | Documentos e cópias ficam no Brasil |
| Segredos | Chave do Django e senha do Postgres geradas na máquina; chave da Anthropic no Parameter Store (SecureString); o papel da máquina só lê `/faperon-teste/*` e só usa o bucket dela | Nada sensível no git |
| Atualização | O `infra/deploy.sh` confere o `main` do **nosso fork** (`justr1de/faperon-novo`) a cada 2 min | Testamos sem tocar no portal do Vinicius |
| Recuperação | Alarme do CloudWatch que reinicia a máquina se ela falhar na checagem de status | Ambiente de teste com pouca vigilância |

**Custo estimado**, com preços de São Paulo em 18/10/2026: máquina US$ 49,1 + disco US$ 6,1 + IPv4 US$ 3,7 + S3 e alarme, abaixo de US$ 1. São **cerca de US$ 60 por mês**, cobertos pelos créditos da conta enquanto durarem.

### Integração com o WhatsApp (registrada aqui, construída em fases)

1. **Canal:** a WhatsApp Business **Cloud API**, oficial da Meta, com um número da FAPERON. Nada de bibliotecas não oficiais, que levam a banimento do número.
2. **Entrada:**
   - o webhook fica em `POST /api/v1/whatsapp/webhook`, com verificação do `hub.verify_token` e da assinatura `X-Hub-Signature-256`;
   - ele responde `200` na hora e põe a mensagem numa **fila** (Redis + trabalhador), porque a Meta reenvia o que demora.
3. **Quem fala:**
   - cada número de telefone fica vinculado a um funcionário cadastrado, numa lista de autorização;
   - número desconhecido recebe só a orientação de procurar a Administração;
   - as permissões são as mesmas da área administrativa.
4. **Demandas:** o Zétele entende a mensagem, escrita ou em áudio, e propõe o registro, que a pessoa confirma antes de gravar. Exemplos:
   - "reserva a Hilux para Jaru na terça";
   - "registra a visita de hoje em Cacoal";
   - "pede o auditório para sexta".
   Para os formulários, usa o mesmo interpretador da voz (`zetele/voz.py`).
5. **Documentos:**
   - fotos e PDFs (comprovantes, ofícios, listas de presença) vão para o S3 em `sa-east-1`;
   - o Zétele extrai os campos, como valor, data e fornecedor, e vincula o arquivo ao item (despesa, atividade, pedido);
   - o envio fica no histórico.
6. **Acesso ao banco:** o Zétele responde perguntas sobre agenda, frota, espaços, contas e atividades por **ferramentas de leitura com escopo por permissão**, nunca por SQL livre. Toda escrita pede confirmação explícita na conversa, e cada consulta fica registrada na auditoria.
7. **Pré-requisito:** o sistema precisa sair do navegador. O protótipo de hoje (ADR 0031) guarda tudo no `localStorage`, e o WhatsApp exige:
   - login real;
   - permissões no servidor;
   - persistência no Postgres;
   - migração das regras de `apps/web/src/lib/sistema/` para o Django.
   Uma ADR própria vai tratar disso antes da primeira fase do WhatsApp.

## Consequências

- **Ambiente de teste estável:** a DATA-RO passa a ter um ambiente próprio, no Brasil, que não depende da `vinicin`. Cada push precisa ir para os dois remotos: `origin` (Vinicius) e `fork`.
- **Dados no Brasil, processamento fora:** banco, arquivos e cópias ficam em São Paulo. Mesmo assim, há **transferência internacional** no processamento, porque as mensagens passam pela Meta e o texto e os documentos vão à Anthropic. O RIPD, a base legal, os avisos aos titulares e os contratos ficam a cargo do encarregado de dados da DATA-RO, Weslley Hariel Lima e Silva Palomeque Gonçalves (`weslley.palomeque@dataro-it.com.br`), antes de qualquer dado real entrar.
- **Pendências do lado da Meta:** conta Business verificada, número dedicado, modelos de mensagem aprovados para conversas fora da janela de 24 h, e as tarifas por conversa da Meta (à parte do custo da AWS).
- **Produção:** em produção, provavelmente com o banco em RDS e um domínio próprio, o desenho é revisto. Este servidor é de teste e não deve receber dados reais de produtores nem de funcionários sem o aval do encarregado.

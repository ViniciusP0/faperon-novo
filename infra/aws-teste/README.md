# Servidor de teste na AWS (DATA-RO, São Paulo)

Este é um ambiente de teste nosso, separado do portal do Vinicius (`vinicin`), e hospedado **no Brasil**. A decisão está em [ADR 0033](../../docs/adr/0033-servidor-de-teste-no-brasil-preparado-para-o-whatsapp.md). O servidor já está dimensionado para a futura integração da área administrativa e do Zétele com o WhatsApp (demandas, documentos e consultas ao banco).

## Especificação

| Item | Valor |
|---|---|
| Região | `sa-east-1` (São Paulo), fixa no script |
| Máquina | EC2 **`t4g.small`** (ARM Graviton2): 2 vCPU e 2 GB de RAM, mais 2 GB de swap. Créditos de CPU no modo *standard*, sem cobrança extra. A conta está no plano gratuito da AWS, que só libera máquinas de até 2 GB a preço baixo (a de 4 GB custa ~US$ 95/mês). |
| Sistema | Ubuntu 24.04 LTS, com atualizações de segurança automáticas e fuso America/Porto_Velho |
| Disco | 40 GB gp3, cifrado |
| Rede | Elastic IP; só as portas 80 e 443 abertas; sem SSH (manutenção pelo Session Manager); IMDSv2 obrigatório |
| HTTPS | Caddy com Let's Encrypt, em `https://<ip-com-hifens>.sslip.io` |
| Aplicação | O mesmo `docker compose` da produção (Postgres 16, API Django, agendador, Next.js), com as imagens trocadas pelas do ECR (`docker-compose.teste.yml`). **A máquina não faz build**: no ar, a pilha usa ~0,6 GB, e com a fila do WhatsApp ~1 GB. |
| Imagens | Geradas para ARM pelo GitHub Actions do fork (máquinas ARM gratuitas para repositório público) e guardadas no ECR de São Paulo (`faperon-teste/api` e `faperon-teste/web`), privado, com as 10 últimas versões. O GitHub publica por OIDC, sem chave guardada. |
| Arquivos e cópias | Bucket S3 `faperon-teste-<conta>-sa-east-1`, privado, cifrado e versionado. `backups/` recebe o `pg_dump` diário às 3 h, guardado por 30 dias; `whatsapp/` fica reservado para a mídia recebida. |
| Segredos | A chave do Django e a senha do Postgres são geradas na máquina. A chave do Zétele fica em `/faperon-teste/anthropic-api-key` (SecureString). O papel da máquina só lê esse prefixo e só usa o próprio bucket. |
| Atualização | A cada 10 min, o workflow do branch `servidor` do fork traz o `main` do Vinicius e gera as imagens de um commit novo. A cada 2 min, a máquina baixa o compose do `main` do fork e as imagens do ECR (`atualizar.sh`). O Vinicius não precisa fazer nada diferente: o que ele sobe chega aqui sozinho. |
| Recuperação | Um alarme do CloudWatch reinicia a máquina, com o mesmo IP e o mesmo disco, se o hardware falhar |
| Custo estimado | **Cerca de US$ 30/mês**: máquina 19,6 + disco 6,1 + IPv4 3,7 + S3, ECR e alarme abaixo de 1. Preços de São Paulo em 18/10/2026. |

## Produção (18/10/2026)

A produção usa os mesmos scripts com `AMBIENTE=producao`, numa **máquina separada**, com IP, banco, bucket, chaves e imagens próprios (`faperon-producao-*`), também t4g.small no plano gratuito da conta, por decisão do usuário.

- **Atualização:** a produção **não recebe todo commit**. Ela segue o branch `producao` do fork, e esse branch só muda quando uma versão já vista no servidor de teste é promovida.
- **Imagens:** são próprias da produção, porque o `SITE_URL` entra no build do web. O workflow do branch `servidor` gera essas imagens quando o branch `producao` muda.
- **Criar:** `AMBIENTE=producao bash infra/aws-teste/criar-servidor.sh`. Ela começa no `main` atual do fork.
- **Promover uma versão testada:** `bash infra/aws-teste/promover-producao.sh [commit]`. Sem argumento, ele promove o `main` atual do fork. O script recusa o commit se ele não tiver imagem de teste ou se o CI dele falhou.
- **Trocar as chaves:** `AMBIENTE=producao bash infra/aws-teste/atualizar-chaves.sh`.

## Criar

```bash
aws login --profile dataro
bash infra/aws-teste/criar-servidor.sh
```

O script pode rodar de novo, porque reaproveita o que já existe. Ele também prepara o fork: liga o Actions, cria o branch `servidor` com o workflow e o torna o branch padrão. A máquina sobe em uns 5 minutos, e o site entra no ar quando o GitHub termina as primeiras imagens, em uns 15 minutos.

## Publicar uma versão

Basta o commit estar no `main` do Vinicius ou no `main` do fork. Em até 10 minutos o workflow gera as imagens, e em mais 2 minutos a máquina se atualiza.

```bash
git push fork HEAD:main
```

## Manutenção

```bash
aws ssm start-session --profile dataro --region sa-east-1 --target <id-da-instância>
sudo tail -f /var/log/faperon-inicializar.log      # primeiro boot
sudo tail -f /var/log/faperon-atualizar.log        # atualizações
sudo /usr/local/bin/faperon-backup                 # cópia do banco agora
```

## Apagar tudo

Os recursos levam a etiqueta `Project=faperon-teste`. Apague-os nesta ordem:

1. Apague o alarme `faperon-teste-recuperar`. Antes de tudo, volte o branch padrão do fork para `main`.
2. Encerre a instância `faperon-teste`.
3. Libere o Elastic IP.
4. Apague o security group `faperon-teste-web`.
5. Apague o perfil e o papel `faperon-teste-ec2`.
6. Apague o parâmetro `/faperon-teste/anthropic-api-key`, os repositórios ECR `faperon-teste/api` e `faperon-teste/web` e o papel `faperon-teste-github` (com o provedor OIDC do GitHub, se nada mais o usa).
7. Esvazie e apague o bucket `faperon-teste-<conta>-sa-east-1`. Antes, confira se as cópias do banco podem ir embora.

## Dados reais

Este servidor é de teste. Dados reais de funcionários ou produtores só entram com o aval do encarregado de dados da DATA-RO, Weslley Hariel Lima e Silva Palomeque Gonçalves (`weslley.palomeque@dataro-it.com.br`). Veja a seção LGPD da ADR 0033.

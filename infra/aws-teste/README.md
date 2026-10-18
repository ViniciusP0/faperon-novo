# Servidor de teste na AWS (DATA-RO, São Paulo)

Este é um ambiente de teste nosso, separado do portal do Vinicius (`vinicin`), e hospedado **no Brasil**. A decisão está em [ADR 0033](../../docs/adr/0033-servidor-de-teste-no-brasil-preparado-para-o-whatsapp.md). O servidor já está dimensionado para a futura integração da área administrativa e do Zétele com o WhatsApp (demandas, documentos e consultas ao banco).

## Especificação

| Item | Valor |
|---|---|
| Região | `sa-east-1` (São Paulo), fixa no script |
| Máquina | EC2 `t3.medium`: 2 vCPU e 4 GB de RAM, mais 4 GB de swap (`TIPO=t3.small` para a versão mais barata, sem folga para o WhatsApp) |
| Sistema | Ubuntu 24.04 LTS, com atualizações de segurança automáticas e fuso America/Porto_Velho |
| Disco | 40 GB gp3, cifrado |
| Rede | Elastic IP; só as portas 80 e 443 abertas; sem SSH (manutenção pelo Session Manager); IMDSv2 obrigatório |
| HTTPS | Caddy com Let's Encrypt, em `https://<ip-com-hifens>.sslip.io` |
| Aplicação | O mesmo `docker compose` da produção: Postgres 16, API Django (Gunicorn), agendador e Next.js |
| Arquivos e cópias | Bucket S3 `faperon-teste-<conta>-sa-east-1`, privado, cifrado e versionado. `backups/` recebe o `pg_dump` diário às 3 h, guardado por 30 dias; `whatsapp/` fica reservado para a mídia recebida. |
| Segredos | A chave do Django e a senha do Postgres são geradas na máquina. A chave do Zétele fica em `/faperon-teste/anthropic-api-key` (SecureString). O papel da máquina só lê esse prefixo e só usa o próprio bucket. |
| Atualização | Confere o `main` do **nosso fork** (`justr1de/faperon-novo`) a cada 2 minutos, com o mesmo `infra/deploy.sh` da vinicin |
| Recuperação | Um alarme do CloudWatch reinicia a máquina, com o mesmo IP e o mesmo disco, se o hardware falhar |
| Custo estimado | Cerca de US$ 60/mês: máquina 49,1 + disco 6,1 + IPv4 3,7 + S3 e alarme abaixo de 1. Preços de São Paulo em 18/10/2026. |

## Criar

```bash
aws login --profile dataro
bash infra/aws-teste/criar-servidor.sh
```

O primeiro boot instala tudo e faz o build, em uns 15 a 20 minutos.

## Publicar uma versão

Faça o push para o `main` do fork. A máquina aplica sozinha em até 2 minutos, mais o tempo do build.

```bash
git push fork HEAD:main
```

## Manutenção

```bash
aws ssm start-session --profile dataro --region sa-east-1 --target <id-da-instância>
sudo tail -f /var/log/faperon-inicializar.log      # primeiro boot
sudo tail -f /opt/faperon/infra/deploy.log         # atualizações
sudo /usr/local/bin/faperon-backup                 # cópia do banco agora
```

## Apagar tudo

Os recursos levam a etiqueta `Project=faperon-teste`. Apague-os nesta ordem:

1. Apague o alarme `faperon-teste-recuperar`.
2. Encerre a instância `faperon-teste`.
3. Libere o Elastic IP.
4. Apague o security group `faperon-teste-web`.
5. Apague o perfil e o papel `faperon-teste-ec2`.
6. Apague o parâmetro `/faperon-teste/anthropic-api-key`.
7. Esvazie e apague o bucket `faperon-teste-<conta>-sa-east-1`. Antes, confira se as cópias do banco podem ir embora.

## Dados reais

Este servidor é de teste. Dados reais de funcionários ou produtores só entram com o aval do encarregado de dados da DATA-RO, Weslley Hariel Lima e Silva Palomeque Gonçalves (`weslley.palomeque@dataro-it.com.br`). Veja a seção LGPD da ADR 0033.

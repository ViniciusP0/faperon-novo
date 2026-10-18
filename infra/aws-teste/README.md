# Servidor de teste na AWS (DATA-RO)

Este é um ambiente de teste nosso, separado do portal do Vinicius (`vinicin`). Ele roda o mesmo
`docker compose` da produção numa EC2 `t3.small` em São Paulo (`sa-east-1`), com estas peças:

- **HTTPS:** o Caddy obtém o certificado no Let's Encrypt. O endereço tem a forma `https://<ip-com-hifens>.sslip.io`.
- **Atualização automática:** a máquina confere o `main` do **nosso fork** (`justr1de/faperon-novo`) a cada 2 minutos, com o mesmo `infra/deploy.sh` da vinicin.
- **Acesso de manutenção:** só pelo Session Manager. Não há porta SSH aberta.
- **Segredos:** a chave do Django e a senha do Postgres são geradas na própria máquina. A chave do Zétele vem do Parameter Store, em `/faperon-teste/anthropic-api-key`, cifrada.
- **Custo estimado:** cerca de US$ 25 por mês (máquina, disco de 30 GB e IP fixo).

## Criar

```bash
aws login --profile dataro
bash infra/aws-teste/criar-servidor.sh
```

## Publicar uma versão

Faça o push para o `main` do fork. A máquina aplica sozinha em até 2 minutos, e depois roda o build.

```bash
git push fork HEAD:main
```

## Manutenção

```bash
aws ssm start-session --profile dataro --region sa-east-1 --target <id-da-instância>
sudo tail -f /var/log/faperon-inicializar.log      # primeiro boot
sudo tail -f /opt/faperon/infra/deploy.log         # atualizações
```

## Apagar tudo

Os recursos levam a etiqueta `Project=faperon-teste`. Apague-os nesta ordem:

1. Encerre a instância `faperon-teste`.
2. Libere o Elastic IP.
3. Apague o security group `faperon-teste-web`.
4. Apague o perfil e o papel `faperon-teste-ec2`.
5. Apague o parâmetro `/faperon-teste/anthropic-api-key`.

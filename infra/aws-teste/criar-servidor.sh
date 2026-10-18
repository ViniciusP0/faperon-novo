#!/bin/bash
# Cria (ou completa) o servidor de teste da FAPERON na AWS da DATA-RO, em São Paulo (sa-east-1).
# Especificação e motivos: docs/adr/0033-servidor-de-teste-no-brasil-preparado-para-o-whatsapp.md.
# Uso, a partir da raiz do repositório, com `aws login --profile dataro` e `gh` logado como justr1de:
#   bash infra/aws-teste/criar-servidor.sh
# Pode rodar de novo: o que já existe é reaproveitado. Tudo leva a etiqueta Project=faperon-teste.
set -euo pipefail
# A região é fixa: banco, arquivos, imagens e cópias ficam no Brasil
export AWS_PROFILE="${AWS_PROFILE:-dataro}" AWS_REGION=sa-east-1 AWS_DEFAULT_REGION=sa-east-1
# t4g.small (ARM, 2 GB) cabe no plano gratuito da conta; a máquina não faz build (imagens vêm do ECR)
TIPO="${TIPO:-t4g.small}"
FORK="justr1de/faperon-novo"
cd "$(dirname "$0")/../.."

TAG='Key=Project,Value=faperon-teste'
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
existe() { "$@" > /dev/null 2>&1; }

echo "Conta: $(aws sts get-caller-identity --query Arn --output text)"
CONTA=$(aws sts get-caller-identity --query Account --output text)
VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)
REGISTRO="$CONTA.dkr.ecr.sa-east-1.amazonaws.com"

# 1. Firewall: só HTTP e HTTPS; sem SSH (o acesso de manutenção é pelo Session Manager)
SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=faperon-teste-web Name=vpc-id,Values="$VPC" \
  --query 'SecurityGroups[0].GroupId' --output text)
if [ "$SG" = "None" ]; then
  SG=$(aws ec2 create-security-group --group-name faperon-teste-web --vpc-id "$VPC" \
    --description "FAPERON servidor de teste: so HTTP/HTTPS" \
    --tag-specifications "ResourceType=security-group,Tags=[{$TAG},{Key=Name,Value=faperon-teste-web}]" \
    --query GroupId --output text)
  aws ec2 authorize-security-group-ingress --group-id "$SG" --ip-permissions \
    'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}],Ipv6Ranges=[{CidrIpv6=::/0}]' \
    'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}],Ipv6Ranges=[{CidrIpv6=::/0}]' > /dev/null
fi
echo "Firewall: $SG"

# 2. IP fixo e o endereço com HTTPS (sslip.io resolve o IP escrito no nome)
read -r EIP ALLOC <<< "$(aws ec2 describe-addresses --filters Name=tag:Name,Values=faperon-teste \
  --query 'Addresses[0].[PublicIp,AllocationId]' --output text)"
if [ "$EIP" = "None" ]; then
  read -r EIP ALLOC <<< "$(aws ec2 allocate-address --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{$TAG},{Key=Name,Value=faperon-teste}]" \
    --query '[PublicIp,AllocationId]' --output text)"
fi
HOST="${EIP//./-}.sslip.io"
echo "IP: $EIP -> https://$HOST"

# 3. Bucket no Brasil: cópias do banco (backups/, 30 dias) e, depois, a mídia do WhatsApp (whatsapp/)
BUCKET="faperon-teste-$CONTA-sa-east-1"
if ! existe aws s3api head-bucket --bucket "$BUCKET"; then
  aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration LocationConstraint=sa-east-1 > /dev/null
fi
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration \
  '{"Rules":[{"ID":"backups-30-dias","Filter":{"Prefix":"backups/"},"Status":"Enabled","Expiration":{"Days":30},"NoncurrentVersionExpiration":{"NoncurrentDays":7}}]}' > /dev/null
aws s3api put-bucket-tagging --bucket "$BUCKET" --tagging 'TagSet=[{Key=Project,Value=faperon-teste}]'
echo "Bucket: s3://$BUCKET"

# 4. Registro das imagens (ECR, São Paulo), privado, guardando as 10 últimas versões
for nome in api web; do
  if ! existe aws ecr describe-repositories --repository-names "faperon-teste/$nome"; then
    aws ecr create-repository --repository-name "faperon-teste/$nome" --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 --tags "$TAG" > /dev/null
  fi
  aws ecr put-lifecycle-policy --repository-name "faperon-teste/$nome" --lifecycle-policy-text \
    '{"rules":[{"rulePriority":1,"description":"guarda as 10 ultimas","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]}' > /dev/null
done
echo "Imagens: $REGISTRO/faperon-teste/{api,web}"

# 5. Papel da máquina: Session Manager, leitura de /faperon-teste/*, o próprio bucket e baixar do ECR
cat > "$TMP/confianca-ec2.json" <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
if ! existe aws iam get-role --role-name faperon-teste-ec2; then
  aws iam create-role --role-name faperon-teste-ec2 --assume-role-policy-document "file://$TMP/confianca-ec2.json" --tags "$TAG" > /dev/null
fi
aws iam attach-role-policy --role-name faperon-teste-ec2 --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam attach-role-policy --role-name faperon-teste-ec2 --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
aws iam put-role-policy --role-name faperon-teste-ec2 --policy-name ler-parametros-faperon-teste --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"ssm:GetParameter\",\"Resource\":\"arn:aws:ssm:sa-east-1:$CONTA:parameter/faperon-teste/*\"},{\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:ListBucket\"],\"Resource\":[\"arn:aws:s3:::$BUCKET\",\"arn:aws:s3:::$BUCKET/*\"]}]}"
if ! existe aws iam get-instance-profile --instance-profile-name faperon-teste-ec2; then
  aws iam create-instance-profile --instance-profile-name faperon-teste-ec2 --tags "$TAG" > /dev/null
  aws iam add-role-to-instance-profile --instance-profile-name faperon-teste-ec2 --role-name faperon-teste-ec2
  sleep 10 # o perfil da instância leva alguns segundos para valer
fi

# 6. GitHub do fork publica no ECR por OIDC: credencial temporária, sem chave guardada no GitHub
OIDC="arn:aws:iam::$CONTA:oidc-provider/token.actions.githubusercontent.com"
if ! existe aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC"; then
  aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com --tags "$TAG" > /dev/null
fi
# O formato do `sub` varia: repositórios novos usam o imutável (repo:dono@id/nome@id); lido do próprio GitHub
PREFIXO_SUB=$(gh api "repos/$FORK/actions/oidc/customization/sub" --jq '.sub_claim_prefix // empty' 2>/dev/null || true)
PREFIXO_SUB="${PREFIXO_SUB:-repo:$FORK}"
cat > "$TMP/confianca-github.json" <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Federated":"$OIDC"},"Action":"sts:AssumeRoleWithWebIdentity",
 "Condition":{"StringEquals":{"token.actions.githubusercontent.com:aud":"sts.amazonaws.com","token.actions.githubusercontent.com:sub":"$PREFIXO_SUB:ref:refs/heads/servidor"}}}]}
EOF
if ! existe aws iam get-role --role-name faperon-teste-github; then
  aws iam create-role --role-name faperon-teste-github --assume-role-policy-document "file://$TMP/confianca-github.json" --tags "$TAG" > /dev/null
else
  aws iam update-assume-role-policy --role-name faperon-teste-github --policy-document "file://$TMP/confianca-github.json"
fi
aws iam put-role-policy --role-name faperon-teste-github --policy-name publicar-imagens-faperon-teste --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"ecr:GetAuthorizationToken\",\"Resource\":\"*\"},{\"Effect\":\"Allow\",\"Action\":[\"ecr:BatchCheckLayerAvailability\",\"ecr:BatchGetImage\",\"ecr:CompleteLayerUpload\",\"ecr:InitiateLayerUpload\",\"ecr:PutImage\",\"ecr:UploadLayerPart\",\"ecr:GetDownloadUrlForLayer\"],\"Resource\":\"arn:aws:ecr:sa-east-1:$CONTA:repository/faperon-teste/*\"}]}"
gh variable set AWS_ROLE_SERVIDOR_TESTE --repo "$FORK" --body "arn:aws:iam::$CONTA:role/faperon-teste-github"
gh variable set SITE_URL_SERVIDOR_TESTE --repo "$FORK" --body "https://$HOST"
echo "GitHub do fork autorizado a publicar no ECR"

# O workflow das imagens vive só no branch `servidor` do fork (padrão de lá), para nunca ir ao
# repositório do Vinicius; forks vêm com o Actions desligado
if ! git ls-remote --exit-code "https://github.com/$FORK.git" refs/heads/servidor > /dev/null; then
  git worktree add -q --orphan -b servidor "$TMP/servidor"
  mkdir -p "$TMP/servidor/.github/workflows"
  cp infra/aws-teste/servidor-teste.yml "$TMP/servidor/.github/workflows/servidor-teste.yml"
  printf '# Branch `servidor` (só no fork da DATA-RO)\n\nGuarda apenas o workflow do servidor de teste (AWS São Paulo). O código fica no `main`,\nidêntico ao do repositório do Vinicius. Veja `infra/aws-teste/README.md` no `main`.\n' > "$TMP/servidor/README.md"
  git -C "$TMP/servidor" add -A
  git -C "$TMP/servidor" commit -q -m "ci: workflow do servidor de teste (sincroniza com o Vinicius e publica imagens ARM no ECR)"
  git -C "$TMP/servidor" push -q "https://github.com/$FORK.git" servidor
  git worktree remove "$TMP/servidor"
  git branch -D servidor > /dev/null
fi
gh api -X PUT "repos/$FORK/actions/permissions" -F enabled=true -f allowed_actions=all
gh api -X PATCH "repos/$FORK" -f default_branch=servidor > /dev/null
echo "Fork: Actions ligado; branch padrão = servidor (workflow das imagens)"

# 7. Chave do Zétele: do .env.local para o Parameter Store cifrado, sem aparecer na tela
if ! existe aws ssm get-parameter --name /faperon-teste/anthropic-api-key; then
  ( umask 077
    python3 - "$TMP/chave" <<'PY'
import re, sys
texto = open(".env.local").read()
m = re.search(r"^ANTHROPIC_API_KEY=(.+)$", texto, re.M)
if not m:
    sys.exit("ANTHROPIC_API_KEY não encontrada no .env.local")
open(sys.argv[1], "w").write(m.group(1).strip().strip('"'))
PY
  )
  aws ssm put-parameter --name /faperon-teste/anthropic-api-key --type SecureString \
    --value "file://$TMP/chave" --tags "$TAG" > /dev/null
  rm -f "$TMP/chave"
fi
echo "Chave do Zétele em /faperon-teste/anthropic-api-key (SecureString)"

# 8. A máquina: Ubuntu 24.04 da arquitetura do tipo, 40 GB gp3 cifrado, IMDSv2, CPU em modo standard
INST=$(aws ec2 describe-instances --filters Name=tag:Name,Values=faperon-teste Name=instance-state-name,Values=pending,running,stopping,stopped \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
if [ "$INST" = "None" ]; then
  ARQ=$(aws ec2 describe-instance-types --instance-types "$TIPO" --query 'InstanceTypes[0].ProcessorInfo.SupportedArchitectures[0]' --output text)
  [ "$ARQ" = "x86_64" ] && ARQ=amd64
  AMI=$(aws ssm get-parameter --name "/aws/service/canonical/ubuntu/server/24.04/stable/current/$ARQ/hvm/ebs-gp3/ami-id" \
    --query Parameter.Value --output text)
  sed -e "s|__HOST__|$HOST|" -e "s|__BUCKET__|$BUCKET|" -e "s|__REGISTRO__|$REGISTRO|" \
    infra/aws-teste/inicializar.sh > "$TMP/inicializar.sh"
  INST=$(aws ec2 run-instances --image-id "$AMI" --instance-type "$TIPO" \
    --iam-instance-profile Name=faperon-teste-ec2 --security-group-ids "$SG" \
    --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=40,VolumeType=gp3,Encrypted=true,DeleteOnTermination=true}' \
    --metadata-options HttpTokens=required,HttpEndpoint=enabled \
    --credit-specification CpuCredits=standard \
    --user-data "file://$TMP/inicializar.sh" \
    --tag-specifications "ResourceType=instance,Tags=[{$TAG},{Key=Name,Value=faperon-teste}]" \
      "ResourceType=volume,Tags=[{$TAG},{Key=Name,Value=faperon-teste}]" \
    --query 'Instances[0].InstanceId' --output text)
fi
echo "Máquina: $INST ($TIPO, aguardando ligar)"
aws ec2 wait instance-running --instance-ids "$INST"
aws ec2 associate-address --instance-id "$INST" --allocation-id "$ALLOC" > /dev/null

# 9. Se o hardware da AWS falhar, a máquina é recuperada sozinha (mesmo IP e disco)
aws cloudwatch put-metric-alarm --alarm-name faperon-teste-recuperar --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_System --dimensions "Name=InstanceId,Value=$INST" \
  --statistic Maximum --period 60 --evaluation-periods 2 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "arn:aws:automate:sa-east-1:ec2:recover" --tags "$TAG"

# 10. Primeiro build das imagens no GitHub do fork (os próximos saem sozinhos a cada 10 min, se o main mudou)
gh workflow run servidor-teste.yml --repo "$FORK" --ref servidor || echo "Rode o workflow 'Servidor de teste' no Actions do fork."

echo
echo "Criado. A máquina sobe em uns 5 min; o site entra no ar quando o GitHub terminar as imagens (uns 15 min)."
echo "Endereço: https://$HOST"
echo "Acompanhar: aws ssm start-session --target $INST  (logs em /var/log/faperon-*.log)"

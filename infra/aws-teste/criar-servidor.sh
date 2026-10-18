#!/bin/bash
# Cria o servidor de teste da FAPERON na AWS da DATA-RO, em São Paulo (sa-east-1), separado da vinicin.
# Especificação e motivos: docs/adr/0033-servidor-de-teste-no-brasil-preparado-para-o-whatsapp.md.
# Uso, a partir da raiz do repositório e com `aws login --profile dataro` válido:
#   bash infra/aws-teste/criar-servidor.sh                  # t3.medium (padrão, já prevendo o WhatsApp)
#   TIPO=t3.small bash infra/aws-teste/criar-servidor.sh    # mais barata, só para a pilha atual
# Tudo leva a etiqueta Project=faperon-teste; para apagar, veja infra/aws-teste/README.md.
set -euo pipefail
# A região é fixa: banco, arquivos e cópias ficam no Brasil
export AWS_PROFILE="${AWS_PROFILE:-dataro}" AWS_REGION=sa-east-1 AWS_DEFAULT_REGION=sa-east-1
TIPO="${TIPO:-t3.medium}"
cd "$(dirname "$0")/../.."

TAG='Key=Project,Value=faperon-teste'
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Conta: $(aws sts get-caller-identity --query Arn --output text)"
VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)

# 1. Firewall: só HTTP e HTTPS; sem SSH (o acesso de manutenção é pelo Session Manager)
SG=$(aws ec2 create-security-group --group-name faperon-teste-web --vpc-id "$VPC" \
  --description "FAPERON servidor de teste: so HTTP/HTTPS" \
  --tag-specifications "ResourceType=security-group,Tags=[{$TAG},{Key=Name,Value=faperon-teste-web}]" \
  --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id "$SG" --ip-permissions \
  'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}],Ipv6Ranges=[{CidrIpv6=::/0}]' \
  'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}],Ipv6Ranges=[{CidrIpv6=::/0}]' > /dev/null
echo "Firewall: $SG"

# 2. IP fixo e o endereço com HTTPS (sslip.io resolve o IP escrito no nome)
read -r EIP ALLOC <<< "$(aws ec2 allocate-address --domain vpc \
  --tag-specifications "ResourceType=elastic-ip,Tags=[{$TAG},{Key=Name,Value=faperon-teste}]" \
  --query '[PublicIp,AllocationId]' --output text)"
HOST="${EIP//./-}.sslip.io"
echo "IP: $EIP -> https://$HOST"

CONTA=$(aws sts get-caller-identity --query Account --output text)

# 3. Bucket no Brasil: cópias do banco (backups/, 30 dias) e, depois, a mídia do WhatsApp (whatsapp/)
BUCKET="faperon-teste-$CONTA-sa-east-1"
aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration LocationConstraint=sa-east-1 > /dev/null
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration \
  '{"Rules":[{"ID":"backups-30-dias","Filter":{"Prefix":"backups/"},"Status":"Enabled","Expiration":{"Days":30},"NoncurrentVersionExpiration":{"NoncurrentDays":7}}]}'
aws s3api put-bucket-tagging --bucket "$BUCKET" --tagging 'TagSet=[{Key=Project,Value=faperon-teste}]'
echo "Bucket: s3://$BUCKET"

# 4. Papel da máquina: Session Manager, leitura só dos parâmetros /faperon-teste/* e uso só do bucket dela
cat > "$TMP/confianca.json" <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
aws iam create-role --role-name faperon-teste-ec2 --assume-role-policy-document "file://$TMP/confianca.json" --tags "$TAG" > /dev/null
aws iam attach-role-policy --role-name faperon-teste-ec2 --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam put-role-policy --role-name faperon-teste-ec2 --policy-name ler-parametros-faperon-teste --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"ssm:GetParameter\",\"Resource\":\"arn:aws:ssm:sa-east-1:$CONTA:parameter/faperon-teste/*\"},{\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:ListBucket\"],\"Resource\":[\"arn:aws:s3:::$BUCKET\",\"arn:aws:s3:::$BUCKET/*\"]}]}"
aws iam create-instance-profile --instance-profile-name faperon-teste-ec2 --tags "$TAG" > /dev/null
aws iam add-role-to-instance-profile --instance-profile-name faperon-teste-ec2 --role-name faperon-teste-ec2

# 5. Chave do Zétele: do .env.local para o Parameter Store cifrado, sem aparecer na tela
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
echo "Chave do Zétele gravada em /faperon-teste/anthropic-api-key (SecureString)"

# 6. A máquina: Ubuntu 24.04, 40 GB gp3 cifrado, IMDSv2 obrigatório
AMI=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --query Parameter.Value --output text)
sed -e "s|__HOST__|$HOST|" -e "s|__BUCKET__|$BUCKET|" infra/aws-teste/inicializar.sh > "$TMP/inicializar.sh"
sleep 10 # o perfil da instância leva alguns segundos para valer
INST=$(aws ec2 run-instances --image-id "$AMI" --instance-type "$TIPO" \
  --iam-instance-profile Name=faperon-teste-ec2 --security-group-ids "$SG" \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=40,VolumeType=gp3,Encrypted=true,DeleteOnTermination=true}' \
  --metadata-options HttpTokens=required,HttpEndpoint=enabled \
  --user-data "file://$TMP/inicializar.sh" \
  --tag-specifications "ResourceType=instance,Tags=[{$TAG},{Key=Name,Value=faperon-teste}]" \
    "ResourceType=volume,Tags=[{$TAG},{Key=Name,Value=faperon-teste}]" \
  --query 'Instances[0].InstanceId' --output text)
echo "Máquina: $INST ($TIPO, aguardando ligar)"
aws ec2 wait instance-running --instance-ids "$INST"
aws ec2 associate-address --instance-id "$INST" --allocation-id "$ALLOC" > /dev/null

# 7. Se o hardware da AWS falhar, a máquina é recuperada sozinha (mesmo IP e disco)
aws cloudwatch put-metric-alarm --alarm-name faperon-teste-recuperar --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_System --dimensions "Name=InstanceId,Value=$INST" \
  --statistic Maximum --period 60 --evaluation-periods 2 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "arn:aws:automate:sa-east-1:ec2:recover" --tags "$TAG"

echo
echo "Criado. O primeiro boot instala tudo e faz o build (uns 15-20 min)."
echo "Endereço: https://$HOST"
echo "Acompanhar: aws ssm start-session --target $INST  (log em /var/log/faperon-inicializar.log)"

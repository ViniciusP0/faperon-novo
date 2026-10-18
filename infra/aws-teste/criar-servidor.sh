#!/bin/bash
# Cria o servidor de teste da FAPERON na AWS da DATA-RO (sa-east-1), separado da vinicin.
# Uso, a partir da raiz do repositório e com `aws login --profile dataro` válido:
#   bash infra/aws-teste/criar-servidor.sh
# Tudo leva a etiqueta Project=faperon-teste; para apagar, veja infra/aws-teste/README.md.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-dataro}" AWS_REGION=sa-east-1
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

# 3. Papel da máquina: Session Manager e leitura só dos parâmetros /faperon-teste/*
CONTA=$(aws sts get-caller-identity --query Account --output text)
cat > "$TMP/confianca.json" <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
aws iam create-role --role-name faperon-teste-ec2 --assume-role-policy-document "file://$TMP/confianca.json" --tags "$TAG" > /dev/null
aws iam attach-role-policy --role-name faperon-teste-ec2 --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam put-role-policy --role-name faperon-teste-ec2 --policy-name ler-parametros-faperon-teste --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"ssm:GetParameter\",\"Resource\":\"arn:aws:ssm:sa-east-1:$CONTA:parameter/faperon-teste/*\"}]}"
aws iam create-instance-profile --instance-profile-name faperon-teste-ec2 --tags "$TAG" > /dev/null
aws iam add-role-to-instance-profile --instance-profile-name faperon-teste-ec2 --role-name faperon-teste-ec2

# 4. Chave do Zétele: do .env.local para o Parameter Store cifrado, sem aparecer na tela
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

# 5. A máquina: t3.small, Ubuntu 24.04, 30 GB gp3, IMDSv2 obrigatório
AMI=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --query Parameter.Value --output text)
sed "s|__HOST__|$HOST|" infra/aws-teste/inicializar.sh > "$TMP/inicializar.sh"
sleep 10 # o perfil da instância leva alguns segundos para valer
INST=$(aws ec2 run-instances --image-id "$AMI" --instance-type t3.small \
  --iam-instance-profile Name=faperon-teste-ec2 --security-group-ids "$SG" \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3,DeleteOnTermination=true}' \
  --metadata-options HttpTokens=required,HttpEndpoint=enabled \
  --user-data "file://$TMP/inicializar.sh" \
  --tag-specifications "ResourceType=instance,Tags=[{$TAG},{Key=Name,Value=faperon-teste}]" \
    "ResourceType=volume,Tags=[{$TAG},{Key=Name,Value=faperon-teste}]" \
  --query 'Instances[0].InstanceId' --output text)
echo "Máquina: $INST (aguardando ligar)"
aws ec2 wait instance-running --instance-ids "$INST"
aws ec2 associate-address --instance-id "$INST" --allocation-id "$ALLOC" > /dev/null

echo
echo "Criado. O primeiro boot instala tudo e faz o build (uns 15-20 min)."
echo "Endereço: https://$HOST"
echo "Acompanhar: aws ssm start-session --target $INST  (log em /var/log/faperon-inicializar.log)"

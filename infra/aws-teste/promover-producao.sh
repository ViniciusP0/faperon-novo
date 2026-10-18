#!/bin/bash
# Promove para a produção uma versão já testada: move o branch producao do fork para o commit
# indicado (padrão: o main atual do fork, que é o que está no servidor de teste) e dispara o build das
# imagens de produção. A máquina de produção se atualiza sozinha em até 2 min depois do build.
# Uso: bash infra/aws-teste/promover-producao.sh [commit]
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-dataro}" AWS_REGION=sa-east-1
FORK="justr1de/faperon-novo"

SHA=$(git ls-remote "https://github.com/$FORK.git" refs/heads/main | cut -f1)
if [ $# -ge 1 ]; then SHA=$(git rev-parse "$1^{commit}"); fi
echo "Promovendo $(git log -1 --format='%h %s' "$SHA" 2>/dev/null || echo "$SHA")"

# só promove o que já passou pelo servidor de teste (há imagem desse commit no ECR de teste)
if ! aws ecr describe-images --repository-name faperon-teste/web --image-ids imageTag="$SHA" > /dev/null 2>&1; then
  echo "Este commit ainda não tem imagem de teste: espere o servidor de teste recebê-lo e confira lá antes." >&2
  exit 1
fi
# e cujo CI do GitHub passou
conclusao=$(gh run list --repo ViniciusP0/faperon-novo --commit "$SHA" --workflow ci.yml --limit 1 --json conclusion --jq '.[0].conclusion // ""' 2>/dev/null || true)
if [ -n "$conclusao" ] && [ "$conclusao" != success ]; then
  echo "O CI deste commit terminou como '$conclusao': corrija antes de promover." >&2
  exit 1
fi

if git ls-remote --exit-code "https://github.com/$FORK.git" refs/heads/producao > /dev/null; then
  gh api -X PATCH "repos/$FORK/git/refs/heads/producao" -f sha="$SHA" -F force=true > /dev/null
else
  gh api "repos/$FORK/git/refs" -f ref=refs/heads/producao -f sha="$SHA" > /dev/null
fi
gh workflow run servidor-teste.yml --repo "$FORK" --ref servidor
echo "Branch producao em ${SHA:0:7}; build das imagens de produção disparado (uns 10 a 15 min)."

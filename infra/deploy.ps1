# Deploy da vinicin (Windows). Roda a cada minuto por uma tarefa agendada (ver infra/demo-checklist.md).
# O listener do webhook (container) só cria infra\.deploy-pendente; este script consome o gatilho,
# atualiza o repositório e reconstrói. Como o repositório é também o de desenvolvimento, NÃO faz
# reset: se houver alteração local ou commit não enviado, registra no log e não mexe em nada.
# 'Continue': o git escreve progresso no stderr, e no PowerShell 5.1 isso viraria erro com 'Stop'.
# Cada comando nativo tem o $LASTEXITCODE conferido abaixo.
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$gatilho = Join-Path $PSScriptRoot '.deploy-pendente'
$log = Join-Path $PSScriptRoot 'deploy.log'

if (-not (Test-Path $gatilho)) { exit 0 }

function Registrar([string]$mensagem) {
  Add-Content -Path $log -Encoding utf8 -Value ("[{0}] {1}" -f (Get-Date -Format 's'), $mensagem)
}

# A tarefa agendada ignora nova instância enquanto uma roda; o gatilho de um push que chega
# durante o build fica no disco e é consumido no minuto seguinte.
Remove-Item $gatilho -Force
Set-Location $repo
try {
  Registrar 'checking for updates'
  git fetch origin main 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'git fetch falhou' }

  if (git status --porcelain) {
    Registrar 'abortado: ha alteracoes locais nao commitadas; nada foi alterado'
    exit 0
  }
  if ((git rev-parse HEAD) -eq (git rev-parse origin/main)) {
    Registrar 'already up to date'
    exit 0
  }
  if ((git rev-list --count 'origin/main..HEAD') -ne '0') {
    Registrar 'abortado: ha commits locais nao enviados; nada foi alterado'
    exit 0
  }

  Registrar 'new commits found, deploying'
  git merge --ff-only origin/main 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'git merge --ff-only falhou' }
  docker compose up -d --build 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'docker compose up falhou' }
  docker image prune -f 2>&1 | Out-Null
  Registrar ('deploy finished at ' + (git rev-parse --short HEAD))
} catch {
  Registrar ('ERRO: ' + $_.Exception.Message)
  exit 1
}

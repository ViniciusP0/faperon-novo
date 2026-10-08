# Correções da auditoria de 06/10/2026: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** corrigir os 10 problemas da auditoria de código, disponibilidade e segurança, sem mudar o contrato público da API além do que cada correção exige.

**Arquitetura:** as correções ficam onde o problema nasce. Na API Django: validação e limpeza do cache de PDF, throttle global, refresh da view materializada dentro da transação da carga, `ALLOWED_HOSTS` e `resolver_periodo`. No proxy do Next: identidade do cliente tirada do último valor do `X-Forwarded-For`. Na infra: Gunicorn `gthread`, imagem de produção sem dependências de dev e sem root, `SITE_URL` no build do web, porta 3000 só em localhost e deploy que espera o anterior terminar.

**Tech stack:** Django 5 + DRF + WeasyPrint + Postgres 16 (API), Next.js com saída standalone + Vitest (web), Docker Compose, Gunicorn, Tailscale Funnel, bash.

**Spec:** não há spec de produto. A fonte é o relatório da auditoria (os 10 findings resumidos na tabela abaixo). As specs que este plano toca indiretamente são `docs/specs/spec-07-relatorio-pdf.md` (PDF) e `docs/specs/spec-03-ranking-de-municipios.md` (período padrão).

| # | Finding | Tarefa |
|---|---------|--------|
| 1 | Rate limit do PDF burlável com `X-Forwarded-For` forjado; porta 3000 aberta em 0.0.0.0 | 6 |
| 2 | Cache de PDF sem validação de `municipios` e sem limpeza | 5 |
| 3 | 3 workers sync servem PDF, API e `/saude` | 7 |
| 4 | `flock -n` descarta deploys concorrentes | 10 |
| 5 | `SITE_URL` não chega ao build do web | 9 |
| 6 | Imagem da API com dependências de dev e rodando como root | 8 |
| 7 | `apps/api/.coverage` versionado | 1 |
| 8 | Falha no REFRESH marca como FALHA uma carga já promovida | 4 |
| 9 | `ALLOWED_HOSTS='*'` como padrão e filtro sem `strip` | 2 |
| 10 | `resolver_periodo` usa `fim=0` quando não há dados | 3 |

## Restrições globais

- Comandos da API rodam no container de **dev** (a Tarefa 8 cria o serviço `api-dev`). Antes da Tarefa 8, use `docker compose run --rm api <cmd>`; a partir dela, `docker compose run --rm api-dev <cmd>` (os alvos do `make` passam a fazer isso sozinhos).
- Formato de erro da API: sempre `{"erro": "...", "campos": {...}}` (ver `apps/api/indicadores/api/erros.py`).
- Limite padrão por IP do PDF: `10/min` (`PDF_RATE_LIMIT`). O teto global novo é `30/min` (`PDF_GLOBAL_RATE_LIMIT`).
- Comparação: de 2 a 5 municípios (`MIN_COMPARACAO = 2`, `MAX_COMPARACAO = 5` em `apps/api/indicadores/servicos.py`).
- Textos de usuário, comentários e mensagens de commit em português, no padrão Conventional Commits do repositório (`feat(api): ...`, `fix(infra): ...`).
- Os commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Ruff com `line-length = 100` e mypy estrito (`check_untyped_defs`) têm de passar: `ruff check .` e `mypy .` no container de dev.

## Foco de revisão

Situações que nenhum teste unitário cobre por completo e que mais podem afetar quem usa o sistema:

1. **O Funnel não acrescenta o IP real ao `X-Forwarded-For`.** Nesse caso o último valor seria o forjado e a Tarefa 6 não resolveria nada. É conferido ponta a ponta no passo 6.8, com requisições reais pelo Funnel.
2. **`.env` do `dt-server` com `DJANGO_ALLOWED_HOSTS` sem `api`.** O proxy do Next chama `http://api:8000`, então o Host `api` tem de estar na lista, ou o site inteiro devolve 400. Coberto pelo passo 2.6 (atualizar o `.env` do servidor) e pelo smoke test da Tarefa 11.
3. **Volume `./data` como não-root.** A imagem de produção (uid 10001) só lê `./data/seed`. `make snapshot` e `make seed` escrevem ou leem ali, por isso passam a rodar no `api-dev`, que segue como root (Tarefa 8).
4. **WeasyPrint em threads.** Com `gthread`, duas threads do mesmo processo poderiam renderizar ao mesmo tempo, e Pango/fontconfig não são confiáveis nisso. Um lock por processo serializa só a renderização (Tarefa 7, com teste de concorrência).
5. **Carga parcial (`apenas=...`) seguida de REFRESH.** Mover o refresh para dentro da transação não pode quebrar o fluxo de sucesso atual. A Tarefa 4 roda a suíte inteira de ingestão.

---

### Task 1: tirar `apps/api/.coverage` do git

**Arquivos:**
- Remover do índice: `apps/api/.coverage` (o arquivo local continua no disco)

- [x] **Passo 1: confirmar que o arquivo está rastreado e que o `.gitignore` já o ignora**

Rode: `git ls-files apps/api/.coverage && git check-ignore -v --no-index apps/api/.coverage`
Esperado: a primeira linha imprime `apps/api/.coverage`; a segunda mostra a regra `.coverage` do `.gitignore`.

- [x] **Passo 2: remover só do índice**

Rode: `git rm --cached apps/api/.coverage`
Esperado: `rm 'apps/api/.coverage'`

- [x] **Passo 3: confirmar**

Rode: `git ls-files apps/api/.coverage`
Esperado: nenhuma saída.

- [x] **Passo 4: commit**

```bash
git commit -m "chore(api): para de versionar o arquivo .coverage

O commit 45c3d98 dizia remover o arquivo, mas ele continuou no índice e
cada pytest --cov sujava o git status.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `ALLOWED_HOSTS` restrito por padrão

**Arquivos:**
- Modificar: `apps/api/config/settings.py:18-21`
- Modificar: `.env.example` (linha `DJANGO_ALLOWED_HOSTS=*`)
- Teste: `apps/api/tests/test_config.py` (novo)

**Interfaces:**
- Produz: `config.settings.env_lista(nome: str, padrao: str = "") -> list[str]`

- [x] **Passo 1: escrever o teste que falha**

Crie `apps/api/tests/test_config.py`:

```python
import pytest

from config.settings import ALLOWED_HOSTS_PADRAO, env_lista


def test_env_lista_descarta_itens_vazios_e_espacos(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("X_LISTA", " a.com , ,b.com, ")
    assert env_lista("X_LISTA") == ["a.com", "b.com"]


def test_env_lista_usa_o_padrao_quando_ausente(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("X_LISTA", raising=False)
    assert env_lista("X_LISTA", "localhost,api") == ["localhost", "api"]
    assert env_lista("X_LISTA") == []


def test_allowed_hosts_padrao_nao_aceita_qualquer_host() -> None:
    hosts = env_lista("NAO_DEFINIDA_NUNCA", ALLOWED_HOSTS_PADRAO)
    assert "*" not in hosts
    assert {"localhost", "127.0.0.1", "api"} <= set(hosts)
```

- [x] **Passo 2: rodar e ver falhar**

Rode: `docker compose run --rm api pytest tests/test_config.py -v`
Esperado: FAIL com `ImportError: cannot import name 'ALLOWED_HOSTS_PADRAO'`.

- [x] **Passo 3: implementar**

Em `apps/api/config/settings.py`, logo depois de `env_bool`:

```python
def env_lista(nome: str, padrao: str = "") -> list[str]:
    return [item.strip() for item in os.environ.get(nome, padrao).split(",") if item.strip()]
```

Substitua as linhas de `ALLOWED_HOSTS` e `CSRF_TRUSTED_ORIGINS` por:

```python
# "api" é o Host que o proxy do Next usa (API_INTERNAL_URL=http://api:8000); localhost serve o healthcheck.
ALLOWED_HOSTS_PADRAO = "localhost,127.0.0.1,api"
ALLOWED_HOSTS = env_lista("DJANGO_ALLOWED_HOSTS", ALLOWED_HOSTS_PADRAO)
CSRF_TRUSTED_ORIGINS = env_lista("DJANGO_CSRF_TRUSTED_ORIGINS")
```

Em `.env.example`, troque `DJANGO_ALLOWED_HOSTS=*` por:

```
# Hosts aceitos pelo Django. "api" é obrigatório (o Next chama http://api:8000); não use "*".
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,api
```

- [x] **Passo 4: rodar e ver passar, incluindo a suíte da API**

Rode: `docker compose run --rm api pytest tests/test_config.py tests/test_api.py -v`
Esperado: tudo PASS. O test client usa o Host `testserver`, que o pytest-django acrescenta sozinho.

- [x] **Passo 5: commit**

```bash
git add apps/api/config/settings.py apps/api/tests/test_config.py .env.example
git commit -m "fix(api): restringe ALLOWED_HOSTS por padrão e ignora itens vazios

Com '*' como padrão, o Django aceitava qualquer Host, e 'a.com, ' deixava
uma string vazia na lista.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [x] **Passo 6: anotar a mudança de `.env` no servidor**

Acrescente em `infra/demo-checklist.md`, na lista de "Operação":

```markdown
- O `.env` do servidor precisa ter `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,api` (desde 06/10/2026 o padrão deixou de ser `*`). Sem `api`, o Next recebe 400 do Django em todas as páginas.
```

Inclua essa linha no commit do Passo 5 (`git add infra/demo-checklist.md` antes de commitar).

---

### Task 3: `resolver_periodo` sem dados devolve um erro claro

**Arquivos:**
- Modificar: `apps/api/indicadores/servicos.py:110-121` (`resolver_periodo`)
- Teste: `apps/api/tests/test_api.py`

**Interfaces:**
- Produz: `resolver_periodo` lança `NaoEncontrado("Não há dados publicados para este produto e indicador")` quando `anos_com_dados(recorte) is None` e `fim is None`. Quando `fim` é informado, o comportamento não muda.

- [x] **Passo 1: escrever o teste que falha**

Ao final de `apps/api/tests/test_api.py`:

```python
@pytest.mark.parametrize("extra", ["", "&inicio=2015"])
def test_recorte_sem_dados_responde_404_e_nao_inventa_periodo(
    api: APIClient, soja: Produto, extra: str
) -> None:
    status, corpo = get(api, f"ranking?{Q}{extra}")
    assert status == 404
    assert corpo["erro"] == "Não há dados publicados para este produto e indicador"
    assert corpo["campos"] == {}
```

(`soja` cria o produto e os vínculos de indicador, sem nenhuma `Medicao`.)

- [x] **Passo 2: rodar e ver falhar**

Rode: `docker compose run --rm api pytest tests/test_api.py -k sem_dados -v`
Esperado: FAIL. Sem `inicio` vem 200 com período `-9..0`; com `inicio=2015` vem 400.

- [x] **Passo 3: implementar**

Em `apps/api/indicadores/servicos.py`, substitua o corpo de `resolver_periodo`:

```python
def resolver_periodo(recorte: Recorte, inicio: int | None, fim: int | None) -> tuple[int, int]:
    """`fim` é o ano de referência do ranking; padrão: último ano com dados e 10 anos de janela."""
    if fim is None:
        anos = anos_com_dados(recorte)
        if anos is None:
            raise NaoEncontrado("Não há dados publicados para este produto e indicador")
        fim = anos[1]
    if inicio is None:
        inicio = fim - (JANELA_PADRAO - 1)
    if inicio > fim:
        raise ConsultaInvalida(
            "O ano inicial não pode ser maior que o ano final", {"inicio": "maior que fim"}
        )
    return inicio, fim
```

Confira que `NaoEncontrado` já está importado no topo do arquivo (é usado por `obter_municipio`).

- [x] **Passo 4: rodar e ver passar**

Rode: `docker compose run --rm api pytest tests/test_api.py tests/test_analise.py -v`
Esperado: tudo PASS.

- [x] **Passo 5: commit**

```bash
git add apps/api/indicadores/servicos.py apps/api/tests/test_api.py
git commit -m "fix(api): recorte sem dados responde 404 em vez de inventar o período -9..0

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: REFRESH da view materializada dentro da transação da carga

**Arquivos:**
- Modificar: `apps/api/ingestao/servico.py:115-126` (`executar_carga`)
- Teste: `apps/api/tests/test_ingestao.py`

**Interfaces:**
- Produz: `carga_concluida` passa a ser enviado **dentro** de `transaction.atomic()`, depois de `promover_staging`. Se algum receptor falhar, a promoção é desfeita e a carga fica como `FALHA`. Os receptores recebem `carga=<Carga>` com `carga.pk` definido (o status ainda não é SUCESSO nesse momento).

- [x] **Passo 1: escrever o teste que falha**

Em `apps/api/tests/test_ingestao.py`, acrescente o import `from ingestao.signals import carga_concluida` e, ao final:

```python
def test_falha_no_refresh_desfaz_a_promocao_e_marca_falha(cliente_soja: ClienteFalso) -> None:
    executar_carga(5457, cliente_soja)
    estado = _estado()
    resposta = carregar_fixture("sidra_5457_soja_quantidade_2023_2024.json")
    for serie in resposta[0]["resultados"][0]["series"]:
        if serie["localidade"]["id"] == "1100072":
            serie["serie"]["2024"] = "190000"
    revisado = ClienteFalso([("40124", "Soja (em grão)")], {"40124": resposta})

    def quebra(**_: object) -> None:
        raise RuntimeError("refresh travou")

    carga_concluida.connect(quebra, dispatch_uid="teste.quebra")
    try:
        with pytest.raises(CargaFalhou):
            executar_carga(5457, revisado)
    finally:
        carga_concluida.disconnect(dispatch_uid="teste.quebra")
    ultima = Carga.objects.order_by("-id").first()
    assert ultima is not None and ultima.status == Carga.Status.FALHA
    assert "refresh travou" in ultima.erro
    assert _estado() == estado
```

- [x] **Passo 2: rodar e ver falhar**

Rode: `docker compose run --rm api pytest tests/test_ingestao.py -k refresh -v`
Esperado: FAIL em `assert _estado() == estado`, porque o valor 190000 já foi promovido.

- [x] **Passo 3: implementar**

Em `apps/api/ingestao/servico.py`, troque o bloco de promoção e sucesso por:

```python
        with transaction.atomic():
            for linha in linhas:
                linha.carga = carga
            StagingMedicao.objects.bulk_create(linhas, batch_size=LOTE)
            promover_staging(carga, cfg.segmento, municipios)
            StagingMedicao.objects.filter(carga=carga).delete()
            # Na mesma transação: se o REFRESH de mv_ranking falhar, os dados novos não ficam
            # publicados com o ranking antigo.
            carga_concluida.send(sender=Carga, carga=carga)
        carga.status = Carga.Status.SUCESSO
        carga.hash = digest if apenas is None else ""
        carga.linhas = len(linhas)
        carga.concluida_em = timezone.now()
        carga.save()
        return carga
```

(A linha `carga_concluida.send(...)` que vinha depois de `carga.save()` sai dali.)

- [x] **Passo 4: rodar toda a ingestão e a API**

Rode: `docker compose run --rm api pytest tests/test_ingestao.py tests/test_snapshot_e_agendador.py tests/test_api.py tests/test_migracao.py -v`
Esperado: tudo PASS, incluindo `test_ranking_da_mv_confere_com_posicao_da_view`.

- [x] **Passo 5: commit**

```bash
git add apps/api/ingestao/servico.py apps/api/tests/test_ingestao.py
git commit -m "fix(ingestao): REFRESH da mv_ranking na mesma transação da promoção

Antes, uma falha no refresh marcava como FALHA uma carga cujos dados já
estavam em medicao, deixando o ranking desatualizado e o cache de PDF preso
à versão anterior.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: cache de PDF validado, com limpeza e teto

**Arquivos:**
- Criar: `apps/api/analise/apps.py`
- Criar: `apps/api/analise/migrations/0002_relatorio_versao_dados.py` (gerada)
- Modificar: `apps/api/analise/models.py`
- Modificar: `apps/api/analise/pdf.py`
- Teste: `apps/api/tests/test_analise.py`

**Interfaces:**
- Consome: `carga_concluida` (Tarefa 4: enviado dentro da transação, com `carga`).
- Produz:
  - `Relatorio.versao_dados: CharField(max_length=20, default="", db_index=True)`
  - `analise.pdf.MAX_RELATORIOS = 200`
  - `analise.pdf.normalizar_comparacao(codigos: list[str]) -> list[str]`: vazio continua vazio; senão deduplica, ordena, exige de 2 a 5 itens e exige que todos existam (lança `ConsultaInvalida` ou `NaoEncontrado`)
  - `analise.pdf.limpar_relatorios(versao_atual: str) -> int`: apaga as linhas de outras versões e mantém só as `MAX_RELATORIOS` mais recentes da versão atual; devolve quantas apagou
  - `analise.apps.AnaliseConfig` conecta `limpar_ao_concluir_carga` a `carga_concluida`

- [x] **Passo 1: escrever os testes que falham**

Em `apps/api/tests/test_analise.py` (os imports `pdf`, `Relatorio`, `Carga` e `APIClient` já existem):

```python
@pytest.mark.django_db
@pytest.mark.parametrize(
    ("municipios", "esperado"),
    [("9999999", 400), ("1100015", 400), ("1100015,9999999", 404)],
)
def test_pdf_rejeita_comparacao_invalida_sem_gerar_nada(
    api: APIClient, dados_soja: Produto, municipios: str, esperado: int
) -> None:
    resposta = api.get(f"/api/v1/relatorio.pdf?{Q}&municipios={municipios}")
    assert resposta.status_code == esperado
    assert Relatorio.objects.count() == 0


@pytest.mark.django_db
def test_ordem_e_repeticao_dos_municipios_nao_criam_outro_pdf(
    api: APIClient, dados_soja: Produto
) -> None:
    for municipios in ["1100015,1100023", "1100023,1100015", "1100023,1100015,1100023"]:
        assert api.get(f"/api/v1/relatorio.pdf?{Q}&municipios={municipios}").status_code == 200
    assert Relatorio.objects.count() == 1


@pytest.mark.django_db
def test_limpar_relatorios_apaga_versoes_antigas_e_respeita_o_teto(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(pdf, "MAX_RELATORIOS", 2)
    Relatorio.objects.create(chave="velho", nome_arquivo="a.pdf", pdf=b"x", versao_dados="1")
    for i in range(3):
        Relatorio.objects.create(chave=f"novo{i}", nome_arquivo="b.pdf", pdf=b"x", versao_dados="2")
    assert pdf.limpar_relatorios("2") == 2
    assert set(Relatorio.objects.values_list("chave", flat=True)) == {"novo1", "novo2"}


@pytest.mark.django_db
def test_carga_concluida_limpa_pdfs_da_versao_anterior(
    api: APIClient, dados_soja: Produto, carga: Carga
) -> None:
    from ingestao.signals import carga_concluida

    assert api.get(f"/api/v1/relatorio.pdf?{Q}").status_code == 200
    nova = Carga.objects.create(
        tabela=5457, iniciada_em=carga.iniciada_em, status=Carga.Status.SUCESSO
    )
    carga_concluida.send(sender=Carga, carga=nova)
    assert Relatorio.objects.count() == 0
```

Confira em `tests/conftest.py::municipios` que `1100015` e `1100023` existem e `9999999` não existe (os testes atuais de comparação já usam os dois primeiros).

- [x] **Passo 2: rodar e ver falhar**

Rode: `docker compose run --rm api pytest tests/test_analise.py -k "comparacao_invalida or ordem_e_repeticao or limpar or limpa_pdfs" -v`
Esperado: FAIL. Hoje um município só gera PDF (200); ordens diferentes geram linhas diferentes; `limpar_relatorios` e `versao_dados` não existem.

- [x] **Passo 3: modelo e migração**

Em `apps/api/analise/models.py`, acrescente o campo depois de `pdf`:

```python
    versao_dados = models.CharField(max_length=20, default="", db_index=True)
```

Rode: `docker compose run --rm api python manage.py makemigrations analise -n relatorio_versao_dados`
Esperado: cria `analise/migrations/0002_relatorio_versao_dados.py` com um `AddField`.

- [x] **Passo 4: implementar em `pdf.py`**

Imports a acrescentar em `apps/api/analise/pdf.py`:

```python
from indicadores.erros import ConsultaInvalida
```

Constante, abaixo de `VERSAO_TEMPLATE`:

```python
MAX_RELATORIOS = 200  # teto de PDFs guardados por versão dos dados (~centenas de KB cada)
```

Funções novas, depois de `chave_do_recorte`:

```python
def normalizar_comparacao(codigos: list[str]) -> list[str]:
    """Valida antes de gerar: códigos inexistentes ou fora de 2..5 nunca viram chave de cache."""
    if not codigos:
        return []
    unicos = sorted(set(codigos))
    if not servicos.MIN_COMPARACAO <= len(unicos) <= servicos.MAX_COMPARACAO:
        raise ConsultaInvalida(
            f"Informe de {servicos.MIN_COMPARACAO} a {servicos.MAX_COMPARACAO} municípios para comparar",
            {"municipios": f"esperado de {servicos.MIN_COMPARACAO} a {servicos.MAX_COMPARACAO} itens"},
        )
    for codigo in unicos:
        servicos.obter_municipio(codigo)
    return unicos


def limpar_relatorios(versao_atual: str) -> int:
    """Apaga PDFs de outras versões dos dados e mantém só os MAX_RELATORIOS mais recentes."""
    apagados, _ = Relatorio.objects.exclude(versao_dados=versao_atual).delete()
    manter = (
        Relatorio.objects.order_by("-criado_em", "-id").values_list("id", flat=True)[:MAX_RELATORIOS]
    )
    excedentes, _ = Relatorio.objects.exclude(id__in=list(manter)).delete()
    return apagados + excedentes


def limpar_ao_concluir_carga(*args: object, carga: Carga, **kwargs: object) -> None:
    limpar_relatorios(str(carga.pk))
```

Em `gerar_relatorio`, normalize a comparação antes de tudo e grave a versão:

```python
    """Retorna (pdf, nome). Mesmo recorte na mesma versão dos dados devolve o mesmo PDF."""
    comparacao = normalizar_comparacao(comparacao)
    r = analisar(produto, indicador, inicio, fim, municipio)
    versao = versao_dos_dados()
    chave = chave_do_recorte(
        {
            "produto": produto,
            "indicador": indicador,
            "inicio": r.inicio,
            "fim": r.fim,
            "municipio": municipio,
            "comparacao": comparacao,
        }
    )
```

E troque o `update_or_create` final por:

```python
    Relatorio.objects.update_or_create(
        chave=chave, defaults={"nome_arquivo": nome, "pdf": pdf, "versao_dados": versao}
    )
    limpar_relatorios(versao)
    return pdf, nome
```

`chave_do_recorte` continua chamando `versao_dos_dados()` por conta própria; não mude a assinatura dela, porque `test_nova_carga_invalida_o_cache` depende disso.

- [x] **Passo 5: conectar o sinal**

Crie `apps/api/analise/apps.py`:

```python
from django.apps import AppConfig


class AnaliseConfig(AppConfig):
    name = "analise"

    def ready(self) -> None:
        from analise.pdf import limpar_ao_concluir_carga
        from ingestao.signals import carga_concluida

        carga_concluida.connect(limpar_ao_concluir_carga, dispatch_uid="analise.limpar_relatorios")
```

`INSTALLED_APPS` já lista `"analise"`, e o Django descobre sozinho a única `AppConfig` de `apps.py`.

- [x] **Passo 6: rodar e ver passar**

Rode: `docker compose run --rm api pytest tests/test_analise.py tests/test_ingestao.py -v`
Esperado: tudo PASS.

Rode: `docker compose run --rm api sh -c "python manage.py makemigrations --check --dry-run && ruff check . && mypy ."`
Esperado: `No changes detected`, ruff sem erros, mypy `Success`.

- [x] **Passo 7: commit**

```bash
git add apps/api/analise apps/api/tests/test_analise.py
git commit -m "fix(api): valida municípios antes de gerar PDF e limpa o cache antigo

Um código inventado ou a reordenação da lista criava um PDF novo a cada
requisição, guardado para sempre. Agora a comparação é validada e ordenada
antes de virar chave, cada carga apaga os PDFs da versão anterior, e há um
teto de 200 PDFs por versão.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: identidade do cliente confiável e teto global de PDF

**Arquivos:**
- Modificar: `apps/web/src/lib/proxy.ts:18-19`
- Teste: `apps/web/src/lib/proxy.test.ts`
- Criar: `apps/api/analise/throttles.py`
- Modificar: `apps/api/analise/views.py:76-78`
- Modificar: `apps/api/config/settings.py` (`DEFAULT_THROTTLE_RATES`)
- Modificar: `docker-compose.yml` (porta do `web`)
- Teste: `apps/api/tests/test_analise.py`

**Interfaces:**
- Produz:
  - `ipDoCliente(valor: string | null): string | null` exportada de `apps/web/src/lib/proxy.ts`: devolve o último item não vazio do `X-Forwarded-For`, ou `null`
  - `analise.throttles.PdfGlobalThrottle(SimpleRateThrottle)`, `scope = "pdf_global"`, com chave de cache fixa
  - Configuração `PDF_GLOBAL_RATE_LIMIT` (padrão `30/min`)

**Por que o último item:** o Tailscale Funnel é o único proxy confiável na frente do Next. Ele acrescenta (ou define) o IP de quem conectou no fim do `X-Forwarded-For`, então tudo à esquerda pode ter sido escrito pelo cliente. Com a porta 3000 presa a `127.0.0.1`, ninguém de fora chega ao Next sem passar pelo Funnel. O teto global segura o pior caso mesmo que essa premissa falhe.

- [x] **Passo 1: teste do proxy que falha**

Em `apps/web/src/lib/proxy.test.ts`, troque o import por `import { ipDoCliente, proxyParaApi } from "./proxy";` e acrescente dentro do `describe`:

```ts
  it("repassa ao Django só o IP que o Funnel acrescentou, nunca a cadeia forjada", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    await proxyParaApi(
      new Request("http://site.test/api/v1/relatorio.pdf", {
        headers: { "x-forwarded-for": "6.6.6.6, 7.7.7.7, 203.0.113.9" },
      }),
    );
    const enviados = fetchFalso.mock.calls[0]![1].headers as Headers;
    expect(enviados.get("x-forwarded-for")).toBe("203.0.113.9");
  });

  it("ipDoCliente pega o último valor não vazio", () => {
    expect(ipDoCliente("1.1.1.1, 2.2.2.2")).toBe("2.2.2.2");
    expect(ipDoCliente(" 2.2.2.2 ,")).toBe("2.2.2.2");
    expect(ipDoCliente("")).toBeNull();
    expect(ipDoCliente(null)).toBeNull();
  });
```

- [x] **Passo 2: rodar e ver falhar**

Rode: `cd apps/web && npx vitest run src/lib/proxy.test.ts`
Esperado: FAIL (`ipDoCliente` não existe; o header vai com a cadeia inteira).

- [x] **Passo 3: implementar no proxy**

Em `apps/web/src/lib/proxy.ts`, antes de `proxyParaApi`:

```ts
/** Último item do X-Forwarded-For: o que o Funnel (único proxy confiável) acrescentou. O resto pode ter vindo do cliente. */
export function ipDoCliente(valor: string | null): string | null {
  const itens = (valor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return itens.at(-1) ?? null;
}
```

E troque as duas linhas do `ip` por:

```ts
  const ip = ipDoCliente(req.headers.get("x-forwarded-for"));
  if (ip) headers.set("x-forwarded-for", ip);
```

- [x] **Passo 4: rodar e ver passar**

Rode: `cd apps/web && npx vitest run src/lib/proxy.test.ts && npm run lint && npm run typecheck`
Esperado: PASS, sem erros.

- [x] **Passo 5: teste do teto global que falha**

Em `apps/api/tests/test_analise.py`, acrescente o import `from rest_framework.throttling import SimpleRateThrottle` (`ScopedRateThrottle` e `cache` já estão importados) e:

```python
@pytest.mark.django_db
def test_teto_global_do_pdf_vale_mesmo_com_ip_trocado(
    api: APIClient, dados_soja: Produto, monkeypatch: pytest.MonkeyPatch
) -> None:
    taxas = {"pdf": "100/min", "pdf_global": "2/min"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", taxas)
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", taxas)
    cache.clear()
    codigos = [
        api.get(f"/api/v1/relatorio.pdf?{Q}", HTTP_X_FORWARDED_FOR=f"198.51.100.{i}").status_code
        for i in range(3)
    ]
    assert codigos == [200, 200, 429]
    cache.clear()
```

- [x] **Passo 6: rodar e ver falhar**

Rode: `docker compose run --rm api pytest tests/test_analise.py -k teto_global -v`
Esperado: FAIL com `[200, 200, 200]`.

- [x] **Passo 7: implementar o throttle**

Crie `apps/api/analise/throttles.py`:

```python
from typing import Any

from rest_framework.throttling import SimpleRateThrottle


class PdfGlobalThrottle(SimpleRateThrottle):
    """Teto de PDFs por minuto somando todos os clientes: limita o estrago se o IP for forjado."""

    scope = "pdf_global"

    def get_cache_key(self, request: Any, view: Any) -> str:
        return self.cache_format % {"scope": self.scope, "ident": "todos"}
```

Em `apps/api/analise/views.py`, importe `from analise.throttles import PdfGlobalThrottle` e troque:

```python
    throttle_classes = [ScopedRateThrottle, PdfGlobalThrottle]
```

Em `apps/api/config/settings.py`, troque a linha de `DEFAULT_THROTTLE_RATES`:

```python
    "DEFAULT_THROTTLE_RATES": {
        "pdf": os.environ.get("PDF_RATE_LIMIT", "10/min"),
        "pdf_global": os.environ.get("PDF_GLOBAL_RATE_LIMIT", "30/min"),
    },
```

- [x] **Passo 8: rodar e ver passar**

Rode: `docker compose run --rm api pytest tests/test_analise.py -v`
Esperado: tudo PASS, incluindo `test_rate_limit_do_pdf`, que continua valendo para o limite por IP.

- [x] **Passo 9: fechar a porta 3000 para fora do host**

Em `docker-compose.yml`, no serviço `web`:

```yaml
    ports:
      - "127.0.0.1:3000:3000"
```

O Funnel (`tailscale funnel --bg 3000`) faz proxy para `localhost:3000`, então continua funcionando. Acesso de outra máquina da LAN direto pela porta 3000 deixa de existir; para isso, use a URL do Funnel ou `tailscale serve`.

- [x] **Passo 10: commit**

```bash
git add apps/web/src/lib/proxy.ts apps/web/src/lib/proxy.test.ts apps/api/analise/throttles.py apps/api/analise/views.py apps/api/config/settings.py apps/api/tests/test_analise.py docker-compose.yml
git commit -m "fix(seguranca): rate limit do PDF não aceita mais IP forjado

O proxy repassava o X-Forwarded-For inteiro e o Django usava o valor que o
cliente escolhesse. Agora só segue o IP acrescentado pelo Funnel, a porta
3000 só escuta em localhost, e um teto global de 30 PDFs/min limita o
estrago se essa premissa falhar.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Passo 11 (depois do deploy, na Tarefa 11): verificação ponta a ponta pelo Funnel**

De fora da tailnet (celular em dados móveis ou `curl --resolve`, ver `infra/demo-checklist.md`), rode 12 vezes, trocando o IP forjado a cada vez:

```bash
URL="https://dt-server.tail3fe9ce.ts.net/api/v1/relatorio.pdf?produto=soja-em-grao&indicador=quantidade-produzida"
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -H "X-Forwarded-For: 10.0.0.$i" "$URL"; done
```

Esperado: 10 respostas `200` e depois `429`. Se vierem 12 `200`, o Funnel não está acrescentando o IP real: pare e registre em `docs/erros-conhecidos/em-aberto.md`, porque só o teto global estará protegendo.

---

### Task 7: Gunicorn com threads e renderização de PDF serializada por processo

**Arquivos:**
- Modificar: `apps/api/entrypoint.sh:27`
- Modificar: `apps/api/analise/pdf.py` (renderização)
- Teste: `apps/api/tests/test_analise.py`

**Interfaces:**
- Produz: `analise.pdf._RENDERIZACAO: threading.Lock`; só a chamada `HTML(...).write_pdf()` roda com o lock. Leitura do cache e consultas ficam fora dele.
- Configuração: `GUNICORN_WORKERS` (padrão 3), `GUNICORN_THREADS` (padrão 4), `GUNICORN_TIMEOUT` (padrão 60).

- [x] **Passo 1: teste que falha**

Em `apps/api/tests/test_analise.py`:

```python
def test_renderizacao_de_pdf_e_serializada_por_processo(monkeypatch: pytest.MonkeyPatch) -> None:
    import threading
    import time

    ativos = 0
    pico = 0
    trava = threading.Lock()

    class HtmlFalso:
        def __init__(self, string: str) -> None:
            pass

        def write_pdf(self) -> bytes:
            nonlocal ativos, pico
            with trava:
                ativos += 1
                pico = max(pico, ativos)
            time.sleep(0.05)
            with trava:
                ativos -= 1
            return b"%PDF"

    monkeypatch.setattr(pdf, "HTML", HtmlFalso)
    threads = [threading.Thread(target=pdf.renderizar, args=("<p/>",)) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert pico == 1
```

- [x] **Passo 2: rodar e ver falhar**

Rode: `docker compose run --rm api pytest tests/test_analise.py -k serializada -v`
Esperado: FAIL com `AttributeError: module 'analise.pdf' has no attribute 'renderizar'`.

- [x] **Passo 3: implementar**

Em `apps/api/analise/pdf.py`, acrescente `import threading` aos imports e, abaixo de `MAX_RELATORIOS`:

```python
# Gunicorn gthread: várias threads por processo. Pango/fontconfig não são confiáveis em
# renderizações simultâneas, e serializar deixa as outras threads livres para API e /saude.
_RENDERIZACAO = threading.Lock()


def renderizar(html: str) -> bytes:
    with _RENDERIZACAO:
        pdf = HTML(string=html).write_pdf()
    assert pdf is not None
    return pdf
```

Em `gerar_relatorio`, troque as linhas

```python
    pdf = HTML(string=html).write_pdf()
    assert pdf is not None
```

por

```python
    pdf = renderizar(html)
```

Em `apps/api/entrypoint.sh`, troque a linha do gunicorn por:

```sh
    exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 \
      --worker-class gthread \
      --workers "${GUNICORN_WORKERS:-3}" \
      --threads "${GUNICORN_THREADS:-4}" \
      --timeout "${GUNICORN_TIMEOUT:-60}"
```

- [x] **Passo 4: rodar e ver passar**

Rode: `docker compose run --rm api pytest tests/test_analise.py -v && docker compose run --rm api sh -c "ruff check . && mypy ."`
Esperado: tudo PASS.

- [x] **Passo 5: smoke test de disponibilidade**

Rode: `docker compose up -d --build api`, espere `docker compose ps` mostrar `api` como `healthy` e então:

```bash
for i in 1 2 3 4 5 6; do curl -s -o /dev/null "http://127.0.0.1:8000/api/v1/relatorio.pdf?produto=soja-em-grao&indicador=quantidade-produzida&inicio=20$((10+i))" & done
time curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/v1/saude
wait
```

Esperado: `/saude` responde `200` em menos de 1 s enquanto os 6 PDFs são gerados. Com o banco vazio, os PDFs voltam 404 e o teste não vale: rode `make seed` antes.

- [x] **Passo 6: commit**

```bash
git add apps/api/entrypoint.sh apps/api/analise/pdf.py apps/api/tests/test_analise.py
git commit -m "perf(api): gunicorn gthread para que PDFs lentos não derrubem a API e o healthcheck

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: imagem de produção da API sem dependências de dev e sem root

**Arquivos:**
- Modificar: `apps/api/Dockerfile`
- Modificar: `docker-compose.yml` (serviço `api-dev` com profile `dev`)
- Modificar: `Makefile` (`test`, `lint`, `typecheck`, `snapshot`, `ingest`, `seed`)
- Modificar: `.github/workflows/ci.yml` (job `api`)

**Interfaces:**
- Produz: o target `prod` (último estágio, padrão do `docker compose build`) roda como `app` (uid 10001) e só tem `requirements.txt`; o target `dev` tem `requirements-dev.txt` e roda como root. O serviço `api-dev` usa o target `dev` e só sobe com `docker compose run` ou `--profile dev`.

- [x] **Passo 1: Dockerfile em estágios**

Substitua `apps/api/Dockerfile` por:

```dockerfile
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libffi8 \
      libjpeg62-turbo libopenjp2-7 zlib1g fonts-dejavu-core \
      shared-mime-info curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["web"]

# Testes, lint, mypy e comandos que escrevem em ./data (snapshot): roda como root.
FROM base AS dev
COPY requirements-dev.txt ./
RUN pip install -r requirements-dev.txt
COPY . .
RUN chmod +x /app/entrypoint.sh

# Produção: sem ferramentas de dev e sem root.
FROM base AS prod
RUN useradd --system --uid 10001 --home-dir /app app \
    && mkdir -p /app/staticfiles /tmp/faperon-cache \
    && chown app:app /app /app/staticfiles /tmp/faperon-cache
COPY --chown=app:app . .
RUN chmod +x /app/entrypoint.sh
USER app
```

- [x] **Passo 2: serviço `api-dev` no compose**

Em `docker-compose.yml`, acrescente em `services` (depois de `scheduler`):

```yaml
  api-dev:
    <<: *api
    build:
      context: ./apps/api
      target: dev
    profiles: ["dev"]
    restart: "no"
```

- [x] **Passo 3: Makefile usa o `api-dev`**

Troque `api` por `api-dev` nos alvos `seed`, `snapshot`, `ingest`, `test`, `lint` (linha do ruff) e `typecheck` (linha do mypy). Exemplo:

```make
test:
	docker compose run --rm api-dev pytest
```

- [x] **Passo 4: CI constrói o target `dev` para os testes**

Em `.github/workflows/ci.yml`, job `api`, passo "Build da imagem da API":

```yaml
        run: docker build --target dev -t faperon-api apps/api
```

(O job `images` continua com `docker compose build`, o que garante que o target `prod` também compila.)

- [x] **Passo 5: verificar**

Rode:

```bash
docker compose build api
docker compose run --rm --entrypoint sh api -c 'id -u; python -c "import pytest" 2>&1 | tail -1'
docker compose up -d api && docker compose ps api
make test
make lint
make typecheck
```

Esperado: `10001`, seguido de `ModuleNotFoundError: No module named 'pytest'`; `api` chega a `healthy` (migrate, collectstatic e seed rodam como `app`); `make test`, `make lint` e `make typecheck` passam.

- [x] **Passo 6: commit**

```bash
git add apps/api/Dockerfile docker-compose.yml Makefile .github/workflows/ci.yml
git commit -m "fix(seguranca): imagem de produção da API sem root e sem dependências de dev

Testes, lint, mypy e snapshot passam a rodar no serviço api-dev (target dev).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: `SITE_URL` no build do web

**Arquivos:**
- Modificar: `apps/web/Dockerfile` (estágios `build` e `run`)
- Modificar: `docker-compose.yml` (serviço `web`)
- Modificar: `.env.example` (comentário do `SITE_URL`)
- Modificar: `infra/demo-checklist.md`

**Interfaces:**
- Consome: `SITE_URL` do `.env` da raiz (o Compose interpola `${SITE_URL}` a partir dele).

- [x] **Passo 1: Dockerfile do web recebe o ARG**

Em `apps/web/Dockerfile`, no estágio `build`, logo depois de `ENV NEXT_TELEMETRY_DISABLED=1`:

```dockerfile
# robots.txt, sitemap.xml e metadataBase são pré-renderizados no build: a URL pública tem de existir aqui.
ARG SITE_URL=http://localhost:3000
ENV SITE_URL=$SITE_URL
```

No estágio `run`, depois do bloco `ENV NODE_ENV=...`:

```dockerfile
ARG SITE_URL=http://localhost:3000
ENV SITE_URL=$SITE_URL
```

- [x] **Passo 2: compose repassa o valor**

Em `docker-compose.yml`, serviço `web`, troque `build: ./apps/web` por:

```yaml
    build:
      context: ./apps/web
      args:
        SITE_URL: ${SITE_URL:-http://localhost:3000}
```

- [x] **Passo 3: documentar**

Em `.env.example`, acima de `SITE_URL=`:

```
# URL pública do site (no dt-server: https://dt-server.tail3fe9ce.ts.net). Usada no BUILD do web; mudou, rode docker compose up -d --build web.
```

Em `infra/demo-checklist.md`, na lista de "Operação":

```markdown
- O `.env` do servidor precisa de `SITE_URL=https://dt-server.tail3fe9ce.ts.net`. Ele entra no build do web (sitemap, robots, OpenGraph); depois de mudar, rode `docker compose up -d --build web`.
```

- [x] **Passo 4: verificar**

Rode:

```bash
SITE_URL=https://exemplo.test docker compose build web
docker compose up -d web
curl -s http://127.0.0.1:3000/robots.txt
curl -s http://127.0.0.1:3000/sitemap.xml | head -5
```

Esperado: `Sitemap: https://exemplo.test/sitemap.xml`, e as URLs do sitemap começam com `https://exemplo.test/`. Depois, rode `docker compose up -d --build web` sem a variável para voltar ao normal.

- [x] **Passo 5: commit**

```bash
git add apps/web/Dockerfile docker-compose.yml .env.example infra/demo-checklist.md
git commit -m "fix(web): SITE_URL entra no build para sitemap, robots e OpenGraph não apontarem para localhost

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: deploy espera o anterior em vez de ser descartado

**Arquivos:**
- Modificar: `infra/deploy.sh:7`
- Modificar: `docs/adr/0021-deploy-automatico-no-dt-server-via-webhook-do-github.md` (parágrafo "Decisão")
- Modificar: `infra/demo-checklist.md` (linha sobre `flock`)

- [x] **Passo 1: trocar `-n` por espera com limite**

Em `infra/deploy.sh`, troque `exec flock -n /tmp/faperon-deploy.lock -c "` por:

```bash
# Espera o deploy em andamento (até 30 min) em vez de desistir: um push durante o build
# precisa ser publicado. Pushes em fila que encontram HEAD == origin/main viram "already up to date".
exec flock -w 1800 /tmp/faperon-deploy.lock -c "
```

- [x] **Passo 2: testar o comportamento do lock localmente (Linux, WSL ou Git Bash com `flock`)**

```bash
flock /tmp/teste.lock -c 'sleep 3' &
sleep 0.5
time flock -w 10 /tmp/teste.lock -c 'echo rodou'
```

Esperado: imprime `rodou` depois de cerca de 2,5 s (com `-n` sairia na hora sem rodar).

- [x] **Passo 3: atualizar a documentação**

No ADR 0021, troque "O script usa `flock` para não rodar dois deploys ao mesmo tempo" por "O script usa `flock -w 1800`: um push que chega durante um deploy espera ele terminar e então publica o próprio commit (atualizado em 06/10/2026; antes era `flock -n`, que descartava esse push)."

Em `infra/demo-checklist.md`, troque "usa `flock` para não rodar dois deploys ao mesmo tempo" por "usa `flock -w 1800`: deploys concorrentes entram em fila (até 30 min), nenhum é descartado".

- [x] **Passo 4: commit**

```bash
git add infra/deploy.sh docs/adr/0021-deploy-automatico-no-dt-server-via-webhook-do-github.md infra/demo-checklist.md
git commit -m "fix(infra): deploy concorrente espera em fila em vez de ser descartado

Com flock -n, um push durante o build nunca ia ao ar até o push seguinte.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: verificação final e publicação

**Arquivos:** nenhum código novo.

- [x] **Passo 1: suíte completa local**

Rode: `make test && make lint && make typecheck && make web-test`
Esperado: tudo PASS.

- [ ] **Passo 2: subir o compose completo localmente**

Rode: `docker compose up -d --build && docker compose ps`
Esperado: `db`, `api` (`healthy`), `scheduler` e `web` de pé. Abra `http://127.0.0.1:3000`, percorra Início → Central → Painel e baixe um PDF com 2 municípios na comparação.

- [ ] **Passo 3: o usuário atualiza o `.env` do `dt-server` (passo manual, antes do push)**

```
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,api
SITE_URL=https://dt-server.tail3fe9ce.ts.net
```

Sem isso, o deploy sobe com `ALLOWED_HOSTS='*'` do `.env` antigo (funciona, mas sem a correção) e o sitemap continua em localhost.

- [ ] **Passo 4: push e acompanhamento do deploy**

Rode: `git push origin main` e acompanhe `infra/deploy.log` no servidor até aparecer `deploy finished at <hash>`.

- [ ] **Passo 5: verificação no ar (de fora da tailnet)**

- `https://dt-server.tail3fe9ce.ts.net/` abre e o Painel carrega
- `/robots.txt` aponta para `https://dt-server.tail3fe9ce.ts.net/sitemap.xml`
- Passo 11 da Tarefa 6 (rajada com IP forjado) responde `429` depois do 10º PDF
- No servidor, `docker compose exec api id -u` imprime `10001`

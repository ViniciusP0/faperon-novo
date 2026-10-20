# Boletim do Agro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coletar todo dia o DOE-RO e o DOU, separar o que é relevante para o agro, resumir com IA e mostrar o Boletim do Agro (7 dias) no acesso interno, só para coordenação e gestão.

**Architecture:** Novo app Django `boletim` (coleta, triagem barata, classificação e resumo por IA, API de leitura) rodando no `scheduler` existente, desligado por padrão (`BOLETIM_ATIVO`). Novo módulo no front `/sistema/boletim` no padrão visual do site, com item no menu do sistema só para quem pode gerir. A IA entra por uma interface (`ClienteLLM`), então todos os testes usam fontes gravadas e um LLM falso.

**Tech Stack:** Django 5.2 + DRF + pytest (`apps/api`), `anthropic` via `zetele.cliente.ClienteAnthropic`, `pdftotext` (poppler-utils), Next.js + vitest + Playwright (`apps/web`).

**Spec:** `docs/superpowers/specs/2026-10-20-boletim-agro-design.md`. Mock aprovado: `docs/design/mocks/boletim-padrao-do-site.html`.

## Global Constraints

- Fontes: só DOE-RO (`https://diof.ro.gov.br/data/uploads/AAAA/MM/DOE-DD-MM-AAAA.pdf`, extras com sufixo `-EXTRAORDINARIO-` e `-SUPLEMENTAR-N`) e DOU (`https://www.in.gov.br/leiturajornal?data=DD-MM-AAAA&secao=do1|do3`, nota em `https://www.in.gov.br/web/dou/-/{urlTitle}`). Seção 2 do DOU é ignorada. Requisição ao DOU com `User-Agent` de navegador e TLS 1.2.
- Relevância: entram normas e decisões que mudam regras ou direitos do agro em Rondônia e normas nacionais do agro; ficam de fora atos de pessoal/funcionamento interno de qualquer estado e licitações de agro abaixo de **R$ 500 mil** (valor total estimado; sem valor informado, fica de fora).
- Resumo de 4 a 5 linhas, só com o que o texto oficial diz; link da nota original sempre presente. Sem revisão humana.
- Histórico de **7 dias corridos**; ao passar disso o boletim e os atos coletados do dia são apagados.
- Tela: 1 destaque + até 10 notas, "Ver todas" para o resto; destaque prefere o que afeta Rondônia; dia sem nada mostra "Sem notas relevantes hoje".
- Mesma `ANTHROPIC_API_KEY` do Zétele; sem chave ou com `BOLETIM_ATIVO` falso, a coleta não roda. Testes nunca chamam a API (`pytest -m llm` é à parte). Registrar consumo de IA por dia.
- Quem vê: coordenação e gestão = perfis de `podeGerirTags` (`coordenador`, `gestorFrota`, `gestorEspacos`, `gestorContas`). O item "Boletim" só aparece no menu para eles. A API do projeto é pública e sem login por desenho (settings.py), e o login do sistema é do protótipo, no navegador; por isso a restrição é de interface, não de servidor. Registrar isso no ADR.
- Fuso `America/Porto_Velho`. Textos em português. Padrão do repo: ruff (linha 100), mypy, pytest com `-m "not network and not llm"`.

## Review Focus

- Edição do DOE do dia ainda não publicada (HTTP 404): não é erro; a coleta fica pendente e tenta de novo, o boletim mostra o que há.
- A mesma coleta rodando duas vezes (ou o mesmo ato nos dois horários): nenhuma nota repetida.
- A IA devolve JSON inválido, resumo vazio, falha ou fica sem chave: o ato não aparece, a coleta termina e as outras notas seguem.
- Licitação sem valor, com valor em lotes ou escrito como "R$ 1.234.567,89": decisão correta contra o limite de R$ 500 mil.
- Fonte fora do ar ou DOE com PDF ilegível: o boletim do dia continua com a outra fonte e indica qual falhou.
- Perfil sem permissão abre `/sistema/boletim` direto pela URL: não vê o conteúdo.

---

## File Structure

```
apps/api/boletim/
  __init__.py, apps.py, models.py, migrations/
  tipos.py            AtoBruto, Veredito (dataclasses)
  fontes/dou.py       ler_pagina_dou, baixar_dou
  fontes/doe.py       url_pdf, dividir_edicao, baixar_edicao
  triagem.py          extrair_valor, triar
  classificador.py    classificar (LLM por lote)
  coleta.py           coletar_dia, escolher_destaque, expurgar
  agenda.py           coletas_pendentes (regra pura)
  leitura.py          montar_dia, listar_dias
  api/views.py, api/urls.py, api/serializers.py
  management/commands/coletar_boletim.py
apps/api/tests/test_boletim_*.py        (um por módulo)
apps/api/tests/fixtures/boletim/        (já commitados: dou_*.html, doe_19-10-2026.txt)
apps/web/src/lib/sistema/boletim.ts     podeVerBoletim, formatadores de dia
apps/web/src/components/sistema/boletim/boletim.tsx (+ .test.tsx)
apps/web/src/app/sistema/boletim/page.tsx
apps/web/e2e/boletim.spec.ts
docs/adr/00NN-boletim-do-agro.md
```

### Task 1: App `boletim`, modelos e ajustes

**Files:**
- Create: `apps/api/boletim/{__init__,apps,models,tipos}.py`, `apps/api/boletim/migrations/__init__.py` (+ migração gerada)
- Modify: `apps/api/config/settings.py` (INSTALLED_APPS e ajustes), `apps/api/Dockerfile` (apt: `poppler-utils`)
- Test: `apps/api/tests/test_boletim_modelos.py`

**Interfaces:**
- Produces (`boletim/tipos.py`): `@dataclass(frozen=True) AtoBruto(fonte: Literal["dou","doe"], id_externo: str, dia: date, edicao: str, secao: str, orgao: str, titulo: str, texto: str, url: str, pagina: int | None = None)`; `@dataclass(frozen=True) Veredito(id_externo: str, relevante: bool, pontuacao: int, rondonia: bool, titulo_chave: str, resumo: str)`.
- Produces (`models.py`): `Ato` (campos de `AtoBruto` + `relevante: bool|None`, `pontuacao: int`, `rondonia: bool`, `titulo_chave`, `resumo`, `destaque: bool`, `coletado_em`; `UniqueConstraint(fonte, id_externo)`); `Coleta(fonte, dia, status: pendente|ok|falha, lidos: int, erro: str, tentativas: int, atualizada_em)` única por `(fonte, dia)`; `ConsumoDia(dia unique, chamadas: int, tokens_entrada: int, tokens_saida: int)`.
- Settings: `BOLETIM_ATIVO` (env, padrão falso), `BOLETIM_MODELO` (padrão `ZETELE_MODELO`), `BOLETIM_RETENCAO_DIAS=7`, `BOLETIM_VALOR_MINIMO=500000`.

- [ ] **Step 1: Teste** `test_ato_unico_por_fonte_e_id` (criar dois `Ato` com mesma `(fonte, id_externo)` levanta `IntegrityError`) e `test_ajustes_padrao` (`BOLETIM_ATIVO is False`, `BOLETIM_RETENCAO_DIAS == 7`, `BOLETIM_VALOR_MINIMO == 500000`).
- [ ] **Step 2:** `docker compose run --rm api-dev pytest tests/test_boletim_modelos.py -q` → falha (app não existe).
- [ ] **Step 3:** Criar o app, os modelos e ajustes acima; `python manage.py makemigrations boletim`; adicionar `poppler-utils` ao `apt-get install` do Dockerfile (estágio `base`).
- [ ] **Step 4:** Mesmo comando → passa. Rodar `make lint` e `make typecheck`.
- [ ] **Step 5:** Commit `feat(api): app boletim com modelos e ajustes`.

### Task 2: Leitor do DOU

**Files:** Create `apps/api/boletim/fontes/{__init__,dou}.py`; Test `apps/api/tests/test_boletim_dou.py`.

**Interfaces:**
- Produces: `ler_pagina_dou(html: str, dia: date, secao: str) -> list[AtoBruto]` (lê o JSON de `<script id="params">`; `id_externo = urlTitle`; `edicao = editionNumber`; `orgao = hierarchyStr`; `url = https://www.in.gov.br/web/dou/-/{urlTitle}`; `texto = content`); `baixar_dou(dia: date, secao: str, http=requests) -> list[AtoBruto]` (GET com `User-Agent` de navegador, adaptador TLS 1.2, timeout 60 s; levanta `FonteIndisponivel` em erro de rede ou status ≥ 400).

- [ ] **Step 1: Testes** com `fixtures/boletim/dou_20-10-2026_do1.html`: `test_le_atos_do_dia` (todos têm `edicao == "198"`, `fonte == "dou"`), `test_monta_url_da_nota` (a Portaria nº 2.276 do Incra tem `url == "https://www.in.gov.br/web/dou/-/portaria-n-2.276-de-19-de-outubro-de-2026-739139553"` e `orgao` começando por "Ministério do Desenvolvimento Agrário"), `test_pagina_sem_params_levanta` (`FonteIndisponivel`), `test_baixar_usa_user_agent_de_navegador` (http falso registra o cabeçalho que contém "Mozilla").
- [ ] **Step 2:** Rodar → falha.
- [ ] **Step 3:** Implementar (`FonteIndisponivel` fica em `boletim/fontes/__init__.py`).
- [ ] **Step 4:** Rodar → passa.
- [ ] **Step 5:** Commit `feat(api): leitor do DOU para o boletim`.

### Task 3: Leitor do DOE-RO

**Files:** Create `apps/api/boletim/fontes/doe.py`; Test `apps/api/tests/test_boletim_doe.py`.

**Interfaces:**
- Produces: `url_pdf(dia: date, sufixo: str = "") -> str` (`.../data/uploads/2026/10/DOE-19-10-2026.pdf`; sufixo como `"EXTRAORDINARIO-"` antes da data ou `"-SUPLEMENTAR-1"` depois, conforme o padrão do site); `dividir_edicao(texto: str, dia: date, url: str) -> list[AtoBruto]`; `baixar_edicao(dia: date, http=requests) -> str | None` (devolve o texto via `pdftotext -enc UTF-8`; `None` em 404; `FonteIndisponivel` nos demais erros).
- Regras de `dividir_edicao`: cada ato termina numa linha `Protocolo <número>` (o número vira `id_externo`); `orgao` é a última linha em caixa-alta que casa com o cabeçalho de órgão (ex.: "SECRETARIA DE ESTADO DE PATRIMÔNIO E REGULARIZAÇÃO FUNDIÁRIA - SEPAT", "AGÊNCIA DE DEFESA SANITÁRIA AGROSILVOPASTORIL DO ESTADO DE RONDÔNIA - IDARON"); `pagina` vem do rodapé `Rondônia, ed. 201 - N`; `edicao` do mesmo rodapé; `titulo` é a primeira linha não vazia do ato (ex.: "Portaria nº 270 de 16 de outubro de 2026"); linhas "Autenticidade pode ser verificada…" e rodapés saem do texto; `url` é a do PDF.

- [ ] **Step 1: Testes** com `fixtures/boletim/doe_19-10-2026.txt`: `test_acha_portaria_270_da_sepat` (um ato com `id_externo` do seu Protocolo, `orgao` contendo "SEPAT", `titulo` começando por "Portaria nº 270", `edicao == "201"`, `pagina == 74` ou o valor do rodapé na fixture), `test_acha_avisos_da_idaron` (3 atos com `orgao` contendo "IDARON"), `test_texto_do_ato_nao_traz_rodape`, `test_url_pdf_comum_e_extra` (comum, `EXTRAORDINARIO` e `SUPLEMENTAR-1`), `test_baixar_edicao_404_devolve_none`.
- [ ] **Step 2:** Rodar → falha.
- [ ] **Step 3:** Implementar. Conferir contra o arquivo da fixture o texto exato dos cabeçalhos antes de fixar a expressão.
- [ ] **Step 4:** Rodar → passa.
- [ ] **Step 5:** Commit `feat(api): leitor do DOE-RO para o boletim`.

### Task 4: Triagem barata e valor da licitação

**Files:** Create `apps/api/boletim/triagem.py`; Test `apps/api/tests/test_boletim_triagem.py`.

**Interfaces:**
- Consumes: `AtoBruto`.
- Produces: `extrair_valor(texto: str) -> Decimal | None` (maior valor "R$ 1.234.567,89" ou "R$ 500 mil"/"milhão/milhões" do texto, que é o valor total estimado; `None` se não houver); `triar(ato: AtoBruto) -> bool` (True = vai para a IA).
- Regras de `triar`: descarta título ou órgão de ato de pessoal (portaria de pessoal, nomeação, exoneração, designação, férias, diárias, folga, cedência, promoção, aposentadoria, remarcação); descarta extratos de contrato/termo aditivo e avisos de aluguel/chamamento que não sejam de agro; para licitações (aviso, pregão, dispensa, edital, resultado de julgamento, extrato), descarta se `extrair_valor` for `None` ou menor que `settings.BOLETIM_VALOR_MINIMO`; do que sobra, passa só quem tem órgão agro (Mapa, Desenvolvimento Agrário, Incra, Pesca e Aquicultura, Ibama, ICMBio, Embrapa, Conab, Idaron, Emater, Seagri, Sedam, Sepat, Anvisa-toxicologia, Banco Central com "crédito rural") ou palavra-chave de agro no título/texto (lista do spec: agropecuária, agrotóxico, defensivo, crédito rural, assentamento, sanidade, rebanho, safra, cultivar etc.). Palavras genéricas como "rural" sozinha e "cooperativa" sozinha não bastam.

- [ ] **Step 1: Testes** usando as fixtures reais do DOU: `test_descarta_portaria_de_pessoal` (as "PORTARIA DE PESSOAL SE/MAPA" da fixture do_2 de 19/10 → False), `test_passa_incra_rondonia` (Portaria 2.276 → True), `test_passa_bcb_credito_rural` (Instrução Normativa BCB nº 782 → True), `test_descarta_licitacao_sem_valor`, `test_descarta_licitacao_abaixo_do_limite` (texto "valor estimado de R$ 499.999,99" → False), `test_passa_licitacao_agro_acima_do_limite` (R$ 500.000,00 → True; usar `@override_settings`), `test_extrair_valor_formatos` (`"R$ 1.234.567,89"` → `Decimal("1234567.89")`; `"R$ 2 milhões"` → `Decimal("2000000")`; sem valor → `None`), `test_nao_passa_so_por_palavra_rural` (texto genérico de prefeitura com "zona rural" → False), `test_passa_comissao_de_titulacao_sepat` (Portaria 270 do DOE → True).
- [ ] **Step 2:** Rodar → falha.
- [ ] **Step 3:** Implementar `extrair_valor` e `triar` (funções puras, sem rede nem banco).
- [ ] **Step 4:** Rodar → passa.
- [ ] **Step 5:** Commit `feat(api): triagem e regra dos R$ 500 mil do boletim`.

### Task 5: Classificação e resumo por IA

**Files:** Create `apps/api/boletim/classificador.py`; Test `apps/api/tests/test_boletim_classificador.py`.

**Interfaces:**
- Consumes: `zetele.cliente.ClienteLLM` (método `criar(system, messages, tools, ultima_rodada, formato=…)`), `AtoBruto`, `Veredito`.
- Produces: `FORMATO_BOLETIM: dict` (json_schema com `itens: [{id, relevante: bool, pontuacao: int 0–100, rondonia: bool, titulo_chave: str, resumo: str}]`); `classificar(atos: list[AtoBruto], llm: ClienteLLM, lote: int = 8) -> tuple[list[Veredito], Uso]` onde `Uso(chamadas: int, tokens_entrada: int, tokens_saida: int)`; ato sem veredito válido é omitido.
- Prompt (`SISTEMA`): papel de triagem da FAPERON; critérios do spec (relevante = mudança de regra/direito do agro em Rondônia ou norma nacional do agro; irrelevante = pessoal, funcionamento interno, licitação pequena); `titulo_chave` curto; `resumo` de 4 a 5 linhas usando apenas o que está no texto, sem inventar números ou datas; `pontuacao` maior para o que afeta Rondônia; `rondonia` verdadeiro só se o texto cita Rondônia, município ou órgão do estado. Cada ato entra truncado a ~6.000 caracteres.

- [ ] **Step 1: Testes** com um LLM falso (classe com `criar` devolvendo objeto com `.content=[bloco texto JSON]` e `.usage`; ver `tests/zetele_falso.py` para o formato): `test_devolve_vereditos_por_ato`, `test_agrupa_em_lotes` (17 atos, lote 8 → 3 chamadas, `Uso.chamadas == 3`), `test_json_invalido_omite_o_lote_e_segue` (primeiro lote com lixo, segundo válido → só os do segundo), `test_resumo_vazio_ou_relevante_sem_titulo_e_descartado`, `test_provedor_indisponivel_propaga` (`ProvedorIndisponivel` sobe para a coleta decidir), `test_prompt_tem_o_limite_de_linhas_e_de_nao_inventar` (o `system` contém "4 a 5 linhas" e "apenas o que está no texto").
- [ ] **Step 2:** Rodar → falha.
- [ ] **Step 3:** Implementar. O texto da resposta sai como em `zetele/agente.py` (`"".join(b.text …)`), e `json.loads`.
- [ ] **Step 4:** Rodar → passa.
- [ ] **Step 5:** Commit `feat(api): classificador de relevância e resumo do boletim`.

### Task 6: Coleta do dia, destaque e expurgo

**Files:** Create `apps/api/boletim/coleta.py`; Test `apps/api/tests/test_boletim_coleta.py`.

**Interfaces:**
- Consumes: `baixar_dou`, `baixar_edicao`/`dividir_edicao`/`url_pdf`, `triar`, `classificar`, modelos.
- Produces: `coletar_dia(dia: date, fonte: Literal["dou","doe"], llm: ClienteLLM, fontes: Fontes | None = None) -> Coleta` (`Fontes` agrupa as funções de download para os testes trocarem por falsas); `escolher_destaque(dia: date) -> None` (marca `destaque=True` no `Ato` relevante de maior `(rondonia, pontuacao)` do dia e desmarca os outros); `expurgar(hoje: date) -> int` (apaga `Ato`, `Coleta` e `ConsumoDia` com `dia < hoje - 7 dias`).
- Comportamento: DOU lê as seções `do1` e `do3` (e edições extras, se o site listar); DOE tenta a edição comum e, se 404, deixa `Coleta.status = pendente` sem erro; `get_or_create` por `(fonte, id_externo)` garante que re-rodar não duplica e não reclassifica atos já decididos; só atos que `triar` aceita vão à IA; guarda os atos descartados na triagem com `relevante=False` (para poder reclassificar); soma o `Uso` em `ConsumoDia`; `ProvedorIndisponivel` deixa a coleta `falha` com `erro` e mantém o que já foi decidido; `FonteIndisponivel` idem. Sempre chama `escolher_destaque(dia)` no fim.

- [ ] **Step 1: Testes** com fontes e LLM falsos montados a partir das fixtures: `test_coleta_dou_grava_so_relevantes_e_marca_destaque` (destaque é uma portaria do Incra de Rondônia), `test_rodar_duas_vezes_nao_duplica`, `test_doe_404_fica_pendente_sem_erro`, `test_falha_da_ia_marca_falha_e_preserva_decididos`, `test_fonte_fora_do_ar_marca_falha_so_dela`, `test_consumo_de_ia_e_somado_no_dia`, `test_destaque_prefere_rondonia_a_pontuacao_maior`, `test_expurgo_apaga_depois_de_7_dias` (dia 20/10: fica 13/10, apaga 12/10 com todos os atos do dia), `test_sem_notas_relevantes_nao_marca_destaque`.
- [ ] **Step 2:** Rodar → falha.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → passa.
- [ ] **Step 5:** Commit `feat(api): coleta diária do boletim, destaque e expurgo`.

### Task 7: Agenda, comando e scheduler

**Files:** Create `apps/api/boletim/agenda.py`, `apps/api/boletim/management/commands/coletar_boletim.py` (+ `__init__.py`); Modify `apps/api/ingestao/management/commands/run_scheduler.py`; Test `apps/api/tests/test_boletim_agenda.py`.

**Interfaces:**
- Produces: `coletas_pendentes(agora: datetime, coletas: dict[tuple[str, date], str]) -> list[tuple[str, date]]` (regra pura; `coletas` mapeia `(fonte, dia)` ao status). Regras: DOU do dia a partir das 07:00 locais; DOE do dia a partir das 21:00; DOU e DOE de ontem se ainda `pendente`/inexistentes/`falha` (com espera de 1 h após falha, como `ESPERA_APOS_TENTATIVA`); nada além de 7 dias; status `ok` não repete.
- Comando `coletar_boletim [--dia AAAA-MM-DD] [--fonte dou|doe]`: monta `ClienteAnthropic(settings.ANTHROPIC_API_KEY, settings.BOLETIM_MODELO)`, recusa rodar com mensagem clara se `BOLETIM_ATIVO` falso ou sem chave, chama `coletar_dia`.
- `run_scheduler.rodar_ciclo`: depois do expurgo do Zétele, se `BOLETIM_ATIVO` e há chave, roda `coletas_pendentes`, coleta cada uma e `expurgar`; qualquer exceção é registrada com `log.exception` e não derruba a ingestão (mesmo padrão do expurgo do Zétele).

- [ ] **Step 1: Testes**: `test_dou_so_depois_das_7h`, `test_doe_so_depois_das_21h`, `test_ontem_pendente_volta_a_tentar`, `test_ok_nao_repete`, `test_falha_espera_uma_hora`, `test_ignora_dias_com_mais_de_7`, `test_ciclo_do_scheduler_nao_coleta_com_boletim_desligado` (usar `override_settings(BOLETIM_ATIVO=False)` e função de coleta falsa que falha se chamada), `test_comando_recusa_sem_chave`.
- [ ] **Step 2:** Rodar → falha.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `tests/test_boletim_agenda.py tests/test_snapshot_e_agendador.py` → passa.
- [ ] **Step 5:** Commit `feat(api): agenda e comando de coleta do boletim`.

### Task 8: API de leitura

**Files:** Create `apps/api/boletim/{leitura.py,api/__init__.py,api/serializers.py,api/views.py,api/urls.py}`; Modify `apps/api/config/urls.py`; Test `apps/api/tests/test_boletim_api.py`.

**Interfaces:**
- `GET /api/v1/boletim/dias` → `{"dias":[{"dia":"2026-10-20","total":8,"tem_destaque":true,"fontes":{"dou":"ok","doe":"pendente"}}]}` (últimos 7 dias corridos, mais novo primeiro; dia sem notas aparece com `total: 0`).
- `GET /api/v1/boletim/dia/<AAAA-MM-DD>?origem=todas|estado|uniao&todas=0|1` → `{"dia","destaque":Nota|null,"notas":[Nota],"total":int,"fontes":{"dou":{"status","erro"},"doe":{…}}}`; `Nota = {id, origem:"estado"|"uniao", diario:"DOE-RO nº 201", orgao, titulo, resumo, rondonia:bool, data:"2026-10-19", url}`; sem `todas=1` devolve até 10 notas fora o destaque; dia fora dos 7 → 404 com o corpo de erro padrão do projeto (`indicadores.api.erros`); data inválida → 400.
- `leitura.py`: `listar_dias(hoje: date) -> list[dict]`, `montar_dia(dia: date, origem: str, todas: bool) -> dict`. Ordem das notas: `rondonia` desc, `pontuacao` desc, depois mais recente. Só `relevante=True`.

- [ ] **Step 1: Testes** (APIClient, atos criados direto no banco): `test_dias_lista_7_dias_com_total`, `test_dia_devolve_destaque_e_ate_10_notas`, `test_todas_devolve_o_resto`, `test_filtro_de_origem`, `test_dia_sem_notas_devolve_vazio_e_status_das_fontes`, `test_dia_fora_da_janela_404`, `test_data_invalida_400`, `test_nota_traz_link_original_e_diario`, `test_nao_expoe_atos_irrelevantes`.
- [ ] **Step 2:** Rodar → falha.
- [ ] **Step 3:** Implementar e registrar em `config/urls.py` (`path("api/v1/", include("boletim.api.urls"))`); documentar nos serializers para o OpenAPI.
- [ ] **Step 4:** Rodar → passa; `make typecheck`.
- [ ] **Step 5:** Commit `feat(api): endpoints de leitura do boletim`.

### Task 9: Calibração com IA real e variável nos ambientes

**Files:** Create `apps/api/tests/test_boletim_ouro.py`; Modify `infra/aws-teste/docker-compose.teste.yml`, `docker-compose.producao.yml` (passar `BOLETIM_ATIVO` ao `scheduler` e à `api`, padrão falso), `.env.example`, `README.md` (seção Boletim).

- [ ] **Step 1:** Teste `@pytest.mark.llm` `test_ouro_19_e_20_de_outubro`: roda `triar` + `classificar` com `ClienteAnthropic` real sobre as fixtures e confere que saem relevantes pelo menos a Portaria nº 2.276 e a nº 2.273 do Incra (Rondônia), a IN BCB nº 782, o Comunicado nº 1 do Mapa (agrotóxicos), a Resolução-RE nº 4.112 da Anvisa e a Portaria 270 da Sepat, e que nenhuma portaria de pessoal sai relevante; o destaque é uma das duas do Incra em Rondônia. Imprime os resumos para leitura humana.
- [ ] **Step 2:** Rodar (precisa da chave): `docker compose run --rm --entrypoint "" -v "$PWD/apps/api:/app" api-dev pytest -m llm tests/test_boletim_ouro.py -s`. Ajustar o prompt de `classificador.py` até passar; relatar o resultado e o consumo de tokens ao usuário. **Sem a chave, pular este passo e dizer que a função fica desligada e sem calibração.**
- [ ] **Step 3:** Passar a variável nos compose e documentar no README (`BOLETIM_ATIVO=1` liga; usa a chave do Zétele; sem teto, ver `ConsumoDia`).
- [ ] **Step 4:** Commit `feat(boletim): calibração com IA real e variável por ambiente`.

### Task 10: Cliente da API, permissão e item de menu

**Files:** Modify `apps/web/src/lib/api-types.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/site.ts`, `apps/web/src/components/site/header.tsx`; Create `apps/web/src/lib/sistema/boletim.ts`; Test `apps/web/src/lib/sistema/boletim.test.ts`, ajustar `apps/web/src/components/site/header.test.tsx`.

**Interfaces:**
- `lib/sistema/boletim.ts`: `podeVerBoletim(f: Funcionario | null): boolean` (mesma regra de `podeGerirTags`; importar dela), `rotuloDia(iso: string): string` (`"20/10 · ter"`).
- `api-types.ts`: `BoletimNota`, `BoletimDia`, `BoletimDiasResposta` (formas da Task 8). `api.boletimDias()` e `api.boletimDia(dia: string, origem: "todas" | "estado" | "uniao", todas: boolean)`.
- `site.ts`: `MENU_SISTEMA` ganha `{ label: "Boletim", href: "/sistema/boletim", restrito: true }` depois de "Relatórios"; `ItemMenu` ganha `restrito?: boolean`. No `header.tsx`, na área logada, filtrar os itens `restrito` com `podeVerBoletim(funcionarioPorId(lerSessao()))` (o cabeçalho não está dentro do `SistemaProvider`; ler o storage no cliente, após montar, sem causar descompasso de hidratação).

- [ ] **Step 1: Testes**: `podeVerBoletim` verdadeiro para Marcos (coordenador) e falso para Carla, Ana, João e Luíza; `rotuloDia("2026-10-20") === "20/10 · ter"`; no `header.test.tsx`, em `/sistema` com sessão de Marcos o link "Boletim" existe depois de "Relatórios", e com sessão de Carla não existe.
- [ ] **Step 2:** `cd apps/web && npx vitest run src/lib/sistema/boletim.test.ts src/components/site/header.test.tsx` → falha.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Mesmo comando → passa; `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(web): permissão e item de menu do boletim`.

### Task 11: Página do Boletim

**Files:** Create `apps/web/src/components/sistema/boletim/boletim.tsx`, `apps/web/src/app/sistema/boletim/page.tsx` (`metadata.title = "Boletim"`); Test `apps/web/src/components/sistema/boletim/boletim.test.tsx`.

**Interfaces:** `export function Boletim()` ("use client"); usa `useSistema()` para o perfil e `api.boletimDias/boletimDia`.
- Segue o mock `docs/design/mocks/boletim-padrao-do-site.html` com os componentes e tokens do site (pílulas como `NavSistema`/`Segmentado`, cartão `bg-card border-line`, selos no estilo de `legenda-de-tipos`, `Skeleton`/`Alert` de `components/ui`): título "Boletim do Agro"; pílulas de dia (dia sem notas em cinza); pílulas de origem (Todas, Estado · DOE-RO, União · DOU); cartão de destaque (selo da origem + diário, selo "Rondônia", título, resumo, link "Ver nota original ↗" em nova aba com `sr-only`); lista de notas; botão "Ver todas as N notas"; rodapé com aviso de IA sem revisão e histórico de 7 dias; aviso por fonte com falha. Dia sem notas: "Sem notas relevantes hoje". Perfil sem permissão: mensagem "O Boletim do Agro é restrito à coordenação e à gestão." sem chamar a API. Erro da API: `Alert` com "Não foi possível carregar o boletim." e botão de tentar de novo. Tema claro e escuro funcionando (só tokens, sem cores soltas).

- [ ] **Step 1: Testes** (vitest + testing-library, API mockada como nos testes de `indicadores.test.tsx`): `mostra_destaque_e_notas_com_links` (links com `target=_blank` e `rel="noopener noreferrer"`), `troca_de_dia_busca_o_dia`, `filtro_de_origem_chama_a_api_com_a_origem`, `ver_todas_pede_todas`, `dia_sem_notas_mostra_mensagem`, `fonte_com_falha_mostra_aviso`, `perfil_sem_permissao_nao_chama_a_api`, `erro_da_api_mostra_alerta`.
- [ ] **Step 2:** `npx vitest run src/components/sistema/boletim` → falha.
- [ ] **Step 3:** Implementar componente e página.
- [ ] **Step 4:** Mesmo comando → passa; `npm run lint && npm run typecheck`.
- [ ] **Step 5:** Commit `feat(web): página do Boletim do Agro`.

### Task 12: e2e, acessibilidade, ADR e demo

**Files:** Create `apps/web/e2e/boletim.spec.ts`, `docs/adr/00NN-boletim-do-agro.md` (próximo número livre); Modify `README.md`, `docs/specs/README.md` se listar módulos.

- [ ] **Step 1:** Teste e2e (padrão de `sistema.spec.ts`, com a API interceptada por `page.route`): Marcos entra, vê "Boletim" no menu após "Relatórios", abre, vê destaque e notas, troca de dia e de origem; Carla entra e não vê o item no menu, e abrir `/sistema/boletim` direto mostra a mensagem de acesso restrito; verificação axe (`semViolacoesSerias`) no tema claro e escuro; sem rolagem horizontal em 375 px.
- [ ] **Step 2:** `cd apps/web && npm run test:e2e -- boletim.spec.ts` → passa.
- [ ] **Step 3:** ADR: decisão (coleta no scheduler, IA por lote com `ClienteLLM`, triagem antes da IA, janela de 7 dias, desligado por padrão), a restrição por perfil só na interface porque a API é pública e o login do sistema é do protótipo, e o consumo de IA registrado sem teto. README: como ligar e rodar `coletar_boletim`.
- [ ] **Step 4:** `make test && make lint && make typecheck && make web-test` limpos.
- [ ] **Step 5:** Commit `docs(boletim): ADR, README e e2e`. Depois, pela memória do projeto, publicar na demo do Tailscale (`infra/demo-checklist.md`) por ser alteração visual, e avisar o usuário.

---

## Self-Review

- **Spec:** fontes e URLs (T2, T3), relevância e R$ 500 mil (T4, T5), 7 dias e expurgo (T6), destaque, 10 notas e "ver todas" (T6, T8, T11), dia sem notas (T8, T11), horário e extras (T7), ambientes desligados por padrão (T1, T9), consumo de IA (T5, T6), quem vê (T10, T11, T12), padrão visual (T11), calibração com IA real (T9), nada de chamada real nos testes (T5). Duplicidade por fonte+identificador (T1, T6). Uma mesma norma nos dois diários aparece uma vez em cada (sem fusão): coberto por não haver fusão.
- **Pendências do spec que viram bloqueio:** a chave. T9 passo 2 depende dela; sem a chave tudo o mais é entregue, desligado e sem calibração.
- **Diferença em relação ao spec:** o spec dizia que a API recusaria os demais perfis; o projeto não tem login no servidor, então a restrição é só de interface (Global Constraints e ADR).
- **Tipos:** `AtoBruto`, `Veredito`, `Uso`, `Coleta`, `ConsumoDia` e as formas `Nota`/`BoletimDia` são os mesmos nas tasks que os usam.

# Fontes de dados do IDARON, do MAPA e do MDA para a Central de Inteligência

As fontes foram levantadas em 18/10/2026, com chamadas de verdade aos endpoints. Hoje a Central usa o IBGE/SIDRA (PAM, PPM e IPCA) por município de Rondônia.

**Resumo:**
- Quatro fontes estão prontas para integrar: **SICOR** (crédito rural, inclusive o Pronaf), **SIGSIF** (abates sob inspeção federal), **ZARC** (risco climático) e **PAA**.
- O **IDARON não publica dado aberto**: o caminho é a LAI ou um convênio.
- O **MDA quase não publica** dado próprio por município. Na prática, os dados da agricultura familiar vêm do Banco Central (Pronaf) e do MDS (PAA).

## Prioridade de integração

| # | Fonte | Acesso | Dado por município de RO / última atualização | Indicador para os painéis | Esforço |
|---|---|---|---|---|---|
| 1 | **SICOR, a Matriz de Dados do Crédito Rural (BCB)** | API OData/JSON, sem chave, licença ODbL | Sim, nos 52 municípios; até set/2026 | Crédito Pronaf e crédito total por município, produto, finalidade (custeio ou investimento) e mês | Baixo |
| 2 | **Abates SIF por município de procedência (MAPA/SIGSIF)** | CSV no CKAN, CC-BY, mensal | Sim, pelo nome do município; até out/2026 | Cabeças abatidas sob inspeção federal, por município e categoria | Médio |
| 3 | **ZARC, tábua de risco (MAPA)** | CSV no CKAN, um arquivo por safra, semanal | Sim, pelo geocódigo do IBGE; safras de 2016/17 a 2026/27 | Janelas de plantio e risco (20/30/40%) por cultura e município | Médio |
| 4 | **PAA, pela API MiSocial (MDS, programa conjunto com o MDA)** | JSON (Solr), sem chave | Sim, código IBGE de 6 dígitos; até jul/2026 | Agricultores fornecedores, valor pago e alimentos adquiridos | Baixo |
| 5 | **Comex Stat (MDIC)**, no lugar do Agrostat | API JSON, sem chave | Sim, pelo município do exportador; 2025 completo | Exportações (US$ FOB) por município e produto | Baixo |
| 6 | Estabelecimentos SIF, PSR/SISSER, AGROFIT, SIPEAGRO (MAPA) | CSV no CKAN | Parcial | Diretório de frigoríficos e laticínios; o seguro rural tem pouca expressão em RO | Baixo, mas pouco valor |
| 7 | IDARON | Só pela LAI ou por convênio | Não publicado | Rebanho declarado por município, GTA, brucelose | Alto |
| 8 | CAF, ATER e assentamentos (MDA/INCRA) | Sem fonte aberta que funcione | Não | — | Alto |

## Detalhes

### SICOR (Banco Central): a fonte prática do Pronaf
- **Serviço:** o OData `https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata/` tem 17 recursos, entre eles `CusteioMunicipioProduto`, `InvestMunicipioProduto` e `ProgramaSubprogramaRegiaoUF`.
- **Teste:** em Ji-Paraná, 2026 teve 34 operações do Pronaf (`cdPrograma` 0001), que somam R$ 9,7 milhões de custeio. Em RO no mesmo ano, de janeiro a setembro, o Pronaf soma R$ 624 milhões dos R$ 2.623 milhões de custeio, nos 52 municípios.
- **Cuidados:**
  - `cdEstado` é um código do próprio BCB: RO é `'22'`. O `codIbge` tem 7 dígitos.
  - Um filtro mal formado devolve 400/500 com mensagem genérica.
  - Cada chamada leva de 5 a 7 s, então a carga tem de ser periódica, como a do SIDRA, e nunca na hora do acesso.

### MAPA (`dados.agricultura.gov.br`, CKAN com 13 conjuntos, todos CC-BY)
- **SIGSIF (abates):**
  - O arquivo não tem código IBGE e traz 85 grafias para os 52 municípios de RO. É preciso uma tabela de-para.
  - Os arquivos têm cerca de 100 MB, em latin-1, com trechos em UTF-8 corrompido.
  - O número de linhas de RO despenca a partir de 2021, de cerca de 3.000 por ano para 370. Pode ser uma mudança de agregação, e é preciso validar antes de montar série histórica.
- **ZARC:**
  - A safra 2026/27 por enquanto tem só 10 culturas para RO, porque as portarias ainda estão saindo.
  - Cada arquivo tem cerca de 100 MB.
  - O SISZARC (cultivares) está "em manutenção".
- **PSR/SISSER:** em 2025, RO tem 42 apólices em 22 municípios, que somam R$ 379 mil de subvenção. É pouco relevante para o estado.
- **SIF estabelecimentos:** RO tem 48 ativos, 17 de carne e 17 de leite. Serve como diretório.
- **Agrostat:** não tem API. É um painel Qlik, atualizado pela última vez em 04/10/2024. O portal de indicadores tem 60 painéis Qlik sem API.
- **Sem conjunto aberto no CKAN:** PGPM, SISBOV e Registro de Cultivares.

### IDARON: sem API e sem dado aberto
- **Portal:** `idaron.ro.gov.br` mostra "Portal em manutenção".
- **Sistemas:** os que existem (IDARON OnLine/GTA, SIAFRO, e-PTV, SISPECEBT) são transacionais, sem estatística pública.
- **Dados abertos do estado:** o CKAN do governo de RO (`dados.ro.gov.br`) não tem nenhum conjunto do IDARON nem da agricultura.
- **Correção de indicador:** a **vacinação contra aftosa está suspensa em RO desde a Portaria IDARON 287/2020** (zona livre sem vacinação). O indicador certo é o **rebanho declarado por município**, nas campanhas de maio e novembro (Portaria 235/2025).
- **Caminhos:**
  - Pedido pela LAI no e-SIC estadual.
  - Um **acordo de cooperação FAPERON–IDARON** com extração periódica. Há precedente: a SEDAM acessa os dados do IDARON desde 2021 por acordo.

### MDA
- **CAF:** `caf.mda.gov.br` devolveu 403 e erro de certificado, e não há conjunto aberto do CAF por município.
- **API do `dados.gov.br`:** exige token.
- **Garantia-Safra:** há painel Qlik, mas o programa é do semiárido. Falta confirmar se RO fica fora.
- **ATER:** nada público.
- **Assentamentos (INCRA):** exige login gov.br.
- **PAA:** o que funciona é a API MiSocial do MDS.

## Próximos passos sugeridos
1. **SICOR:** é aberto, tem código IBGE e está atualizado até set/2026. Entraria como um painel de crédito rural e Pronaf por município.
2. **Abates SIF:** depende da tabela de-para de nomes de município para código IBGE.
3. **PAA e Comex Stat.**
4. **ZARC:** como camada de calendário de plantio.
5. **IDARON, em paralelo:** um pedido pela LAI ou uma proposta de convênio. A decisão é da FAPERON e fica para validar com o Tiago Martins.

## Fontes consultadas
- https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata/
- https://dadosabertos.bcb.gov.br/api/3/action/package_search?q=SICOR
- https://www.bcb.gov.br/estabilidadefinanceira/micrrural
- https://dados.agricultura.gov.br/api/3/action/package_search?rows=50
- https://indicadores.agro.gov.br/
- https://api-comexstat.mdic.gov.br/docs
- https://aplicacoes.mds.gov.br/sagi/servicos/misocial
- https://www.idaron.ro.gov.br/
- https://rondonia.ro.gov.br/idaron/
- https://dados.ro.gov.br/api/3/action/package_search
- https://www.legisweb.com.br/legislacao/?id=394440 (Portaria IDARON 287/2020)
- https://www.normasbrasil.com.br/norma/portaria-235-2025-ro_475942.html
- https://old.reporterbrasil.org.br/wp-content/uploads/2023/11/SEDAM_Resposta-a-LAI-acesso-a-dados-da-IDARON_Abril2023.pdf

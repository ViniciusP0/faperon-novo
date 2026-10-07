# ADR 0028: Observatório como contexto de leitura, com valores deflacionados pelo IPCA

Status: Aceita

## Contexto

A Central de Inteligência só levava ao Painel, que é uma ferramenta de consulta. A FAPERON quer, ao lado dele, um Observatório para a diretoria e os técnicos: blocos de panorama, crescimento, território e pecuária, cada um com uma conclusão explicada, gráficos e mapas, e filtros próprios. Os valores da PAM e da PPM vêm em reais correntes de cada ano, então comparar anos sem correção exagera o crescimento.

## Opções

- **Escolhida:** novo app Django `observatorio`, só leitura sobre Indicadores, com métricas e textos por regras no backend e um endpoint por bloco; o Next.js só renderiza.
- **Descartada:** calcular no front sobre os endpoints atuais (muitas requisições por bloco, regras duplicadas em TypeScript e Python, sem deflator, e o PDF futuro teria de refazer tudo).
- **Descartada:** pré-calcular tudo a cada carga (as combinações de filtro da exploração livre explodem).
- Para os valores: **escolhido** deflacionar pelo IPCA; **descartado** mostrar só o nominal com aviso e ter um seletor real/nominal.

## Decisão

- App `observatorio` com `calculos.py` (funções puras), `regras.py` (textos determinísticos, ADR 0007) e quatro endpoints em `/api/v1/observatorio/`. Ele depende só de `indicadores` e do índice de preços; não conhece o SIDRA.
- O IPCA (SIDRA 1737) é ingerido pelo pipeline atual para um modelo próprio, `IndicePreco(ano, indice_medio)`, com a média dos 12 meses; ano incompleto não é gravado. Valor real = valor × índice do ano de referência ÷ índice do ano.
- A PPM 94 (vacas ordenhadas) entra em `Medicao` para a produtividade do leite; `TabelaSidra` passa a aceitar tabela sem classificação.
- A malha municipal de RO é baixada uma vez da API de malhas do IBGE e versionada como GeoJSON estático no front.
- O Observatório é feito em três entregas: base (esta), conjuntura (LSPA e Abate) e receita e mercado (ComexStat e ICMS do setor primário pelo CONFAZ).

## Consequências

- As regras e os números ficam testáveis em pytest e prontos para o PDF e o CSV das próximas entregas.
- Toda variação monetária do Observatório é real, "a preços de" um ano informado na tela; o Painel continua mostrando o valor nominal do IBGE.
- O valor da produção não inclui carne bovina até a Entrega 2 trazer o Abate; a tela avisa.
- Mais uma série no agendador e no snapshot; a malha só muda quando alguém roda `manage.py baixar_malha`.

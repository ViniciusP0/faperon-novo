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
- O IPCA (SIDRA 1737) é ingerido pelo pipeline atual para um modelo próprio, `IndicePreco(ano, indice_medio)`, com a média dos 12 meses; ano incompleto não é gravado. Valor real = valor × índice do ano de referência ÷ índice do ano. O piso é 1995: o IPCA médio de 1994 mistura meses anteriores ao Real, então não há correção para anos anteriores (o Panorama só oferece anos a partir de 1995 e o Crescimento avisa quando o ano final é anterior a 1995). Se o ano pedido não tem IPCA fechado, os valores saem a preços do último ano disponível, com aviso; se nenhum IPCA está carregado, o Panorama devolve um bloco vazio com o aviso de IPCA ausente.
- A PPM 94 (vacas ordenhadas) entra em `Medicao` para a produtividade do leite; `TabelaSidra` passa a aceitar tabela sem classificação.
- A malha municipal de RO (e a microrregião de cada município) é baixada uma vez, com `manage.py baixar_territorio`, da API de malhas do IBGE e versionada como GeoJSON estático no front.
- Regras de agregação do valor da produção:
  - **Café (PAM 5457):** o "Café (em grão) Total" já contém o Canephora e o Arábica. O agregado fica; os componentes (`cafe-em-grao-canephora`, `cafe-em-grao-arabica`) saem das somas, composições, rankings e da cultura dominante entre produtos quando o Total existe no banco. Pedir o componente explicitamente continua funcionando.
  - **Território, métrica "valor":** é o valor das **lavouras** (PAM) apenas, e é assim rotulado ("Valor da produção das lavouras"); o valor total com origem animal só existe no Panorama.
  - **Pecuária, composição dos rebanhos:** o agregado fica e o subconjunto sai (`galinaceos-total` fica e `galinaceos-galinhas` sai; `suino-total` fica e `suino-matrizes-de-suinos` sai), para não esconder cabeças.
  - **Pecuária, variação do efetivo:** calculada sobre o conjunto comum de municípios com dado nos dois anos; quem some de um lado (sigilo ou ausência) fica fora e o bloco avisa.
- O Observatório é feito em três entregas: base (esta), conjuntura (LSPA e Abate) e receita e mercado (ComexStat e ICMS do setor primário pelo CONFAZ).

## Consequências

- As regras e os números ficam testáveis em pytest e prontos para o PDF e o CSV das próximas entregas.
- Toda variação monetária do Observatório é real, "a preços de" um ano informado na tela; o Painel continua mostrando o valor nominal do IBGE.
- O valor da produção não inclui carne bovina até a Entrega 2 trazer o Abate; a tela avisa.
- Mais uma série no agendador e no snapshot; a malha só muda quando alguém roda `manage.py baixar_territorio`.
- Os parâmetros de ano são limitados a 1974-2100 e as séries de Crescimento e Pecuária percorrem só os anos com dado, para que um `fim` absurdo não monte listas gigantes.

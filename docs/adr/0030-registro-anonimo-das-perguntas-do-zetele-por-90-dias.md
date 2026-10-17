# ADR 0030: Registro anônimo das perguntas do Zétele por 90 dias

Status: Aceita

## Contexto

Para montar o FAQ e melhorar as respostas, é útil saber o que os visitantes perguntam. A política de privacidade descreve só o que o site faz e o site não guarda dados pessoais de quem consulta o painel.

## Opções

- **Escolhida:** guardar o texto da pergunta mascarado, o desfecho, a página, a data e os tokens, por 90 dias.
- **Descartadas:** não guardar nada (o FAQ sairia só da intuição); guardar a conversa inteira ou o IP (dado pessoal sem necessidade).

## Decisão

- Tabela `zetele_pergunta`, sem IP, user agent, resposta ou identificador de conversa.
- CPF, CNPJ, e-mail, telefone e sequências de 8 ou mais dígitos viram `[removido]` antes de gravar.
- O `scheduler` apaga as perguntas com mais de 90 dias a cada passada.
- `manage.py zetele_exportar` gera o CSV para o FAQ.
- O texto da pergunta e das mensagens anteriores vai à Anthropic para gerar a resposta (transferência internacional, art. 33 da LGPD). A política de privacidade diz isso e nomeia o encarregado de dados.

## Consequências

- Base legal proposta: legítimo interesse (art. 7º, IX), com dado anonimizado na origem. O deploy depende do ciente do encarregado (registrado em `docs/erros-conhecidos/em-aberto.md`).

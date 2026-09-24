# ADR 0018: Notícias importadas do Wix por script pontual (`manage.py import_wix_news`)

Status: Aceita

## Contexto

O Início precisa de notícias reais e a migração da Fase 2 vai precisar do mesmo código.

## Opções

- **Escolhida:** Notícias importadas do Wix por script pontual (`manage.py import_wix_news`)
- **Descartadas:** Cadastro manual; conteúdo fictício

## Decisão

Importar as notícias do site Wix por comando manual, sem sincronização contínua.

Motivo: Conteúdo real na demo e base da migração.

## Consequências

Conteúdo real na demo. Custo: mudanças no HTML do Wix podem quebrar o script; roda sob demanda.

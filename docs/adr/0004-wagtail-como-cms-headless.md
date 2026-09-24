# ADR 0004: Wagtail como CMS headless

Status: Substituída por ADR 0020

## Contexto

A equipe edita Início, Central e notícias sem código. O back-end já é Django.

## Opções

- **Escolhida:** Wagtail como CMS headless
- **Descartadas:** Strapi, Payload, WordPress

## Decisão

Usar Wagtail como CMS. O Next.js consome os conteúdos por endpoints JSON do Django.

Motivo: Um único backend Python.

## Consequências

Um só backend Python e um só banco. Custo: modelagem de páginas em Django.

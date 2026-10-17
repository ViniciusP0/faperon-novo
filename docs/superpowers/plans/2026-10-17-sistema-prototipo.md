# Sistema interno (protótipo) — plano de implementação

**Goal:** agenda individual e gestão de frotas navegáveis por trás do "Acessar o sistema", só no front, com dados fictícios.

**Spec:** `docs/superpowers/specs/2026-10-17-sistema-prototipo-design.md`

**Execução:** o controlador implementa direto. Os despachos de subagente vêm sendo bloqueados pelo classificador do modo automático. Cada tarefa segue TDD (teste que falha, implementação, teste verde, lint e tipos) e termina num commit.

## Global Constraints
- Só `apps/web` (Next.js 15, React 19, Tailwind 3, Vitest, Playwright). Nenhuma chamada de rede nova.
- Storage sempre em try/catch, caindo para memória.
- Textos em português do Brasil, sem emoji. Faixa "Protótipo: dados fictícios, salvos só neste navegador" em toda tela do sistema.
- `noindex` nas rotas `/login` e `/sistema/*`; fora do sitemap; o Zétele não aparece.
- Componentes reaproveitam `components/ui/*` (Button, Input, Select, Textarea, Label, Alert, Badge, Card) e `components/painel/grafico.tsx`.
- Datas tratadas como strings locais `YYYY-MM-DD` e `YYYY-MM-DDTHH:mm` (sem fuso), comparadas lexicograficamente.

## Tarefas

### Task A: Regras puras (`apps/web/src/lib/sistema/`)
- `armazenamento.ts`: `ler<T>(chave, padrao): T`, `gravar(chave, valor): void`, `apagarTudo(): void` (chaves `sistema:*`), `lerSessao()` e `gravarSessao(id | null)`, sempre com try/catch.
- `datas.ts`:
  - `hojeISO()` e `somarDias(iso, n)`;
  - `gradeDoMes(ano, mes0) -> string[][]` (semanas de domingo a sábado, com dias de fora do mês);
  - `sobrepoe(aIni, aFim, bIni, bFim)` (meio aberto);
  - `formatarDataBR(iso)` e `formatarHora(isoDataHora)`.
- `placa.ts`: `normalizarPlaca(s)` e `placaValida(s)` (antiga `AAA9999`, Mercosul `AAA9A99`).
- `reservas.ts`:
  - `conflitoDeReserva(nova, reservas, manutencoes) -> "choque" | "manutencao" | null`;
  - `situacaoDoVeiculo(veiculo, reservas, manutencoes, agora)`;
  - `validarRetorno(kmInicial, kmFinal)`.
- `revisao.ts`: `alertaDeRevisao(veiculo, manutencoes, hoje) -> { estado: "ok" | "proxima" | "vencida"; proximaKm; proximaData }`.
- `custos.ts`: `custosPorMes(abastecimentos, manutencoes, reservas, veiculoId | null, mesesAte, quantos=6)`, que devolve `{mes, combustivel, manutencao, total, km, custoPorKm | null}[]`.
- Tipos em `tipos.ts`: `Funcionario`, `Evento`, `Veiculo`, `Reserva`, `Abastecimento`, `Manutencao` e `EstadoFrota`.
- Testes: todos os casos da seção "Testes" da spec para as regras.

### Task B: Dados de exemplo e estado (`apps/web/src/content/sistema/` e hooks)
- `content/sistema/funcionarios.ts` (os 5), `content/sistema/exemplo.ts`: `eventosInstitucionais(hoje)` e `frotaDeExemplo(hoje)`, deterministas a partir de `hoje`.
- `lib/sistema/use-sessao.ts`: `useSessao()` -> `{ funcionario | null, entrar(id), sair() }`.
- `lib/sistema/use-agenda.ts`: `useAgenda(funcionarioId)` -> `{ eventos, criar, editar, excluir }`.
- `lib/sistema/use-frota.ts`: `useFrota()` -> estado e ações (cadastrar e editar veículo, reservar, cancelar, registrar saída e retorno, abastecimento, manutenção, restaurar).
- Testes: dados deterministas, hooks com storage falhando.

### Task C: Entrada e casca do sistema
- `/login` vira a escolha de funcionário (`components/login/escolha-funcionario.tsx`). Sai o formulário de e-mail e senha e o teste antigo dele é atualizado.
- `app/sistema/layout.tsx` (noindex, barra do sistema com faixa de protótipo, nome, trocar, sair, restaurar) e `app/sistema/page.tsx` (atalhos).
- Sem sessão: aviso com link para o `/login`.
- Testes de componente.

### Task D: Agenda
- `app/sistema/agenda/page.tsx` e `components/sistema/agenda/*` (visão mês, visão lista, diálogo do evento).
- Reservas da pessoa aparecem como viagem.
- Testes de componente.

### Task E: Frotas
- `app/sistema/frotas/page.tsx` e `components/sistema/frotas/*` (abas Veículos, Reservas, Abastecimento e manutenção, Custos com gráfico).
- Testes de componente.

### Task F: E2E, privacidade, docs
- `e2e/sistema.spec.ts` (fluxo do critério de sucesso e axe) e o caso de celular em `responsivo.spec.ts`.
- `privacidade.ts`: o item do login passa a dizer que o protótipo guarda dados fictícios só no navegador; ajustar o teste.
- ADR 0031 (protótipo do sistema interno só no front, com dados no navegador).
- Rebuild do servidor local e conferência visual.

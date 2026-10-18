"use client";

import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label, Select } from "@/components/ui/field";
import { novoId, useSistema } from "@/lib/sistema/estado";
import { alternarTag, CORES_TAG, podeGerirTags, tagsDoItem, TAMANHO_MAXIMO_TAG, validarNomeTag } from "@/lib/sistema/tags";
import type { CorTag, Tag } from "@/lib/sistema/tipos";
import { cn } from "@/lib/utils";
import { Dialogo } from "./dialogo";

const CORES = Object.keys(CORES_TAG) as CorTag[];

function Ponto({ cor, className }: { cor: CorTag; className?: string }) {
  return <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", CORES_TAG[cor].ponto, className)} />;
}

/** Tag mostrada como ponto + nome: a cor nunca é o único sinal. */
export function ChipTag({ tag }: { tag: Tag }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2 py-0.5 text-xs font-medium text-ink">
      <Ponto cor={tag.cor} />
      {tag.nome}
    </span>
  );
}

/** As tags de um item; tag apagada some sozinha. */
export function ChipsDeTags({ ids, className }: { ids?: string[]; className?: string }) {
  const { tags } = useSistema();
  const lista = tagsDoItem(ids, tags);
  if (lista.length === 0) return null;
  return (
    <ul aria-label="Tags" className={cn("flex flex-wrap gap-1.5", className)}>
      {lista.map((t) => (
        <li key={t.id}>
          <ChipTag tag={t} />
        </li>
      ))}
    </ul>
  );
}

/** Estado do filtro "Tag" de uma lista; se a tag escolhida for apagada, volta a "Todas". */
export function useFiltroDeTag(): [string, (id: string) => void] {
  const { tags } = useSistema();
  const [id, setId] = useState("");
  return [tags.some((t) => t.id === id) ? id : "", setId];
}

/** Filtro "Tag" (Todas ou uma tag). Compacto: rótulo ao lado, na altura dos botões da barra de ações. */
export function FiltroDeTag({ id, valor, aoMudar, compacto, className }: { id: string; valor: string; aoMudar: (id: string) => void; compacto?: boolean; className?: string }) {
  const { tags } = useSistema();
  return (
    <div className={cn(compacto ? "flex items-center gap-2" : "w-full max-w-[14rem]", className)}>
      <Label htmlFor={id} className={cn(compacto && "mb-0 text-ink-muted")}>
        Tag
      </Label>
      <Select id={id} value={valor} onChange={(e) => aoMudar(e.target.value)} className={cn(compacto && "h-9 w-40")}>
        <option value="">Todas</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Seletor dos formulários: chips marcáveis (checkbox de verdade) e, para quem gere, o atalho "Gerenciar tags". */
export function SeletorDeTags({ valor, aoMudar }: { valor: string[] | undefined; aoMudar: (ids: string[]) => void }) {
  const { tags, funcionario } = useSistema();
  const [gerindo, setGerindo] = useState(false);
  const marcadas = valor ?? [];
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">
        Tags <span className="font-normal text-ink-muted">(opcional)</span>
      </legend>
      {tags.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma tag criada ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const marcada = marcadas.includes(t.id);
            return (
              <label key={t.id} className="cursor-pointer">
                <input type="checkbox" className="peer sr-only" checked={marcada} onChange={() => aoMudar(alternarTag(marcadas, t.id))} />
                <span
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition duration-150 ease-out peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-steel",
                    marcada ? "border-brand-fg bg-brand-soft font-medium text-ink" : "border-line bg-card text-ink-muted hover:border-field hover:text-ink",
                  )}
                >
                  <Ponto cor={t.cor} />
                  {t.nome}
                  {marcada && <Check aria-hidden="true" className="h-3.5 w-3.5 text-brand-fg" />}
                </span>
              </label>
            );
          })}
        </div>
      )}
      {podeGerirTags(funcionario) && (
        <button type="button" onClick={() => setGerindo(true)} className="mt-2 text-sm font-medium text-brand-fg underline-offset-2 hover:underline">
          Gerenciar tags
        </button>
      )}
      {gerindo && <GerenciarTags aoFechar={() => setGerindo(false)} />}
    </fieldset>
  );
}

function SeletorDeCor({ id, valor, aoMudar, rotulo }: { id: string; valor: CorTag; aoMudar: (cor: CorTag) => void; rotulo?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Ponto cor={valor} className="h-3 w-3" />
      <Select id={id} aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value as CorTag)} className="w-36">
        {CORES.map((c) => (
          <option key={c} value={c}>
            {CORES_TAG[c].rotulo}
          </option>
        ))}
      </Select>
    </div>
  );
}

function LinhaTag({ tag }: { tag: Tag }) {
  const { tags, atualizarTags, apagarTag } = useSistema();
  const [nome, setNome] = useState(tag.nome);
  const [cor, setCor] = useState(tag.cor);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const mudou = nome.trim() !== tag.nome || cor !== tag.cor;

  function salvar(e: FormEvent) {
    e.preventDefault();
    // pelo portal, o submit subiria até o formulário que abriu o diálogo
    e.stopPropagation();
    if (!mudou) return;
    const problema = validarNomeTag(nome, tags, tag.id);
    setErro(problema);
    if (problema) return;
    const novoNome = nome.trim();
    const corNova = CORES_TAG[cor].rotulo.toLowerCase();
    const acao =
      novoNome !== tag.nome
        ? `Renomeou a tag "${tag.nome}" para "${novoNome}"${cor !== tag.cor ? ` e trocou a cor para ${corNova}` : ""}`
        : `Trocou a cor da tag "${tag.nome}" para ${corNova}`;
    atualizarTags((l) => l.map((t) => (t.id === tag.id ? { ...t, nome: novoNome, cor } : t)), acao);
    setNome(novoNome);
  }

  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <form onSubmit={salvar} className="flex flex-wrap items-center gap-2" noValidate>
        <Input aria-label={`Nome da tag ${tag.nome}`} value={nome} maxLength={TAMANHO_MAXIMO_TAG} onChange={(e) => setNome(e.target.value)} className="min-w-0 flex-1 basis-40" />
        <SeletorDeCor id={`tag-${tag.id}-cor`} rotulo={`Cor da tag ${tag.nome}`} valor={cor} aoMudar={setCor} />
        <div className="flex gap-1">
          <Button type="submit" size="sm" variant="vidro-claro" disabled={!mudou} aria-label={`Salvar a tag ${tag.nome}`}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" className="text-danger-ink" onClick={() => setConfirmando(true)} aria-label={`Apagar a tag ${tag.nome}`}>
            Apagar
          </Button>
        </div>
      </form>
      {erro && (
        <Alert tone="erro" className="mt-2">
          {erro}
        </Alert>
      )}
      {confirmando && (
        <div role="group" aria-label={`Confirmar: apagar a tag ${tag.nome}`} className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-ink">
          <span className="min-w-0 flex-1">Apagar “{tag.nome}”? Ela sai de todos os itens que a usam.</span>
          <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
            Manter
          </Button>
          <Button size="sm" variant="vidro" onClick={() => apagarTag(tag.id)}>
            Apagar tag
          </Button>
        </div>
      )}
    </li>
  );
}

/** Diálogo de gestão das tags, só para quem gere. Vai direto para o body: pode abrir de dentro de um formulário. */
export function GerenciarTags({ aoFechar }: { aoFechar: () => void }) {
  const { funcionario, tags, atualizarTags } = useSistema();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState<CorTag>(() => CORES.find((c) => !tags.some((t) => t.cor === c)) ?? "azul");
  const [erro, setErro] = useState<string | null>(null);
  if (!podeGerirTags(funcionario)) return null;

  function criar(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const problema = validarNomeTag(nome, tags);
    setErro(problema);
    if (problema) return;
    const nova: Tag = { id: novoId("tag"), nome: nome.trim(), cor };
    atualizarTags((l) => [...l, nova], `Criou a tag "${nova.nome}"`);
    setNome("");
    setCor(CORES.find((c) => c !== cor && !tags.some((t) => t.cor === c)) ?? cor);
  }

  return createPortal(
    <Dialogo titulo="Gerenciar tags" aoFechar={aoFechar}>
      <p className="mb-4 text-sm text-ink-muted">As tags valem para todos: qualquer pessoa aplica e filtra. Só os gestores criam, renomeiam e apagam.</p>
      <form onSubmit={criar} className="grid gap-2" noValidate>
        <Label htmlFor="tag-nova-nome" className="mb-0">
          Nova tag
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input id="tag-nova-nome" value={nome} maxLength={TAMANHO_MAXIMO_TAG} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Feira regional" className="min-w-0 flex-1 basis-40" />
          <SeletorDeCor id="tag-nova-cor" rotulo="Cor da nova tag" valor={cor} aoMudar={setCor} />
          <Button type="submit" size="sm" variant="vidro">
            Criar tag
          </Button>
        </div>
        {erro && <Alert tone="erro">{erro}</Alert>}
      </form>
      <h3 className="mt-6 text-sm font-semibold text-ink">Tags existentes</h3>
      {tags.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Nenhuma tag criada ainda.</p>
      ) : (
        <ul aria-label="Tags existentes" className="mt-1">
          {tags.map((t) => (
            <LinhaTag key={t.id} tag={t} />
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={aoFechar}>
          Fechar
        </Button>
      </div>
    </Dialogo>,
    document.body,
  );
}

"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { MARCADORES, modeloPadrao, type ModeloDocumento } from "@/lib/sistema/documento";
import type { TipoRelatorio } from "@/lib/sistema/relatorios";

interface Props {
  tipo: TipoRelatorio;
  inicial: ModeloDocumento;
  aoSalvar: (m: ModeloDocumento) => void;
  aoCancelar: () => void;
}

const linhas = (texto: string) => texto.split("\n");

/** Personaliza capa e contracapa de um tipo de relatório; o que for salvo vale para os próximos. */
export function FormularioDocumento({ tipo, inicial, aoSalvar, aoCancelar }: Props) {
  const [m, setM] = useState<ModeloDocumento>(inicial);
  const mudar = (parcial: Partial<ModeloDocumento>) => setM((a) => ({ ...a, ...parcial }));

  function salvar(e: FormEvent) {
    e.preventDefault();
    aoSalvar(m);
  }

  return (
    <form onSubmit={salvar} className="grid gap-5" noValidate>
      <p className="text-xs text-ink-muted">
        Marcadores que se preenchem sozinhos: {MARCADORES.join(", ")}.
      </p>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-semibold text-ink">Capa</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={m.incluirCapa} onChange={(e) => mudar({ incluirCapa: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />
          Incluir capa
        </label>
        <div>
          <Label htmlFor="doc-titulo">Título</Label>
          <Input id="doc-titulo" value={m.titulo} onChange={(e) => mudar({ titulo: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="doc-destaque">Destaque (abaixo da linha verde)</Label>
          <Input id="doc-destaque" value={m.destaque} onChange={(e) => mudar({ destaque: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium text-ink">Campos da capa</p>
          {m.campos.map((c, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="w-2/5">
                <Label htmlFor={`doc-campo-rotulo-${i}`} className="sr-only">
                  Rótulo do campo {i + 1}
                </Label>
                <Input
                  id={`doc-campo-rotulo-${i}`}
                  value={c.rotulo}
                  placeholder="Rótulo"
                  onChange={(e) => mudar({ campos: m.campos.map((x, j) => (j === i ? { ...x, rotulo: e.target.value } : x)) })}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor={`doc-campo-valor-${i}`} className="sr-only">
                  Valor do campo {i + 1}
                </Label>
                <Input
                  id={`doc-campo-valor-${i}`}
                  value={c.valor}
                  placeholder="Valor"
                  onChange={(e) => mudar({ campos: m.campos.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)) })}
                />
              </div>
              <Button size="sm" variant="ghost" onClick={() => mudar({ campos: m.campos.filter((_, j) => j !== i) })} aria-label={`Remover o campo ${c.rotulo || i + 1}`}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="vidro-claro" className="justify-self-start" onClick={() => mudar({ campos: [...m.campos, { rotulo: "", valor: "" }] })}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Adicionar campo
          </Button>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-semibold text-ink">Faixa verde e contracapa</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={m.incluirContracapa} onChange={(e) => mudar({ incluirContracapa: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />
          Incluir contracapa
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="doc-serie">Título da faixa</Label>
            <Input id="doc-serie" value={m.serie} onChange={(e) => mudar({ serie: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="doc-subserie">Subtítulo da faixa</Label>
            <Input id="doc-subserie" value={m.subserie} onChange={(e) => mudar({ subserie: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="doc-titulo-creditos">Título da contracapa</Label>
          <Input id="doc-titulo-creditos" value={m.tituloCreditos} onChange={(e) => mudar({ tituloCreditos: e.target.value })} />
        </div>
        {m.creditos.map((s, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-line p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`doc-credito-${i}`}>Bloco de créditos {i + 1}</Label>
                <Input id={`doc-credito-${i}`} value={s.titulo} onChange={(e) => mudar({ creditos: m.creditos.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => mudar({ creditos: m.creditos.filter((_, j) => j !== i) })} aria-label={`Remover o bloco ${s.titulo || i + 1}`}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
            <Label htmlFor={`doc-credito-linhas-${i}`} className="sr-only">
              Pessoas do bloco {i + 1}, uma por linha
            </Label>
            <Textarea
              id={`doc-credito-linhas-${i}`}
              value={s.linhas.join("\n")}
              placeholder="Uma pessoa por linha"
              onChange={(e) => mudar({ creditos: m.creditos.map((x, j) => (j === i ? { ...x, linhas: linhas(e.target.value) } : x)) })}
              className="min-h-16"
            />
          </div>
        ))}
        <Button size="sm" variant="vidro-claro" className="justify-self-start" onClick={() => mudar({ creditos: [...m.creditos, { titulo: "", linhas: [] }] })}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Adicionar bloco de créditos
        </Button>
        <div>
          <Label htmlFor="doc-nota-titulo">Título da nota</Label>
          <Input id="doc-nota-titulo" value={m.nota.titulo} onChange={(e) => mudar({ nota: { ...m.nota, titulo: e.target.value } })} />
        </div>
        <div>
          <Label htmlFor="doc-nota-texto">Texto da nota</Label>
          <Textarea id="doc-nota-texto" value={m.nota.texto} onChange={(e) => mudar({ nota: { ...m.nota, texto: e.target.value } })} className="min-h-20" />
        </div>
        <div>
          <Label htmlFor="doc-rodape">Rodapé (uma linha por linha)</Label>
          <Textarea id="doc-rodape" value={m.rodape.join("\n")} onChange={(e) => mudar({ rodape: linhas(e.target.value) })} className="min-h-20" />
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={() => setM(modeloPadrao(tipo))}>
          Restaurar padrão
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={aoCancelar}>
            Cancelar
          </Button>
          <Button variant="vidro" type="submit">
            Salvar modelo
          </Button>
        </div>
      </div>
    </form>
  );
}

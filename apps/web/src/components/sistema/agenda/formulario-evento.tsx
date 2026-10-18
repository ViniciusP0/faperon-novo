"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { ROTULO_TIPO_EVENTO, validarEvento } from "@/lib/sistema/agenda";
import type { Evento, TipoEvento } from "@/lib/sistema/tipos";
import { SeletorDeTags } from "../tags";

interface Props {
  inicial: Evento;
  novo: boolean;
  aoSalvar: (evento: Evento) => void;
  aoExcluir: () => void;
  aoCancelar: () => void;
}

export function FormularioEvento({ inicial, novo, aoSalvar, aoExcluir, aoCancelar }: Props) {
  const [evento, setEvento] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const muda = (campo: keyof Evento) => (e: { target: { value: string } }) => setEvento((atual) => ({ ...atual, [campo]: e.target.value }));

  function salvar(e: FormEvent) {
    e.preventDefault();
    const problema = validarEvento(evento);
    setErro(problema);
    if (!problema) aoSalvar({ ...evento, titulo: evento.titulo.trim() });
  }

  return (
    <form onSubmit={salvar} className="grid gap-4" noValidate>
      <div>
        <Label htmlFor="evento-titulo">Título</Label>
        <Input id="evento-titulo" value={evento.titulo} onChange={muda("titulo")} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="evento-data">Data</Label>
          <Input id="evento-data" type="date" value={evento.data} onChange={muda("data")} required />
        </div>
        <div>
          <Label htmlFor="evento-inicio">Início</Label>
          <Input id="evento-inicio" type="time" value={evento.inicio} onChange={muda("inicio")} required />
        </div>
        <div>
          <Label htmlFor="evento-fim">Fim</Label>
          <Input id="evento-fim" type="time" value={evento.fim} onChange={muda("fim")} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="evento-tipo">Tipo</Label>
          <Select id="evento-tipo" value={evento.tipo} onChange={(e) => setEvento((a) => ({ ...a, tipo: e.target.value as TipoEvento }))}>
            {Object.entries(ROTULO_TIPO_EVENTO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="evento-local">Local</Label>
          <Input id="evento-local" value={evento.local} onChange={muda("local")} />
        </div>
      </div>
      <div>
        <Label htmlFor="evento-descricao">Descrição</Label>
        <Textarea id="evento-descricao" value={evento.descricao} onChange={muda("descricao")} className="min-h-20" />
      </div>
      <SeletorDeTags valor={evento.tags} aoMudar={(tags) => setEvento((a) => ({ ...a, tags }))} />
      {erro && <Alert tone="erro">{erro}</Alert>}
      <div className="flex flex-wrap justify-between gap-2">
        {!novo ? (
          <Button variant="ghost" onClick={aoExcluir} className="text-danger-ink">
            Excluir evento
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={aoCancelar}>
            Cancelar
          </Button>
          <Button variant="vidro" type="submit">Salvar</Button>
        </div>
      </div>
    </form>
  );
}

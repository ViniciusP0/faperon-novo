"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { MUNICIPIOS_RO } from "@/content/sistema/municipios";
import { ROTULO_TIPO_ATIVIDADE, validarAtividade } from "@/lib/sistema/atividades";
import type { Atividade, TipoAtividade } from "@/lib/sistema/tipos";
import { SeletorDeTags } from "../tags";

interface Props {
  inicial: Atividade;
  aoSalvar: (a: Atividade) => void;
  aoCancelar: () => void;
}

export function FormularioAtividade({ inicial, aoSalvar, aoCancelar }: Props) {
  const [a, setA] = useState({ ...inicial, publicoTexto: inicial.publico ? String(inicial.publico) : "" });
  const [erro, setErro] = useState<string | null>(null);

  function salvar(e: FormEvent) {
    e.preventDefault();
    const { publicoTexto, ...resto } = a;
    const atividade: Atividade = {
      ...resto,
      titulo: resto.titulo.trim(),
      municipio: resto.municipio.trim(),
      descricao: resto.descricao.trim(),
      resultados: resto.resultados.trim(),
      publico: publicoTexto.trim() === "" ? 0 : Number(publicoTexto),
    };
    const problema = validarAtividade(atividade);
    setErro(problema);
    if (!problema) aoSalvar(atividade);
  }

  return (
    <form onSubmit={salvar} className="grid gap-4" noValidate>
      <div>
        <Label htmlFor="atividade-titulo">Atividade</Label>
        <Input id="atividade-titulo" value={a.titulo} onChange={(e) => setA({ ...a, titulo: e.target.value })} placeholder="Ex.: Visita técnica a produtores de café" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="atividade-data">Data</Label>
          <Input id="atividade-data" type="date" value={a.data} onChange={(e) => setA({ ...a, data: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="atividade-inicio">Início</Label>
          <Input id="atividade-inicio" type="time" value={a.inicio} onChange={(e) => setA({ ...a, inicio: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="atividade-fim">Fim</Label>
          <Input id="atividade-fim" type="time" value={a.fim} onChange={(e) => setA({ ...a, fim: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="atividade-tipo">Tipo</Label>
          <Select id="atividade-tipo" value={a.tipo} onChange={(e) => setA({ ...a, tipo: e.target.value as TipoAtividade })}>
            {Object.entries(ROTULO_TIPO_ATIVIDADE).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="atividade-municipio">Município</Label>
          <Input id="atividade-municipio" list="municipios-ro" value={a.municipio} onChange={(e) => setA({ ...a, municipio: e.target.value })} />
          <datalist id="municipios-ro">
            {MUNICIPIOS_RO.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <Label htmlFor="atividade-publico">Público atendido (pessoas)</Label>
        <Input id="atividade-publico" inputMode="numeric" value={a.publicoTexto} onChange={(e) => setA({ ...a, publicoTexto: e.target.value })} placeholder="0 se não se aplica" />
      </div>
      <div>
        <Label htmlFor="atividade-descricao">O que foi feito</Label>
        <Textarea id="atividade-descricao" value={a.descricao} onChange={(e) => setA({ ...a, descricao: e.target.value })} className="min-h-20" />
      </div>
      <div>
        <Label htmlFor="atividade-resultados">Resultados e encaminhamentos</Label>
        <Textarea id="atividade-resultados" value={a.resultados} onChange={(e) => setA({ ...a, resultados: e.target.value })} className="min-h-20" />
      </div>
      <SeletorDeTags valor={a.tags} aoMudar={(tags) => setA((atual) => ({ ...atual, tags }))} />
      {erro && <Alert tone="erro">{erro}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button variant="vidro" type="submit">
          Salvar atividade
        </Button>
      </div>
    </form>
  );
}

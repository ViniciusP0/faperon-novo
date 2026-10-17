"use client";

import { useState, type FormEvent } from "react";
import { ESPACOS } from "@/content/sistema/exemplo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { conflitosDoPedido, excedeCapacidade, horarioDoPeriodo, ROTULO_PERIODO, ROTULO_STATUS, ROTULO_TIPO_ESPACO } from "@/lib/sistema/espacos";
import type { IdEspaco, PedidoEspaco, PeriodoEspaco, TipoEventoEspaco } from "@/lib/sistema/tipos";

interface Rascunho {
  espacoId: IdEspaco;
  data: string;
  periodo: PeriodoEspaco;
  inicio: string;
  fim: string;
  tipo: TipoEventoEspaco;
  nome: string;
  participantes: string;
  coffeeBreak: boolean;
  observacoes: string;
}

interface Props {
  base: PedidoEspaco;
  pedidos: PedidoEspaco[];
  aoEnviar: (pedido: PedidoEspaco) => void;
  aoCancelar: () => void;
}

/** Monta o pedido a partir do rascunho; null se o horário ainda não fecha. */
function montar(base: PedidoEspaco, r: Rascunho): PedidoEspaco | null {
  const horario = horarioDoPeriodo(r.periodo, r.inicio, r.fim);
  if (!horario) return null;
  return { ...base, ...r, ...horario, nome: r.nome.trim(), participantes: Number(r.participantes) || 0, observacoes: r.observacoes.trim() };
}

export function FormularioPedido({ base, pedidos, aoEnviar, aoCancelar }: Props) {
  const [r, setR] = useState<Rascunho>({
    espacoId: base.espacoId,
    data: base.data,
    periodo: base.periodo,
    inicio: "",
    fim: "",
    tipo: base.tipo,
    nome: "",
    participantes: "",
    coffeeBreak: false,
    observacoes: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const espaco = ESPACOS.find((e) => e.id === r.espacoId)!;
  const pedido = montar(base, r);
  const conflitos = pedido ? conflitosDoPedido(pedido, pedidos) : [];
  const lotado = pedido ? excedeCapacidade(pedido, espaco) : false;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!r.nome.trim()) return setErro("Informe o nome do evento.");
    if (!r.data) return setErro("Informe o dia.");
    if (!pedido) return setErro("No horário específico, o fim precisa ser depois do início.");
    if (!(Number(r.participantes) > 0) || !Number.isInteger(Number(r.participantes))) return setErro("Informe a quantidade aproximada de participantes.");
    aoEnviar(pedido);
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pedido-espaco">Espaço</Label>
          <Select id="pedido-espaco" value={r.espacoId} onChange={(e) => setR({ ...r, espacoId: e.target.value as IdEspaco })}>
            {ESPACOS.map((esp) => (
              <option key={esp.id} value={esp.id}>
                {esp.nome} (até {esp.capacidade} pessoas)
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pedido-data">Dia</Label>
          <Input id="pedido-data" type="date" value={r.data} onChange={(e) => setR({ ...r, data: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="pedido-periodo">Período</Label>
          <Select id="pedido-periodo" value={r.periodo} onChange={(e) => setR({ ...r, periodo: e.target.value as PeriodoEspaco })}>
            {Object.entries(ROTULO_PERIODO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </div>
        {r.periodo === "horario" ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="pedido-inicio">Início</Label>
              <Input id="pedido-inicio" type="time" value={r.inicio} onChange={(e) => setR({ ...r, inicio: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pedido-fim">Fim</Label>
              <Input id="pedido-fim" type="time" value={r.fim} onChange={(e) => setR({ ...r, fim: e.target.value })} />
            </div>
          </div>
        ) : (
          <span />
        )}
        <div>
          <Label htmlFor="pedido-tipo">Tipo de evento</Label>
          <Select id="pedido-tipo" value={r.tipo} onChange={(e) => setR({ ...r, tipo: e.target.value as TipoEventoEspaco })}>
            {Object.entries(ROTULO_TIPO_ESPACO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pedido-participantes">Participantes (aproximado)</Label>
          <Input id="pedido-participantes" type="number" min={1} value={r.participantes} onChange={(e) => setR({ ...r, participantes: e.target.value })} />
        </div>
      </div>
      <div>
        <Label htmlFor="pedido-nome">Nome do evento</Label>
        <Input id="pedido-nome" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={r.coffeeBreak} onChange={(e) => setR({ ...r, coffeeBreak: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />
        Haverá coffee break
      </label>
      <div>
        <Label htmlFor="pedido-observacoes">Observações</Label>
        <Textarea id="pedido-observacoes" value={r.observacoes} onChange={(e) => setR({ ...r, observacoes: e.target.value })} className="min-h-20" />
      </div>

      {(conflitos.length > 0 || lotado) && (
        <div role="status" className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger-ink">
          <p className="font-semibold">Possíveis conflitos</p>
          <ul className="mt-1 list-disc pl-5">
            {conflitos.map((c) => (
              <li key={c.id}>
                {c.nome}, {c.inicio}–{c.fim} ({ROTULO_STATUS[c.status].toLowerCase()})
              </li>
            ))}
            {lotado && (
              <li>
                {r.participantes} participantes passam da capacidade do {espaco.nome.toLowerCase()} ({espaco.capacidade} pessoas).
              </li>
            )}
          </ul>
          <p className="mt-2">O pedido pode ir para a fila assim mesmo; o gestor dos espaços decide.</p>
        </div>
      )}
      {erro && <Alert tone="erro">{erro}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit">Enviar para a fila</Button>
      </div>
    </form>
  );
}

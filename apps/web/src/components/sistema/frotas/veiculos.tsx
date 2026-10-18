"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/field";
import { agoraISO, formatarDataBR } from "@/lib/sistema/datas";
import { novoId, useSistema } from "@/lib/sistema/estado";
import { km } from "@/lib/sistema/formato";
import { formatarPlaca, normalizarPlaca, placaValida } from "@/lib/sistema/placa";
import { situacaoDoVeiculo } from "@/lib/sistema/reservas";
import { alertaDeRevisao } from "@/lib/sistema/revisao";
import type { SituacaoVeiculo, Veiculo } from "@/lib/sistema/tipos";
import { cn } from "@/lib/utils";
import { Dialogo } from "../dialogo";

export const ROTULO_SITUACAO: Record<SituacaoVeiculo, string> = {
  disponivel: "Disponível",
  reservado: "Em uso / reservado",
  em_manutencao: "Em manutenção",
};

const corSituacao: Record<SituacaoVeiculo, string> = {
  disponivel: "bg-brand-soft text-brand-strong",
  reservado: "bg-steel-soft text-ink",
  em_manutencao: "bg-danger-soft text-danger-ink",
};

function FormularioVeiculo({ inicial, aoSalvar, aoCancelar }: { inicial: Veiculo; aoSalvar: (v: Veiculo) => string | null; aoCancelar: () => void }) {
  const [v, setV] = useState({ ...inicial, placa: formatarPlaca(inicial.placa) });
  const [erro, setErro] = useState<string | null>(null);

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!placaValida(v.placa)) return setErro("Placa inválida. Use AAA-9999 ou o padrão Mercosul AAA9A99.");
    if (!v.modelo.trim()) return setErro("Informe o modelo.");
    if (!Number.isInteger(v.ano) || v.ano < 1990 || v.ano > 2100) return setErro("Informe um ano válido.");
    if (!Number.isFinite(v.km) || v.km < 0) return setErro("Informe o km atual.");
    setErro(aoSalvar({ ...v, placa: normalizarPlaca(v.placa), modelo: v.modelo.trim() }));
  }

  return (
    <form onSubmit={salvar} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="veiculo-placa">Placa</Label>
          <Input id="veiculo-placa" value={v.placa} onChange={(e) => setV({ ...v, placa: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="veiculo-modelo">Modelo</Label>
          <Input id="veiculo-modelo" value={v.modelo} onChange={(e) => setV({ ...v, modelo: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="veiculo-ano">Ano</Label>
          <Input id="veiculo-ano" type="number" value={v.ano || ""} onChange={(e) => setV({ ...v, ano: Number(e.target.value) })} />
        </div>
        <div>
          <Label htmlFor="veiculo-km">Km atual</Label>
          <Input id="veiculo-km" type="number" min={0} value={Number.isFinite(v.km) ? v.km : ""} onChange={(e) => setV({ ...v, km: Number(e.target.value) })} />
        </div>
      </div>
      {erro && <Alert tone="erro">{erro}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button variant="vidro" type="submit">Salvar veículo</Button>
      </div>
    </form>
  );
}

export function Veiculos() {
  const { funcionario, hoje, frota, atualizarFrota } = useSistema();
  const [editando, setEditando] = useState<{ veiculo: Veiculo; novo: boolean } | null>(null);
  const gestor = funcionario?.gestorFrota ?? false;
  const agora = agoraISO();

  function salvar(v: Veiculo): string | null {
    if (frota.veiculos.some((o) => o.id !== v.id && normalizarPlaca(o.placa) === v.placa)) return "Já existe um veículo com essa placa.";
    const existia = frota.veiculos.some((o) => o.id === v.id);
    atualizarFrota(
      (f) => ({ ...f, veiculos: [...f.veiculos.filter((o) => o.id !== v.id), v].sort((a, b) => a.modelo.localeCompare(b.modelo)) }),
      `${existia ? "Editou" : "Cadastrou"} o veículo ${v.modelo} (${formatarPlaca(v.placa)})`,
    );
    setEditando(null);
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{frota.veiculos.length} veículos. Revisão a cada 10.000 km ou 12 meses.</p>
        {gestor && <Button variant="vidro" onClick={() => setEditando({ novo: true, veiculo: { id: novoId("veiculo"), placa: "", modelo: "", ano: new Date().getFullYear(), km: 0 } })}>Cadastrar veículo</Button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Veículos da frota</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-muted">
              <th scope="col" className="py-2">Placa</th>
              <th scope="col">Modelo</th>
              <th scope="col">Ano</th>
              <th scope="col">Km</th>
              <th scope="col">Situação</th>
              <th scope="col">Próxima revisão</th>
              {gestor && <th scope="col"><span className="sr-only">Ações</span></th>}
            </tr>
          </thead>
          <tbody>
            {frota.veiculos.map((v) => {
              const situacao = situacaoDoVeiculo(v, frota.reservas, frota.manutencoes, agora);
              const revisao = alertaDeRevisao(v, frota.manutencoes, hoje);
              return (
                <tr key={v.id} className="border-b border-line">
                  <th scope="row" className="py-2 text-left font-mono font-medium text-ink">{formatarPlaca(v.placa)}</th>
                  <td>{v.modelo}</td>
                  <td>{v.ano}</td>
                  <td>{km(v.km)}</td>
                  <td>
                    <Badge className={cn("px-2 py-0.5", corSituacao[situacao])}>{ROTULO_SITUACAO[situacao]}</Badge>
                  </td>
                  <td>
                    {km(revisao.proximaKm)}
                    {revisao.proximaData && ` ou ${formatarDataBR(revisao.proximaData)}`}
                    {revisao.estado !== "ok" && (
                      <Badge className={cn("ml-2 px-2 py-0.5", revisao.estado === "vencida" ? "bg-danger-soft text-danger-ink" : "bg-warm text-ink")}>
                        {revisao.estado === "vencida" ? "Revisão vencida" : "Revisão próxima"}
                      </Badge>
                    )}
                  </td>
                  {gestor && (
                    <td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditando({ novo: false, veiculo: v })} aria-label={`Editar ${formatarPlaca(v.placa)}`}>
                        Editar
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editando && (
        <Dialogo titulo={editando.novo ? "Cadastrar veículo" : "Editar veículo"} aoFechar={() => setEditando(null)}>
          <FormularioVeiculo inicial={editando.veiculo} aoSalvar={salvar} aoCancelar={() => setEditando(null)} />
        </Dialogo>
      )}
    </div>
  );
}

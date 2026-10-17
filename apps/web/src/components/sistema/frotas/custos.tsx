"use client";

import { useMemo, useState } from "react";
import { Grafico } from "@/components/painel/grafico";
import { Label, Select } from "@/components/ui/field";
import { custosPorMes } from "@/lib/sistema/custos";
import { rotuloMesCurto } from "@/lib/sistema/datas";
import { useSistema } from "@/lib/sistema/estado";
import { km, reais } from "@/lib/sistema/formato";
import { formatarPlaca } from "@/lib/sistema/placa";

export function Custos() {
  const { hoje, frota } = useSistema();
  const [veiculoId, setVeiculoId] = useState("");
  const meses = useMemo(
    () => custosPorMes(frota.abastecimentos, frota.manutencoes, frota.reservas, veiculoId || null, hoje.slice(0, 7)),
    [frota, veiculoId, hoje],
  );
  const total = meses.reduce((s, m) => s + m.total, 0);
  const kmTotal = meses.reduce((s, m) => s + m.km, 0);

  const option = useMemo(
    () => ({
      tooltip: { trigger: "axis", valueFormatter: (v: number) => reais(v) },
      legend: { top: 0 },
      grid: { left: 64, right: 16, top: 40, bottom: 32 },
      xAxis: { type: "category", data: meses.map((m) => rotuloMesCurto(m.mes)) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => reais(v).replace(",00", "") } },
      series: [
        { name: "Combustível", type: "bar", stack: "custo", data: meses.map((m) => m.combustivel), itemStyle: { color: "#00604e" } },
        { name: "Manutenção", type: "bar", stack: "custo", data: meses.map((m) => m.manutencao), itemStyle: { color: "#8bcd51" } },
      ],
    }),
    [meses],
  );

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <Label htmlFor="custos-veiculo">Veículo</Label>
        <Select id="custos-veiculo" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
          <option value="">Toda a frota</option>
          {frota.veiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.modelo} ({formatarPlaca(v.placa)})
            </option>
          ))}
        </Select>
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        Últimos 6 meses: <strong className="text-ink">{reais(total)}</strong> em combustível e manutenção, {km(kmTotal)} rodados em viagens concluídas
        {kmTotal > 0 && `, ${reais(total / kmTotal)} por km`}.
      </p>
      <Grafico option={option} descricao={`Custos mensais de combustível e manutenção, ${veiculoId ? "do veículo escolhido" : "da frota"}, nos últimos 6 meses.`} altura={300} />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">Custos por mês</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-muted">
              <th scope="col" className="py-2">Mês</th>
              <th scope="col">Combustível</th>
              <th scope="col">Manutenção</th>
              <th scope="col">Total</th>
              <th scope="col">Km rodados</th>
              <th scope="col">Custo por km</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes} className="border-b border-line">
                <th scope="row" className="py-2 text-left font-medium capitalize text-ink">{rotuloMesCurto(m.mes)}</th>
                <td>{reais(m.combustivel)}</td>
                <td>{reais(m.manutencao)}</td>
                <td className="font-medium">{reais(m.total)}</td>
                <td>{km(m.km)}</td>
                <td>{m.custoPorKm == null ? "—" : reais(m.custoPorKm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

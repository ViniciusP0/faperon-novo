"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { formatarDataBR } from "@/lib/sistema/datas";
import { novoId, useSistema } from "@/lib/sistema/estado";
import { km, litros, reais } from "@/lib/sistema/formato";
import { formatarPlaca } from "@/lib/sistema/placa";
import type { Abastecimento, Manutencao, TipoManutencao } from "@/lib/sistema/tipos";

const ROTULO_MANUTENCAO: Record<TipoManutencao, string> = { revisao: "Revisão", pneus: "Pneus", freios: "Freios", outros: "Outros" };
const ULTIMOS = 8;

function numero(texto: string): number {
  return Number(texto.replace(",", "."));
}

export function AbastecimentoManutencao() {
  const { funcionario, hoje, frota, atualizarFrota } = useSistema();
  const [ab, setAb] = useState({ veiculoId: "", data: hoje, litros: "", valor: "", km: "" });
  const [ma, setMa] = useState({ veiculoId: "", data: hoje, tipo: "revisao" as TipoManutencao, valor: "", km: "", concluida: true, observacao: "" });
  const [msgAb, setMsgAb] = useState<{ tom: "info" | "erro"; texto: string } | null>(null);
  const [msgMa, setMsgMa] = useState<{ tom: "info" | "erro"; texto: string } | null>(null);
  if (!funcionario) return null;
  const nomeVeiculo = (id: string) => {
    const v = frota.veiculos.find((x) => x.id === id);
    return v ? `${v.modelo} (${formatarPlaca(v.placa)})` : "";
  };
  const opcoes = frota.veiculos.map((v) => (
    <option key={v.id} value={v.id}>
      {v.modelo} ({formatarPlaca(v.placa)})
    </option>
  ));

  function registrarAbastecimento(e: FormEvent) {
    e.preventDefault();
    const registro: Abastecimento = { id: novoId("abastecimento"), veiculoId: ab.veiculoId, funcionarioId: funcionario!.id, data: ab.data, litros: numero(ab.litros), valor: numero(ab.valor), km: numero(ab.km) };
    if (!registro.veiculoId || !registro.data) return setMsgAb({ tom: "erro", texto: "Escolha o veículo e a data." });
    if (!(registro.litros > 0) || !(registro.valor > 0) || !(registro.km >= 0)) return setMsgAb({ tom: "erro", texto: "Informe litros, valor e km válidos." });
    atualizarFrota((f) => ({
      ...f,
      abastecimentos: [...f.abastecimentos, registro],
      veiculos: f.veiculos.map((v) => (v.id === registro.veiculoId ? { ...v, km: Math.max(v.km, registro.km) } : v)),
    }), `Registrou abastecimento de ${registro.litros} L em ${nomeVeiculo(registro.veiculoId)}`);
    setAb({ veiculoId: "", data: hoje, litros: "", valor: "", km: "" });
    setMsgAb({ tom: "info", texto: "Abastecimento registrado." });
  }

  function registrarManutencao(e: FormEvent) {
    e.preventDefault();
    const registro: Manutencao = { id: novoId("manutencao"), veiculoId: ma.veiculoId, data: ma.data, tipo: ma.tipo, valor: numero(ma.valor), km: numero(ma.km), concluida: ma.concluida, ...(ma.tipo === "outros" && { observacao: ma.observacao.trim() }) };
    if (!registro.veiculoId || !registro.data) return setMsgMa({ tom: "erro", texto: "Escolha o veículo e a data." });
    if (ma.tipo === "outros" && !registro.observacao) return setMsgMa({ tom: "erro", texto: "Descreva o motivo da manutenção em Observação." });
    if (!(registro.valor >= 0) || !(registro.km >= 0) || ma.valor === "" || ma.km === "") return setMsgMa({ tom: "erro", texto: "Informe valor e km válidos." });
    atualizarFrota((f) => ({ ...f, manutencoes: [...f.manutencoes, registro] }), `Registrou manutenção (${registro.tipo}) em ${nomeVeiculo(registro.veiculoId)}`);
    setMa({ veiculoId: "", data: hoje, tipo: "revisao", valor: "", km: "", concluida: true, observacao: "" });
    setMsgMa({ tom: "info", texto: registro.concluida ? "Manutenção registrada." : "Manutenção registrada; o veículo fica em manutenção até ser concluída." });
  }

  function concluir(id: string) {
    const m = frota.manutencoes.find((o) => o.id === id);
    atualizarFrota(
      (f) => ({ ...f, manutencoes: f.manutencoes.map((o) => (o.id === id ? { ...o, concluida: true } : o)) }),
      `Concluiu a manutenção de ${nomeVeiculo(m?.veiculoId ?? "")}`,
    );
  }

  const abastecimentos = [...frota.abastecimentos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, ULTIMOS);
  const manutencoes = [...frota.manutencoes].sort((a, b) => Number(a.concluida) - Number(b.concluida) || b.data.localeCompare(a.data)).slice(0, ULTIMOS);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="titulo-abastecimento">
        <h2 id="titulo-abastecimento" className="text-lg font-semibold text-ink">Abastecimento</h2>
        <form onSubmit={registrarAbastecimento} className="mt-3 grid gap-3 rounded-2xl border border-line bg-card p-4" noValidate>
          <div>
            <Label htmlFor="ab-veiculo">Veículo</Label>
            <Select id="ab-veiculo" value={ab.veiculoId} onChange={(e) => setAb({ ...ab, veiculoId: e.target.value })}>
              <option value="">Escolha</option>
              {opcoes}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ab-data">Data</Label>
              <Input id="ab-data" type="date" value={ab.data} onChange={(e) => setAb({ ...ab, data: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ab-km">Km no hodômetro</Label>
              <Input id="ab-km" inputMode="numeric" value={ab.km} onChange={(e) => setAb({ ...ab, km: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ab-litros">Litros</Label>
              <Input id="ab-litros" inputMode="decimal" value={ab.litros} onChange={(e) => setAb({ ...ab, litros: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ab-valor">Valor total (R$)</Label>
              <Input id="ab-valor" inputMode="decimal" value={ab.valor} onChange={(e) => setAb({ ...ab, valor: e.target.value })} />
            </div>
          </div>
          {msgAb && <Alert tone={msgAb.tom}>{msgAb.texto}</Alert>}
          <Button variant="vidro" type="submit">Registrar abastecimento</Button>
        </form>
        <h3 className="mt-5 text-sm font-semibold text-ink">Últimos abastecimentos</h3>
        <ul className="mt-2 grid gap-1 text-sm">
          {abastecimentos.map((a) => (
            <li key={a.id} className="flex justify-between gap-2 border-b border-line py-1.5">
              <span>
                {formatarDataBR(a.data)} · {nomeVeiculo(a.veiculoId)}
              </span>
              <span className="text-ink-muted">
                {litros(a.litros)} · {reais(a.valor)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-manutencao">
        <h2 id="titulo-manutencao" className="text-lg font-semibold text-ink">Manutenção</h2>
        {funcionario.gestorFrota ? (
          <form onSubmit={registrarManutencao} className="mt-3 grid gap-3 rounded-2xl border border-line bg-card p-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ma-veiculo">Veículo</Label>
                <Select id="ma-veiculo" value={ma.veiculoId} onChange={(e) => setMa({ ...ma, veiculoId: e.target.value })}>
                  <option value="">Escolha</option>
                  {opcoes}
                </Select>
              </div>
              <div>
                <Label htmlFor="ma-tipo">Tipo</Label>
                <Select id="ma-tipo" value={ma.tipo} onChange={(e) => setMa({ ...ma, tipo: e.target.value as TipoManutencao })}>
                  {Object.entries(ROTULO_MANUTENCAO).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="ma-data">Data</Label>
                <Input id="ma-data" type="date" value={ma.data} onChange={(e) => setMa({ ...ma, data: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ma-km">Km</Label>
                <Input id="ma-km" inputMode="numeric" value={ma.km} onChange={(e) => setMa({ ...ma, km: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ma-valor">Valor (R$)</Label>
                <Input id="ma-valor" inputMode="decimal" value={ma.valor} onChange={(e) => setMa({ ...ma, valor: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink">
                <input type="checkbox" checked={ma.concluida} onChange={(e) => setMa({ ...ma, concluida: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />
                Já concluída
              </label>
            </div>
            {ma.tipo === "outros" && (
              <div>
                <Label htmlFor="ma-observacao">Observação</Label>
                <Textarea id="ma-observacao" rows={2} placeholder="Descreva o motivo da manutenção" value={ma.observacao} onChange={(e) => setMa({ ...ma, observacao: e.target.value })} />
              </div>
            )}
            {msgMa && <Alert tone={msgMa.tom}>{msgMa.texto}</Alert>}
            <Button variant="vidro" type="submit">Registrar manutenção</Button>
          </form>
        ) : (
          <p className="mt-3 rounded-2xl border border-line bg-surface-alt p-4 text-sm text-ink-muted">Só o gestor da frota registra manutenções.</p>
        )}
        <h3 className="mt-5 text-sm font-semibold text-ink">Manutenções</h3>
        <ul className="mt-2 grid gap-1 text-sm">
          {manutencoes.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-1.5">
              <span>
                {formatarDataBR(m.data)} · {nomeVeiculo(m.veiculoId)} · {ROTULO_MANUTENCAO[m.tipo]}
                {m.observacao && <span className="block text-ink-muted">{m.observacao}</span>}
              </span>
              <span className="flex items-center gap-2 text-ink-muted">
                {km(m.km)} · {reais(m.valor)}
                {!m.concluida &&
                  (funcionario.gestorFrota ? (
                    <Button size="sm" variant="vidro-claro" onClick={() => concluir(m.id)}>
                      Concluir
                    </Button>
                  ) : (
                    <span className="font-medium text-danger-ink">em andamento</span>
                  ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

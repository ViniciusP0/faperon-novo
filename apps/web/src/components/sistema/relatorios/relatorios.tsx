"use client";

import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/field";
import { PROTOTIPO } from "@/content/sistema/funcionarios";
import { itensDaAgenda } from "@/lib/sistema/agenda";
import { formatarDataBR, somarDias, somarMeses } from "@/lib/sistema/datas";
import { useSistema } from "@/lib/sistema/estado";
import {
  formatarCelula,
  paraCSV,
  relatorioAgenda,
  relatorioContas,
  relatorioEspacos,
  relatorioFrota,
  ROTULO_RELATORIO,
  type Relatorio,
  type TipoRelatorio,
} from "@/lib/sistema/relatorios";
import { cn } from "@/lib/utils";
import { Segmentado } from "../segmentado";

const TIPOS = (Object.keys(ROTULO_RELATORIO) as TipoRelatorio[]).map((valor) => ({ valor, rotulo: ROTULO_RELATORIO[valor] }));

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Tabela({ r }: { r: Relatorio }) {
  const numerica = r.colunas.map((c) => c.formato !== "texto");
  if (r.linhas.length === 0) return <p className="py-6 text-sm text-ink-muted">Nada registrado no período.</p>;
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[640px] text-sm print:min-w-0 print:text-[11px]">
        <caption className="sr-only">{r.titulo}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
            {r.colunas.map((c, i) => (
              <th key={c.rotulo} scope="col" className={cn("px-2 py-2 font-medium first:pl-0", numerica[i] && "text-right")}>
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.linhas.map((l, li) => (
            <tr key={li} className="border-b border-line">
              {l.map((c, i) => (
                <td key={i} className={cn("px-2 py-2 first:pl-0", numerica[i] ? "text-right tabular-nums" : "text-ink")}>
                  {formatarCelula(c, r.colunas[i]!.formato)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {r.total && (
          <tfoot>
            <tr className="font-semibold text-ink">
              {r.total.map((c, i) => (
                <td key={i} className={cn("px-2 py-2 first:pl-0", numerica[i] && "text-right tabular-nums")}>
                  {formatarCelula(c, r.colunas[i]!.formato)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function Relatorios() {
  const { hoje, funcionario, eventos, institucionais, frota, pedidos, despesas } = useSistema();
  const inicioDoMes = `${hoje.slice(0, 7)}-01`;
  const fimDoMes = somarDias(somarMeses(inicioDoMes, 1), -1);
  const [tipo, setTipo] = useState<TipoRelatorio>("frota");
  const [de, setDe] = useState(inicioDoMes);
  const [ate, setAte] = useState(fimDoMes);
  if (!funcionario) return null;

  const periodoValido = /^\d{4}-\d{2}-\d{2}$/.test(de) && /^\d{4}-\d{2}-\d{2}$/.test(ate) && de <= ate;
  const gerar = (): Relatorio => {
    switch (tipo) {
      case "frota":
        return relatorioFrota(frota, de, ate);
      case "espacos":
        return relatorioEspacos(pedidos, de, ate);
      case "agenda":
        return relatorioAgenda(itensDaAgenda(funcionario.id, eventos, institucionais, frota.reservas, frota.veiculos, pedidos), de, ate);
      case "contas":
        return relatorioContas(despesas, funcionario, de, ate);
    }
  };
  const relatorio = periodoValido ? gerar() : null;
  const atalhos = [
    { rotulo: "Este mês", de: inicioDoMes, ate: fimDoMes },
    { rotulo: "Últimos 30 dias", de: somarDias(hoje, -29), ate: hoje },
    { rotulo: "Últimos 3 meses", de: somarMeses(hoje, -3), ate: hoje },
  ];

  return (
    <div className="relatorio-impressao">
      <h1 className="mb-4 text-2xl font-semibold text-ink print:hidden">Relatórios</h1>
      <div className="mb-6 grid gap-4 print:hidden">
        <Segmentado rotulo="Tipo de relatório" opcoes={TIPOS} valor={tipo} aoMudar={setTipo} />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="relatorio-de">De</Label>
            <Input id="relatorio-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="relatorio-ate">Até</Label>
            <Input id="relatorio-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          {atalhos.map((a) => (
            <Button
              key={a.rotulo}
              size="sm"
              variant={de === a.de && ate === a.ate ? "vidro" : "vidro-claro"}
              onClick={() => {
                setDe(a.de);
                setAte(a.ate);
              }}
            >
              {a.rotulo}
            </Button>
          ))}
        </div>
      </div>

      {!relatorio ? (
        <Alert tone="erro">Escolha um período válido: a data inicial não pode vir depois da final.</Alert>
      ) : (
        <section aria-labelledby="titulo-relatorio" className="vidro-cartao rounded-2xl p-5 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-fg">FAPERON · Relatório de {ROTULO_RELATORIO[tipo].toLowerCase()}</p>
              <h2 id="titulo-relatorio" className="text-lg font-semibold text-ink">
                {relatorio.titulo}
              </h2>
              <p className="text-sm text-ink-muted">
                {formatarDataBR(de)} a {formatarDataBR(ate)} · gerado em {formatarDataBR(hoje)} por {funcionario.nome}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button size="sm" variant="vidro-claro" onClick={() => window.print()}>
                <Printer aria-hidden="true" className="h-4 w-4" />
                Imprimir / salvar PDF
              </Button>
              <Button size="sm" variant="vidro" onClick={() => baixar(`relatorio-${tipo}-${de}-a-${ate}.csv`, paraCSV(relatorio))}>
                <Download aria-hidden="true" className="h-4 w-4" />
                Baixar CSV
              </Button>
            </div>
          </div>
          {relatorio.resumo.map((linha) => (
            <p key={linha} className="mb-1 text-sm text-ink">
              {linha}
            </p>
          ))}
          <div className="mt-3">
            <Tabela r={relatorio} />
          </div>
          <p className="mt-4 hidden text-[10px] text-ink-muted print:block">{PROTOTIPO.faixa}</p>
        </section>
      )}
    </div>
  );
}

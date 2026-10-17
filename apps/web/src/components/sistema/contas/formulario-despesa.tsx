"use client";

import { Paperclip } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label, Select } from "@/components/ui/field";
import { LIMITE_COMPROVANTE, ROTULO_CATEGORIA, validarDespesa } from "@/lib/sistema/contas";
import { CENTROS_DE_CUSTO, type CategoriaDespesa, type CentroDeCusto, type Despesa } from "@/lib/sistema/tipos";

interface Props {
  inicial: Despesa;
  aoSalvar: (d: Despesa, enviar: boolean) => void;
  aoCancelar: () => void;
}

function lerArquivo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

export function FormularioDespesa({ inicial, aoSalvar, aoCancelar }: Props) {
  const [d, setD] = useState({ ...inicial, valorTexto: inicial.valor ? String(inicial.valor).replace(".", ",") : "" });
  const [erro, setErro] = useState<string | null>(null);
  const [avisoArquivo, setAvisoArquivo] = useState<string | null>(null);

  async function anexar(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > LIMITE_COMPROVANTE) {
      setD((a) => ({ ...a, comprovante: { nome: arquivo.name, tipo: arquivo.type, dados: null } }));
      setAvisoArquivo("Arquivo grande para o protótipo: guardamos só o nome. No sistema definitivo, o arquivo irá para o servidor.");
      return;
    }
    const dados = await lerArquivo(arquivo);
    setD((a) => ({ ...a, comprovante: { nome: arquivo.name, tipo: arquivo.type, dados } }));
    setAvisoArquivo(null);
  }

  function salvar(e: FormEvent, enviar: boolean) {
    e.preventDefault();
    const { valorTexto, ...resto } = d;
    const valor = Number(valorTexto.replace(/\./g, "").replace(",", "."));
    const despesa: Despesa = { ...resto, valor, descricao: resto.descricao.trim(), fornecedor: resto.fornecedor.trim() };
    const problema = validarDespesa(despesa);
    setErro(problema);
    if (!problema) aoSalvar(despesa, enviar);
  }

  return (
    <form onSubmit={(e) => salvar(e, true)} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="despesa-data">Data</Label>
          <Input id="despesa-data" type="date" value={d.data} onChange={(e) => setD({ ...d, data: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="despesa-valor">Valor (R$)</Label>
          <Input id="despesa-valor" inputMode="decimal" value={d.valorTexto} onChange={(e) => setD({ ...d, valorTexto: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="despesa-centro">Centro de custo</Label>
          <Select id="despesa-centro" value={d.centro} onChange={(e) => setD({ ...d, centro: e.target.value as CentroDeCusto })}>
            {CENTROS_DE_CUSTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="despesa-categoria">Categoria</Label>
          <Select id="despesa-categoria" value={d.categoria} onChange={(e) => setD({ ...d, categoria: e.target.value as CategoriaDespesa })}>
            {Object.entries(ROTULO_CATEGORIA).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="despesa-descricao">Descrição</Label>
        <Input id="despesa-descricao" value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="despesa-fornecedor">Fornecedor</Label>
        <Input id="despesa-fornecedor" value={d.fornecedor} onChange={(e) => setD({ ...d, fornecedor: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="despesa-comprovante">Comprovante (imagem ou PDF)</Label>
        <input
          id="despesa-comprovante"
          type="file"
          accept="image/*,application/pdf"
          onChange={anexar}
          className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-strong hover:file:brightness-95"
        />
        {d.comprovante && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
            <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
            {d.comprovante.nome}
          </p>
        )}
        {avisoArquivo && <p className="mt-1 text-xs text-ink-muted">{avisoArquivo}</p>}
      </div>
      {erro && <Alert tone="erro">{erro}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button variant="vidro-claro" onClick={(e) => salvar(e, false)}>
          Salvar rascunho
        </Button>
        <Button variant="vidro" type="submit">
          Enviar para aprovação
        </Button>
      </div>
    </form>
  );
}

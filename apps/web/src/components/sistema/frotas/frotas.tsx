"use client";

import { Abas } from "../abas";
import { AbastecimentoManutencao } from "./abastecimento-manutencao";
import { Custos } from "./custos";
import { Reservas } from "./reservas";
import { Veiculos } from "./veiculos";

export function Frotas() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-ink">Gestão de frotas</h1>
      <Abas
        rotulo="Áreas da gestão de frotas"
        tour="frotas-abas"
        base="/sistema/frotas"
        abas={[
          { id: "veiculos", rotulo: "Veículos", conteudo: <Veiculos /> },
          { id: "reservas", rotulo: "Reservas", conteudo: <Reservas /> },
          { id: "abastecimento", rotulo: "Abastecimento e manutenção", conteudo: <AbastecimentoManutencao /> },
          { id: "custos", rotulo: "Custos", conteudo: <Custos /> },
        ]}
      />
    </div>
  );
}

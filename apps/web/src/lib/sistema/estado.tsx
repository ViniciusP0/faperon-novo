"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { agendaDeExemplo, eventosInstitucionais, frotaDeExemplo, pedidosDeExemplo } from "@/content/sistema/exemplo";
import { funcionarioPorId } from "@/content/sistema/funcionarios";
import { apagarTudo, gravar, gravarAcesso, gravarSessao, ler, lerAcesso, lerSessao } from "./armazenamento";
import { hojeISO } from "./datas";
import type { EstadoFrota, Evento, Funcionario, PedidoEspaco } from "./tipos";

interface ContextoSistema {
  /** Falso até ler o storage (no servidor e no primeiro render): evita descompasso de hidratação. */
  pronto: boolean;
  hoje: string;
  /** Login (e-mail e senha) feito nesta aba. */
  acesso: boolean;
  funcionario: Funcionario | null;
  /** Troca de perfil: mantém o login. */
  sair: () => void;
  /** Sai do sistema: desfaz o login e o perfil. */
  encerrar: () => void;
  /** Eventos pessoais do funcionário logado. */
  eventos: Evento[];
  institucionais: Evento[];
  salvarEvento: (evento: Evento) => void;
  excluirEvento: (id: string) => void;
  frota: EstadoFrota;
  atualizarFrota: (muda: (atual: EstadoFrota) => EstadoFrota) => void;
  pedidos: PedidoEspaco[];
  atualizarPedidos: (muda: (atual: PedidoEspaco[]) => PedidoEspaco[]) => void;
  restaurar: () => void;
}

const Contexto = createContext<ContextoSistema | null>(null);

const FROTA_VAZIA: EstadoFrota = { veiculos: [], reservas: [], abastecimentos: [], manutencoes: [] };

export function SistemaProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [hoje] = useState(hojeISO);
  const [acesso, setAcesso] = useState(false);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [frota, setFrota] = useState<EstadoFrota>(FROTA_VAZIA);
  const [pedidos, setPedidos] = useState<PedidoEspaco[]>([]);

  const carregar = useCallback(() => {
    const liberado = lerAcesso();
    setAcesso(liberado);
    const atual = liberado ? funcionarioPorId(lerSessao()) : null;
    setFuncionario(atual);
    setEventos(atual ? ler(`agenda:${atual.id}`, agendaDeExemplo(atual.id, hoje)) : []);
    setFrota(ler("frota", frotaDeExemplo(hoje)));
    setPedidos(ler("espacos", pedidosDeExemplo(hoje)));
    setPronto(true);
  }, [hoje]);

  useEffect(carregar, [carregar]);

  const valor = useMemo<ContextoSistema>(() => {
    const salvarEventos = (lista: Evento[]) => {
      setEventos(lista);
      if (funcionario) gravar(`agenda:${funcionario.id}`, lista);
    };
    return {
      pronto,
      hoje,
      acesso,
      funcionario,
      sair: () => {
        gravarSessao(null);
        setFuncionario(null);
      },
      encerrar: () => {
        gravarSessao(null);
        gravarAcesso(false);
        setFuncionario(null);
        setAcesso(false);
      },
      eventos,
      institucionais: eventosInstitucionais(hoje),
      salvarEvento: (evento) => salvarEventos([...eventos.filter((e) => e.id !== evento.id), evento]),
      excluirEvento: (id) => salvarEventos(eventos.filter((e) => e.id !== id)),
      frota,
      atualizarFrota: (muda) =>
        setFrota((atual) => {
          const nova = muda(atual);
          gravar("frota", nova);
          return nova;
        }),
      pedidos,
      atualizarPedidos: (muda) =>
        setPedidos((atual) => {
          const nova = muda(atual);
          gravar("espacos", nova);
          return nova;
        }),
      restaurar: () => {
        apagarTudo();
        carregar();
      },
    };
  }, [pronto, hoje, acesso, funcionario, eventos, frota, pedidos, carregar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSistema(): ContextoSistema {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useSistema fora do SistemaProvider");
  return ctx;
}

export function novoId(prefixo: string): string {
  const aleatorio = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2);
  return `${prefixo}-${aleatorio}`;
}

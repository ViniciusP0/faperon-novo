"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  agendaDeExemplo,
  atividadesDeExemplo,
  despesasDeExemplo,
  eventosInstitucionais,
  frotaDeExemplo,
  historicoDeExemplo,
  pedidosDeExemplo,
} from "@/content/sistema/exemplo";
import { FUNCIONARIOS, funcionarioPorId } from "@/content/sistema/funcionarios";
import { apagarTudo, gravar, gravarAcesso, gravarSessao, ler, lerAcesso, lerSessao } from "./armazenamento";
import { anotar } from "./atividades";
import { agoraISO, hojeISO } from "./datas";
import { removerTag, tagsDeExemplo } from "./tags";
import type { Atividade, Despesa, EstadoFrota, Evento, Funcionario, ModuloHistorico, PedidoEspaco, RegistroHistorico, Tag } from "./tipos";

/** Mudança com a descrição do que foi feito: entra no histórico (registro automático de atividades). */
type Atualizar<T> = (muda: (atual: T) => T, acao?: string) => void;

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
  atualizarFrota: Atualizar<EstadoFrota>;
  pedidos: PedidoEspaco[];
  atualizarPedidos: Atualizar<PedidoEspaco[]>;
  despesas: Despesa[];
  atualizarDespesas: Atualizar<Despesa[]>;
  atividades: Atividade[];
  atualizarAtividades: Atualizar<Atividade[]>;
  /** Tags compartilhadas por todos; só quem gere (`podeGerirTags`) cria, renomeia e apaga. */
  tags: Tag[];
  atualizarTags: Atualizar<Tag[]>;
  /** Apaga a tag e a tira de todos os itens, inclusive das agendas dos colegas guardadas neste navegador. */
  apagarTag: (id: string) => void;
  historico: RegistroHistorico[];
  registrar: (modulo: ModuloHistorico, acao: string) => void;
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
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [historico, setHistorico] = useState<RegistroHistorico[]>([]);

  const carregar = useCallback(() => {
    const liberado = lerAcesso();
    setAcesso(liberado);
    const atual = liberado ? funcionarioPorId(lerSessao()) : null;
    setFuncionario(atual);
    setEventos(atual ? ler(`agenda:${atual.id}`, agendaDeExemplo(atual.id, hoje)) : []);
    setFrota(ler("frota", frotaDeExemplo(hoje)));
    setPedidos(ler("espacos", pedidosDeExemplo(hoje)));
    setDespesas(ler("contas", despesasDeExemplo(hoje)));
    setAtividades(ler("atividades", atividadesDeExemplo(hoje)));
    setTags(ler("tags", tagsDeExemplo()));
    setHistorico(ler("historico", historicoDeExemplo(hoje)));
    setPronto(true);
  }, [hoje]);

  useEffect(carregar, [carregar]);

  const valor = useMemo<ContextoSistema>(() => {
    const registrar = (modulo: ModuloHistorico, acao: string) => {
      if (!funcionario) return;
      setHistorico((atual) => {
        const novo = anotar(atual, { id: novoId("historico"), quando: agoraISO(), funcionarioId: funcionario.id, modulo, acao });
        gravar("historico", novo);
        return novo;
      });
    };
    /** Grava a coleção e, se houver descrição, anota no histórico. */
    function persistente<T>(chave: string, modulo: ModuloHistorico, set: (f: (atual: T) => T) => void): Atualizar<T> {
      return (muda, acao) => {
        set((atual) => {
          const nova = muda(atual);
          gravar(chave, nova);
          return nova;
        });
        if (acao) registrar(modulo, acao);
      };
    }
    const salvarEventos = (lista: Evento[]) => {
      setEventos(lista);
      if (funcionario) gravar(`agenda:${funcionario.id}`, lista);
    };
    const atualizarFrota = persistente("frota", "frota", setFrota);
    const atualizarPedidos = persistente("espacos", "espacos", setPedidos);
    const atualizarDespesas = persistente("contas", "contas", setDespesas);
    const atualizarAtividades = persistente("atividades", "atividades", setAtividades);
    const atualizarTags = persistente("tags", "tags", setTags);
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
      salvarEvento: (evento) => {
        const existia = eventos.some((e) => e.id === evento.id);
        salvarEventos([...eventos.filter((e) => e.id !== evento.id), evento]);
        registrar("agenda", `${existia ? "Editou" : "Criou"} o evento "${evento.titulo}"`);
      },
      excluirEvento: (id) => {
        const evento = eventos.find((e) => e.id === id);
        salvarEventos(eventos.filter((e) => e.id !== id));
        if (evento) registrar("agenda", `Excluiu o evento "${evento.titulo}"`);
      },
      frota,
      atualizarFrota,
      pedidos,
      atualizarPedidos,
      despesas,
      atualizarDespesas,
      atividades,
      atualizarAtividades,
      tags,
      atualizarTags,
      apagarTag: (id) => {
        const tag = tags.find((t) => t.id === id);
        if (!tag) return;
        salvarEventos(removerTag(eventos, id));
        // agendas dos colegas: só as que já foram gravadas (as de exemplo não têm a tag apagada salva)
        for (const f of FUNCIONARIOS) {
          if (f.id === funcionario?.id) continue;
          const salva = ler<Evento[] | null>(`agenda:${f.id}`, null);
          if (Array.isArray(salva)) gravar(`agenda:${f.id}`, removerTag(salva, id));
        }
        atualizarFrota((fr) => ({ ...fr, reservas: removerTag(fr.reservas, id) }));
        atualizarPedidos((l) => removerTag(l, id));
        atualizarDespesas((l) => removerTag(l, id));
        atualizarAtividades((l) => removerTag(l, id));
        atualizarTags((l) => l.filter((t) => t.id !== id), `Apagou a tag "${tag.nome}"`);
      },
      historico,
      registrar,
      restaurar: () => {
        apagarTudo();
        carregar();
      },
    };
  }, [pronto, hoje, acesso, funcionario, eventos, frota, pedidos, despesas, atividades, tags, historico, carregar]);

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

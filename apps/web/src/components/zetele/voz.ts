"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZETELE, ZETELE_VOZ } from "@/content/zetele";
import { falarTexto, type ErroDaVoz } from "@/lib/zetele";

/** Gravação e leitura em voz do Zétele do sistema (ADR 0034). O "Agendar por voz" usa outro caminho
 *  (reconhecimento do navegador, components/sistema/voz) e não passa por aqui. */

export function suportaGravacao(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** Opus em WebM (Chrome, Edge, Firefox); no Safari, MP4. Vazio: o padrão do navegador. */
export function tipoDeGravacao(): string {
  const suporta = (t: string) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t);
  if (suporta("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (suporta("audio/mp4")) return "audio/mp4";
  return "";
}

export function textoDoErroDaVoz(erro: ErroDaVoz): string {
  if (erro.tipo === "espera") return ZETELE.espera(erro.segundos);
  if (erro.tipo === "indisponivel" && erro.motivo === "orcamento_diario") return ZETELE_VOZ.erros.limiteDoDia;
  return ZETELE_VOZ.erros.indisponivel;
}

function textoDoErroDoMicrofone(erro: unknown): string {
  const nome = erro instanceof DOMException || erro instanceof Error ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") return ZETELE_VOZ.erros.bloqueado;
  if (nome === "NotFoundError" || nome === "OverconstrainedError") return ZETELE_VOZ.erros.semMicrofone;
  return ZETELE_VOZ.erros.microfone;
}

export type EstadoGravacao = "parado" | "pedindo" | "gravando";

/** Grava com MediaRecorder até `limite` segundos. Parar entrega o áudio; cancelar descarta. */
export function useGravador({ onPronto, onErro, limite = ZETELE_VOZ.limiteSegundos }: { onPronto: (audio: Blob) => void; onErro: (mensagem: string) => void; limite?: number }) {
  const [estado, setEstado] = useState<EstadoGravacao>("parado");
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef<MediaRecorder | null>(null);
  const descartar = useRef(false);
  const callbacks = useRef({ onPronto, onErro });
  callbacks.current = { onPronto, onErro };

  const parar = useCallback(() => {
    const r = gravador.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const cancelar = useCallback(() => {
    descartar.current = true;
    parar();
  }, [parar]);

  const iniciar = useCallback(async () => {
    if (gravador.current) return;
    setEstado("pedindo");
    let fluxo: MediaStream;
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setEstado("parado");
      callbacks.current.onErro(textoDoErroDoMicrofone(e));
      return;
    }
    let r: MediaRecorder;
    try {
      const tipo = tipoDeGravacao();
      r = tipo ? new MediaRecorder(fluxo, { mimeType: tipo }) : new MediaRecorder(fluxo);
    } catch (e) {
      fluxo.getTracks().forEach((t) => t.stop());
      setEstado("parado");
      callbacks.current.onErro(textoDoErroDoMicrofone(e));
      return;
    }
    const pedacos: Blob[] = [];
    descartar.current = false;
    r.ondataavailable = (ev) => {
      if (ev.data.size > 0) pedacos.push(ev.data);
    };
    r.onstop = () => {
      fluxo.getTracks().forEach((t) => t.stop());
      gravador.current = null;
      setEstado("parado");
      setSegundos(0);
      if (descartar.current) return;
      const audio = new Blob(pedacos, { type: r.mimeType || pedacos[0]?.type || "audio/webm" });
      if (audio.size > 0) callbacks.current.onPronto(audio);
    };
    gravador.current = r;
    r.start();
    setSegundos(0);
    setEstado("gravando");
  }, []);

  useEffect(() => {
    if (estado !== "gravando") return;
    if (segundos >= limite) {
      parar();
      return;
    }
    const t = window.setTimeout(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearTimeout(t);
  }, [estado, segundos, limite, parar]);

  // fechar o painel no meio da gravação desliga o microfone e descarta o áudio
  useEffect(() => () => {
    descartar.current = true;
    const r = gravador.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  return { estado, segundos, iniciar, parar, cancelar };
}

/** Toca a resposta em voz. Guarda o áudio de cada mensagem: ouvir de novo não gasta o limite do dia. */
export function useLeitor({ pagina, onErro }: { pagina: string; onErro: (mensagem: string) => void }) {
  const [tocando, setTocando] = useState<number | null>(null);
  const [preparando, setPreparando] = useState<number | null>(null);
  const elemento = useRef<HTMLAudioElement | null>(null);
  const enderecos = useRef(new Map<number, string>());
  const vez = useRef(0);
  const erro = useRef(onErro);
  erro.current = onErro;

  /** Cria o elemento de áudio dentro de um toque da pessoa (o Safari só deixa tocar depois disso). */
  const preparar = useCallback(() => {
    if (!elemento.current && typeof Audio !== "undefined") elemento.current = new Audio();
    return elemento.current;
  }, []);

  const parar = useCallback(() => {
    vez.current += 1;
    const a = elemento.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setTocando(null);
    setPreparando(null);
  }, []);

  const tocar = useCallback(
    async (id: number, texto: string) => {
      parar();
      const minhaVez = vez.current;
      const a = preparar();
      if (!a) return;
      let url = enderecos.current.get(id);
      if (!url) {
        setPreparando(id);
        const r = await falarTexto(texto, pagina);
        if (minhaVez !== vez.current) return;
        setPreparando(null);
        if (r.tipo !== "ok") {
          erro.current(textoDoErroDaVoz(r));
          return;
        }
        url = URL.createObjectURL(r.audio);
        enderecos.current.set(id, url);
      }
      a.src = url;
      a.onended = () => setTocando((atual) => (atual === id ? null : atual));
      try {
        await a.play();
        if (minhaVez === vez.current) setTocando(id);
      } catch {
        if (minhaVez === vez.current) erro.current(ZETELE_VOZ.erros.tocar);
      }
    },
    [pagina, parar, preparar],
  );

  useEffect(() => {
    const mapa = enderecos.current;
    return () => {
      elemento.current?.pause();
      mapa.forEach((u) => URL.revokeObjectURL(u));
      mapa.clear();
    };
  }, []);

  return { tocando, preparando, tocar, parar, preparar };
}

"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Label, Textarea } from "@/components/ui/field";
import { useSistema } from "@/lib/sistema/estado";
import { interpretar, type CamposPorTipo, type Opcao, type TipoVoz } from "@/lib/sistema/voz";
import { Dialogo } from "../dialogo";

/** Só o que usamos da Web Speech API (Chrome e Edge expõem como webkitSpeechRecognition). */
interface Reconhecedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function construtorDeReconhecedor(): (new () => Reconhecedor) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecedor; webkitSpeechRecognition?: new () => Reconhecedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRO_DE_VOZ: Record<string, string> = {
  "not-allowed": "O navegador não deu acesso ao microfone. Libere o microfone para este site ou digite a frase.",
  "service-not-allowed": "O navegador não deu acesso ao microfone. Libere o microfone para este site ou digite a frase.",
  "no-speech": "Não ouvi nada. Tente de novo, mais perto do microfone.",
  "audio-capture": "Nenhum microfone encontrado. Digite a frase.",
  network: "O reconhecimento de voz do navegador precisa de internet. Digite a frase.",
};

const EXEMPLO: Record<TipoVoz, string> = {
  evento: "“Reunião com o sindicato de Vilhena na terça às nove, na sede.”",
  reserva: "“Preciso da Hilux na quinta, das sete às dezoito, para ir a Cacoal fazer visita técnica.”",
  espaco: "“Auditório no dia 20 à tarde, palestra sobre crédito rural para 80 pessoas, com coffee break.”",
  atividade: "“Hoje das oito ao meio-dia fiz visita técnica a produtores de café em Cacoal, atendi doze produtores e encaminhei três para análise de solo.”",
};

interface Props<T extends TipoVoz> {
  tipo: T;
  /** Texto do botão e do diálogo; o padrão serve aos agendamentos. */
  rotulo?: string;
  veiculos?: Opcao[];
  espacos?: Opcao[];
  aoInterpretar: (campos: CamposPorTipo[T], faltando: string[]) => void;
}

export function AgendarPorVoz<T extends TipoVoz>({ tipo, rotulo = "Agendar por voz", veiculos, espacos, aoInterpretar }: Props<T>) {
  const { hoje } = useSistema();
  const [aberto, setAberto] = useState(false);
  const [suporte, setSuporte] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [interpretando, setInterpretando] = useState(false);
  const reconhecedor = useRef<Reconhecedor | null>(null);

  // detectado depois da hidratação: no servidor não há window
  useEffect(() => setSuporte(construtorDeReconhecedor() != null), []);
  useEffect(() => () => reconhecedor.current?.abort(), []);

  function ouvir() {
    const Construtor = construtorDeReconhecedor();
    if (!Construtor) return;
    const rec = new Construtor();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => setTexto(Array.from(e.results, (r) => r[0]?.transcript ?? "").join(" ").replace(/\s+/g, " ").trim());
    rec.onerror = (e) => setErro(ERRO_DE_VOZ[e.error] ?? "O reconhecimento de voz falhou. Tente de novo ou digite a frase.");
    rec.onend = () => setOuvindo(false);
    reconhecedor.current = rec;
    setErro(null);
    setTexto("");
    setOuvindo(true);
    rec.start();
  }

  function parar() {
    reconhecedor.current?.stop();
    setOuvindo(false);
  }

  function fechar() {
    reconhecedor.current?.abort();
    setOuvindo(false);
    setAberto(false);
    setTexto("");
    setErro(null);
  }

  async function preencher() {
    parar();
    if (!texto.trim()) return setErro(tipo === "atividade" ? "Fale ou digite o que você fez." : "Fale ou digite o que quer agendar.");
    setInterpretando(true);
    setErro(null);
    const r = await interpretar(tipo, texto.trim(), hoje, { veiculos, espacos });
    setInterpretando(false);
    if (r.tipo === "erro") return setErro(r.mensagem);
    fechar();
    aoInterpretar(r.campos, r.faltando);
  }

  return (
    <>
      <Button variant="vidro-claro" onClick={() => setAberto(true)}>
        <Mic aria-hidden="true" className="h-4 w-4" />
        {rotulo}
      </Button>
      {aberto && (
        <Dialogo titulo={rotulo} aoFechar={fechar}>
          <div className="grid gap-4">
            <p className="text-sm text-ink-muted">
              {tipo === "atividade" ? "Conte o que você fez" : "Diga o que quer agendar"}, por exemplo: <span className="text-ink">{EXEMPLO[tipo]}</span> O formulário abre preenchido para você conferir antes de salvar.
            </p>
            {suporte ? (
              <div className="flex items-center gap-3">
                {ouvindo ? (
                  <Button variant="vidro" onClick={parar}>
                    <Square aria-hidden="true" className="h-4 w-4" />
                    Parar
                  </Button>
                ) : (
                  <Button variant="vidro" onClick={ouvir}>
                    <Mic aria-hidden="true" className="h-4 w-4" />
                    {texto ? "Falar de novo" : "Falar"}
                  </Button>
                )}
                <span role="status" className="text-sm text-ink-muted">
                  {ouvindo ? (
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-danger motion-reduce:animate-none" />
                      Ouvindo…
                    </span>
                  ) : (
                    ""
                  )}
                </span>
              </div>
            ) : (
              <Alert tone="info">Este navegador não reconhece voz (funciona no Chrome e no Edge). Digite a frase abaixo.</Alert>
            )}
            <div>
              <Label htmlFor="voz-texto">{suporte ? "O que entendi (pode corrigir)" : "Frase do agendamento"}</Label>
              <Textarea id="voz-texto" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} className="min-h-24" />
            </div>
            {erro && <Alert tone="erro">{erro}</Alert>}
            <p className="text-xs text-ink-muted">
              A voz é transcrita pelo serviço do navegador; o texto vai ao assistente da FAPERON (Anthropic) só para preencher os campos e não é guardado.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={fechar}>
                Cancelar
              </Button>
              <Button variant="vidro" onClick={preencher} disabled={interpretando}>
                {interpretando && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
                {interpretando ? "Interpretando…" : "Preencher formulário"}
              </Button>
            </div>
          </div>
        </Dialogo>
      )}
    </>
  );
}

/** Aviso no topo do formulário preenchido por voz. */
export function AvisoVoz({ faltando }: { faltando: string[] }) {
  return (
    <Alert tone="info" className="mb-4">
      Preenchido por voz: confira os campos antes de salvar.
      {faltando.length > 0 && ` Faltou: ${faltando.join(", ")}.`}
    </Alert>
  );
}

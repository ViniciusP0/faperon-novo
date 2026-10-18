"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { areaDaPagina, ehPaginaComZetele, type PaginaComZetele, PAGINAS_SO_ORIENTACAO, type PerguntaPronta, perguntasDaPagina, type Pose, TEXTOS_DA_AREA, ZETELE } from "@/content/zetele";
import { obterEstado, perguntar, type EstadoVoz, type MensagemHistorico } from "@/lib/zetele";
import { BotaoZetele } from "./botao-zetele";
import type { Mensagem } from "./mensagens";
import { PainelZetele } from "./painel-zetele";
import { SaudacaoZetele, marcarSaudou } from "./saudacao-zetele";
import { useLeitor } from "./voz";

const CHAVE_RESPONDER_EM_VOZ = "zetele-responder-em-voz";

function lerResponderEmVoz(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_RESPONDER_EM_VOZ) === "1";
  } catch {
    return false;
  }
}

/** Assistente do site (ADR 0029) e do sistema (ADR 0032). A conversa sobrevive à navegação dentro da
 *  mesma área; ao trocar de área (site ↔ sistema) começa outra, com o outro Zétele.
 *  Fica fixo no canto inferior direito (acompanha a rolagem), com o balão de saudação à esquerda. */
export function Zetele() {
  const caminho = usePathname();
  if (!ehPaginaComZetele(caminho)) return null;
  return <ZeteleNaPagina key={areaDaPagina(caminho)} pagina={caminho} />;
}

function ZeteleNaPagina({ pagina }: { pagina: PaginaComZetele }) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [disponivel, setDisponivel] = useState(true);
  const [espera, setEspera] = useState(0);
  const [pose, setPose] = useState<Pose>("acenando");
  const [mostrarChips, setMostrarChips] = useState(true);
  const [sugeridas, setSugeridas] = useState<PerguntaPronta[]>([]);
  // voz só no Zétele do sistema (ADR 0034)
  const [voz, setVoz] = useState<EstadoVoz | null>(null);
  const [responderEmVoz, setResponderEmVoz] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState<string | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const proximoId = useRef(1);

  const area = areaDaPagina(pagina);
  const leitor = useLeitor({ pagina, onErro: setAvisoVoz });
  const falar = area === "sistema" && Boolean(voz?.falar);

  useEffect(() => {
    let vivo = true;
    void obterEstado(area === "sistema" ? "/sistema" : "/").then((e) => {
      if (!vivo) return;
      setDisponivel(e.disponivel);
      if (area === "sistema" && e.voz) setVoz(e.voz);
    });
    return () => {
      vivo = false;
    };
  }, [area]);

  useEffect(() => setResponderEmVoz(lerResponderEmVoz()), []);

  function mudarResponderEmVoz(ligado: boolean) {
    setResponderEmVoz(ligado);
    try {
      window.localStorage.setItem(CHAVE_RESPONDER_EM_VOZ, ligado ? "1" : "0");
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  }

  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [espera]);

  useEffect(() => {
    if (!aberto) return;
    if (campoRef.current && !campoRef.current.disabled) campoRef.current.focus();
    else fecharRef.current?.focus();
  }, [aberto, disponivel]);

  const adicionar = (m: Omit<Mensagem, "id">) => {
    const id = proximoId.current++;
    setMensagens((lista) => [...lista, { ...m, id }]);
    return id;
  };

  function abrir() {
    marcarSaudou();
    setAberto(true);
  }

  function fechar() {
    leitor.parar();
    setAvisoVoz(null);
    setAberto(false);
    botaoRef.current?.focus();
  }

  async function enviarPergunta(texto: string, porVoz = false) {
    const historico: MensagemHistorico[] = mensagens
      .filter((m) => !m.perguntaOriginal)
      .map((m) => ({ papel: m.autor, texto: m.texto }));
    adicionar({ autor: "visitante", texto });
    setMostrarChips(false);
    setSugeridas([]);
    setCarregando(true);
    setPose("tablet");
    const r = await perguntar(texto, historico, pagina);
    setCarregando(false);
    if (r.tipo === "ok") {
      const { resposta } = r;
      const id = adicionar({ autor: "zetele", texto: resposta.texto, fontes: resposta.fontes, falavel: true });
      // só toca sozinho quando a pergunta veio por voz ou a pessoa ligou "Responder em voz"
      if (falar && (porVoz || responderEmVoz)) void leitor.tocar(id, resposta.texto);
      const temLink = resposta.fontes.length > 0 || resposta.texto.includes("](");
      setPose(temLink || resposta.status === "recusada" ? "apontando" : "acenando");
      if (resposta.sugestoes.length) {
        setSugeridas(resposta.sugestoes.map((s, i) => ({ id: `sugestao-${i}`, texto: s, tipo: "dados" })));
        setMostrarChips(true);
      }
      return;
    }
    setPose("acenando");
    if (r.tipo === "espera") {
      setEspera(r.segundos);
      adicionar({ autor: "zetele", texto: ZETELE.espera(r.segundos) });
    } else if (r.tipo === "indisponivel") {
      // sem chave ou orçamento do dia: só perguntas prontas até recarregar; fora do ar ou ocupado: só avisa
      if (r.motivo === "sem_chave" || r.motivo === "orcamento_diario") setDisponivel(false);
      adicionar({ autor: "zetele", texto: TEXTOS_DA_AREA[area].descansando });
      setMostrarChips(true);
    } else {
      adicionar({ autor: "zetele", texto: ZETELE.falha, perguntaOriginal: texto });
    }
  }

  function escolher(p: PerguntaPronta) {
    if (p.tipo === "estatica") {
      adicionar({ autor: "visitante", texto: p.texto });
      const id = adicionar({
        autor: "zetele",
        texto: p.resposta ?? "",
        link: p.href ? { href: p.href, rotulo: p.rotuloLink ?? p.href } : undefined,
        falavel: true,
      });
      if (falar && responderEmVoz && p.resposta) void leitor.tocar(id, p.resposta);
      setPose(p.href ? "apontando" : "acenando");
      setMostrarChips(false);
      return;
    }
    void enviarPergunta(p.texto);
  }

  const daPagina = perguntasDaPagina(pagina);
  const visiveis = sugeridas.length ? sugeridas : daPagina.visiveis;
  const demais = sugeridas.length ? [] : daPagina.demais;

  return (
    <>
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-30 flex items-end gap-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="pointer-events-auto">
          <SaudacaoZetele bloqueada={aberto} onAbrir={abrir} />
        </div>
        {/* sem pointer-events aqui: só a área do corpo dentro do botão recebe clique */}
        <div>
          <BotaoZetele ref={botaoRef} aberto={aberto} pose={pose} onClick={() => (aberto ? fechar() : abrir())} />
        </div>
      </div>
      {aberto && (
        <PainelZetele
          pose={pose}
          mensagens={mensagens}
          carregando={carregando}
          disponivel={disponivel}
          area={area}
          soOrientacao={PAGINAS_SO_ORIENTACAO.includes(pagina)}
          espera={espera}
          mostrarChips={mostrarChips}
          visiveis={visiveis}
          demais={demais}
          campoRef={campoRef}
          fecharRef={fecharRef}
          onFechar={fechar}
          onEnviar={(t, porVoz) => void enviarPergunta(t, porVoz)}
          onEscolher={escolher}
          onMostrarChips={() => setMostrarChips(true)}
          onOcultarChips={() => setMostrarChips(false)}
          pagina={pagina}
          voz={area === "sistema" ? voz : null}
          ouvir={
            falar
              ? {
                  tocando: leitor.tocando,
                  preparando: leitor.preparando,
                  onOuvir: (m) => {
                    setAvisoVoz(null);
                    void leitor.tocar(m.id, m.texto);
                  },
                  onParar: leitor.parar,
                }
              : undefined
          }
          responderEmVoz={responderEmVoz}
          onResponderEmVoz={mudarResponderEmVoz}
          avisoVoz={avisoVoz}
          onAvisoVoz={setAvisoVoz}
          onPrepararAudio={leitor.preparar}
        />
      )}
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { areaDaPagina, ehPaginaComZetele, type PaginaComZetele, PAGINAS_SO_ORIENTACAO, type PerguntaPronta, perguntasDaPagina, type Pose, TEXTOS_DA_AREA, ZETELE } from "@/content/zetele";
import { obterEstado, perguntar, type MensagemHistorico } from "@/lib/zetele";
import { BotaoZetele } from "./botao-zetele";
import type { Mensagem } from "./mensagens";
import { PainelZetele } from "./painel-zetele";
import { SaudacaoZetele, marcarSaudou } from "./saudacao-zetele";

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
  const botaoRef = useRef<HTMLButtonElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const proximoId = useRef(1);

  const area = areaDaPagina(pagina);

  useEffect(() => {
    let vivo = true;
    void obterEstado(area === "sistema" ? "/sistema" : "/").then((e) => {
      if (vivo) setDisponivel(e.disponivel);
    });
    return () => {
      vivo = false;
    };
  }, [area]);

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

  const adicionar = (m: Omit<Mensagem, "id">) => setMensagens((lista) => [...lista, { ...m, id: proximoId.current++ }]);

  function abrir() {
    marcarSaudou();
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    botaoRef.current?.focus();
  }

  async function enviarPergunta(texto: string) {
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
      adicionar({ autor: "zetele", texto: resposta.texto, fontes: resposta.fontes });
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
      adicionar({
        autor: "zetele",
        texto: p.resposta ?? "",
        link: p.href ? { href: p.href, rotulo: p.rotuloLink ?? p.href } : undefined,
      });
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
          onEnviar={(t) => void enviarPergunta(t)}
          onEscolher={escolher}
          onMostrarChips={() => setMostrarChips(true)}
          onOcultarChips={() => setMostrarChips(false)}
        />
      )}
    </>
  );
}

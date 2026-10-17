import { CENTRAL } from "./central";
import { CONTATO } from "./contato";
import { INFORMATIVOS } from "./informativos";

export const PAGINAS_COM_ZETELE = ["/", "/central-de-inteligencia", "/central-de-inteligencia/observatorio", "/painel"] as const;
export type PaginaComZetele = (typeof PAGINAS_COM_ZETELE)[number];

export function ehPaginaComZetele(caminho: string | null): caminho is PaginaComZetele {
  return PAGINAS_COM_ZETELE.includes(caminho as PaginaComZetele);
}

export type Pose = "acenando" | "tablet" | "apontando";
/** Arte recortada de Gemini_Generated_Image_1wmk3o1wmk3o1wmk.jpeg (Task 11). Trocar a extensão aqui se virar WebP. */
export const POSES: Record<Pose, string> = {
  acenando: "/zetele/acenando.png",
  tablet: "/zetele/tablet.png",
  apontando: "/zetele/apontando.png",
};

export interface PerguntaPronta {
  id: string;
  texto: string;
  tipo: "estatica" | "dados";
  resposta?: string;
  href?: string;
  rotuloLink?: string;
}

const [painel, observatorio] = CENTRAL.portas;

// Só a inicial: o subtítulo termina em "Rondônia", que não pode virar minúscula.
const minusculaInicial = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export const PERGUNTAS: PerguntaPronta[] = [
  {
    id: "central",
    texto: "O que é a Central de Inteligência?",
    tipo: "estatica",
    resposta: CENTRAL.paragrafos[0],
    href: "/central-de-inteligencia",
    rotuloLink: "Abrir a Central de Inteligência",
  },
  {
    id: "painel-observatorio",
    texto: "Qual a diferença entre o Painel e o Observatório?",
    tipo: "estatica",
    resposta: `${painel!.titulo}: ${painel!.texto} ${observatorio!.titulo}: ${observatorio!.texto}`,
    href: "/central-de-inteligencia",
    rotuloLink: "Ver as duas portas na Central",
  },
  {
    id: "pdf",
    texto: "Como gero o relatório em PDF no Painel?",
    tipo: "estatica",
    resposta:
      'No Painel Agro Analítico, escolha o produto, o indicador e o período. Depois clique em "Gerar PDF", na barra do recorte, no alto da página. O relatório sai com os dados e a análise do recorte escolhido.',
    href: "/painel",
    rotuloLink: "Abrir o Painel Agro Analítico",
  },
  { id: "soja", texto: "Qual município mais produz soja em Rondônia?", tipo: "dados" },
  { id: "gado", texto: "Quantas cabeças de gado tem Rondônia hoje?", tipo: "dados" },
  { id: "cafe", texto: "Como a produção de café evoluiu nos últimos 10 anos?", tipo: "dados" },
  {
    id: "informativos",
    texto: "Onde encontro os Informativos Técnicos?",
    tipo: "estatica",
    resposta: `Na página ${INFORMATIVOS.titulo}: ${minusculaInicial(INFORMATIVOS.subtitulo)}, em PDF, nas categorias ${INFORMATIVOS.categorias.map((c) => c.titulo).join(" e ")}.`,
    href: "/informativos-tecnicos",
    rotuloLink: "Abrir os Informativos Técnicos",
  },
  {
    id: "contato",
    texto: "Como falo com a FAPERON?",
    tipo: "estatica",
    resposta: `Pelo telefone ${CONTATO.telefone.texto}, pelo WhatsApp ${CONTATO.whatsapp.texto} ou no endereço ${CONTATO.endereco.linhas.join(", ")}. A página Fale Conosco também tem um formulário.`,
    href: "/fale-conosco",
    rotuloLink: "Abrir o Fale Conosco",
  },
];

export const ORDEM_POR_PAGINA: Record<PaginaComZetele, string[]> = {
  "/": ["central", "informativos", "contato", "soja"],
  "/central-de-inteligencia": ["painel-observatorio", "soja", "cafe", "pdf"],
  "/painel": ["pdf", "soja", "gado", "cafe"],
  "/central-de-inteligencia/observatorio": ["painel-observatorio", "cafe", "gado", "soja"],
};

export function perguntasDaPagina(pagina: PaginaComZetele): { visiveis: PerguntaPronta[]; demais: PerguntaPronta[] } {
  const ids = ORDEM_POR_PAGINA[pagina];
  const porId = new Map(PERGUNTAS.map((p) => [p.id, p]));
  return {
    visiveis: ids.map((id) => porId.get(id)).filter((p): p is PerguntaPronta => Boolean(p)),
    demais: PERGUNTAS.filter((p) => !ids.includes(p.id)),
  };
}

export const ZETELE = {
  nome: "Zétele",
  rotuloBotao: "Falar com o Zétele, assistente do site",
  saudacao: "Oi! Posso ajudar?",
  rotuloFecharSaudacao: "Fechar saudação",
  boasVindas:
    "Oi, eu sou o Zétele! Tiro dúvidas sobre o site da FAPERON: onde achar cada coisa, como usar o Painel e o Observatório e os números do IBGE que o site mostra.",
  rotuloCampo: "Sua pergunta",
  placeholder: "Escreva sua pergunta sobre o site",
  enviar: "Enviar pergunta",
  fechar: "Fechar o Zétele",
  rotuloSugestoes: "Perguntas sugeridas",
  sugestoes: "Sugestões",
  maisSugestoes: "Mais sugestões",
  consultando: "Zétele está consultando os dados…",
  indisponivel: "Hoje só respondo às perguntas prontas.",
  descansando: "O Zétele está descansando. Tente de novo em instantes ou abra o Painel.",
  falha: "Não consegui responder agora.",
  tentarDeNovo: "Tentar de novo",
  espera: (segundos: number) => `Muitas perguntas de uma vez; espere ${segundos} segundos.`,
  fonte: "Fonte",
  abrirConsulta: "Ver no site",
  avisoPrivacidade: "Não digite dados pessoais. As perguntas ficam guardadas por 90 dias, sem identificação.",
  politica: "Política de Privacidade",
  tamanhoMaximo: 500,
} as const;

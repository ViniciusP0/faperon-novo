export const PRIVACIDADE = {
  titulo: "Política de Privacidade",
  atualizadoEm: "2026-10-07",
  seo: {
    titulo: "Política de Privacidade",
    descricao: "Como a FAPERON trata os dados pessoais de quem visita o site, usa o formulário de contato ou o painel.",
  },
  introducao:
    "A Federação da Agricultura e Pecuária do Estado de Rondônia (FAPERON) respeita a sua privacidade. Esta política explica quais dados pessoais este site trata, para que, e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).",
  secoes: [
    {
      id: "controlador",
      titulo: "Quem é o controlador dos dados",
      paragrafos: [
        "O controlador é a FAPERON, com sede na Rua João Goulart, 1843, Nossa Sra. das Graças, Porto Velho - RO, CEP 78915-450.",
      ],
    },
    {
      id: "dados",
      titulo: "Quais dados tratamos",
      itens: [
        "Dados do formulário de contato: nome, sobrenome, e-mail, telefone e a mensagem que você escreve. O formulário monta a mensagem e abre uma conversa no WhatsApp da FAPERON; o envio só acontece quando você o confirma no WhatsApp.",
        "Dados de acesso ao login do sistema, quando você tem cadastro: identificação de usuário e informações de sessão necessárias para mantê-lo autenticado.",
        "Preferência de tema (claro ou escuro), guardada apenas no seu navegador. Ela não é enviada à FAPERON.",
        "O painel de inteligência usa dados públicos do IBGE e não coleta dados pessoais de quem o consulta.",
      ],
    },
    {
      id: "finalidades",
      titulo: "Para que usamos os dados",
      itens: [
        "Responder à sua mensagem e atender solicitações dirigidas à FAPERON.",
        "Autenticar usuários e proteger o acesso às áreas restritas.",
        "Cumprir obrigações legais e regulatórias.",
      ],
      paragrafos: ["Não vendemos nem cedemos dados pessoais para publicidade."],
    },
    {
      id: "compartilhamento",
      titulo: "Compartilhamento e serviços de terceiros",
      paragrafos: [
        "Ao usar o botão do WhatsApp ou abrir links para redes sociais, mapas ou sites de parceiros (SENAR Rondônia, CNA, IBGE e outros), você passa a se submeter às políticas desses serviços, sobre as quais a FAPERON não tem controle.",
      ],
    },
    {
      id: "retencao",
      titulo: "Por quanto tempo guardamos",
      paragrafos: [
        "Guardamos os dados pelo tempo necessário para cumprir a finalidade para a qual foram coletados e para atender a obrigações legais. Depois disso, eles são eliminados ou anonimizados.",
      ],
    },
    {
      id: "direitos",
      titulo: "Seus direitos",
      paragrafos: ["Pela LGPD, você pode solicitar à FAPERON, a qualquer momento:"],
      itens: [
        "Confirmação de que tratamos seus dados e acesso a eles.",
        "Correção de dados incompletos, inexatos ou desatualizados.",
        "Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei.",
        "Informação sobre com quem os dados foram compartilhados.",
        "Revogação do consentimento, quando o tratamento se basear nele.",
      ],
    },
    {
      id: "seguranca",
      titulo: "Segurança",
      paragrafos: [
        "Adotamos medidas técnicas e administrativas para proteger os dados contra acessos não autorizados, perda e alteração. Nenhum sistema é totalmente imune a falhas, por isso pedimos que você nos avise se perceber qualquer uso indevido.",
      ],
    },
    {
      id: "contato",
      titulo: "Como exercer seus direitos",
      paragrafos: [
        "Envie sua solicitação pela página Fale Conosco, pelo telefone (69) 3214-8371 ou pelo WhatsApp (69) 3224-7620. Podemos pedir informações para confirmar a sua identidade antes de atender ao pedido.",
      ],
    },
    {
      id: "alteracoes",
      titulo: "Alterações nesta política",
      paragrafos: ["Podemos atualizar esta política. A data da última revisão aparece no início da página."],
    },
  ] as { id: string; titulo: string; paragrafos?: string[]; itens?: string[] }[],
};

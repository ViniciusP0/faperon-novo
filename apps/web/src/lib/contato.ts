export interface DadosContato {
  primeiroNome: string;
  ultimoNome: string;
  email: string;
  telefone: string;
  mensagem: string;
}

export function montarMensagem(d: DadosContato): string {
  const nome = d.ultimoNome.trim() ? `${d.primeiroNome.trim()} ${d.ultimoNome.trim()}` : d.primeiroNome.trim();
  return [`Nome: ${nome}`, `E-mail: ${d.email.trim()}`, `Telefone: ${d.telefone.trim()}`, "", d.mensagem.trim()].join("\n");
}

export function linkWhatsApp(numero: string, d: DadosContato): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(montarMensagem(d))}`;
}

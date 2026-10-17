/** Login do protótipo. A conferência é no navegador: trava a demonstração, NÃO é segurança.
 *  A senha não fica em texto no código, só o SHA-256 dela. O sistema definitivo terá login no servidor. */
export const EMAIL_PROTOTIPO = "user@faperon.br";
const SHA256_SENHA = "a2ca37fe6fdc490b8f7ce841e1701a169d2b1697c6b5b5c63f94abb8f9b6d6dd";

async function sha256(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function credenciaisValidas(email: string, senha: string): Promise<boolean> {
  return email.trim().toLowerCase() === EMAIL_PROTOTIPO && (await sha256(senha)) === SHA256_SENHA;
}

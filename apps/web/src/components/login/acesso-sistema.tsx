"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/field";
import { credenciaisValidas } from "@/lib/sistema/acesso";
import { gravarAcesso, gravarSessao, lerAcesso } from "@/lib/sistema/armazenamento";
import { EscolhaFuncionario } from "./escolha-funcionario";

/** Protótipo: não há envio de e-mail; a tela explica o que o sistema definitivo fará. */
function RecuperarSenha({ aoVoltar }: { aoVoltar: () => void }) {
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function pedir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = String(new FormData(evento.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErro("Informe um e-mail válido.");
    setErro(null);
    setEnviado(email);
  }

  return (
    <form aria-label="Recuperar senha" onSubmit={pedir} className="grid gap-4" noValidate>
      <p className="text-sm text-ink-muted">Informe o e-mail de acesso para receber um link de redefinição de senha.</p>
      <div>
        <Label htmlFor="recuperar-email">E-mail</Label>
        <Input id="recuperar-email" name="email" type="email" autoComplete="username" required />
      </div>
      {erro && <Alert tone="erro">{erro}</Alert>}
      {enviado && (
        <Alert tone="info">
          Protótipo: nenhum e-mail é enviado. No sistema definitivo, se {enviado} estiver cadastrado, chegará um link para criar uma nova senha.
        </Alert>
      )}
      <Button variant="vidro" type="submit" size="lg" className="w-full">
        Enviar link de recuperação
      </Button>
      <Button variant="ghost" className="w-full" onClick={aoVoltar}>
        Voltar ao login
      </Button>
    </form>
  );
}

/** /login do protótipo: e-mail e senha liberam a área; depois, a escolha do perfil fictício. */
export function AcessoSistema() {
  const [estado, setEstado] = useState<"carregando" | "login" | "recuperar" | "perfil">("carregando");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conferindo, setConferindo] = useState(false);

  useEffect(() => setEstado(lerAcesso() ? "perfil" : "login"), []);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setConferindo(true);
    const ok = await credenciaisValidas(String(dados.get("email") ?? ""), String(dados.get("senha") ?? ""));
    setConferindo(false);
    if (!ok) return setErro("E-mail ou senha incorretos.");
    gravarAcesso(true);
    setErro(null);
    setEstado("perfil");
  }

  if (estado === "carregando") return <Skeleton className="h-48 w-full" />;
  if (estado === "recuperar") return <RecuperarSenha aoVoltar={() => setEstado("login")} />;

  if (estado === "perfil") {
    return (
      <div>
        <p className="mb-3 text-sm font-medium text-ink">Escolha o perfil de exemplo:</p>
        <EscolhaFuncionario />
        <Button
          variant="ghost"
          className="mt-3 w-full"
          onClick={() => {
            gravarSessao(null);
            gravarAcesso(false);
            setEstado("login");
          }}
        >
          Sair
        </Button>
      </div>
    );
  }

  return (
    <form aria-label="Acessar o sistema" onSubmit={entrar} className="grid gap-4" noValidate>
      <div>
        <Label htmlFor="login-email">E-mail</Label>
        <Input id="login-email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="login-senha">Senha</Label>
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setEstado("recuperar");
            }}
            className="rounded text-sm font-medium text-brand-fg underline-offset-2 hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>
        <div className="relative">
          <Input id="login-senha" name="senha" type={verSenha ? "text" : "password"} autoComplete="current-password" required className="pr-11" />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Ocultar a senha" : "Mostrar a senha"}
            aria-pressed={verSenha}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-muted transition hover:text-ink"
          >
            {verSenha ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {erro && <Alert tone="erro">{erro}</Alert>}
      <Button variant="vidro" type="submit" size="lg" className="mt-1 w-full" disabled={conferindo}>
        Entrar
      </Button>
      <p className="text-center text-xs leading-relaxed text-ink-muted">
        Área restrita à equipe do sistema FAPERON/SENAR e demais instituições. Solicite seu acesso à Administração.
      </p>
    </form>
  );
}

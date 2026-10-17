"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/field";
import { credenciaisValidas } from "@/lib/sistema/acesso";
import { gravarAcesso, gravarSessao, lerAcesso } from "@/lib/sistema/armazenamento";
import { EscolhaFuncionario } from "./escolha-funcionario";

/** /login do protótipo: e-mail e senha liberam a área; depois, a escolha do perfil fictício. */
export function AcessoSistema() {
  const [estado, setEstado] = useState<"carregando" | "login" | "perfil">("carregando");
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
        <Label htmlFor="login-senha">Senha</Label>
        <Input id="login-senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {erro && <Alert tone="erro">{erro}</Alert>}
      <Button variant="vidro" type="submit" size="lg" className="mt-1 w-full" disabled={conferindo}>
        Entrar
      </Button>
    </form>
  );
}

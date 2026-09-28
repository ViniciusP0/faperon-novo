"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/field";

export function FormularioLogin() {
  const [enviado, setEnviado] = useState(false);

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!evento.currentTarget.checkValidity()) return;
    setEnviado(true);
  }

  return (
    <form aria-label="Acessar o sistema" onSubmit={aoEnviar} className="grid gap-4">
      <div>
        <Label htmlFor="login-email">E-mail</Label>
        <Input id="login-email" name="email" type="email" autoComplete="username" required aria-required="true" />
      </div>

      <div>
        <Label htmlFor="login-senha">Senha</Label>
        <Input id="login-senha" name="senha" type="password" autoComplete="current-password" required aria-required="true" />
      </div>

      <Button type="submit" size="lg" className="mt-1 w-full">
        Entrar
      </Button>

      {enviado && <Alert tone="info">O acesso ao sistema ainda não está disponível. Em breve você poderá entrar por aqui.</Alert>}
    </form>
  );
}

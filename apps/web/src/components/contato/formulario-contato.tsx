"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input, Label, Textarea } from "@/components/ui/field";
import type { CONTATO } from "@/content/contato";
import { linkWhatsApp } from "@/lib/contato";

export function FormularioContato({
  numeroWhatsApp,
  campos,
}: {
  numeroWhatsApp: string;
  campos: (typeof CONTATO)["campos"];
}) {
  const [enviado, setEnviado] = useState(false);

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    if (!form.checkValidity()) return;

    const dados = new FormData(form);
    const link = linkWhatsApp(numeroWhatsApp, {
      primeiroNome: String(dados.get("primeiroNome") ?? ""),
      ultimoNome: String(dados.get("ultimoNome") ?? ""),
      email: String(dados.get("email") ?? ""),
      telefone: String(dados.get("telefone") ?? ""),
      mensagem: String(dados.get("mensagem") ?? ""),
    });
    window.open(link, "_blank", "noopener,noreferrer");
    setEnviado(true);
  }

  return (
    <form aria-labelledby="form-contato-titulo" onSubmit={aoEnviar} className="grid gap-4">
      <Alert>Ao enviar, abriremos o WhatsApp da FAPERON com a sua mensagem pronta. Nada é armazenado neste site.</Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contato-primeiro-nome">
            {campos.primeiroNome} <span aria-hidden="true">*</span>
          </Label>
          <Input id="contato-primeiro-nome" name="primeiroNome" autoComplete="given-name" required aria-required="true" />
        </div>
        <div>
          <Label htmlFor="contato-ultimo-nome">{campos.ultimoNome}</Label>
          <Input id="contato-ultimo-nome" name="ultimoNome" autoComplete="family-name" />
        </div>
      </div>

      <div>
        <Label htmlFor="contato-email">
          {campos.email} <span aria-hidden="true">*</span>
        </Label>
        <Input id="contato-email" name="email" type="email" autoComplete="email" required aria-required="true" />
      </div>

      <div>
        <Label htmlFor="contato-telefone">
          {campos.telefone} <span aria-hidden="true">*</span>
        </Label>
        <Input id="contato-telefone" name="telefone" type="tel" autoComplete="tel" required aria-required="true" />
      </div>

      <div>
        <Label htmlFor="contato-mensagem">
          {campos.mensagem} <span aria-hidden="true">*</span>
        </Label>
        <Textarea id="contato-mensagem" name="mensagem" required aria-required="true" />
      </div>

      <p className="text-xs text-ink-muted">* campos obrigatórios</p>

      <Button type="submit" size="lg" className="justify-self-start">
        Enviar pelo WhatsApp
      </Button>

      {enviado && <Alert tone="info">Abrimos o WhatsApp em uma nova aba com a sua mensagem pronta para enviar.</Alert>}
    </form>
  );
}

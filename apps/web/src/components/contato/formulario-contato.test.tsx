import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTATO } from "@/content/contato";
import { FormularioContato } from "./formulario-contato";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FormularioContato", () => {
  it("primeiro nome, e-mail, telefone e mensagem são obrigatórios; último nome não é", () => {
    render(<FormularioContato numeroWhatsApp={CONTATO.whatsapp.numero} campos={CONTATO.campos} />);
    expect(screen.getByLabelText(/Primeiro nome/)).toBeRequired();
    expect(screen.getByLabelText(/E-mail/)).toBeRequired();
    expect(screen.getByLabelText(/Telefone para contato/)).toBeRequired();
    expect(screen.getByLabelText(/Mensagem/)).toBeRequired();
    expect(screen.getByLabelText(/Último nome/)).not.toBeRequired();
  });

  it("ao enviar com os campos preenchidos, abre o WhatsApp com a mensagem codificada", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    render(<FormularioContato numeroWhatsApp={CONTATO.whatsapp.numero} campos={CONTATO.campos} />);

    await user.type(screen.getByLabelText(/Primeiro nome/), "José");
    await user.type(screen.getByLabelText(/E-mail/), "jose@exemplo.com");
    await user.type(screen.getByLabelText(/Telefone para contato/), "69999990000");
    await user.type(screen.getByLabelText(/Mensagem/), "Olá & tudo?");
    await user.click(screen.getByRole("button", { name: "Enviar pelo WhatsApp" }));

    expect(open).toHaveBeenCalledTimes(1);
    const url = open.mock.calls[0]?.[0] as string;
    expect(url).toContain("wa.me/556932247620");
    expect(url).toContain(encodeURIComponent("Olá & tudo?"));
  });

  it("não abre o WhatsApp se os campos obrigatórios estiverem vazios", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    render(<FormularioContato numeroWhatsApp={CONTATO.whatsapp.numero} campos={CONTATO.campos} />);

    await user.click(screen.getByRole("button", { name: "Enviar pelo WhatsApp" }));

    expect(open).not.toHaveBeenCalled();
  });
});

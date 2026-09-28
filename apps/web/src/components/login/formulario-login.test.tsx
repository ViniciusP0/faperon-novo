import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FormularioLogin } from "./formulario-login";

describe("FormularioLogin", () => {
  it("pede e-mail e senha e avisa que o acesso ainda não está disponível", async () => {
    const user = userEvent.setup();
    render(<FormularioLogin />);

    await user.type(screen.getByLabelText("E-mail"), "pessoa@faperon.com.br");
    await user.type(screen.getByLabelText("Senha"), "senha-qualquer");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("status")).toHaveTextContent("ainda não está disponível");
  });

  it("não avisa nada se os campos obrigatórios estiverem vazios", async () => {
    const user = userEvent.setup();
    render(<FormularioLogin />);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

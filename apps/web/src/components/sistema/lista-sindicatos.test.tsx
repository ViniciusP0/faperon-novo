import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SINDICATOS } from "@/content/sindicatos";
import { ListaSindicatos } from "./lista-sindicatos";

describe("ListaSindicatos", () => {
  it("lista todos os sindicatos e filtra por município sem diferenciar acento", async () => {
    const user = userEvent.setup();
    render(<ListaSindicatos sindicatos={SINDICATOS} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(SINDICATOS.length);

    await user.type(screen.getByLabelText(/Buscar por município/), "ji-parana");
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Ji-Paraná"]);
    expect(screen.getByRole("status")).toHaveTextContent(`1 de ${SINDICATOS.length} sindicatos`);
  });

  it("avisa quando nada é encontrado", async () => {
    const user = userEvent.setup();
    render(<ListaSindicatos sindicatos={SINDICATOS} />);
    await user.type(screen.getByLabelText(/Buscar por município/), "xyz");
    expect(screen.getByText(/Nenhum sindicato encontrado/)).toBeInTheDocument();
  });

  it("liga telefone e e-mail por tel: e mailto:", () => {
    render(<ListaSindicatos sindicatos={SINDICATOS.slice(0, 1)} />);
    expect(screen.getByRole("link", { name: /\(69\) 98431-1001/ })).toHaveAttribute("href", "tel:+5569984311001");
    expect(screen.getByRole("link", { name: /sindicatoruralafo@gmail.com/ })).toHaveAttribute("href", "mailto:sindicatoruralafo@gmail.com");
  });
});

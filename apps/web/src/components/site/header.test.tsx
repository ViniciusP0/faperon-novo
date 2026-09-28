import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./header";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("SiteHeader", () => {
  it("mostra o botão 'Acessar o sistema' levando para /login", () => {
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: /Acessar o sistema/ });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("o menu móvel também tem o botão 'Acessar o sistema'", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const links = screen.getAllByRole("link", { name: /Acessar o sistema/ });
    expect(links.length).toBe(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/login");
  });
});

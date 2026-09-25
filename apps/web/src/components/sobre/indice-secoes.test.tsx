import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IndiceSecoes } from "./indice-secoes";

const secoes = [
  { id: "a", titulo: "Primeira" },
  { id: "b", titulo: "Segunda" },
];

describe("IndiceSecoes", () => {
  it("lista as seções como âncoras e marca a primeira como atual", () => {
    render(<IndiceSecoes secoes={secoes} />);
    expect(screen.getByRole("navigation", { name: "Nesta página" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Segunda" })).toHaveAttribute("href", "#b");
    expect(screen.getByRole("link", { name: "Primeira" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Segunda" })).not.toHaveAttribute("aria-current");
  });
});

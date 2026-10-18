import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ALBUNS, filtrarAlbuns } from "@/content/galeria";
import { GaleriaAlbuns } from "./galeria-albuns";

describe("GaleriaAlbuns", () => {
  it("lista todos os álbuns e filtra por FAPERON e SENAR", async () => {
    const user = userEvent.setup();
    render(<GaleriaAlbuns albuns={ALBUNS} />);
    expect(screen.getAllByRole("button", { name: /^Abrir álbum/ })).toHaveLength(ALBUNS.length);

    await user.click(screen.getByRole("button", { name: /^SENAR \(/ }));
    expect(screen.getAllByRole("button", { name: /^Abrir álbum/ })).toHaveLength(filtrarAlbuns(ALBUNS, "senar").length);
    expect(screen.getByRole("button", { name: /^SENAR \(/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /^Todos \(/ }));
    expect(screen.getAllByRole("button", { name: /^Abrir álbum/ })).toHaveLength(ALBUNS.length);
  });
});

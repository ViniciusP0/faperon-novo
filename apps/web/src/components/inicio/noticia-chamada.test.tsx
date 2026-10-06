import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Noticia } from "@/content/noticias";
import { NoticiaChamada } from "./noticia-chamada";

const noticia: Noticia = {
  slug: "n",
  titulo: "FAPERON participa de evento",
  resumo: "r",
  data: "2026-09-17",
  imagem: null,
  url_original: "https://www.faperon.com.br/post/n",
  categorias: ["Faperon", "Geral"],
};

describe("NoticiaChamada", () => {
  it("abre a notícia original em nova aba e avisa leitores de tela", () => {
    render(<NoticiaChamada noticia={noticia} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://www.faperon.com.br/post/n");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAccessibleName(/abre no site atual em nova aba/);
  });

  it("por padrão (Início) não mostra as categorias", () => {
    render(<NoticiaChamada noticia={noticia} />);
    expect(screen.queryByText("Faperon")).toBeNull();
  });

  it("na página de notícias mostra as categorias do cartão", () => {
    render(<NoticiaChamada noticia={noticia} mostrarCategorias />);
    expect(screen.getByText("Faperon")).toBeInTheDocument();
    expect(screen.getByText("Geral")).toBeInTheDocument();
  });

  it("notícia sem categoria não mostra etiquetas mesmo com mostrarCategorias", () => {
    const { container } = render(<NoticiaChamada noticia={{ ...noticia, categorias: [] }} mostrarCategorias />);
    expect(container.querySelector("[data-testid='categorias']")).toBeNull();
  });
});

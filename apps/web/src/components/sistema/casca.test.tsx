import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EscolhaFuncionario } from "@/components/login/escolha-funcionario";
import { gravarAcesso, gravarSessao, lerSessao } from "@/lib/sistema/armazenamento";
import { SistemaProvider } from "@/lib/sistema/estado";
import { BarraSistema } from "./barra-sistema";
import { ExigeLogin } from "./exige-login";
import { InicioSistema } from "./inicio-sistema";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/sistema" }));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  gravarAcesso(true);
  push.mockClear();
});

function Sistema({ children }: { children: React.ReactNode }) {
  return (
    <SistemaProvider>
      <BarraSistema />
      <ExigeLogin>{children}</ExigeLogin>
    </SistemaProvider>
  );
}

describe("entrada no protótipo", () => {
  it("lista os 5 funcionários fictícios e entra como o escolhido", async () => {
    const user = userEvent.setup();
    render(<EscolhaFuncionario />);
    expect(screen.getAllByRole("button", { name: /^Entrar como/ })).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: "Entrar como Ana Ribeiro" }));
    expect(lerSessao()).toBe("ana");
    expect(push).toHaveBeenCalledWith("/sistema");
  });

  it("sem login, o sistema pede para fazer login", () => {
    gravarAcesso(false);
    render(<Sistema><p>conteúdo</p></Sistema>);
    expect(screen.getByRole("heading", { name: "Faça login para entrar no sistema" })).toBeInTheDocument();
    expect(screen.queryByText("conteúdo")).toBeNull();
  });

  it("sem sessão, o sistema pede para escolher um funcionário", () => {
    render(<Sistema><p>conteúdo</p></Sistema>);
    expect(screen.getByRole("heading", { name: "Escolha um funcionário para entrar" })).toBeInTheDocument();
    expect(screen.queryByText("conteúdo")).toBeNull();
    expect(screen.getByRole("note")).toHaveTextContent("Protótipo: dados fictícios");
  });

  it("logado, mostra o nome, os atalhos e troca de funcionário", async () => {
    gravarSessao("marcos");
    const user = userEvent.setup();
    render(<Sistema><InicioSistema /></Sistema>);
    expect(screen.getByRole("heading", { name: "Olá, Marcos" })).toBeInTheDocument();
    expect(screen.getByText("Marcos Oliveira")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Agenda.*próximos 7 dias/ })).toHaveAttribute("href", "/sistema/agenda");
    expect(screen.getByText(/pedido\(s\) na fila para avaliar/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trocar de funcionário" }));
    expect(lerSessao()).toBeNull();
    expect(push).toHaveBeenCalledWith("/login");
  });
});

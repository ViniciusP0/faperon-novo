"""Testes do listener do webhook: stdlib apenas, servidor local em porta livre, sem rede externa.

Rodar: python -m unittest discover -s infra -p "test_*.py"
"""
import hashlib
import hmac
import http.client
import os
import socket
import sys
import threading
import time
import unittest

os.environ["GITHUB_WEBHOOK_SECRET"] = "segredo-de-teste"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webhook_listener as wl  # noqa: E402


def assinar(corpo: bytes) -> str:
    return "sha256=" + hmac.new(b"segredo-de-teste", corpo, hashlib.sha256).hexdigest()


class ListenerTest(unittest.TestCase):
    def iniciar(self, max_conexoes=None, timeout=None):
        if timeout is not None:
            antigo = wl.Handler.timeout
            wl.Handler.timeout = timeout
            self.addCleanup(setattr, wl.Handler, "timeout", antigo)
        argumentos = {} if max_conexoes is None else {"max_conexoes": max_conexoes}
        servidor = wl.ServidorLimitado(("127.0.0.1", 0), wl.Handler, **argumentos)
        threading.Thread(target=servidor.serve_forever, daemon=True).start()
        self.addCleanup(servidor.server_close)
        self.addCleanup(servidor.shutdown)
        return servidor.server_address[1]

    def post(self, porta, corpo=b"{}", evento="ping", assinatura=None, content_length=None):
        conexao = http.client.HTTPConnection("127.0.0.1", porta, timeout=5)
        cabecalhos = {
            "X-Hub-Signature-256": assinar(corpo) if assinatura is None else assinatura,
            "X-GitHub-Event": evento,
        }
        if content_length is not None:
            cabecalhos["Content-Length"] = str(content_length)
        conexao.request("POST", "/webhook", body=corpo, headers=cabecalhos)
        return conexao.getresponse().status

    def test_limites_configurados(self):
        self.assertEqual(wl.SOCKET_TIMEOUT, 10)
        self.assertEqual(wl.Handler.timeout, 10)
        self.assertEqual(wl.MAX_CONEXOES, 8)
        self.assertEqual(wl.MAX_BODY_SIZE, 1024 * 1024)

    def test_ping_assinado_responde_200(self):
        self.assertEqual(self.post(self.iniciar()), 200)

    def test_assinatura_invalida_responde_401(self):
        self.assertEqual(self.post(self.iniciar(), assinatura="sha256=00"), 401)

    def test_corpo_acima_de_1_mb_responde_413_sem_ler(self):
        porta = self.iniciar()
        conexao = socket.create_connection(("127.0.0.1", porta), timeout=5)
        conexao.sendall(
            b"POST /webhook HTTP/1.1\r\nHost: x\r\nContent-Length: %d\r\n\r\n" % (wl.MAX_BODY_SIZE + 1)
        )
        self.assertTrue(conexao.recv(64).startswith(b"HTTP/1.0 413"))
        conexao.close()

    def test_corpo_de_exatamente_1_mb_passa_do_limite_de_tamanho(self):
        corpo = b" " * wl.MAX_BODY_SIZE
        self.assertEqual(self.post(self.iniciar(), corpo=corpo), 200)

    def test_cliente_lento_e_cortado_pelo_timeout_de_socket(self):
        porta = self.iniciar(timeout=0.5)
        conexao = socket.create_connection(("127.0.0.1", porta), timeout=5)
        # promete 100 bytes, manda 1 e fica parado
        conexao.sendall(b"POST /webhook HTTP/1.1\r\nHost: x\r\nContent-Length: 100\r\n\r\nx")
        inicio = time.monotonic()
        resposta = conexao.recv(64)
        self.assertLess(time.monotonic() - inicio, 3)
        self.assertTrue(resposta.startswith(b"HTTP/1.0 408") or resposta == b"")
        conexao.close()

    def test_acima_do_limite_de_conexoes_simultaneas_responde_503(self):
        porta = self.iniciar(max_conexoes=2, timeout=2)
        ocupadas = [socket.create_connection(("127.0.0.1", porta), timeout=5) for _ in range(2)]
        time.sleep(0.3)  # deixa o servidor aceitar as duas e ocupar as vagas
        extra = socket.create_connection(("127.0.0.1", porta), timeout=5)
        self.assertTrue(extra.recv(64).startswith(b"HTTP/1.1 503"))
        extra.close()
        for c in ocupadas:
            c.close()

    def test_vagas_voltam_quando_a_conexao_termina(self):
        porta = self.iniciar(max_conexoes=1, timeout=2)
        self.assertEqual(self.post(porta), 200)
        self.assertEqual(self.post(porta), 200)


if __name__ == "__main__":
    unittest.main()

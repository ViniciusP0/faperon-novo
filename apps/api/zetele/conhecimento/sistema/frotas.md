# Zétele do sistema: frotas

## [/sistema/frotas] Gestão de frotas
Abas: Veículos, Reservas, Abastecimento e manutenção, e Custos.
- Veículos: placa, modelo, ano, km, situação (disponível, reservado, em manutenção) e próxima revisão. Só o gestor da frota cadastra e edita veículos; a placa aceita o formato antigo (AAA-9999) e o Mercosul (AAA9A99).
- Reservas: qualquer funcionário reserva informando veículo, saída, retorno, destino e motivo. O sistema recusa choque de horário com outra reserva e veículo em manutenção. Na reserva, "Registrar saída" e "Registrar retorno" guardam o km; o km de retorno não pode ser menor que o de saída.
- Abastecimento: qualquer funcionário registra data, veículo, km, litros e valor. Manutenção: só o gestor registra tipo (revisão, pneus, freios, outros), data, km, valor e se já foi concluída; manutenção em aberto deixa o veículo indisponível.
- Revisão: a cada 10.000 km ou 12 meses desde a última, o que vencer primeiro; o sistema avisa quando está próxima ou vencida.
- Custos: combustível e manutenção dos últimos 6 meses, km rodados em viagens concluídas e custo por km, da frota toda ou por veículo.

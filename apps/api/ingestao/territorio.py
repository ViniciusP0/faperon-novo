"""Malha municipal e microrregiões de RO (API de malhas v3 e de localidades v1 do IBGE)."""

from typing import Any

URL_MALHA = (
    "https://servicodados.ibge.gov.br/api/v3/malhas/estados/11"
    "?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio"
)
URL_LOCALIDADES = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/11/municipios"


class ErroTerritorio(Exception):
    pass


def normalizar_malha(geojson: dict[str, Any], codigos_esperados: set[str]) -> dict[str, Any]:
    feicoes = []
    for f in geojson["features"]:
        codigo = str(f["properties"]["codarea"])
        feicoes.append({"type": "Feature", "properties": {"codigo_ibge": codigo}, "geometry": f["geometry"]})
    obtidos = {f["properties"]["codigo_ibge"] for f in feicoes}
    if obtidos != codigos_esperados:
        faltam = sorted(codigos_esperados - obtidos)
        sobram = sorted(obtidos - codigos_esperados)
        raise ErroTerritorio(f"Malha diferente do cadastro: faltam {faltam}, sobram {sobram}")
    feicoes.sort(key=lambda f: f["properties"]["codigo_ibge"])
    return {"type": "FeatureCollection", "features": feicoes}


def microrregioes(localidades: list[dict[str, Any]]) -> dict[str, str]:
    return {str(m["id"]): m["microrregiao"]["nome"] for m in localidades}

from django.urls import path

from indicadores.api import views

urlpatterns = [
    path("produtos", views.ProdutosView.as_view()),
    path("indicadores", views.IndicadoresView.as_view()),
    path("municipios", views.MunicipiosView.as_view()),
    path("meta", views.MetaView.as_view()),
    path("ranking", views.RankingView.as_view()),
    path("serie", views.SerieView.as_view()),
    path("comparacao", views.ComparacaoView.as_view()),
    path("destaques", views.DestaquesView.as_view()),
    path("saude", views.SaudeView.as_view()),
]

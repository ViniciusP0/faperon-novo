from django.urls import path

from zetele import views

urlpatterns = [
    # Zétele do site público
    path("zetele/estado", views.EstadoView.as_view()),
    path("zetele/perguntar", views.PerguntarView.as_view()),
    # Zétele da área do sistema: base, tabela e limites próprios (ADR 0032)
    path("sistema/zetele/estado", views.EstadoSistemaView.as_view()),
    path("sistema/zetele/perguntar", views.PerguntarSistemaView.as_view()),
    path("sistema/interpretar", views.InterpretarView.as_view()),
]

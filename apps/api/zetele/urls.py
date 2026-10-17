from django.urls import path

from zetele import views

urlpatterns = [
    path("zetele/estado", views.EstadoView.as_view()),
    path("zetele/perguntar", views.PerguntarView.as_view()),
    path("sistema/interpretar", views.InterpretarView.as_view()),
]

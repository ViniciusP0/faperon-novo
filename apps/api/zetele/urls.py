from django.urls import path

from zetele import views

urlpatterns = [
    path("zetele/estado", views.EstadoView.as_view()),
    path("zetele/perguntar", views.PerguntarView.as_view()),
]

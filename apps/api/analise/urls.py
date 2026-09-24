from django.urls import path

from analise import views

urlpatterns = [
    path("analise", views.AnaliseView.as_view()),
    path("relatorio.pdf", views.RelatorioPdfView.as_view()),
]

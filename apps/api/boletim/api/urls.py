from django.urls import path

from boletim.api import views

urlpatterns = [
    path("boletim/dias", views.DiasView.as_view()),
    path("boletim/dia/<str:dia>", views.DiaView.as_view()),
]

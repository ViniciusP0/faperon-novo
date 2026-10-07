from django.urls import path

from observatorio.api import views

urlpatterns = [
    path("observatorio/panorama", views.PanoramaView.as_view()),
    path("observatorio/crescimento", views.CrescimentoView.as_view()),
    path("observatorio/territorio", views.TerritorioView.as_view()),
    path("observatorio/pecuaria", views.PecuariaView.as_view()),
]

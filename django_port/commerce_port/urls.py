from django.urls import path

from . import views


urlpatterns = [
    path("premium", views.premium, name="premium"),
    path("package", views.package, name="package"),
    path("payment", views.payment, name="payment"),
    path("shop", views.shop, name="shop"),
    path("buy-item", views.buy_item, name="buy_item"),
]

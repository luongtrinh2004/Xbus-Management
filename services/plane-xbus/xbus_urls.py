from django.urls import path
from plane.urls import urlpatterns as plane_urlpatterns
from plane.xbus_bridge import bootstrap, sign_in

urlpatterns = [
    path("api/xbus/bootstrap/", bootstrap),
    path("auth/xbus/", sign_in),
    *plane_urlpatterns,
]

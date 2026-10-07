from django.urls import path
from plane.urls import urlpatterns as plane_urlpatterns
from plane.xbus_bridge import bootstrap, sign_in
from plane.xbus_review.views import ReviewView, WorkflowView

urlpatterns = [
    path("api/workspaces/<slug:slug>/projects/<uuid:project_id>/xbus-workflow/", WorkflowView.as_view()),
    path("api/workspaces/<slug:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/xbus-review/", ReviewView.as_view()),
    path("api/xbus/bootstrap/", bootstrap),
    path("auth/xbus/", sign_in),
    *plane_urlpatterns,
]

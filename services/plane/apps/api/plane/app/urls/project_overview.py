from django.urls import path
from plane.app.views.project_overview import ProjectOverview, ProjectStatusUpdates

urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/overview/", ProjectOverview.as_view(), name="project-overview"
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/status-updates/",
        ProjectStatusUpdates.as_view(),
        name="project-status-updates",
    ),
]

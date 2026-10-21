from django.urls import path
from plane.app.views.workload import WorkspaceWorkload, WorkspaceWorkloadCapacity

urlpatterns = [
    path("workspaces/<str:slug>/workload/", WorkspaceWorkload.as_view(), name="workspace-workload"),
    path(
        "workspaces/<str:slug>/workload/capacities/<uuid:user_id>/",
        WorkspaceWorkloadCapacity.as_view(),
        name="workspace-workload-capacity",
    ),
]

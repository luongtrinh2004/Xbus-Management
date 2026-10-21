from django.urls import path
from plane.app.views.my_task_planning import MyTaskPlanningDetail, MyTaskPlanningList

urlpatterns = [
    path("workspaces/<str:slug>/my-tasks/planning/", MyTaskPlanningList.as_view(), name="my-task-planning"),
    path("workspaces/<str:slug>/my-tasks/planning/<uuid:issue_id>/", MyTaskPlanningDetail.as_view(), name="my-task-planning-detail"),
]

from django.urls import path
from plane.app.views.issue_ai import IssueAssistance, ApplyAISubtasks

urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/ai-assistance/apply-subtasks/",
        ApplyAISubtasks.as_view(),
        name="issue-ai-apply-subtasks",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/ai-assistance/",
        IssueAssistance.as_view(),
        name="issue-ai-assistance",
    ),
]

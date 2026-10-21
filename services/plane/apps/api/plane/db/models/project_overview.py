from django.conf import settings
from django.db import models

from .project import ProjectBaseModel


PROJECT_HEALTH_STATUSES = ("on_track", "at_risk", "off_track", "on_hold", "complete")


class ProjectOverviewDetails(ProjectBaseModel):
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    links = models.JSONField(default=list, blank=True)
    revision = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "project_overview_details"
        constraints = [
            models.UniqueConstraint(fields=["project"], name="unique_project_overview_details"),
            models.CheckConstraint(
                condition=models.Q(start_date__isnull=True)
                | models.Q(target_date__isnull=True)
                | models.Q(start_date__lte=models.F("target_date")),
                name="valid_project_overview_dates",
            ),
        ]


class ProjectStatusUpdate(ProjectBaseModel):
    status = models.CharField(max_length=16, choices=[(value, value) for value in PROJECT_HEALTH_STATUSES])
    title = models.CharField(max_length=255)
    summary = models.TextField()
    client_request_id = models.UUIDField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    author_name = models.CharField(max_length=255)

    class Meta:
        db_table = "project_status_updates"
        ordering = ("-created_at", "-id")
        constraints = [
            models.UniqueConstraint(fields=["project", "client_request_id"], name="unique_project_status_request"),
            models.CheckConstraint(
                condition=models.Q(status__in=PROJECT_HEALTH_STATUSES), name="valid_project_health_status"
            ),
        ]


class IssueAIApplication(ProjectBaseModel):
    request_id = models.UUIDField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    payload = models.JSONField()
    result = models.JSONField()

    class Meta:
        db_table = "issue_ai_applications"
        constraints = [models.UniqueConstraint(fields=["project", "request_id"], name="unique_issue_ai_application")]

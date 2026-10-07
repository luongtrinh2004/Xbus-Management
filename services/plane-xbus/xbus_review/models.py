from django.conf import settings
from django.db import models


class Workflow(models.Model):
    project = models.OneToOneField("db.Project", on_delete=models.CASCADE, primary_key=True)
    config = models.JSONField(default=dict)

    class Meta:
        db_table = "xbus_project_workflows"


class Review(models.Model):
    issue = models.OneToOneField("db.Issue", on_delete=models.CASCADE, primary_key=True)
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    status = models.CharField(max_length=16, default="draft")

    class Meta:
        db_table = "xbus_issue_reviews"


class ReviewEvent(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=16)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

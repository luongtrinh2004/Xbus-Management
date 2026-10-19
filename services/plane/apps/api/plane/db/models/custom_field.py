# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import models
from .project import ProjectBaseModel


class IssueCustomField(ProjectBaseModel):
    FIELD_TYPES = [(kind, kind) for kind in ("text", "number", "date", "single_select", "multi_select", "people")]
    name = models.CharField(max_length=100)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
    options = models.JSONField(default=list, blank=True)
    number_format = models.CharField(
        max_length=12,
        default="number",
        choices=[("number", "Number"), ("percent", "Percent"), ("currency", "Currency")],
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "issue_custom_fields"
        ordering = ["sort_order", "created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "name"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_project_custom_field_name",
            )
        ]


class IssueCustomFieldValue(ProjectBaseModel):
    issue = models.ForeignKey("db.Issue", on_delete=models.CASCADE, related_name="custom_field_values")
    field = models.ForeignKey(IssueCustomField, on_delete=models.CASCADE, related_name="values")
    value = models.JSONField()

    class Meta:
        db_table = "issue_custom_field_values"
        constraints = [
            models.UniqueConstraint(
                fields=["issue", "field"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_issue_custom_field_value",
            )
        ]

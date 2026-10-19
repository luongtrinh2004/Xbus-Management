# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0122_alter_draftissue_assignees_alter_issue_assignees_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="IssueDueReminder",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("target_date", models.DateField()),
                ("kind", models.CharField(choices=[("due_soon", "Due soon"), ("overdue", "Overdue")], max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("issue", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="due_reminders", to="db.issue")),
                ("receiver", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="due_reminders", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "issue_due_reminders",
                "constraints": [models.UniqueConstraint(fields=("issue", "receiver", "target_date", "kind"), name="unique_issue_due_reminder")],
            },
        ),
    ]

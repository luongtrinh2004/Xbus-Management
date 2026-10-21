from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("db", "0125_issue_user_plan")]

    operations = [
        migrations.AddField(
            model_name="draftissue", name="custom_field_values", field=models.JSONField(blank=True, default=dict)
        )
    ]

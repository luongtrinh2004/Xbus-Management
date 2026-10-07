from importlib import import_module
from django.db import migrations

original = import_module("plane.xbus_review.migrations.0002_workflow").SQL.split("CREATE TRIGGER")[0]
original = original.replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION", 1)
updated = original.replace("(roles ? 'member' AND is_member)", "(roles ? 'member' AND is_member) OR (roles ? ('user:' || actor::text) AND is_member)")


class Migration(migrations.Migration):
    dependencies = [("xbus_review", "0002_workflow")]
    operations = [migrations.RunSQL(updated, original)]

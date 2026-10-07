from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


GUARD = """
CREATE FUNCTION xbus_guard_issue_review() RETURNS trigger AS $$
DECLARE review_status text;
BEGIN
    SELECT status INTO review_status FROM xbus_issue_reviews WHERE issue_id = NEW.id;
    IF review_status IS NULL THEN RETURN NEW; END IF;
    IF NEW.name IS DISTINCT FROM OLD.name OR NEW.description_html IS DISTINCT FROM OLD.description_html
       OR NEW.description_binary IS DISTINCT FROM OLD.description_binary THEN
        UPDATE xbus_issue_reviews SET status = 'draft' WHERE issue_id = NEW.id;
        review_status := 'draft';
    END IF;
    IF EXISTS (SELECT 1 FROM states WHERE id = NEW.state_id AND "group" = 'completed') THEN
        IF review_status <> 'approved' OR
           (NEW.state_id IS DISTINCT FROM OLD.state_id AND
            current_setting('xbus.review_decision', true) IS DISTINCT FROM NEW.id::text) THEN
            RAISE EXCEPTION 'XBUS_REVIEW_REQUIRED' USING ERRCODE = '23514';
        END IF;
    ELSIF EXISTS (SELECT 1 FROM states WHERE id = OLD.state_id AND "group" = 'completed') THEN
        UPDATE xbus_issue_reviews SET status = 'draft' WHERE issue_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER xbus_issue_review_guard BEFORE UPDATE ON issues
FOR EACH ROW EXECUTE FUNCTION xbus_guard_issue_review();
"""


class Migration(migrations.Migration):
    dependencies = [("db", "0122_alter_draftissue_assignees_alter_issue_assignees_and_more"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="Review", fields=[
            ("issue", models.OneToOneField(primary_key=True, serialize=False, on_delete=django.db.models.deletion.CASCADE, to="db.issue")),
            ("reviewer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ("status", models.CharField(default="draft", max_length=16)),
        ], options={"db_table": "xbus_issue_reviews"}),
        migrations.CreateModel(name="ReviewEvent", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("action", models.CharField(max_length=16)), ("note", models.TextField()),
            ("created_at", models.DateTimeField(auto_now_add=True)),
            ("actor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ("review", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="xbus_review.review")),
        ], options={"ordering": ["created_at", "id"]}),
        migrations.RunSQL(GUARD, "DROP TRIGGER xbus_issue_review_guard ON issues; DROP FUNCTION xbus_guard_issue_review();"),
    ]

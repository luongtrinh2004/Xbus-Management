from django.db import migrations, models
import django.db.models.deletion

SQL = """
CREATE FUNCTION xbus_guard_workflow() RETURNS trigger AS $$
DECLARE policy jsonb; roles jsonb; actor uuid; is_admin boolean; is_member boolean;
BEGIN
    SELECT config INTO policy FROM xbus_project_workflows WHERE project_id = NEW.project_id;
    IF policy IS NULL OR NOT (policy->>'enabled')::boolean THEN RETURN NEW; END IF;
    IF TG_OP = 'INSERT' THEN
        IF NOT (policy->'allowed_new' ? NEW.state_id::text) OR
           ((policy->>'require_review')::boolean AND EXISTS(SELECT 1 FROM states WHERE id = NEW.state_id AND "group" = 'completed')) THEN
            RAISE EXCEPTION 'XBUS_WORKFLOW_DENIED' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;
    IF NEW.state_id IS NOT DISTINCT FROM OLD.state_id AND NEW.project_id = OLD.project_id THEN RETURN NEW; END IF;
    IF NEW.project_id <> OLD.project_id THEN
        RAISE EXCEPTION 'XBUS_WORKFLOW_DENIED' USING ERRCODE = '23514';
    END IF;
    roles := policy->'rules'->(OLD.state_id::text || ':' || NEW.state_id::text);
    actor := NULLIF(current_setting('xbus.workflow_actor', true), '')::uuid;
    SELECT EXISTS(SELECT 1 FROM workspace_members WHERE workspace_id = NEW.workspace_id AND member_id = actor AND is_active AND deleted_at IS NULL AND role = 20)
        OR EXISTS(SELECT 1 FROM project_members WHERE project_id = NEW.project_id AND member_id = actor AND is_active AND deleted_at IS NULL AND role = 20) INTO is_admin;
    SELECT EXISTS(SELECT 1 FROM project_members WHERE project_id = NEW.project_id AND member_id = actor AND is_active AND deleted_at IS NULL AND role >= 15) INTO is_member;
    IF NOT EXISTS(SELECT 1 FROM workspace_members wm JOIN users u ON u.id = wm.member_id WHERE wm.workspace_id = NEW.workspace_id AND wm.member_id = actor AND wm.is_active AND wm.deleted_at IS NULL AND u.is_active) THEN
        RAISE EXCEPTION 'XBUS_WORKFLOW_DENIED' USING ERRCODE = '23514';
    END IF;
    IF NOT COALESCE((roles ? 'admin' AND is_admin) OR (roles ? 'member' AND is_member)
        OR (roles ? 'assignee' AND is_member AND EXISTS(SELECT 1 FROM issue_assignees WHERE issue_id = NEW.id AND assignee_id = actor AND deleted_at IS NULL))
        OR (roles ? 'reviewer' AND is_member AND current_setting('xbus.review_decision', true) = NEW.id::text
            AND EXISTS(SELECT 1 FROM xbus_issue_reviews WHERE issue_id = NEW.id AND reviewer_id = actor)), false) THEN
        RAISE EXCEPTION 'XBUS_WORKFLOW_DENIED' USING ERRCODE = '23514';
    END IF;
    IF (policy->>'require_review')::boolean AND EXISTS(SELECT 1 FROM states WHERE id = NEW.state_id AND "group" = 'completed')
       AND NOT EXISTS(SELECT 1 FROM xbus_issue_reviews WHERE issue_id = NEW.id AND status = 'approved') THEN
        RAISE EXCEPTION 'XBUS_REVIEW_REQUIRED' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER xbus_workflow_guard BEFORE INSERT OR UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION xbus_guard_workflow();
"""


class Migration(migrations.Migration):
    dependencies = [("xbus_review", "0001_initial")]
    operations = [migrations.CreateModel(name="Workflow", fields=[
        ("project", models.OneToOneField(primary_key=True, serialize=False, on_delete=django.db.models.deletion.CASCADE, to="db.project")),
        ("config", models.JSONField(default=dict)),
    ], options={"db_table": "xbus_project_workflows"}),
    migrations.RunSQL(SQL, "DROP TRIGGER xbus_workflow_guard ON issues; DROP FUNCTION xbus_guard_workflow();")]

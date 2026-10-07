from django.db import IntegrityError, connection, transaction
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class ReviewGuardMiddleware(MiddlewareMixin):
    async_capable = False

    def __call__(self, request):
        if request.method in ("POST", "PATCH", "PUT", "DELETE"):
            with transaction.atomic():
                actor = str(request.user.pk) if request.user.is_authenticated else ""
                with connection.cursor() as cursor:
                    cursor.execute("SELECT set_config('xbus.workflow_actor', %s, true)", [actor])
                return super().__call__(request)
        return super().__call__(request)

    def process_exception(self, request, exception):
        if isinstance(exception, IntegrityError) and "XBUS_WORKFLOW_DENIED" in str(exception):
            return JsonResponse({"error": "Workflow không cho phép tạo hoặc chuyển công việc sang trạng thái này với quyền hiện tại."}, status=409)
        if isinstance(exception, IntegrityError) and "XBUS_REVIEW_REQUIRED" in str(exception):
            return JsonResponse({"error": "Công việc phải được duyệt qua mục Nghiệm thu trước khi hoàn thành."}, status=409)
        return None

// Built-in project template catalog for the Work module.
// Kept dependency-free so both the API routes and the client UI can import it.

export const TEMPLATE_CATEGORIES = [
  { id: "all", label: "Tất cả", icon: "tabler-layout-grid" },
  { id: "agile", label: "Agile & Kanban", icon: "tabler-arrows-exchange" },
  { id: "engineering", label: "Kỹ thuật", icon: "tabler-code" },
  { id: "product", label: "Sản phẩm", icon: "tabler-bulb" },
  { id: "operations", label: "Vận hành", icon: "tabler-settings-automation" },
  { id: "xbus", label: "XBus", icon: "tabler-bus" },
];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];

const section = (name, status) => ({ name, status });
const task = (title, taskSection, priority, description = "", dueOffsetDays = null) => ({
  title,
  section: taskSection,
  priority,
  description,
  dueOffsetDays,
});

// Legacy ids (basic/campaign/sprint) stay first-class so existing projects
// keep resolving their sections through getTemplateSections().
export const WORK_TEMPLATE_CATALOG = [
  {
    id: "basic",
    name: "Dự án cơ bản",
    category: "agile",
    icon: "tabler-checkbox",
    featured: false,
    description: "Ba cột tối giản: việc cần làm, đang thực hiện, hoàn thành.",
    sections: [
      section("Việc cần làm", "todo"),
      section("Đang thực hiện", "in_progress"),
      section("Hoàn thành", "done"),
    ],
    tasks: [
      task("Xác định phạm vi công việc", "Việc cần làm", "high"),
      task("Phân công người phụ trách", "Việc cần làm", "medium"),
    ],
  },
  {
    id: "campaign",
    name: "Chiến dịch",
    category: "product",
    icon: "tabler-megaphone",
    featured: false,
    description: "Luồng chạy chiến dịch từ ý tưởng đến hoàn tất.",
    sections: [
      section("Ý tưởng", "todo"),
      section("Chuẩn bị", "in_progress"),
      section("Đang chạy", "in_progress"),
      section("Hoàn tất", "done"),
    ],
    tasks: [
      task("Chốt thông điệp chiến dịch", "Ý tưởng", "high"),
      task("Lên lịch chạy", "Chuẩn bị", "medium"),
    ],
  },
  {
    id: "sprint",
    name: "Sprint phần mềm",
    category: "agile",
    icon: "tabler-rocket",
    featured: false,
    description: "Backlog, sẵn sàng, thực hiện, kiểm thử, hoàn thành.",
    sections: [
      section("Backlog", "todo"),
      section("Sẵn sàng", "todo"),
      section("Đang thực hiện", "in_progress"),
      section("Kiểm thử", "in_progress"),
      section("Hoàn thành", "done"),
    ],
    tasks: [
      task("Chốt sprint goal", "Sẵn sàng", "high"),
      task("Cập nhật definition of done", "Kiểm thử", "medium"),
    ],
  },
  {
    id: "sprint-backlog",
    name: "Sprint Backlog",
    category: "agile",
    icon: "tabler-list-check",
    featured: true,
    description: "Quản lý backlog theo sprint với đánh giá và demo cuối kỳ.",
    sections: [
      section("Product backlog", "todo"),
      section("Sẵn sàng cho sprint", "todo"),
      section("Đang thực hiện", "in_progress"),
      section("Kiểm thử", "in_progress"),
      section("Sprint hoàn thành", "done"),
    ],
    tasks: [
      task("Chốt mục tiêu sprint", "Sẵn sàng cho sprint", "urgent", "Sprint goal phải đo lường được"),
      task("Đánh giá backlog với product owner", "Product backlog", "high"),
      task("Chuẩn bị demo cuối sprint", "Sprint hoàn thành", "medium"),
    ],
  },
  {
    id: "bug-tracker",
    name: "Bug Tracker",
    category: "engineering",
    icon: "tabler-bug",
    featured: true,
    description: "Theo dõi lỗi từ báo cáo đến đóng với quy trình tái hiện.",
    sections: [
      section("Lỗi mới", "todo"),
      section("Đã xác nhận", "todo"),
      section("Đang sửa", "in_progress"),
      section("Chờ kiểm thử", "in_progress"),
      section("Đã đóng", "done"),
    ],
    tasks: [
      task("Ghi log tái hiện lỗi", "Lỗi mới", "high", "Môi trường, bước thực hiện, kết quả mong đợi"),
      task("Xác nhận mức độ nghiêm trọng", "Đã xác nhận", "urgent"),
      task("Kiểm thử hồi quy", "Chờ kiểm thử", "medium"),
    ],
  },
  {
    id: "feature-requests",
    name: "Feature Requests",
    category: "product",
    icon: "tabler-sparkles",
    featured: false,
    description: "Thu thập và chấm điểm yêu cầu tính năng từ người dùng.",
    sections: [
      section("Ý tưởng", "todo"),
      section("Đang cân nhắc", "todo"),
      section("Đã lên kế hoạch", "in_progress"),
      section("Đang phát triển", "in_progress"),
      section("Đã phát hành", "done"),
    ],
    tasks: [
      task("Tổng hợp yêu cầu từ khách hàng", "Ý tưởng", "medium"),
      task("Chấm điểm tác động", "Đang cân nhắc", "high"),
    ],
  },
  {
    id: "code-review",
    name: "Code Review",
    category: "engineering",
    icon: "tabler-git-pull-request",
    featured: false,
    description: "Luồng review code từ mở pull request đến gộp.",
    sections: [
      section("Chờ review", "todo"),
      section("Đang review", "in_progress"),
      section("Cần chỉnh sửa", "blocked"),
      section("Đã gộp", "done"),
    ],
    tasks: [
      task("Kiểm tra test case và độ phủ", "Đang review", "high"),
      task("Rà soát bảo mật và tối ưu", "Đang review", "urgent"),
    ],
  },
  {
    id: "technical-debt",
    name: "Technical Debt",
    category: "engineering",
    icon: "tabler-tool",
    featured: false,
    description: "Nhận diện, ưu tiên và trả nợ kỹ thuật theo nhịp đều.",
    sections: [
      section("Đã nhận diện", "todo"),
      section("Đang ưu tiên", "todo"),
      section("Đang xử lý", "in_progress"),
      section("Xác nhận hoàn tất", "done"),
    ],
    tasks: [
      task("Quét mã nguồn tìm hotspot", "Đã nhận diện", "medium"),
      task("Định kỳ mỗi sprint 2 ngày trả nợ", "Đang ưu tiên", "high"),
    ],
  },
  {
    id: "deployment-schedule",
    name: "Deployment Schedule",
    category: "operations",
    icon: "tabler-rocket",
    featured: false,
    description: "Lịch triển khai kèm kiểm tra sau phát hành.",
    sections: [
      section("Chuẩn bị", "todo"),
      section("Đang triển khai", "in_progress"),
      section("Kiểm tra sau triển khai", "in_progress"),
      section("Hoàn tất", "done"),
    ],
    tasks: [
      task("Chốt rollback plan", "Chuẩn bị", "urgent"),
      task("Thông báo cửa sổ bảo trì", "Chuẩn bị", "high"),
      task("Giám sát sau phát hành 24h", "Kiểm tra sau triển khai", "high"),
    ],
  },
  {
    id: "incident-response",
    name: "Incident Response",
    category: "operations",
    icon: "tabler-alert-triangle",
    featured: true,
    description: "Xử lý sự cố khẩn cấp và phân tích nguyên nhân gốc.",
    sections: [
      section("Tiếp nhận", "todo"),
      section("Xử lý khẩn cấp", "in_progress"),
      section("Phân tích nguyên nhân", "in_progress"),
      section("Hành động phòng ngừa", "in_progress"),
      section("Đã đóng sự cố", "done"),
    ],
    tasks: [
      task("Kích hoạt kênh sự cố và cập nhật trạng thái", "Tiếp nhận", "urgent"),
      task("Mổ xẻ nguyên nhân gốc (5 whys)", "Phân tích nguyên nhân", "high"),
      task("Viết postmortem", "Đã đóng sự cố", "medium"),
    ],
  },
  {
    id: "documentation-backlog",
    name: "Documentation Backlog",
    category: "product",
    icon: "tabler-book",
    featured: false,
    description: "Hàng đợi tài liệu cần viết, cập nhật và xuất bản.",
    sections: [
      section("Cần viết", "todo"),
      section("Đang viết", "in_progress"),
      section("Chờ duyệt", "in_progress"),
      section("Đã xuất bản", "done"),
    ],
    tasks: [
      task("Cập nhật tài liệu API mới nhất", "Cần viết", "high"),
      task("Bổ sung ảnh chụp màn hình hướng dẫn", "Đang viết", "low"),
    ],
  },
  {
    id: "kanban",
    name: "Kanban",
    category: "agile",
    icon: "tabler-layout-kanban",
    featured: true,
    description: "Bảng Kanban gọn với giới hạn công việc đang làm.",
    sections: [
      section("Cần làm", "todo"),
      section("Đang làm", "in_progress"),
      section("Chờ duyệt", "in_progress"),
      section("Hoàn thành", "done"),
    ],
    tasks: [
      task("Đặt WIP limit cho cột Đang làm", "Đang làm", "medium"),
      task("Rà soát bảng mỗi sáng thứ Hai", "Cần làm", "low"),
    ],
  },
  {
    id: "ticketing",
    name: "Ticketing",
    category: "operations",
    icon: "tabler-ticket",
    featured: false,
    description: "Hỗ trợ khách hàng qua phiếu yêu cầu và thời gian phản hồi.",
    sections: [
      section("Phiếu mới", "todo"),
      section("Đang xử lý", "in_progress"),
      section("Chờ phản hồi", "blocked"),
      section("Đã giải quyết", "done"),
    ],
    tasks: [
      task("Phân loại phiếu theo mức độ", "Phiếu mới", "high"),
      task("Cam kết thời gian phản hồi SLA", "Đang xử lý", "urgent"),
    ],
  },
  {
    id: "xbus-operations",
    name: "XBus Vận hành",
    category: "xbus",
    icon: "tabler-bus",
    featured: true,
    description: "Mẫu vận hành nội bộ XBus: đầu việc hằng ngày, trực ca, đối soát.",
    sections: [
      section("Cần xử lý", "todo"),
      section("Đang xử lý", "in_progress"),
      section("Chờ xác nhận", "in_progress"),
      section("Hoàn thành", "done"),
    ],
    tasks: [
      task("Kiểm tra ca trực và phân công", "Cần xử lý", "high"),
      task("Đối soát dữ liệu đầu ngày", "Cần xử lý", "urgent"),
      task("Báo cáo vận hành cuối ngày", "Chờ xác nhận", "medium"),
      task("Xử lý sự cố tuyến", "Đang xử lý", "urgent"),
    ],
  },
  {
    id: "xbus-events",
    name: "XBus Sự kiện",
    category: "xbus",
    icon: "tabler-calendar-event",
    featured: false,
    description: "Chuẩn bị, diễn ra và tổng kết sự kiện của XBus.",
    sections: [
      section("Ý tưởng sự kiện", "todo"),
      section("Chuẩn bị", "in_progress"),
      section("Đang diễn ra", "in_progress"),
      section("Tổng kết", "in_progress"),
      section("Đã hoàn tất", "done"),
    ],
    tasks: [
      task("Chốt ngân sách và địa điểm", "Ý tưởng sự kiện", "high"),
      task("Lên kịch bản chương trình", "Chuẩn bị", "high"),
      task("Tổng kết và đo lường kết quả", "Tổng kết", "medium"),
    ],
  },
];

export function getTemplate(templateId, customTemplates = []) {
  if (!templateId) return null;
  return (
    WORK_TEMPLATE_CATALOG.find((item) => item.id === templateId) ||
    customTemplates.find((item) => item.id === templateId) ||
    null
  );
}

export function templateSections(template) {
  if (!template?.sections?.length) return [];
  const total = template.sections.length;
  return template.sections.map((item, index) => ({
    name: item.name,
    status:
      item.status ||
      (index === total - 1 ? "done" : index === 0 ? "todo" : "in_progress"),
    order: index,
  }));
}

// Legacy signature used by the project creation route.
export function getTemplateSections(templateId) {
  const template = getTemplate(templateId);
  if (template) return templateSections(template);
  const fallback = getTemplate("basic");
  return templateSections(fallback);
}

export function templateSampleTasks(template) {
  if (!template?.tasks?.length) return [];
  return template.tasks.map((item) => ({
    title: item.title,
    section: item.section,
    priority: TASK_PRIORITIES.includes(item.priority) ? item.priority : "medium",
    description: item.description || "",
    dueOffsetDays:
      typeof item.dueOffsetDays === "number" ? item.dueOffsetDays : null,
  }));
}

export function listTemplates({ category = "all", featured, custom = [] } = {}) {
  const all = [...WORK_TEMPLATE_CATALOG, ...custom];
  return all.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (featured && !item.featured) return false;
    return true;
  });
}

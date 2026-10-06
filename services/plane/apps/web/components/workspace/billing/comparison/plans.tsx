/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { ChatOutline, MailOutline } from "@makeplane/propel/icons";
import { EProductSubscriptionEnum } from "@plane/types";
// plane imports
import { cn } from "@plane/utils";

export type TPlanFeatureData = React.ReactNode | boolean | null;

// TODO: we should change this type and use TProductSubscriptionType instead. Need changes in common constants.
export type TPlanePlans = "free" | "one" | "pro" | "business" | "enterprise";

export type TPlanDetail = {
  id: EProductSubscriptionEnum;
  name: React.ReactNode;
  monthlyPrice?: number;
  yearlyPrice?: number;
  monthlyPriceSecondaryDescription?: React.ReactNode;
  yearlyPriceSecondaryDescription?: React.ReactNode;
  buttonCTA?: React.ReactNode;
  isActive: boolean;
};

type TPlanFeatureDetails = {
  title: React.ReactNode;
  description?: React.ReactNode;
  selfHostedDescription?: React.ReactNode;
  comingSoon?: boolean;
  selfHostedOnly?: boolean;
  cloud: Record<TPlanePlans, TPlanFeatureData>;
  "self-hosted"?: Record<TPlanePlans, TPlanFeatureData>;
};

type TPlansComparisonDetails = {
  id: string;
  title: React.ReactNode;
  comingSoon?: boolean;
  cloudOnly?: boolean;
  selfHostedOnly?: boolean;
  features: TPlanFeatureDetails[];
};

type PlanePlans = {
  planDetails: Record<TPlanePlans, TPlanDetail>;
  planHighlights: Record<TPlanePlans, string[]>;
  planComparison: TPlansComparisonDetails[];
};

function ForumIcon({ className }: { className?: string }) {
  return <ChatOutline className={cn(className, "size-5 text-secondary")} />;
}

export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "w-fit rounded-sm bg-accent-primary px-1.5 py-0.5 text-9 font-semibold whitespace-nowrap text-on-color",
        className
      )}
    >
      SẮP RA MẮT
    </span>
  );
}

export const PLANS_LIST: TPlanePlans[] = ["free", "one", "pro", "business", "enterprise"];

export const PLANS_COMPARISON_LIST: TPlansComparisonDetails[] = [
  {
    id: "project-work-tracking",
    title: "Theo dõi dự án và công việc",
    features: [
      {
        title: "Dự án",
        description: "Tạo dự án để tổ chức công việc, chu kỳ và nhóm công việc.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Công việc",
        description: "Tạo công việc, thiết lập thuộc tính để theo dõi và đưa vào chu kỳ hoặc nhóm công việc.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Bình luận",
        description: "Bình luận công việc, @nhắc thành viên và cùng trao đổi ý tưởng ngay trong Plane.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Chu kỳ",
        description: "Theo dõi công việc theo chu kỳ có thời lượng linh hoạt.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Nhóm công việc",
        description: "Tổ chức công việc lặp lại thành nhóm có người phụ trách riêng.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Tiếp nhận",
        description: "Xem đề xuất và phản hồi của người xem hoặc khách trước khi đưa vào dự án.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Ước tính",
        description: "Ước lượng khối lượng công việc theo hệ thống điểm phù hợp với đội ngũ.",
        cloud: {
          free: "Basic",
          one: "Basic",
          pro: "Advanced",
          business: "Advanced",
          enterprise: "Advanced",
        },
      },
    ],
  },
  {
    id: "project-work-management",
    title: "Quản lý dự án và công việc",
    features: [
      {
        title: "Thao tác hàng loạt",
        description:
          "Thêm nhiều công việc vào chu kỳ hoặc nhóm công việc, di chuyển hoặc chỉnh sửa thuộc tính cùng lúc.",
        cloud: {
          free: false,
          one: "Thuộc tính giới hạn",
          pro: "Tất cả thuộc tính",
          business: (
            <span className="flex flex-col items-end gap-1 lg:items-center">
              <ComingSoonBadge />
              Chuyển và đổi loại công việc
            </span>
          ),
          enterprise: (
            <span className="flex flex-col items-end gap-1 lg:items-center">
              <ComingSoonBadge />
              Chuyển và đổi loại công việc
            </span>
          ),
        },
      },
      {
        title: "Theo dõi thời gian và nhật ký công việc",
        description: "Ghi nhận thời gian cho từng công việc, xem báo cáo tổng hợp và lọc theo nhu cầu.",
        cloud: {
          free: false,
          one: "Basic",
          pro: "Lịch sử bảng chấm công",
          business: "Lịch sử bảng chấm công và phê duyệt",
          enterprise: "Lịch sử bảng chấm công và phê duyệt",
        },
      },
      {
        title: "Chu kỳ đang diễn ra",
        description: "Xem các chu kỳ đang diễn ra trên toàn bộ dự án hoặc trong từng dự án.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Loại công việc",
        description: "Tạo loại công việc với các thuộc tính riêng.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Thuộc tính tùy chỉnh",
        description: "Tạo thuộc tính tùy chỉnh cho không gian làm việc hoặc dự án.",
        cloud: {
          free: false,
          one: false,
          pro: "Project-level\ncustom properties",
          business: "Workspace-level\nproperties and roll-ups",
          enterprise: "Workspace-level\nproperties and roll-ups",
        },
      },
      {
        title: "Quan hệ phụ thuộc trên biểu đồ Gantt",
        description: "Điều chỉnh lịch của các công việc phụ thuộc trên biểu đồ Gantt.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Chuyển công việc",
        description: "Chuyển công việc sang dự án hoặc chu kỳ khác.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Tự động chuyển công việc giữa các chu kỳ",
        description: "Chuyển công việc chưa hoàn thành sang chu kỳ tiếp theo hoặc trạng thái mặc định của dự án.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Epics",
        description: "Tổ chức công việc dài hạn theo Epic, bao gồm công việc, chu kỳ và nhóm công việc.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Sáng kiến",
        description: "Tạo sáng kiến để tập hợp nhiều Epic.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Mốc kiểm tra",
        description: "Thêm mốc vào dự án, Epic và sáng kiến để theo dõi tiến độ và lập báo cáo.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Tổng quan nhóm công việc",
        description: "Xem thông tin và biểu đồ tiến độ của từng nhóm công việc, tương tự tổng quan chu kỳ.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Tự động phân công trong nhóm công việc",
        description: "Chọn quy tắc phân công trong nhóm công việc: tuần tự, luân phiên hoặc theo năng lực.",
        cloud: {
          free: false,
          one: false,
          pro: "Linear",
          business: "Round-robin and Capacity",
          enterprise: "Round-robin and Capacity",
        },
      },
      // {
      //   title: "Project Overview",
      //   description: "See just-in-time snapshots of your project with\nessential metrics.",
      //   comingSoon: true,
      //   cloud: {
      //     free: false,
      //     one: false,
      //     pro: true,
      //     business: true,
      //     enterprise: true,
      //   },
      // },
      {
        title: "Dự án công khai, riêng tư và bí mật",
        description:
          "Mọi người có thể xem và truy cập dự án công khai. Dự án riêng tư cần được duyệt để tham gia. Dự án bí mật chỉ hiển thị với thành viên được cấp quyền.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Trạng thái dự án",
        description: "Xem dự án theo trạng thái để nhận biết dự án đúng tiến độ và dự án cần chú ý.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      // {
      //   title: "Project Updates",
      //   description:
      //     "Keep stakeholders in the loop with a dedicated\nspace for updates that everyone in the project can\nsee.",
      //   comingSoon: true,
      //   cloud: {
      //     free: false,
      //     one: false,
      //     pro: true,
      //     business: true,
      //     enterprise: true,
      //   },
      // },
      {
        title: "Mẫu công việc có sẵn",
        description: "Chọn mẫu công việc có sẵn với loại và thuộc tính phù hợp cho từng nhu cầu.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Chu kỳ của nhóm",
        description: "Xem đồng thời nhiều chu kỳ ở nhiều dự án.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Mẫu dự án",
        description: "Lưu trạng thái, quy trình, tự động hóa và các cài đặt dự án thành mẫu.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Đường cơ sở và sai lệch",
        description: "Thiết lập tiến độ cơ sở của dự án để theo dõi các sai lệch.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Gửi thông tin theo lịch",
        description: "Lên lịch gửi báo cáo, thông báo và tin nhắn đến công cụ bên thứ ba.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Người phụ trách tiếp nhận",
        description: "Tự động giao công việc đã được duyệt trong mục Tiếp nhận cho một thành viên.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "SLA tùy chỉnh",
        description: "Thiết lập ma trận SLA cho công việc cần xử lý đúng hạn.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Biểu mẫu tiếp nhận",
        description: "Tiếp nhận công việc từ biểu mẫu web dành cho người dùng bên ngoài.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Tiếp nhận qua email",
        description: "Dùng địa chỉ email để gửi công việc trực tiếp vào mục Tiếp nhận của dự án.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    id: "visualization",
    title: "Trực quan hóa",
    features: [
      {
        title: "Bố cục",
        description: "Hiển thị công việc theo danh sách, bảng Kanban, lịch, biểu đồ Gantt hoặc bảng tính.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Chế độ xem",
        description: "Lưu cách sắp xếp, bộ lọc và tùy chọn hiển thị thành một chế độ xem.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Chế độ xem được chia sẻ",
        description: "Chọn thành viên để chia sẻ chế độ xem.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Công bố chế độ xem",
        description: "Công bố chế độ xem trên web để khách hàng tương tác.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Bảng tổng quan và tiện ích",
        description: "Tạo bảng tổng quan với tiện ích và loại dữ liệu tùy chỉnh.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    id: "analytics-reports",
    title: "Phân tích và báo cáo",
    features: [
      {
        title: "Biểu đồ tiến độ",
        description:
          "Theo dõi tiến độ ngay trong chu kỳ, nhóm công việc và trang tổng quan mà không cần chuyển sang bảng phân tích.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Báo cáo chu kỳ",
        description: "Tạo báo cáo trong và sau chu kỳ. Mở lại báo cáo bất cứ lúc nào bằng liên kết cố định.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Thông tin phân tích",
        description: "Đánh giá kết quả, phân tích theo nhu cầu và dự báo.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      // {
      //   title: "Time Capsule",
      //   description: "Go back in your project's timeline and see point-in-\ntime snapshots.",
      //   comingSoon: true,
      //   cloud: {
      //     free: false,
      //     one: false,
      //     pro: false,
      //     business: true,
      //     enterprise: true,
      //   },
      // },
      {
        title: "Phân tích trang nâng cao",
        description: "Xem ai đang đọc, chia sẻ và bình luận trên trang cùng các thông tin hữu ích khác.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Báo cáo tùy chỉnh",
        description: "Tạo báo cáo theo các tiêu chí và chỉ số của dự án hoặc không gian làm việc.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    id: "navigation",
    title: "Điều hướng",
    features: [
      {
        title: "Power K",
        description: "Truy cập nhanh các chức năng trong Plane bằng bàn phím.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      // {
      //   title: "Search",
      //   description: "Search via natural-language queries, operators, or\nPQL",
      //   cloud: {
      //     free: "Basic text search",
      //     one: "Basic text search",
      //     pro: (
      //       <span className="flex flex-col items-end lg:items-center gap-1">
      //         <span className="bg-[#3f76ff] text-on-color font-semibold text-9 p-0.5 w-fit whitespace-nowrap rounded-xs">
      //           COMING SOON
      //         </span>
      //         Operator capsules from text or PQL
      //       </span>
      //     ),
      //     business: (
      //       <span className="flex flex-col items-end lg:items-center gap-1">
      //         <span className="bg-[#3f76ff] text-on-color font-semibold text-9 p-0.5 w-fit whitespace-nowrap rounded-xs">
      //           COMING SOON
      //         </span>
      //         Operator capsules from text or PQL
      //       </span>
      //     ),
      //     enterprise: (
      //       <span className="flex flex-col items-end lg:items-center gap-1">
      //         <span className="bg-[#3f76ff] text-on-color font-semibold text-9 p-0.5 w-fit whitespace-nowrap rounded-xs">
      //           COMING SOON
      //         </span>
      //         Operator capsules from text or PQL
      //       </span>
      //     ),
      //   },
      // },
      {
        title: "PQL",
        description:
          "Tìm kiếm bằng Plane Query Language với toán tử Boolean. Truy vấn ngôn ngữ tự nhiên sẽ được hỗ trợ sau.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    id: "workspace-user-management",
    title: "Quản lý không gian làm việc và người dùng",
    features: [
      {
        title: "Giới hạn thành viên",
        description: "Số người dùng có thể sử dụng tính năng quản lý dự án và công việc",
        selfHostedDescription: "Số người dùng hạ tầng tiêu chuẩn hỗ trợ. Nâng cấp hạ tầng để tăng số người dùng.",
        cloud: {
          free: "12",
          one: "",
          pro: "Unlimited",
          business: "Unlimited",
          enterprise: "Unlimited",
        },
        "self-hosted": {
          free: "~50",
          one: "~50",
          pro: "~200",
          business: "~200",
          enterprise: "Unlimited",
        },
      },
      {
        title: "Vai trò",
        description: "Chọn một trong bốn vai trò có sẵn hoặc tạo vai trò tùy chỉnh bằng RBAC.",
        cloud: {
          free: "Basic",
          one: "Basic",
          pro: "Pre-defined roles",
          business: "RBAC",
          enterprise: "GAC",
        },
      },
      {
        title: "Khách",
        description: "Cho phép người dùng xem toàn bộ công việc hoặc chỉ công việc của mình trong dự án.",
        cloud: {
          free: false,
          one: "5 per paid member",
          pro: "5 per paid member",
          business: "5 per paid member",
          enterprise: "5 per paid member",
        },
      },
      {
        title: "Phê duyệt",
        description: "Chỉ định quản trị viên phê duyệt không gian làm việc, dự án và loại công việc.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Giao diện quản trị",
        description: "Quản lý cài đặt không gian làm việc và dự án từ giao diện quản trị.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Nhật ký hoạt động của không gian làm việc",
        description: "Xem và lọc nhật ký hoạt động của toàn bộ không gian làm việc.",
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Nhật ký kiểm tra hỗ trợ API",
        description:
          "Xem nhật ký kiểm tra toàn bộ không gian làm việc và dùng API để ghi nhận hoạt động trong hệ thống tuân thủ.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    id: "automations-workflows",
    title: "Tự động hóa và quy trình",
    features: [
      {
        title: "Điều kiện kích hoạt và hành động",
        description: "Chọn điều kiện kích hoạt và hành động tương ứng cho mỗi quy trình tự động hóa.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Tự động hóa điều kiện và vòng lặp",
        description: "Dùng hành động làm điều kiện kích hoạt tiếp theo trong quy trình tự động hóa.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Số quy trình tự động hóa",
        description: "Tổng số quy trình tự động hóa trong không gian làm việc",
        cloud: {
          free: false,
          one: false,
          pro: "5,000",
          business: "10,000",
          enterprise: "Unlimited",
        },
      },
    ],
  },
  {
    id: "knowledge-management",
    title: "Quản lý tri thức",
    features: [
      {
        title: "Trang",
        description: "Xây dựng kho tri thức để đội ngũ dễ truy cập và chia sẻ.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Cộng tác theo thời gian thực",
        description: "Cùng thành viên trong dự án, nhóm hoặc không gian làm việc chỉnh sửa trang.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Nhúng công việc",
        description: "Nhúng công việc từ bất kỳ dự án nào bạn tham gia.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Liên kết đến công việc",
        description: "Liên kết trang trong mục riêng trên màn hình chi tiết công việc.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Xuất bản",
        description: "Công bố trang trên web để người dùng bên ngoài bình luận mà không cần đăng nhập.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Wiki",
        description: "Tạo wiki hoặc kho tri thức cho toàn công ty mà không cần tạo dự án.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Xuất",
        description: "Xuất nội dung trang thành PDF hoặc tài liệu tương thích với Word.",
        cloud: {
          free: false,
          one: false,
          pro: "Mỗi lần tải một tệp",
          business: "Tệp đang chờ tải",
          enterprise: "Tệp đang chờ tải",
        },
      },
      {
        title: "Mẫu",
        description: "Dùng trang làm mẫu cho dự án, nhóm hoặc không gian làm việc.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Phiên bản",
        description: "Xem và khôi phục các phiên bản chỉnh sửa của trang.",
        cloud: {
          free: false,
          one: false,
          pro: "2 days",
          business: "3 months",
          enterprise: "Unlimited",
        },
      },
      {
        title: "Cơ sở dữ liệu và công thức",
        description: "Thêm cơ sở dữ liệu và công thức vào trang mà vẫn giữ nguyên văn bản, ảnh và các nội dung khác.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Trang lồng nhau",
        description: "Tạo trang con để tổ chức nội dung theo từng cấp.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: "Word-compatible + other format downloads",
          enterprise: "Word-compatible + other format downloads",
        },
      },
    ],
  },
  {
    id: "importers",
    title: "Công cụ nhập dữ liệu",
    features: [
      {
        title: "Jira",
        description: "Nhập công việc và thành viên từ Jira.",
        cloud: {
          free: "Không có thuộc tính tùy chỉnh",
          one: "Không có thuộc tính tùy chỉnh",
          pro: "Có thuộc tính tùy chỉnh",
          business: "Có thuộc tính tùy chỉnh",
          enterprise: "Có thuộc tính tùy chỉnh",
        },
      },
      {
        title: "GitHub",
        description: "Nhập công việc và thành viên từ GitHub.",
        cloud: {
          free: "Không có thuộc tính tùy chỉnh",
          one: "Không có thuộc tính tùy chỉnh",
          pro: "Có thuộc tính tùy chỉnh",
          business: "Có thuộc tính tùy chỉnh",
          enterprise: "Có thuộc tính tùy chỉnh",
        },
      },
    ],
  },
  {
    id: "integrations",
    title: "Tích hợp",
    comingSoon: true,
    features: [
      {
        title: "GitHub",
        description:
          "Đồng bộ công việc và trạng thái giữa Plane với GitHub. Hoạt động ở một bên sẽ tự động cập nhật bên còn lại.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Slack",
        description: "Nhận hoạt động Plane trong Slack và dùng lệnh / trong Slack để cập nhật Plane.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Zapier",
        description: "Tạo quy trình tự động hóa theo điều kiện if-then-else bằng Zapier.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Zendesk",
        description: "Tạo công việc trong Plane từ ticket Zendesk.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Freshdesk",
        description: "Tạo công việc trong Plane từ ticket Freshdesk.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    id: "storage",
    title: "Dung lượng lưu trữ",
    cloudOnly: true,
    features: [
      {
        title: "Không gian",
        description: "Tổng dung lượng lưu trữ cho mỗi không gian làm việc",
        cloud: {
          free: "5GB",
          one: false,
          pro: "1 TB",
          business: "5 TB",
          enterprise: "Custom",
        },
      },
      {
        title: "Dung lượng tệp tối đa",
        description: "Giới hạn tải lên trong không gian làm việc",
        cloud: {
          free: "5 MB",
          one: false,
          pro: "100 MB",
          business: "200 MB",
          enterprise: "Custom",
        },
      },
    ],
  },
  {
    id: "security",
    title: "Bảo mật",
    features: [
      {
        title: "SAML",
        description: "Tích hợp SAML chính thức để xác thực Plane với nhà cung cấp danh tính IdP.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "OIDC",
        description: "Tích hợp OIDC chính thức để xác thực Plane với nhà cung cấp danh tính IdP.",
        selfHostedOnly: true,
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Bảo mật tên miền",
        description: "Chọn các tên miền được phép đăng nhập vào không gian làm việc hoặc giới hạn ở một tên miền.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Xác thực hai yếu tố và passkey",
        description: "Bảo vệ không gian làm việc bằng xác thực hai yếu tố và passkey theo thiết bị.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Chính sách mật khẩu",
        description: "Thiết lập chính sách mật khẩu theo yêu cầu tuân thủ của bạn.",
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "LDAP",
        description: "Tích hợp LDAP chính thức để bảo vệ không gian làm việc bằng máy chủ LDAP của bạn.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: false,
          enterprise: true,
        },
      },
    ],
  },
  {
    id: "self-hosted",
    title: "Tự triển khai",
    selfHostedOnly: true,
    features: [
      {
        title: "Quản trị hệ thống",
        description: "Quản lý Plane tự triển khai bằng giao diện quản trị hệ thống.",
        cloud: {
          free: true,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Triển khai bằng một lần nhấn",
        description: "Cài đặt và tự triển khai Plane lên hạ tầng Cloud riêng bằng một lệnh.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Ứng dụng trên DigitalOcean Marketplace",
        description: "Tải ứng dụng tương thích DigitalOcean từ Marketplace.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Ứng dụng Heroku Platform",
        description: "Dùng ứng dụng tương thích Heroku Platform để triển khai lên Heroku.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "AWS AMI",
        description: "Tải ứng dụng tương thích AMI từ AWS Marketplace.",
        cloud: {
          free: false,
          one: true,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
      {
        title: "Triển khai riêng",
        description: "Sử dụng ứng dụng trên hạ tầng Cloud riêng do chúng tôi quản lý.",
        comingSoon: true,
        cloud: {
          free: false,
          one: false,
          pro: false,
          business: false,
          enterprise: true,
        },
      },
    ],
  },
  {
    id: "support",
    title: "Hỗ trợ",
    features: [
      {
        title: "Kênh",
        description: "Sử dụng các kênh hỗ trợ tùy theo gói dịch vụ.",
        cloud: {
          free: (
            <>
              <ForumIcon className="size-4" />
            </>
          ),
          one: (
            <div className="flex items-center gap-1">
              <MailOutline className="size-4 flex-shrink-0" />
              <ForumIcon className="size-4 flex-shrink-0" />
            </div>
          ),
          pro: (
            <div className="flex items-center gap-1">
              <MailOutline className="size-4 flex-shrink-0" />
              <ForumIcon className="size-4 flex-shrink-0" />
              <ChatOutline className="size-4 flex-shrink-0" />
            </div>
          ),
          business: "Full-suite\nprofessional services",
          enterprise: "Full-suite\nprofessional services",
        },
      },
      {
        title: "SLA",
        description: (
          <>
            Sử dụng SLA phù hợp với doanh nghiệp ở các gói cao hơn, theo mức ưu tiên và cấp độ công việc.{" "}
            <a href="https://plane.so/talk-to-sales" target="_blank" rel="noopener noreferrer" className="underline">
              có thể yêu cầu
            </a>
            .
          </>
        ),
        cloud: {
          free: false,
          one: false,
          pro: true,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
];

export const PLANE_PLANS: PlanePlans = {
  planDetails: {
    free: {
      id: EProductSubscriptionEnum.FREE,
      name: "Free",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isActive: true,
    },
    one: {
      id: EProductSubscriptionEnum.ONE,
      name: "One",
      monthlyPrice: 799,
      yearlyPrice: 799,
      monthlyPriceSecondaryDescription: "per workspace",
      yearlyPriceSecondaryDescription: "per workspace",
      buttonCTA: "Upgrade",
      isActive: false,
    },
    pro: {
      id: EProductSubscriptionEnum.PRO,
      name: "Pro",
      monthlyPrice: 8,
      yearlyPrice: 6,
      monthlyPriceSecondaryDescription: "billed monthly",
      yearlyPriceSecondaryDescription: "billed yearly",
      buttonCTA: "Upgrade",
      isActive: true,
    },
    business: {
      id: EProductSubscriptionEnum.BUSINESS,
      name: "Business",
      monthlyPriceSecondaryDescription: "billed monthly",
      yearlyPriceSecondaryDescription: "billed yearly",
      buttonCTA: "Liên hệ bộ phận bán hàng",
      isActive: false,
    },
    enterprise: {
      id: EProductSubscriptionEnum.ENTERPRISE,
      name: "Enterprise",
      monthlyPriceSecondaryDescription: "billed monthly",
      yearlyPriceSecondaryDescription: "billed yearly",
      buttonCTA: "Liên hệ bộ phận bán hàng",
      isActive: false,
    },
  },
  planHighlights: {
    free: ["Tối đa 12 người dùng", "Pages", "Không giới hạn dự án", "Không giới hạn chu kỳ và nhóm công việc"],
    one: ["Tối đa 50 người dùng", "OIDC and SAML", "Chu kỳ hoạt động", "Theo dõi thời gian giới hạn"],
    pro: [
      "Không giới hạn người dùng",
      "Công việc và thuộc tính tùy chỉnh",
      "Mẫu công việc",
      "Theo dõi thời gian đầy đủ",
    ],
    business: ["RBAC", "Mẫu dự án", "Đường cơ sở và sai lệch", "Báo cáo tùy chỉnh"],
    enterprise: ["Triển khai riêng có quản lý", "GAC", "Hỗ trợ LDAP", "Cơ sở dữ liệu và công thức"],
  },
  planComparison: PLANS_COMPARISON_LIST,
};

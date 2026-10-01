const verticalMenuData = [
  {
    label: "Trang chủ",
    href: "/home",
    icon: "tabler-smart-home",
    roles: ["user", "assistant", "admin"],
  },

  {
    label: "Nhân sự",
    href: "/users",
    icon: "tabler-users",
    roles: ["user", "assistant", "admin"],
  },
  {
    label: "Sinh hoạt đội",
    href: "/water-schedule",
    icon: "tabler-users-group",
    roles: ["user", "assistant", "admin"],
  },
  {
    label: "Tài chính",
    href: "/fund",
    icon: "tabler-wallet",
    roles: ["user", "assistant", "admin"],
  },
  {
    label: "Quản lý tài sản",
    href: "/assets",
    icon: "tabler-package",
    roles: ["user", "assistant", "admin"],
  },
  {
    label: "Trà chiều",
    href: "/afternoon-tea",
    icon: "tabler-bubble-tea",
    roles: ["user", "assistant", "admin"],
  },
  {
    label: "Ảnh và video",
    href: "/gallery",
    icon: "tabler-photo-video",
    roles: ["user", "assistant", "admin"],
  },
  {
    label: "Lịch sử hoạt động",
    href: "/audit-logs",
    icon: "tabler-history",
    roles: ["assistant", "admin"],
  },
  {
    label: "Cài đặt",
    icon: "tabler-settings",
    roles: ["assistant", "admin"],
    children: [
      {
        label: "Nhắc lịch",
        href: "/settings?section=reminder",
        roles: ["assistant", "admin"],
      },
      {
        label: "Kỳ đóng",
        href: "/settings?section=period",
        roles: ["assistant", "admin"],
      },
      {
        label: "QR đóng quỹ",
        href: "/settings?section=qr",
        roles: ["assistant", "admin"],
      },
      {
        label: "Hàng đợi Bull Board",
        href: "/bull-board",
        icon: "tabler-cpu",
        roles: ["admin"],
      },
    ],
  },
];

export default verticalMenuData;

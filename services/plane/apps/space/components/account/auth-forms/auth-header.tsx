/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// helpers
import { EAuthModes } from "@/types/auth";

type TAuthHeader = {
  authMode: EAuthModes;
};

type TAuthHeaderContent = {
  header: string;
  subHeader: string;
};

type TAuthHeaderDetails = {
  [mode in EAuthModes]: TAuthHeaderContent;
};

const Titles: TAuthHeaderDetails = {
  [EAuthModes.SIGN_IN]: {
    header: "Đăng nhập để ủng hộ hoặc bình luận",
    subHeader: "Góp ý cho những tính năng bạn muốn phát triển.",
  },
  [EAuthModes.SIGN_UP]: {
    header: "Xem, bình luận và cộng tác",
    subHeader: "Đăng ký hoặc đăng nhập để sử dụng công việc và trang trong Plane.",
  },
};

export function AuthHeader(props: TAuthHeader) {
  const { authMode } = props;

  const getHeaderSubHeader = (mode: EAuthModes | null): TAuthHeaderContent => {
    if (mode) {
      return Titles[mode];
    }

    return {
      header: "Bình luận hoặc bày tỏ cảm xúc về công việc",
      subHeader: "Dùng Plane để đóng góp ý kiến cho các tính năng.",
    };
  };

  const { header, subHeader } = getHeaderSubHeader(authMode);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-20 leading-7 font-semibold text-primary">{header}</span>
        <span className="text-20 leading-7 font-semibold text-placeholder">{subHeader}</span>
      </div>
    </>
  );
}

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

type Props = {
  isSignUp?: boolean;
};

export function TermsAndConditions(props: Props) {
  const { isSignUp = false } = props;
  return (
    <span className="flex items-center justify-center py-6">
      <p className="text-center text-13 whitespace-pre-line text-secondary">
        {isSignUp ? "Khi tạo tài khoản" : "Khi đăng nhập"}, bạn đồng ý với{" \n"}
        <a href="https://plane.so/legals/terms-and-conditions" target="_blank" rel="noopener noreferrer">
          <span className="text-13 font-medium underline hover:cursor-pointer">Điều khoản sử dụng</span>
        </a>{" "}
        và{" "}
        <a href="https://plane.so/legals/privacy-policy" target="_blank" rel="noopener noreferrer">
          <span className="text-13 font-medium underline hover:cursor-pointer">Chính sách bảo mật</span>
        </a>
        {"."}
      </p>
    </span>
  );
}

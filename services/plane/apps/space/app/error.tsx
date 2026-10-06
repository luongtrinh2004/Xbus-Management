/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// ui
import { Button } from "@makeplane/propel/components/button";

function ErrorPage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="grid h-screen place-items-center bg-surface-1 p-4">
      <div className="space-y-8 text-center">
        <div className="space-y-2">
          <h3 className="text-16 font-semibold">Đã xảy ra lỗi.</h3>
          <p className="mx-auto text-13 text-secondary md:w-1/2">
            Plane gặp sự cố. Lỗi đã được ghi nhận. Nếu có thêm thông tin, hãy gửi đến{" "}
            <a href="mailto:support@plane.so" className="text-accent-primary">
              support@plane.so
            </a>{" "}
            hoặc trên{" "}
            <a href="https://forum.plane.so" target="_blank" className="text-accent-primary" rel="noopener noreferrer">
              Diễn đàn
            </a>
            .
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="primary" size="md" stretch="auto" label={"Làm mới"} onClick={handleRetry} />
          {/* <Button variant="secondary" size="lg" onClick={() => {}}>
            Sign out
          </Button> */}
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;

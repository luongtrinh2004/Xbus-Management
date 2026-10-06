/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export function LogoSpinner() {
  return (
    <div role="status" aria-label="Đang tải XBus Office" className="flex items-center justify-center">
      <img src="/xbus/loading.svg" alt="" aria-hidden="true" className="size-14 object-contain sm:size-20" />
    </div>
  );
}

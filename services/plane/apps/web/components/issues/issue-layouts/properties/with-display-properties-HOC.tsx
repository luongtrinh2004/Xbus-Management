/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useListTable } from "../list/table-context";
import type { ReactNode } from "react";
import { observer } from "mobx-react";
import type { IIssueDisplayProperties } from "@plane/types";

interface IWithDisplayPropertiesHOC {
  displayProperties: IIssueDisplayProperties;
  shouldRenderProperty?: (displayProperties: IIssueDisplayProperties) => boolean;
  displayPropertyKey: keyof IIssueDisplayProperties | (keyof IIssueDisplayProperties)[];
  children: ReactNode;
}

export const WithDisplayPropertiesHOC = observer(function WithDisplayPropertiesHOC({
  displayProperties,
  shouldRenderProperty,
  displayPropertyKey,
  children,
}: IWithDisplayPropertiesHOC) {
  const columns = useListTable();
  let shouldDisplayPropertyFromFilters = false;
  if (Array.isArray(displayPropertyKey))
    shouldDisplayPropertyFromFilters = displayPropertyKey.every((key) => !!displayProperties[key]);
  else shouldDisplayPropertyFromFilters = !!displayProperties[displayPropertyKey];

  const renderProperty =
    shouldDisplayPropertyFromFilters &&
    (shouldRenderProperty ? shouldRenderProperty(displayProperties) : true);

  if (columns && typeof displayPropertyKey === "string") {
    const index = columns.findIndex(({ key }) => key === displayPropertyKey);
    if (index < 0) return null;
    return (
      <div
        className="asana-list-cell"
        data-column={displayPropertyKey}
        style={{ gridColumn: index + 1, gridRow: 1 }}
      >
        {renderProperty ? children : null}
      </div>
    );
  }
  if (!renderProperty) return null;

  return <>{children}</>;
});

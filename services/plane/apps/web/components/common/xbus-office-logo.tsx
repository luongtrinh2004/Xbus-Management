import type { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<"svg"> & { color?: string };

export function XBusOfficeIcon({ width = 44, height = 44, color: _color, ...props }: Props) {
  return (
    <svg width={width} height={height} viewBox="0 0 251 258" role="img" aria-label="XBus Office" {...props}>
      <image href="/xbus/logo-icon.svg" width="251" height="258" />
    </svg>
  );
}

export function XBusOfficeLogo({ width = 220, height = 52, color = "currentColor", ...props }: Props) {
  return (
    <svg width={width} height={height} viewBox="0 0 220 52" role="img" aria-label="XBus Office" {...props}>
      <image href="/xbus/logo-icon.svg" x="0" y="4" width="42" height="44" />
      <text x="54" y="34" fill={color} fontFamily="Inter, sans-serif" fontWeight="650" fontSize="25">
        XBus Office
      </text>
    </svg>
  );
}

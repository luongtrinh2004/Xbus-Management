import type { ReactNode } from "react";

export function ListAddRow({
  onClick,
  children,
  indent = 72,
}: {
  onClick: () => void;
  children: ReactNode;
  indent?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-9 w-full items-center border-b border-subtle text-left text-13 text-tertiary hover:bg-layer-1 hover:underline focus-visible:outline-2 focus-visible:outline-accent-strong"
      style={{ paddingLeft: indent }}
    >
      {children}
    </button>
  );
}

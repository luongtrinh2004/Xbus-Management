/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Links, Meta, Outlet, Scripts } from "react-router";
import type { LinksFunction } from "react-router";
import { ThemeProvider, useTheme } from "next-themes";
// plane imports
import { SITE_DESCRIPTION, SITE_NAME } from "@plane/constants";
// types
// assets
import globalStyles from "@/styles/globals.css?url";
import type { Route } from "./+types/root";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
// lib
import { isStaleAssetError, recoverFromStaleAsset } from "@/lib/stale-asset-error";
// local
import { CustomErrorComponent } from "./error";
// fonts
import "@fontsource-variable/inter";
import interVariableWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import interVietnameseWoff2 from "@fontsource-variable/inter/files/inter-vietnamese-wght-normal.woff2?url";
import "@fontsource/material-symbols-rounded";
import "@fontsource/ibm-plex-mono";

const APP_TITLE = "XBus Office";
const ogImage = "/xbus/logo.png";

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", sizes: "any", href: "/xbus/logo-icon.svg" },
  { rel: "manifest", href: "/site.webmanifest.json" },
  { rel: "apple-touch-icon", href: "/xbus/logo-icon.svg" },
  { rel: "apple-touch-icon", sizes: "180x180", href: "/xbus/logo-icon.svg" },
  { rel: "apple-touch-icon", sizes: "512x512", href: "/xbus/logo-icon.svg" },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "stylesheet", href: globalStyles },
  {
    rel: "preload",
    href: interVariableWoff2,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: interVietnameseWoff2,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi-VN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#fff" />
        {/* Meta info for PWA */}
        <meta name="application-name" content="XBus Office" />
        <meta name="apple-mobile-web-app-capable" content={"Có"} />
        <meta name="apple-mobile-web-app-status-bar-style" content={"Mặc định"} />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content={"Có"} />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <div id="context-menu-portal" />
        <div id="editor-portal" />
        <ThemeProvider themes={["light", "dark", "light-contrast", "dark-contrast", "custom"]} defaultTheme="system">
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

export const meta: Route.MetaFunction = () => [
  { title: APP_TITLE },
  { name: "description", content: SITE_DESCRIPTION },
  { property: "og:title", content: APP_TITLE },
  {
    property: "og:description",
    content: "Công cụ quản lý dự án mã nguồn mở giúp tổ chức công việc, chu kỳ và lộ trình sản phẩm.",
  },
  { property: "og:image", content: ogImage },
  { property: "og:image:alt", content: "XBus Office - Quản lý dự án hiện đại" },
  {
    name: "keywords",
    content:
      "software development, plan, ship, software, accelerate, code management, release management, project management, work item tracking, agile, scrum, kanban, collaboration",
  },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:image", content: ogImage },
  { name: "twitter:image:alt", content: "XBus Office - Quản lý dự án hiện đại" },
];

// Root stays shell-thin: in SPA mode React Router server-builds only the root route, so
// everything imported here is evaluated in Node just to prerender the fallback index.html.
// Providers, the store layer, and app chrome belong in app/layout.tsx — never import them here.
export default function Root() {
  return <Outlet />;
}

export function HydrateFallback() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { resolvedTheme } = useTheme();

  // if we are on the server or the theme is not resolved, return an empty div
  if (!mounted || typeof window === "undefined" || resolvedTheme === undefined) return <div />;

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-canvas">
      <LogoSpinner />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // A stale chunk failure surfaces here as React Router's own wrapper error
  // (the failed dynamic import itself never reaches a window event) — recover
  // the same way entry.client.tsx does instead of just showing the error page.
  if (import.meta.env.PROD && isStaleAssetError(error)) recoverFromStaleAsset();

  return <CustomErrorComponent error={error} />;
}

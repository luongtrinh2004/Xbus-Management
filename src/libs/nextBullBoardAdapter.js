import fs from "fs";
import path from "path";
import ejs from "ejs";
import { match } from "path-to-regexp";
import { getToken } from "next-auth/jwt";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { getGalleryQueue } from "@/libs/galleryQueue";

const MIME_TYPES = {
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

class NextAppAdapter {
  constructor() {
    this.basePath = "/bull-board";
    this.uiConfig = {};
    this.apiRoutes = [];
    this.entryMatchers = [];
  }

  setBasePath(pathStr) {
    this.basePath = pathStr;
    return this;
  }

  setStaticPath(route, dirPath) {
    this.staticRoute = route;
    this.staticPath = dirPath;
    return this;
  }

  setViewsPath(dirPath) {
    this.viewsPath = dirPath;
    return this;
  }

  setErrorHandler(handler) {
    this.errorHandler = handler;
    return this;
  }

  setQueues(queues) {
    this.bullBoardQueues = queues;
    return this;
  }

  setUIConfig(config) {
    this.uiConfig = config;
    return this;
  }

  setEntryRoute(routeDef) {
    this.entryRoute = routeDef;
    const routes = Array.isArray(routeDef.route) ? routeDef.route : [routeDef.route];
    this.entryMatchers = routes.map((r) =>
      match(r, { decode: decodeURIComponent, end: false })
    );
    return this;
  }

  setApiRoutes(routes) {
    this.apiRoutes = routes.map((r) => ({
      ...r,
      matcher: match(r.route, { decode: decodeURIComponent }),
      methods: (Array.isArray(r.method) ? r.method : [r.method]).map((m) =>
        m.toUpperCase()
      ),
    }));
    return this;
  }
}

let boardHandlerInstance = null;

export function getBullBoardAdapter() {
  if (boardHandlerInstance) return boardHandlerInstance;

  const adapter = new NextAppAdapter();
  adapter.setBasePath(`${process.env.BASEPATH || ""}/bull-board`);

  const galleryQueue = getGalleryQueue();
  createBullBoard({
    queues: [new BullMQAdapter(galleryQueue, { readOnlyMode: false })],
    serverAdapter: adapter,
    options: {
      uiConfig: {
        boardTitle: "Xbus — Bull Board",
        misc: {
          version: "9.10.2",
        },
        favIcon: {
          default: "static/images/logo.svg",
          alternative: "static/favicon-32x32.png",
        },
      },
    },
  });

  boardHandlerInstance = adapter;
  return boardHandlerInstance;
}

export async function handleBullBoardRequest(req, context) {
  // 1. Authenticate with NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) {
    return new Response(
      "Vui lòng đăng nhập tài khoản quản trị viên để xem Bull Board.",
      {
        status: 401,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }
  if (token.role !== "admin" || token.status === "disabled") {
    return new Response("Chỉ quản trị viên mới có quyền xem Bull Board.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const url = new URL(req.url);
  if (!["GET", "HEAD"].includes(req.method) && req.headers.get("origin") !== url.origin) {
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });
  }
  const adapter = getBullBoardAdapter();

  // Extract path relative to /bull-board
  const params = await Promise.resolve(context?.params || {});
  const segments = Array.isArray(params.path) ? params.path : [];
  const pathname = "/" + segments.join("/");
  const method = req.method.toUpperCase();

  // 2. Static Asset handling (/bull-board/static/*)
  if (pathname.startsWith("/static/")) {
    const rel = pathname.slice("/static/".length);
    const safeRel = path.normalize(rel).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(adapter.staticPath, safeRel);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const fileBuffer = fs.readFileSync(filePath);

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    return new Response("Static asset not found", { status: 404 });
  }

  // 3. API Route handling (/bull-board/api/*)
  if (pathname.startsWith("/api/")) {
    const query = Object.fromEntries(url.searchParams.entries());

    let body = {};
    if (["POST", "PUT", "PATCH"].includes(method)) {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    for (const route of adapter.apiRoutes) {
      if (!route.methods.includes(method)) continue;

      const matchRes = route.matcher(pathname);
      if (matchRes) {
        try {
          const res = await route.handler({
            queues: adapter.bullBoardQueues,
            uiConfig: adapter.uiConfig,
            query,
            params: matchRes.params,
            body,
            headers: Object.fromEntries(req.headers.entries()),
          });

          return Response.json(res.body, { status: res.status || 200 });
        } catch (err) {
          if (err?.code === "ECONNREFUSED" || err?.message?.includes("ECONNREFUSED")) {
            return Response.json(
              {
                queues: [],
                error: "Không thể kết nối Redis (127.0.0.1:6379). Vui lòng khởi động Redis service.",
              },
              { status: 200 }
            );
          }

          if (adapter.errorHandler) {
            const errRes = adapter.errorHandler(err);
            return Response.json(errRes.body, { status: errRes.status || 500 });
          }
          return Response.json({ error: err.message }, { status: 500 });
        }
      }
    }
    return Response.json({ error: "API route not found" }, { status: 404 });
  }

  // 4. Entry UI HTML route (/bull-board, /bull-board/queue/*, etc.)
  const isEntry =
    pathname === "/" ||
    pathname === "" ||
    adapter.entryMatchers.some((matcher) => matcher(pathname));

  if (isEntry) {
    const { name, params: viewParams } = adapter.entryRoute.handler({
      basePath: adapter.basePath.endsWith("/")
        ? adapter.basePath
        : `${adapter.basePath}/`,
      uiConfig: adapter.uiConfig,
    });

    const fileName = name.endsWith(".ejs") ? name : `${name}.ejs`;
    const templatePath = path.join(adapter.viewsPath, fileName);

    const html = await ejs.renderFile(templatePath, viewParams);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  }

  return new Response("Not found", { status: 404 });
}

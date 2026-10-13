const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { File } = require("node:buffer");
const ts = require("typescript");
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        if (!(name in mocks)) throw Error(name);
        return mocks[name];
      },
      Buffer,
      File,
      process: { env: {} },
      console,
    },
  );
  return exports;
}
(async () => {
  const buffer = Buffer.from("menu");
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const objects = new Map();
  let uploads = 0;
  let available = true;
  const client = {
    statObject: async (_b, k) => {
      if (!objects.has(k))
        throw Object.assign(Error("missing"), { code: "NoSuchKey" });
    },
    putObject: async (_b, k, value) => {
      objects.set(k, value);
      uploads++;
    },
  };
  const storage = load("src/libs/teaMenuStorage.js", {
    "node:crypto": crypto,
    "./minioClient": {
      ensureBucket: async () => available,
      getMinioClient: () => client,
      MINIO_BUCKET: "test",
    },
  });
  const input = { buffer, mimeType: "image/png", checksum };
  const first = await storage.storeTeaMenuImage(input);
  assert.equal(await storage.storeTeaMenuImage(input), first);
  assert.equal(uploads, 1);
  await assert.rejects(
    storage.storeTeaMenuImage({ ...input, checksum: "0".repeat(64) }),
    /checksum/,
  );
  available = false;
  await assert.rejects(storage.storeTeaMenuImage(input), /MinIO/);
  available = true;
  client.statObject = async () => {
    throw Object.assign(Error("denied"), { code: "AccessDenied" });
  };
  await assert.rejects(storage.storeTeaMenuImage(input), /denied/);
  assert.equal(uploads, 1);
  const catalog = {
    id: "catalog-1",
    checksum,
    imageUrl: "/api/media/afternoon-tea/legacy.png",
    items: [{ name: "Trà" }],
    status: "approved",
  };
  let state = {
    invitations: [
      { id: "invite-1", createdBy: "admin", menus: [] },
      {
        id: "invite-2",
        menus: [
          {
            id: "old-menu",
            checksum,
            catalogId: catalog.id,
            imageUrl: catalog.imageUrl,
          },
        ],
      },
    ],
    menuCatalog: [catalog],
  };
  let aiCalls = 0;
  const route = load("src/app/api/afternoon-tea/menu/route.js", {
    "next/server": {
      NextResponse: {
        json: (body, options) => ({ body, status: options?.status || 200 }),
      },
    },
    crypto,
    "next-auth/jwt": { getToken: async () => ({ id: "admin", role: "admin" }) },
    "@/libs/dataRepository": {
      getAfternoonTea: async () => structuredClone(state),
      getUsers: async () => [],
      saveAfternoonTea: async (data) => {
        state = data;
      },
    },
    "@/libs/afternoonTeaRealtime": { publishAfternoonTeaEvent: () => {} },
    "@/libs/teaMenuStorage": { storeTeaMenuImage: async () => first },
    "@/libs/geminiMenu": {
      optimizeMenuImageForGemini: async (value) => value,
      extractMenuItemsWithGemini: async () => {
        aiCalls++;
        return [];
      },
    },
  });
  const fields = {
    invitationId: "invite-1",
    shop: "Quán A",
    image: new File([buffer], "menu.png", { type: "image/png" }),
  };
  const result = await route.POST({
    formData: async () => ({ get: (key) => fields[key] }),
  });
  assert.equal(result.status, 200);
  assert.equal(aiCalls, 0);
  assert.equal(result.body.catalog.reused, true);
  assert.equal(state.menuCatalog[0].imageUrl, first);
  assert.equal(state.invitations[0].menus[0].imageUrl, first);
  assert.equal(state.invitations[1].menus[0].imageUrl, first);
  console.log(
    "PASS: checksum deduplication, invalid checksum, MinIO failures, catalog reuse without Gemini, shared legacy URL migration",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import env from "@next/env";

env.loadEnvConfig(process.cwd());
const { syncPlanePersonnel } = await import("../src/libs/planeIntegration.js");
const { getMysqlPool, isMysqlEnabled } = await import("../src/libs/mysql.js");
try {
  const result = await syncPlanePersonnel();
  console.log(
    `Plane: ${result.members} nhân sự đang hoạt động trong workspace ${result.workspace}.`,
  );
} finally {
  if (isMysqlEnabled()) await getMysqlPool().end();
}

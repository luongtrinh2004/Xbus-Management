// Test double for next-auth/jwt: the token is injected through a global so
// route tests can exercise authenticated and anonymous requests without
// minting real session cookies.

export async function getToken() {
  return globalThis.__WORK_TEST_TOKEN ?? null;
}

export async function encode() {
  throw new Error("not used in tests");
}

export async function decode() {
  throw new Error("not used in tests");
}

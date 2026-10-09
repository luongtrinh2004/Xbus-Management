import { resolve as baseResolve } from "./work-route-loader.mjs";
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server")
    return {
      url: new URL("./stubs/overtimeNextServer.mjs", import.meta.url).href,
      shortCircuit: true,
    };
  return baseResolve(specifier, context, nextResolve);
}

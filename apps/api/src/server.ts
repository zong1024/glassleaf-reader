import { buildApp } from "./app.js";
import { env } from "./env.js";
import { ensureStorageRoot } from "./lib/storage.js";

const app = await buildApp();

await ensureStorageRoot();

await app.listen({
  host: env.HOST,
  port: env.PORT,
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

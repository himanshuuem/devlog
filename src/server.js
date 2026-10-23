import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { PostStore } from "./store.js";
import { SEED_POSTS } from "./seed.js";

const dataFile = process.env.DATA_FILE ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "posts.json");
const store = await new PostStore(dataFile).load(SEED_POSTS);

const port = Number(process.env.PORT ?? 3000);
const server = createApp(store, { adminPassword: process.env.ADMIN_PASSWORD }).listen(port, () => console.log(`📝 DevLog running at http://localhost:${port}`));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

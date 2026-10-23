import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Tiny JSON-file repository. Writes go to a temp file and are renamed into place (atomic on POSIX),
 * and are chained on a promise so concurrent requests can't interleave.
 */
export class PostStore {
  #file;
  #posts = [];
  #writeChain = Promise.resolve();

  constructor(file) {
    this.#file = file;
  }

  async load(seed = []) {
    try {
      this.#posts = JSON.parse(await readFile(this.#file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      this.#posts = seed.map((post) => ({ ...post }));
      await this.#persist();
    }
    return this;
  }

  #persist() {
    const snapshot = JSON.stringify(this.#posts, null, 2);
    this.#writeChain = this.#writeChain.then(async () => {
      await mkdir(path.dirname(this.#file), { recursive: true });
      const temp = `${this.#file}.${process.pid}.tmp`;
      await writeFile(temp, snapshot, "utf8");
      await rename(temp, this.#file);
    });
    return this.#writeChain;
  }

  list({ tag, q } = {}) {
    const query = q?.trim().toLowerCase();
    return this.#posts
      .filter((post) => !tag || post.tags.includes(tag))
      .filter((post) => !query || `${post.title} ${post.body} ${post.tags.join(" ")}`.toLowerCase().includes(query))
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  tags() {
    const counts = new Map();
    for (const post of this.#posts) for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  get(id) {
    return this.#posts.find((post) => post.id === id) ?? null;
  }

  async create(fields) {
    const now = new Date().toISOString();
    const post = { id: randomUUID(), ...fields, createdAt: now, updatedAt: now };
    this.#posts.push(post);
    await this.#persist();
    return post;
  }

  async update(id, fields) {
    const post = this.get(id);
    if (!post) return null;
    Object.assign(post, fields, { updatedAt: new Date().toISOString() });
    await this.#persist();
    return post;
  }

  async remove(id) {
    const before = this.#posts.length;
    this.#posts = this.#posts.filter((post) => post.id !== id);
    if (this.#posts.length === before) return false;
    await this.#persist();
    return true;
  }
}

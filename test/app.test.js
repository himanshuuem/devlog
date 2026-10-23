import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";
import { PostStore } from "../src/store.js";
import { SEED_POSTS } from "../src/seed.js";
import { validatePost, renderMarkdown, readingTime } from "../src/posts.js";

let dir;
let dataFile;
let server;
let base;

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "devlog-"));
  dataFile = path.join(dir, "posts.json");
  const store = await new PostStore(dataFile).load(SEED_POSTS);
  server = createApp(store).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

const form = (url, body) => fetch(`${base}${url}`, {
  method: "POST",
  redirect: "manual",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(body),
});

test("validatePost normalises tags and reports errors", () => {
  const ok = validatePost({ title: "Hello world", body: "This is long enough.", tags: "Node, node , Express JS" });
  assert.deepEqual(ok.value.tags, ["node", "express-js"]);
  assert.equal(ok.errors, undefined);
  const bad = validatePost({ title: "x", body: "short" });
  assert.ok(bad.errors.title && bad.errors.body);
});

test("renderMarkdown strips scripts and javascript: links", () => {
  const html = renderMarkdown('**hi** <script>alert(1)</script> [x](javascript:alert(1))');
  assert.match(html, /<strong>hi<\/strong>/);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /javascript:/);
});

test("readingTime is at least one minute", () => {
  assert.equal(readingTime("one two"), 1);
});

test("home lists seeded posts and filters by tag", async () => {
  const home = await (await fetch(`${base}/`)).text();
  assert.match(home, /Welcome to DevLog/);
  const tagged = await (await fetch(`${base}/?tag=security`)).text();
  assert.match(tagged, /Rate limiting without a library/);
  assert.doesNotMatch(tagged, /What I learned building a QR code CLI/);
});

test("full CRUD flow persists to disk", async () => {
  const created = await form("/posts", { title: "Testing DevLog", body: "Integration tests are **great**.", tags: "testing" });
  assert.equal(created.status, 303);
  const location = created.headers.get("location");
  const id = location.split("/")[2].split("?")[0];

  const page = await (await fetch(`${base}/posts/${id}`)).text();
  assert.match(page, /<strong>great<\/strong>/);

  const edited = await form(`/posts/${id}/edit`, { title: "Testing DevLog (edited)", body: "Still great, now edited.", tags: "testing" });
  assert.equal(edited.status, 303);
  const saved = JSON.parse(await readFile(dataFile, "utf8"));
  assert.ok(saved.some((post) => post.title === "Testing DevLog (edited)"));

  const deleted = await form(`/posts/${id}/delete`, {});
  assert.equal(deleted.status, 303);
  assert.equal((await fetch(`${base}/posts/${id}`)).status, 404);
});

test("invalid post re-renders the form with 422", async () => {
  const res = await form("/posts", { title: "", body: "" });
  assert.equal(res.status, 422);
  assert.match(await res.text(), /Title needs at least 3 characters/);
});

test("search matches body text", async () => {
  const html = await (await fetch(`${base}/?q=parseArgs`)).text();
  assert.match(html, /What I learned building a QR code CLI/);
});

test("write routes require Basic auth when ADMIN_PASSWORD is set", async () => {
  const store = await new PostStore(path.join(dir, "locked.json")).load(SEED_POSTS);
  const locked = createApp(store, { adminPassword: "s3cret" }).listen(0);
  await new Promise((resolve) => locked.once("listening", resolve));
  const url = `http://127.0.0.1:${locked.address().port}`;
  try {
    assert.equal((await fetch(`${url}/`)).status, 200);
    assert.equal((await fetch(`${url}/posts/new`)).status, 401);
    const auth = `Basic ${Buffer.from("admin:s3cret").toString("base64")}`;
    assert.equal((await fetch(`${url}/posts/new`, { headers: { authorization: auth } })).status, 200);
  } finally {
    locked.close();
  }
});

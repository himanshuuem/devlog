import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { validatePost, renderMarkdown, readingTime, excerpt } from "./posts.js";
import { adminAuth } from "./adminAuth.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const FLASH = {
  created: "Post published 🎉",
  updated: "Changes saved",
  deleted: "Post deleted",
};

export function createApp(store, { adminPassword } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("view engine", "ejs");
  app.set("views", path.join(root, "views"));
  app.use(express.static(path.join(root, "public")));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));

  app.use((req, res, next) => {
    res.locals.flash = FLASH[req.query.flash] ?? null;
    res.locals.allTags = store.tags();
    res.locals.query = typeof req.query.q === "string" ? req.query.q : "";
    res.locals.activeTag = typeof req.query.tag === "string" ? req.query.tag : "";
    res.locals.formatDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    res.locals.readingTime = readingTime;
    res.locals.excerpt = excerpt;
    next();
  });

  const requireAdmin = adminAuth(adminPassword);

  const loadPost = (req, res, next) => {
    const post = store.get(req.params.id);
    if (!post) return res.status(404).render("404");
    res.locals.post = post;
    next();
  };

  app.get("/", (req, res) => {
    const posts = store.list({ tag: res.locals.activeTag, q: res.locals.query });
    res.render("index", { posts });
  });

  app.get("/posts/new", requireAdmin, (req, res) => res.render("form", { mode: "new", values: { title: "", body: "", tags: [] }, errors: {} }));

  app.post("/posts", requireAdmin, async (req, res, next) => {
    try {
      const { value, errors } = validatePost(req.body);
      if (errors) return res.status(422).render("form", { mode: "new", values: value, errors });
      const post = await store.create(value);
      res.redirect(303, `/posts/${post.id}?flash=created`);
    } catch (error) {
      next(error);
    }
  });

  app.get("/posts/:id", loadPost, (req, res) => {
    res.render("post", { html: renderMarkdown(res.locals.post.body) });
  });

  app.get("/posts/:id/edit", requireAdmin, loadPost, (req, res) => {
    res.render("form", { mode: "edit", values: res.locals.post, errors: {} });
  });

  // HTML forms only speak GET/POST, so edit and delete use POST to explicit sub-routes.
  app.post("/posts/:id/edit", requireAdmin, loadPost, async (req, res, next) => {
    try {
      const { value, errors } = validatePost(req.body);
      if (errors) return res.status(422).render("form", { mode: "edit", values: { ...value, id: req.params.id }, errors });
      await store.update(req.params.id, value);
      res.redirect(303, `/posts/${req.params.id}?flash=updated`);
    } catch (error) {
      next(error);
    }
  });

  app.post("/posts/:id/delete", requireAdmin, loadPost, async (req, res, next) => {
    try {
      await store.remove(req.params.id);
      res.redirect(303, "/?flash=deleted");
    } catch (error) {
      next(error);
    }
  });

  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use((req, res) => res.status(404).render("404"));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render("404", { message: "Something broke on our side. Please try again." });
  });

  return app;
}

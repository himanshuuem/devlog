import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export const LIMITS = { title: 120, body: 20_000, tags: 5 };

/** Validate and normalise form input. Returns { value } or { errors }. */
export function validatePost(input) {
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  const tags = [...new Set(String(input.tags ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean))];

  const errors = {};
  if (title.length < 3) errors.title = "Title needs at least 3 characters.";
  if (title.length > LIMITS.title) errors.title = `Title must be under ${LIMITS.title} characters.`;
  if (body.length < 10) errors.body = "Write at least a sentence (10+ characters).";
  if (body.length > LIMITS.body) errors.body = `Post is too long (max ${LIMITS.body.toLocaleString()} characters).`;
  if (tags.length > LIMITS.tags) errors.tags = `Use up to ${LIMITS.tags} tags.`;

  return Object.keys(errors).length ? { errors, value: { title, body, tags } } : { value: { title, body, tags } };
}

/** Markdown → HTML, then sanitised so user posts can't inject scripts. */
export function renderMarkdown(markdown) {
  const html = marked.parse(markdown, { gfm: true, breaks: false });
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "del"]),
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "title"], code: ["class"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}

export function readingTime(markdown) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function excerpt(markdown, length = 180) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-[\]()!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > length ? `${plain.slice(0, length).trimEnd()}…` : plain;
}

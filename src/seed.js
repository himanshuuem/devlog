export const SEED_POSTS = [
  {
    id: "welcome-to-devlog",
    title: "Welcome to DevLog",
    tags: ["meta", "express"],
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
    body: `DevLog is a tiny blog engine I built with **Express** and **EJS**.

## What it does

- Write posts in *Markdown* (sanitised, so no script injection)
- Tag posts and filter by tag
- Search titles, bodies and tags
- Edit and delete with confirmation

\`\`\`js
app.post("/posts", async (req, res) => {
  const { value, errors } = validatePost(req.body);
  // ...
});
\`\`\`

Try creating a post with the **New post** button.`,
  },
  {
    id: "what-i-learned-building-a-qr-cli",
    title: "What I learned building a QR code CLI",
    tags: ["node", "cli"],
    createdAt: "2026-10-18T14:30:00.000Z",
    updatedAt: "2026-10-18T14:30:00.000Z",
    body: `Node's built-in \`parseArgs\` is good enough that I didn't need a CLI framework.

> Validate early, fail loudly, exit with a non-zero code.

The trickiest part was telling \`localhost:3000\` (a host and port) apart from \`javascript:alert(1)\` (a scheme). A negative lookahead did it.`,
  },
  {
    id: "rate-limiting-without-a-library",
    title: "Rate limiting without a library",
    tags: ["security", "express"],
    createdAt: "2026-10-15T08:10:00.000Z",
    updatedAt: "2026-10-15T08:10:00.000Z",
    body: `A fixed-window limiter is about 30 lines: a \`Map\` from IP to \`{ start, count }\`, plus a periodic sweep so memory doesn't grow without bound.

1. Count the request
2. If over the limit, send **429** with a \`Retry-After\` header
3. Otherwise call \`next()\`

For multiple instances you'd move the counters into Redis.`,
  },
];

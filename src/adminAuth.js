import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value) => createHash("sha256").update(value).digest();

/**
 * Optional HTTP Basic auth for write routes. When no password is configured (local dev),
 * everything is open; on a public deploy set ADMIN_PASSWORD so strangers can read but not write.
 */
export function adminAuth(password) {
  if (!password) return (req, res, next) => next();
  const expected = digest(`admin:${password}`);
  return (req, res, next) => {
    const [scheme, encoded] = (req.headers.authorization ?? "").split(" ");
    const supplied = scheme === "Basic" && encoded ? Buffer.from(encoded, "base64").toString() : "";
    if (supplied && timingSafeEqual(digest(supplied), expected)) return next();
    res.set("WWW-Authenticate", 'Basic realm="DevLog admin", charset="UTF-8"');
    res.status(401).send("Authentication required to write posts.");
  };
}

const crypto = require("crypto");

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...v] = c.trim().split("=");
      return [key, v.join("=")];
    })
  );
}

function verifyToken(token, secret) {
  if (!token) return null;

  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  if (expected !== signature) return null;

  const payload = JSON.parse(Buffer.from(data, "base64url").toString());
  if (Date.now() > payload.exp) return null;

  return payload;
}

module.exports = async (req, res) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.admin_session;
  const payload = verifyToken(token, process.env.ADMIN_SECRET);

  if (!payload) {
    return res.status(200).json({ authenticated: false });
  }

  return res.status(200).json({ authenticated: true, user: payload.user });
};
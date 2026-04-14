import crypto from "crypto";

function createToken(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { username, password } = req.body || {};

    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = createToken(
        {
          user: username,
          exp: Date.now() + 1000 * 60 * 60 * 24
        },
        process.env.ADMIN_SECRET
      );

      res.setHeader(
        "Set-Cookie",
        `admin_session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax; Secure`
      );

      return res.status(200).json({ success: true });
    }

    return res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
}

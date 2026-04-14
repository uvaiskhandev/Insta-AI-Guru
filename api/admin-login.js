export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const { username, password } = req.body || {};

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Missing environment variables"
      });
    }

    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      res.setHeader(
        "Set-Cookie",
        `admin_session=${process.env.ADMIN_SECRET}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax; Secure`
      );

      return res.status(200).json({
        success: true,
        message: "Login successful"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
}

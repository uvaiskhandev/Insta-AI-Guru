export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const { username, password } = req.body || {};

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return res.status(500).json({
        success: false,
        message: "Admin credentials not configured on server"
      });
    }

    if (username === adminUsername && password === adminPassword) {
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
      message: "Server error"
    });
  }
}
function parseCookies(cookieHeader = "") {
  const cookies = {};

  cookieHeader.split(";").forEach((part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return;
    cookies[key] = rest.join("=");
  });

  return cookies;
}

export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_SECRET) {
      return res.status(500).json({
        authenticated: false,
        message: "Missing ADMIN_SECRET"
      });
    }

    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies.admin_session;

    if (token === process.env.ADMIN_SECRET) {
      return res.status(200).json({
        authenticated: true
      });
    }

    return res.status(200).json({
      authenticated: false
    });
  } catch (error) {
    return res.status(500).json({
      authenticated: false,
      message: error.message || "Server error"
    });
  }
}

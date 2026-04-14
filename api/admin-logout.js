module.exports = async (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure"
  );

  return res.status(200).json({ success: true });
};
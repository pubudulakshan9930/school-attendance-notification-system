const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "to_be_changed_in_production"; // Ensure this is set in .env for production use

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication token missing." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log("[AUTH] Token verified:", {
      userId: req.user.userId,
      role: req.user.role,
    });
    return next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    const userRole = (req.user?.role || "").toLowerCase();
    const requiredRole = (role || "").toLowerCase();
    console.log("[ROLE_CHECK]", {
      userRole,
      requiredRole,
      match: userRole === requiredRole,
    });

    if (
      !req.user ||
      (req.user.role || "").toLowerCase() !== (role || "").toLowerCase()
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden. Insufficient permissions." });
    }
    return next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
};

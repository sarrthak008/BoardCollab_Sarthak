import jwt from "jsonwebtoken";
import responser from "../utils/responder.js";

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return responser({
      res,
      success: false,
      status: 401,
      message: "Not authorized, no token provided",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    return responser({
      res,
      success: false,
      status: 401,
      message: "Invalid or expired token",
    });
  }
};
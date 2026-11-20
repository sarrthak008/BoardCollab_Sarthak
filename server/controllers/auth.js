import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import responser from "../utils/responder.js";

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return responser({
        res,
        success: false,
        status: 400,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return responser({
        res,
        success: false,
        status: 400,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    return responser({
      res,
      status: 201,
      message: "Account created successfully",
      data: {
        token: generateToken(user),
        user: { id: user._id, name: user.name, email: user.email },
      },
    });
  } catch (error) {
    return responser({
      res,
      success: false,
      status: 500,
      message: error.message,
    });
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return responser({
        res,
        success: false,
        status: 400,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return responser({
        res,
        success: false,
        status: 401,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return responser({
        res,
        success: false,
        status: 401,
        message: "Invalid email or password",
      });
    }

    return responser({
      res,
      status: 200,
      message: "Logged in successfully",
      data: {
        token: generateToken(user),
        user: { id: user._id, name: user.name, email: user.email },
      },
    });
  } catch (error) {
    return responser({
      res,
      success: false,
      status: 500,
      message: error.message,
    });
  }
};


export{registerUser , loginUser}
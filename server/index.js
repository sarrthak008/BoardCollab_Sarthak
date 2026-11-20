import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

config();

import connectodb from "./config/connectDB.js";
import { initSocket } from "./sockets/socketsHadler.js"; 

import { protect } from "./middlewares/auth.middleware.js";

import { getServerHealth } from "./controllers/health.js";
import { registerUser, loginUser } from "./controllers/auth.js";
import {
  getAllRooms,
  createRoom,
  getRoomById,
  deleteRoom,
} from "./controllers/rooms.js"; 

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 30000,
  pingTimeout: 10000,
});

initSocket(io);

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/health", getServerHealth);
app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginUser);


app.get("/api/rooms", protect, getAllRooms);
app.post("/api/rooms", protect, createRoom);
app.get("/api/rooms/:id", protect, getRoomById);
app.delete("/api/rooms/:id", protect, deleteRoom);


server.listen(PORT, async () => {
  await connectodb();
  console.log(`Server & Socket.IO listening on port ${PORT}`);
});
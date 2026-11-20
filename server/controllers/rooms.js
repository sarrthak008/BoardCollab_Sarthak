import bcrypt from "bcryptjs";
import crypto from "crypto";
import Room from "../models/room.model.js";
import responser from "../utils/responder.js";


const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .select("roomId name owner users password lastUpdated")
      .populate("owner", "name")
      .sort({ lastUpdated: -1 });

    const formatted = rooms.map((r) => ({
      roomId: r.roomId,
      name: r.name,
      ownerId: r.owner?._id,
      ownerName: r.owner?.name || "Unknown",
      isPrivate: Boolean(r.password),
      online: r.users.length,
    }));

    return responser({
      res,
      status: 200,
      data: formatted,
      message: "Rooms fetched successfully",
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

const createRoom = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !name.trim()) {
      return responser({
        res,
        success: false,
        status: 400,
        message: "Room name is required",
      });
    }

    const roomId = crypto.randomBytes(4).toString("hex");
    const hashedPassword =
      password && password.trim() ? await bcrypt.hash(password.trim(), 10) : "";

    const room = await Room.create({
      roomId,
      name: name.trim(),
      password: hashedPassword,
      owner: req.user.id,
      elements: [],
      users: [{ userId: req.user.id }],
    });

    return responser({
      res,
      status: 201,
      message: "Room created successfully",
      data: {
        roomId: room.roomId,
        name: room.name,
        ownerId: req.user.id,
        isPrivate: Boolean(room.password),
        online: 1,
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

const getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.id });
    if (!room) {
      return responser({
        res,
        success: false,
        status: 404,
        message: "Room not found",
      });
    }

    if (room.password && room.owner.toString() !== req.user.id) {
      const roomPassword = req.headers["x-room-password"];
      if (!roomPassword) {
        return responser({
          res,
          success: false,
          status: 403,
          data: { requiresPassword: true },
          message: "Room password required",
        });
      }

      const isMatch = await bcrypt.compare(roomPassword, room.password);
      if (!isMatch) {
        return responser({
          res,
          success: false,
          status: 401,
          message: "Incorrect room password",
        });
      }
    }

    return responser({
      res,
      status: 200,
      message: "Room fetched successfully",
      data: {
        roomId: room.roomId,
        name: room.name,
        ownerId: room.owner,
        elements: room.elements,
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

const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.id });
    if (!room) {
      return responser({
        res,
        success: false,
        status: 404,
        message: "Room not found",
      });
    }

    if (room.owner.toString() !== req.user.id) {
      return responser({
        res,
        success: false,
        status: 403,
        message: "Only the room owner can delete this room",
      });
    }

    await Room.deleteOne({ roomId: req.params.id });

    return responser({
      res,
      status: 200,
      data: { roomId: req.params.id },
      message: "Room deleted successfully",
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


export { getAllRooms , createRoom , getRoomById , deleteRoom}
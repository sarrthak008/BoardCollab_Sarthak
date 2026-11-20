import jwt from "jsonwebtoken";
import Room from "../models/room.model.js";

// In-memory store for active rooms to avoid MongoDB write thrashing
// Map<roomId, { elements: Array, dirty: Boolean, eventCount: Number, activeUsers: Map<socketId, user> }>
const activeRooms = new Map();

// Helper: Persist dirty room states to MongoDB
const flushRoomToDB = async (roomId) => {
  const roomState = activeRooms.get(roomId);
  if (!roomState || !roomState.dirty) return;

  try {
    await Room.findOneAndUpdate(
      { roomId },
      {
        elements: roomState.elements,
        lastUpdated: new Date(),
      }
    );
    roomState.dirty = false;
    roomState.eventCount = 0;
  } catch (error) {
    console.error(`Failed to batch-save room ${roomId}:`, error.message);
  }
};

// Background interval: Batch-save modified rooms every 5 seconds
setInterval(() => {
  for (const [roomId, state] of activeRooms.entries()) {
    if (state.dirty) {
      flushRoomToDB(roomId);
    }
  }
}, 5000);

export const initSocket = (io) => {
  // 1. JWT Authentication Middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, name, email }
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.id})`);

    // 2. Join Room
    socket.on("join-room", async ({ roomId }) => {
      try {
        if (!roomId) return;

        // Load room into memory if not already cached
        if (!activeRooms.has(roomId)) {
          const roomDoc = await Room.findOne({ roomId });
          if (!roomDoc) {
            socket.emit("error-message", { message: "Room not found" });
            return;
          }

          activeRooms.set(roomId, {
            elements: roomDoc.elements || [],
            dirty: false,
            eventCount: 0,
            activeUsers: new Map(),
          });
        }

        const roomState = activeRooms.get(roomId);
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Track connected user
        roomState.activeUsers.set(socket.id, {
          userId: socket.user.id,
          name: socket.user.name,
        });

        // Send current canvas elements to the joining user
        socket.emit("canvas-state", {
          elements: roomState.elements,
        });

        // Broadcast updated user list to everyone in the room
        io.to(roomId).emit(
          "room-users",
          Array.from(roomState.activeUsers.values())
        );
      } catch (error) {
        console.error("join-room error:", error.message);
      }
    });

    // 3. Draw Stroke / Add Shape / Add Text
    socket.on("draw-stroke", ({ roomId, element }) => {
      const roomState = activeRooms.get(roomId);
      if (!roomState || !element) return;

      const enrichedElement = {
        ...element,
        userId: socket.user.id,
        timestamp: new Date(),
      };

      roomState.elements.push(enrichedElement);
      roomState.dirty = true;
      roomState.eventCount += 1;

      // Broadcast to all OTHER users in the room
      socket.to(roomId).emit("draw-stroke", { element: enrichedElement });

      // Flush immediately if 100 events accumulated before the 5s timer
      if (roomState.eventCount >= 100) {
        flushRoomToDB(roomId);
      }
    });

    // 4. Update Element (Drag / Resize / Edit Text)
    socket.on("update-element", ({ roomId, element }) => {
      const roomState = activeRooms.get(roomId);
      if (!roomState || !element) return;

      const index = roomState.elements.findIndex((el) => el.id === element.id);
      if (index !== -1) {
        // Basic conflict check: apply latest update
        roomState.elements[index] = {
          ...roomState.elements[index],
          data: element.data,
          timestamp: new Date(),
        };
        roomState.dirty = true;
        roomState.eventCount += 1;

        socket.to(roomId).emit("update-element", {
          element: roomState.elements[index],
        });
      }
    });

    // 5. Per-User Undo (Removes specific element ID belonging to this user)
    socket.on("undo", ({ roomId, elementId }) => {
      const roomState = activeRooms.get(roomId);
      if (!roomState || !elementId) return;

      roomState.elements = roomState.elements.filter(
        (el) => el.id !== elementId
      );
      roomState.dirty = true;

      socket.to(roomId).emit("undo", { elementId });
    });

    // 6. Per-User Redo (Restores element belonging to this user)
    socket.on("redo", ({ roomId, element }) => {
      const roomState = activeRooms.get(roomId);
      if (!roomState || !element) return;

      roomState.elements.push(element);
      roomState.dirty = true;

      socket.to(roomId).emit("redo", { element });
    });

    // 7. Clear Canvas
    socket.on("clear-canvas", ({ roomId }) => {
      const roomState = activeRooms.get(roomId);
      if (!roomState) return;

      roomState.elements = [];
      roomState.dirty = true;
      flushRoomToDB(roomId);

      socket.to(roomId).emit("clear-canvas");
    });

    // 8. Live Cursor Movement
    socket.on("cursor-move", ({ roomId, x, y }) => {
      socket.to(roomId).emit("cursor-move", {
        socketId: socket.id,
        userId: socket.user.id,
        name: socket.user.name,
        x,
        y,
      });
    });

    // 9. Heartbeat (30s ping/pong)
    socket.on("heartbeat", () => {
      socket.emit("heartbeat-ack", { timestamp: Date.now() });
    });

    // 10. Disconnect & Cleanup
    socket.on("disconnect", async () => {
      const roomId = socket.currentRoom;
      if (roomId && activeRooms.has(roomId)) {
        const roomState = activeRooms.get(roomId);
        roomState.activeUsers.delete(socket.id);

        io.to(roomId).emit(
          "room-users",
          Array.from(roomState.activeUsers.values())
        );

        // If room is now empty, flush remaining changes to DB and free memory
        if (roomState.activeUsers.size === 0) {
          await flushRoomToDB(roomId);
          activeRooms.delete(roomId);
        }
      }
      console.log(`Socket disconnected: ${socket.user.name}`);
    });
  });
};
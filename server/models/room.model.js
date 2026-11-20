import mongoose from "mongoose";

const elementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true }, 
    data: { type: Object, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    default: "", 
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  elements: [elementSchema],
  users: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Room", roomSchema);
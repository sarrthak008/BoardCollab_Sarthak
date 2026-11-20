import React, { useState } from "react";
import { sileo } from "sileo";
import Logout from "../components/Logout"

const initialRooms = [
  {
    id: 1,
    name: "Product Design Sprint",
    online: 120,
    isPrivate: false,
    avatars: [
      { initials: "AK", bg: "bg-[#ffe11b]" },
      { initials: "SR", bg: "bg-[#bae6fd]" },
      { initials: "MJ", bg: "bg-[#dcd6ff]" },
    ],
  },
  {
    id: 2,
    name: "System Architecture & API",
    online: 48,
    isPrivate: true,
    avatars: [
      { initials: "DN", bg: "bg-[#bae6fd]" },
      { initials: "PR", bg: "bg-[#ffe11b]" },
      { initials: "VK", bg: "bg-neutral-200" },
    ],
  },
  {
    id: 3,
    name: "Frontend Wireframes",
    online: 84,
    isPrivate: false,
    avatars: [
      { initials: "TR", bg: "bg-[#dcd6ff]" },
      { initials: "SL", bg: "bg-[#ffe11b]" },
      { initials: "AM", bg: "bg-[#bae6fd]" },
    ],
  },
  {
    id: 4,
    name: "Open Brainstorm Lounge",
    online: 215,
    isPrivate: false,
    avatars: [
      { initials: "NK", bg: "bg-[#ffe11b]" },
      { initials: "RP", bg: "bg-[#bae6fd]" },
      { initials: "YS", bg: "bg-neutral-200" },
    ],
  },
];

const Rooms = () => {
  const [rooms, setRooms] = useState(initialRooms);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: "",
    password: "",
  });

  const handleChange = (e) => {
    setRoomForm({ ...roomForm, [e.target.name]: e.target.value });
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();

    const trimmedName = roomForm.name.trim();
    if (!trimmedName) {
      sileo.error({ title: "Room name is required" });
      return;
    }

    const newRoom = {
      id: Date.now(),
      name: trimmedName,
      online: 1,
      isPrivate: Boolean(roomForm.password.trim()),
      avatars: [
        { initials: "YO", bg: "bg-[#ffe11b]" },
        { initials: "U2", bg: "bg-[#bae6fd]" },
        { initials: "U3", bg: "bg-[#dcd6ff]" },
      ],
    };

    setRooms([newRoom, ...rooms]);
    sileo.success({
      title: "Room created!",
      description: `Joined "${trimmedName}"`,
    });
    setRoomForm({ name: "", password: "" });
    setIsModalOpen(false);
  };

  const handleJoinRoom = (room) => {
    sileo.success({
      title: `Joining ${room.name}`,
      description: `${room.online} users online`,
    });
  };

  return (
    <div className="min-h-screen w-full bg-white text-neutral-900 font-sans relative px-6 py-24">
      {/* Create Your Own Room */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="fixed top-[10%] right-[10%] z-20 flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-black transition cursor-pointer"
      >
        <i className="ri-add-line text-lg"></i>
        <span className="underline decoration-[#ffe11b] decoration-2 underline-offset-4">
          Create your own room
        </span>
      </button>

      {/* Centered Rooms List */}
      <div className="w-full max-w-xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 leading-snug">
            Active{" "}
            <span className="bg-[#ffe11b] px-2 py-0.5 rounded-md">rooms</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1.5">
            Pick a room to sketch live on{" "}
            <span className="bg-[#bae6fd] text-neutral-900 font-medium px-1.5 py-0.5 rounded">
              BoardCollab
            </span>
            .
          </p>
        </div>

        {/* Borderless Clean Rows */}
        <div className="divide-y divide-neutral-100">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => handleJoinRoom(room)}
              className="group -mx-3 px-3 py-4 rounded-xl hover:bg-neutral-50/90 flex items-center justify-between gap-4 transition cursor-pointer"
            >
              {/* Left: Room Name + Arrow */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-neutral-800 group-hover:text-black transition truncate">
                  {room.name}
                </span>
                {room.isPrivate && (
                  <i
                    className="ri-lock-line text-xs text-neutral-400 shrink-0"
                    title="Password protected"
                  ></i>
                )}
                <i className="ri-arrow-right-up-line text-base text-neutral-400 group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0"></i>
              </div>

              {/* Right: Overlapping User Circles + Online Count */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex -space-x-2">
                  {room.avatars.map((avatar, idx) => (
                    <div
                      key={idx}
                      className={`w-6 h-6 rounded-full ${avatar.bg} ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-neutral-900`}
                    >
                      {avatar.initials}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-neutral-500 font-medium min-w-[68px] text-right">
                  {room.online} online
                </span>
              </div>
            </div>
          ))}
        </div>

        <Logout/>
      </div>

      {/* Create Room Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs px-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-6 shadow-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>

            <h2 className="text-xl font-bold text-neutral-900">
              Create{" "}
              <span className="bg-[#bae6fd] px-2 py-0.5 rounded-md">room</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Enter a room name and optional password.
            </p>

            <form onSubmit={handleCreateRoom} noValidate className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={roomForm.name}
                  onChange={handleChange}
                  placeholder="Design Sync"
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Room Password{" "}
                  <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={roomForm.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-black transition"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white font-medium text-sm py-2.5 px-4 rounded-lg hover:bg-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Create</span>
                <i className="ri-arrow-right-up-line text-base"></i>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;
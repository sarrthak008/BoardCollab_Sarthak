import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sileo } from "sileo";
import Logout from "../components/Logout";
import api from "../utils/api";

const AVATAR_STYLES = ["bg-[#ffe11b]", "bg-[#bae6fd]", "bg-[#dcd6ff]", "bg-neutral-200"];

const getInitials = (name = "U") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const Rooms = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: "",
    password: "",
  });

  // Private room password prompt state
  const [privateRoom, setPrivateRoom] = useState(null);
  const [joinPassword, setJoinPassword] = useState("");

  const fetchRooms = async () => {
    try {
      const res = await api.get("/api/rooms");
      const fetched = (res.data.data || []).map((room, idx) => ({
        ...room,
        id: room.roomId,
        avatars: [
          {
            initials: getInitials(room.ownerName || room.name),
            bg: AVATAR_STYLES[idx % AVATAR_STYLES.length],
          },
          {
            initials: "+1",
            bg: AVATAR_STYLES[(idx + 1) % AVATAR_STYLES.length],
          },
        ],
      }));
      setRooms(fetched);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/register");
      } else {
        sileo.error({
          title: error.response?.data?.message || "Failed to load rooms",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleChange = (e) => {
    setRoomForm({ ...roomForm, [e.target.name]: e.target.value });
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    const trimmedName = roomForm.name.trim();
    if (!trimmedName) {
      sileo.error({ title: "Room name is required" });
      return;
    }

    try {
      const res = await api.post("/api/rooms", {
        name: trimmedName,
        password: roomForm.password,
      });

      const created = res.data.data;
      sileo.success({
        title: "Room created!",
        description: `Joined "${created.name}"`,
      });
      setRoomForm({ name: "", password: "" });
      setIsModalOpen(false);
      navigate(`/board/${created.roomId}`);
    } catch (error) {
      sileo.error({
        title: error.response?.data?.message || "Failed to create room",
      });
    }
  };

  const handleJoinRoom = (room) => {
    if (room.isPrivate && room.ownerId !== currentUser.id) {
      setPrivateRoom(room);
      setJoinPassword("");
      return;
    }

    sileo.success({
      title: `Joining ${room.name}`,
      description: `${room.online} users online`,
    });
    navigate(`/board/${room.roomId}`);
  };

  const handlePrivateJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinPassword.trim()) {
      sileo.error({ title: "Password is required" });
      return;
    }

    try {
      await api.get(`/api/rooms/${privateRoom.roomId}`, {
        headers: { "x-room-password": joinPassword },
      });
      sessionStorage.setItem(`room_pw_${privateRoom.roomId}`, joinPassword);
      sileo.success({
        title: `Joining ${privateRoom.name}`,
        description: `${privateRoom.online} users online`,
      });
      const targetId = privateRoom.roomId;
      setPrivateRoom(null);
      navigate(`/board/${targetId}`);
    } catch (error) {
      sileo.error({
        title: error.response?.data?.message || "Incorrect room password",
      });
    }
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      sileo.success({ title: "Room deleted" });
    } catch (error) {
      sileo.error({
        title: error.response?.data?.message || "Could not delete room",
      });
    }
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
          {loading ? (
            <p className="text-xs text-neutral-400 py-4">Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4">
              No active rooms yet. Click "Create your own room" to start one.
            </p>
          ) : (
            rooms.map((room) => (
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

                {/* Right: Overlapping User Circles + Online Count + Owner Delete */}
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
                  {room.ownerId === currentUser.id && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRoom(e, room.roomId)}
                      title="Delete room"
                      className="text-neutral-400 hover:text-red-600 transition cursor-pointer"
                    >
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Logout />
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

      {/* Private Room Password Modal */}
      {privateRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs px-4"
          onClick={() => setPrivateRoom(null)}
        >
          <div
            className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-6 shadow-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPrivateRoom(null)}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>

            <h2 className="text-xl font-bold text-neutral-900">
              Private{" "}
              <span className="bg-[#ffe11b] px-2 py-0.5 rounded-md">room</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Enter password for {privateRoom.name}
            </p>

            <form onSubmit={handlePrivateJoinSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Room Password
                </label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-black transition"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white font-medium text-sm py-2.5 px-4 rounded-lg hover:bg-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Join Room</span>
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
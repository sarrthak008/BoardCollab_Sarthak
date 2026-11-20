import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Stage, Layer, Line, Rect, Circle, Text, Transformer } from "react-konva";
import { sileo } from "sileo";
import api from "../../utils/api";
import { connectSocket } from "../../utils/socket";

const COLORS = ["#171717", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
const FONT_SIZES = [
  { label: "S", value: 14 },
  { label: "M", value: 18 },
  { label: "L", value: 26 },
  { label: "XL", value: 36 },
];
const STROKE_WIDTHS = [
  { label: "Thin", value: 2 },
  { label: "Med", value: 4 },
  { label: "Bold", value: 7 },
];

const getInitials = (name = "U") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const Board = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const isDrawing = useRef(false);
  const textInputRef = useRef(null);
  const lastCursorEmit = useRef(0);

  const [stageSize, setStageSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Room & Live Collaboration State
  const [roomName, setRoomName] = useState("BoardCollab");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  // Active tool, color, font size & stroke width
  const [tool, setTool] = useState("pen"); // select | pen | rect | circle | text | eraser
  const [color, setColor] = useState("#171717");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(18);

  // Canvas elements & selection state
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Local user Undo / Redo stacks
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Inline text input state
  const [textInput, setTextInput] = useState(null); // { x, y, value }

  useEffect(() => {
    const handleResize = () => {
      setStageSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Offline localStorage cache backup
  useEffect(() => {
    if (roomId && elements.length > 0) {
      localStorage.setItem(`board_cache_${roomId}`, JSON.stringify(elements));
    }
  }, [elements, roomId]);

  // Fetch Room Info & Wire Up Socket.IO Listeners
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/register");
      return;
    }

    const cached = localStorage.getItem(`board_cache_${roomId}`);
    if (cached) {
      try {
        setElements(JSON.parse(cached));
      } catch {}
    }

    const fetchRoomInfo = async () => {
      try {
        const savedPw = sessionStorage.getItem(`room_pw_${roomId}`) || "";
        const res = await api.get(`/api/rooms/${roomId}`, {
          headers: savedPw ? { "x-room-password": savedPw } : {},
        });
        setRoomName(res.data.data.name);
        if (res.data.data.elements?.length) {
          setElements(res.data.data.elements);
        }
      } catch (error) {
        sileo.error({
          title: error.response?.data?.message || "Could not load room",
        });
        navigate("/rooms");
      }
    };

    fetchRoomInfo();

    const socket = connectSocket();
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("join-room", { roomId });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    socket.on("canvas-state", ({ elements: serverElements }) => {
      if (Array.isArray(serverElements)) {
        setElements(serverElements);
      }
    });

    socket.on("room-users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("draw-stroke", ({ element }) => {
      setElements((prev) =>
        prev.some((el) => el.id === element.id) ? prev : [...prev, element]
      );
    });

    socket.on("update-element", ({ element }) => {
      setElements((prev) =>
        prev.map((el) => (el.id === element.id ? element : el))
      );
    });

    socket.on("undo", ({ elementId }) => {
      setElements((prev) => prev.filter((el) => el.id !== elementId));
    });

    socket.on("redo", ({ element }) => {
      setElements((prev) =>
        prev.some((el) => el.id === element.id) ? prev : [...prev, element]
      );
    });

    socket.on("clear-canvas", () => {
      setElements([]);
      setSelectedId(null);
      localStorage.removeItem(`board_cache_${roomId}`);
    });

    socket.on("cursor-move", ({ socketId, name, x, y }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [socketId]: { name, x, y },
      }));
    });

    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("heartbeat");
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("canvas-state");
      socket.off("room-users");
      socket.off("draw-stroke");
      socket.off("update-element");
      socket.off("undo");
      socket.off("redo");
      socket.off("clear-canvas");
      socket.off("cursor-move");
    };
  }, [roomId, navigate]);

  // Attach Konva Transformer box to whichever shape/text is selected
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    if (selectedId && tool === "select") {
      const selectedNode = stageRef.current.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
        return;
      }
    }
    transformerRef.current.nodes([]);
    transformerRef.current.getLayer().batchDraw();
  }, [selectedId, tool, elements]);

  // Delete selected element with Delete / Backspace key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !textInput &&
        document.activeElement.tagName !== "INPUT"
      ) {
        setElements((prev) => prev.filter((el) => el.id !== selectedId));
        connectSocket()?.emit("undo", { roomId, elementId: selectedId });
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, textInput, roomId]);

  // Commit Text Input
  const handleTextSubmit = (e) => {
    if (e) e.preventDefault();
    if (!textInput) return;

    const trimmed = textInput.value.trim();
    if (!trimmed) {
      setTextInput(null);
      return;
    }

    const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newTextElement = {
      id,
      type: "text",
      data: {
        x: textInput.x,
        y: textInput.y,
        text: trimmed,
        fill: color,
        fontSize,
      },
      timestamp: Date.now(),
    };

    setElements((prev) => [...prev, newTextElement]);
    setHistory((prev) => [...prev, newTextElement]);
    setRedoStack([]);
    setTextInput(null);
    setSelectedId(id);
    setTool("select");

    connectSocket()?.emit("draw-stroke", { roomId, element: newTextElement });
  };

  // Mouse / Touch Down
  const handleMouseDown = (e) => {
    const clickedOnEmpty =
      e.target === e.target.getStage() || e.target.name() === "bg-rect";

    if (tool === "select") {
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (tool === "text") {
      if (textInput && textInput.value.trim()) {
        handleTextSubmit();
      }
      setTextInput({ x: pos.x, y: pos.y, value: "" });
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 10);
      return;
    }

    isDrawing.current = true;
    const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let newElement = null;

    if (tool === "pen" || tool === "eraser") {
      newElement = {
        id,
        type: "stroke",
        data: {
          x: 0,
          y: 0,
          points: [pos.x, pos.y],
          stroke: tool === "eraser" ? "#ffffff" : color,
          strokeWidth: tool === "eraser" ? 18 : strokeWidth,
        },
        timestamp: Date.now(),
      };
    } else if (tool === "rect") {
      newElement = {
        id,
        type: "rect",
        data: {
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          stroke: color,
          strokeWidth,
        },
        timestamp: Date.now(),
      };
    } else if (tool === "circle") {
      newElement = {
        id,
        type: "circle",
        data: {
          x: pos.x,
          y: pos.y,
          radius: 0,
          stroke: color,
          strokeWidth,
        },
        timestamp: Date.now(),
      };
    }

    if (newElement) {
      setElements((prev) => [...prev, newElement]);
    }
  };

  // Mouse / Touch Move
  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;

    const now = Date.now();
    if (now - lastCursorEmit.current > 50) {
      lastCursorEmit.current = now;
      connectSocket()?.emit("cursor-move", {
        roomId,
        x: point.x,
        y: point.y,
      });
    }

    if (!isDrawing.current) return;

    setElements((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };

      if (last.type === "stroke") {
        last.data = {
          ...last.data,
          points: [...last.data.points, point.x, point.y],
        };
      } else if (last.type === "rect") {
        last.data = {
          ...last.data,
          width: point.x - last.data.x,
          height: point.y - last.data.y,
        };
      } else if (last.type === "circle") {
        const dx = point.x - last.data.x;
        const dy = point.y - last.data.y;
        last.data = {
          ...last.data,
          radius: Math.sqrt(dx * dx + dy * dy),
        };
      }

      updated[updated.length - 1] = last;
      return updated;
    });
  };

  // Mouse / Touch Up
  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const lastElement = elements[elements.length - 1];
    if (lastElement) {
      setHistory((prev) => [...prev, lastElement]);
      setRedoStack([]);
      connectSocket()?.emit("draw-stroke", { roomId, element: lastElement });
    }
  };

  // Update Font Size (also updates currently selected text if any)
  const handleFontSizeChange = (newSize) => {
    setFontSize(newSize);
    if (selectedId) {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id === selectedId && el.type === "text") {
            const updated = { ...el, data: { ...el.data, fontSize: newSize } };
            connectSocket()?.emit("update-element", { roomId, element: updated });
            return updated;
          }
          return el;
        })
      );
    }
  };

  // Update Color (also updates currently selected element if any)
  const handleColorChange = (newColor) => {
    setColor(newColor);
    if (tool === "eraser") setTool("pen");

    if (selectedId) {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedId) return el;
          const updated =
            el.type === "text"
              ? { ...el, data: { ...el.data, fill: newColor } }
              : { ...el, data: { ...el.data, stroke: newColor } };
          connectSocket()?.emit("update-element", { roomId, element: updated });
          return updated;
        })
      );
    }
  };

  // Per-User Undo
  const handleUndo = () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastAction]);
    setElements((prev) => prev.filter((el) => el.id !== lastAction.id));
    if (selectedId === lastAction.id) setSelectedId(null);

    connectSocket()?.emit("undo", { roomId, elementId: lastAction.id });
  };

  // Per-User Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextAction = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, nextAction]);
    setElements((prev) => [...prev, nextAction]);

    connectSocket()?.emit("redo", { roomId, element: nextAction });
  };

  // Clear Canvas
  const handleClear = () => {
    if (elements.length === 0) return;
    setElements([]);
    setHistory([]);
    setRedoStack([]);
    setSelectedId(null);
    localStorage.removeItem(`board_cache_${roomId}`);
    connectSocket()?.emit("clear-canvas", { roomId });
    sileo.success({ title: "Canvas cleared" });
  };

  // Export PNG (hide Transformer box before capture)
  const handleExportPNG = () => {
    if (!stageRef.current) return;
    setSelectedId(null);
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `boardcollab-${Date.now()}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      sileo.success({ title: "Exported as PNG" });
    }, 20);
  };

  // Update position when dragging an element in Select mode
  const handleDragEnd = (id, e) => {
    const { x, y } = e.target.position();
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        const updated = { ...el, data: { ...el.data, x, y } };
        connectSocket()?.emit("update-element", { roomId, element: updated });
        return updated;
      })
    );
  };

  // Save resize/scale changes from Transformer
  const handleTransformEnd = (id, e) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        let updated = el;
        if (el.type === "rect") {
          updated = {
            ...el,
            data: {
              ...el.data,
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(5, node.height() * scaleY),
            },
          };
        } else if (el.type === "circle") {
          updated = {
            ...el,
            data: {
              ...el.data,
              x: node.x(),
              y: node.y(),
              radius: Math.max(5, el.data.radius * scaleX),
            },
          };
        } else if (el.type === "text") {
          const updatedFontSize = Math.max(10, Math.round(el.data.fontSize * scaleY));
          setFontSize(updatedFontSize);
          updated = {
            ...el,
            data: {
              ...el.data,
              x: node.x(),
              y: node.y(),
              fontSize: updatedFontSize,
            },
          };
        } else {
          updated = {
            ...el,
            data: { ...el.data, x: node.x(), y: node.y() },
          };
        }
        connectSocket()?.emit("update-element", { roomId, element: updated });
        return updated;
      })
    );
  };

  const selectedElement = elements.find((el) => el.id === selectedId);
  const showFontSizeControls =
    tool === "text" || selectedElement?.type === "text";

  const tools = [
    { id: "select", icon: "ri-cursor-line", label: "Select & Move" },
    { id: "pen", icon: "ri-pencil-line", label: "Pen" },
    { id: "rect", icon: "ri-rectangle-line", label: "Rectangle" },
    { id: "circle", icon: "ri-circle-line", label: "Circle" },
    { id: "text", icon: "ri-text", label: "Text" },
    { id: "eraser", icon: "ri-eraser-line", label: "Eraser" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white font-sans">
      {/* Top-Left: Back to Rooms + Room Title */}
      <div className="fixed top-5 left-5 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-xs border border-neutral-200 rounded-xl px-3.5 py-2 shadow-2xs">
        <Link
          to="/rooms"
          aria-label="Back to rooms"
          className="text-neutral-600 hover:text-black transition flex items-center"
        >
          <i className="ri-arrow-left-line text-base"></i>
        </Link>
        <div className="h-4 w-[1px] bg-neutral-200" />
        <span className="text-xs font-semibold text-neutral-900">
          {roomName}{" "}
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ml-1 ${
              isConnected ? "bg-emerald-500" : "bg-amber-500"
            }`}
            title={isConnected ? "Live synced" : "Offline mode"}
          />
        </span>
      </div>

      {/* Top-Right: Online Users + Export */}
      <div className="fixed top-5 right-5 z-20 flex items-center gap-2.5 bg-white/90 backdrop-blur-xs border border-neutral-200 rounded-xl px-3.5 py-2 shadow-2xs">
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 4).map((u, idx) => (
            <div
              key={`${u.userId}-${idx}`}
              title={u.name}
              className={`w-6 h-6 rounded-full ${
                idx % 2 === 0 ? "bg-[#ffe11b]" : "bg-[#bae6fd]"
              } ring-2 ring-white flex items-center justify-center text-[9px] font-bold`}
            >
              {getInitials(u.name)}
            </div>
          ))}
        </div>
        <span className="text-xs text-neutral-500 font-medium pr-1">
          {onlineUsers.length || 1} online
        </span>
        <div className="h-4 w-[1px] bg-neutral-200" />
        <button
          type="button"
          onClick={handleExportPNG}
          title="Export PNG"
          className="text-xs font-medium text-neutral-700 hover:text-black flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
        >
          <i className="ri-download-2-line text-sm"></i>
          <span>Export</span>
        </button>
      </div>

      {/* Bottom Floating Toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-neutral-200 rounded-2xl px-3 py-2 shadow-md">
        {tools.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTool(item.id);
              if (item.id !== "select") setSelectedId(null);
              if (item.id !== "text") setTextInput(null);
            }}
            title={item.label}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition cursor-pointer ${
              tool === item.id
                ? "bg-black text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
            }`}
          >
            <i className={item.icon}></i>
          </button>
        ))}

        <div className="h-5 w-[1px] bg-neutral-200 mx-1" />

        {/* Color Swatches */}
        <div className="flex items-center gap-1.5 px-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleColorChange(c)}
              aria-label={`Color ${c}`}
              className={`w-5 h-5 rounded-full transition cursor-pointer ${
                color === c && tool !== "eraser"
                  ? "ring-2 ring-offset-2 ring-black scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="h-5 w-[1px] bg-neutral-200 mx-1" />

        {/* Font Size (when Text active/selected) OR Stroke Width (when Drawing) */}
        {showFontSizeControls ? (
          <div className="flex items-center gap-1 px-0.5">
            {FONT_SIZES.map((sz) => (
              <button
                key={sz.value}
                type="button"
                onClick={() => handleFontSizeChange(sz.value)}
                title={`Font size ${sz.value}px`}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  fontSize === sz.value
                    ? "bg-[#ffe11b] text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1 px-0.5">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                type="button"
                onClick={() => setStrokeWidth(sw.value)}
                title={`${sw.label} stroke`}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  strokeWidth === sw.value
                    ? "bg-[#bae6fd] text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span
                  className="rounded-full bg-current block"
                  style={{ width: sw.value + 3, height: sw.value + 3 }}
                />
              </button>
            ))}
          </div>
        )}

        <div className="h-5 w-[1px] bg-neutral-200 mx-1" />

        {/* Undo / Redo / Clear */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0}
          title="Undo"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base text-neutral-600 hover:bg-neutral-100 hover:text-black disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        >
          <i className="ri-arrow-go-back-line"></i>
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          title="Redo"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base text-neutral-600 hover:bg-neutral-100 hover:text-black disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        >
          <i className="ri-arrow-go-forward-line"></i>
        </button>
        <button
          type="button"
          onClick={handleClear}
          title="Clear canvas"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base text-neutral-600 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
        >
          <i className="ri-delete-bin-line"></i>
        </button>
      </div>

      {/* Inline Floating Text Input */}
      {textInput && (
        <form
          onSubmit={handleTextSubmit}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ top: textInput.y, left: textInput.x }}
          className="fixed z-30"
        >
          <input
            ref={textInputRef}
            type="text"
            value={textInput.value}
            onChange={(e) =>
              setTextInput({ ...textInput, value: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") setTextInput(null);
            }}
            placeholder="Type & press Enter..."
            className="bg-white border border-black rounded-md px-2.5 py-1 shadow-sm focus:outline-none min-w-[180px]"
            style={{ color, fontSize: `${fontSize}px` }}
          />
        </form>
      )}

      {/* Remote Users' Live Cursors */}
      {Object.entries(remoteCursors).map(([id, cursor]) => (
        <div
          key={id}
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          className="fixed top-0 left-0 z-10 pointer-events-none transition-transform duration-75"
        >
          <i className="ri-cursor-fill text-black text-base"></i>
          <span className="ml-2 -mt-1 inline-block bg-[#ffe11b] text-neutral-900 text-[10px] font-semibold px-1.5 py-0.5 rounded">
            {cursor.name}
          </span>
        </div>
      ))}

      {/* Konva Drawing Stage */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        className={`select-none ${
          tool === "select" ? "cursor-default" : "cursor-crosshair"
        }`}
      >
        <Layer>
          {/* Solid White Background */}
          <Rect
            name="bg-rect"
            x={0}
            y={0}
            width={stageSize.width}
            height={stageSize.height}
            fill="#ffffff"
          />

          {elements.map((el) => {
            const commonProps = {
              id: el.id,
              draggable: tool === "select",
              onClick: () => {
                if (tool === "select") {
                  setSelectedId(el.id);
                  if (el.type === "text") setFontSize(el.data.fontSize);
                }
              },
              onTap: () => {
                if (tool === "select") {
                  setSelectedId(el.id);
                  if (el.type === "text") setFontSize(el.data.fontSize);
                }
              },
              onDragStart: () => {
                if (tool === "select") setSelectedId(el.id);
              },
              onDragEnd: (e) => handleDragEnd(el.id, e),
              onTransformEnd: (e) => handleTransformEnd(el.id, e),
            };

            if (el.type === "stroke") {
              return (
                <Line
                  key={el.id}
                  {...commonProps}
                  x={el.data.x || 0}
                  y={el.data.y || 0}
                  points={el.data.points}
                  stroke={el.data.stroke}
                  strokeWidth={el.data.strokeWidth}
                  hitStrokeWidth={16}
                  tension={0.4}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            }
            if (el.type === "rect") {
              return (
                <Rect
                  key={el.id}
                  {...commonProps}
                  x={el.data.x}
                  y={el.data.y}
                  width={el.data.width}
                  height={el.data.height}
                  stroke={el.data.stroke}
                  strokeWidth={el.data.strokeWidth}
                  hitStrokeWidth={12}
                />
              );
            }
            if (el.type === "circle") {
              return (
                <Circle
                  key={el.id}
                  {...commonProps}
                  x={el.data.x}
                  y={el.data.y}
                  radius={el.data.radius}
                  stroke={el.data.stroke}
                  strokeWidth={el.data.strokeWidth}
                  hitStrokeWidth={12}
                />
              );
            }
            if (el.type === "text") {
              return (
                <Text
                  key={el.id}
                  {...commonProps}
                  x={el.data.x}
                  y={el.data.y}
                  text={el.data.text}
                  fill={el.data.fill}
                  fontSize={el.data.fontSize}
                />
              );
            }
            return null;
          })}

          {/* Selection & Resize Handles */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            borderStroke="#3b82f6"
            anchorStroke="#3b82f6"
            anchorFill="#ffffff"
            anchorSize={7}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default Board;
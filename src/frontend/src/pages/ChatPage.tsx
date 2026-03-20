import type { ChatMessage } from "@/backend.d";
import { useActor } from "@/hooks/useActor";
import { filterProfanity } from "@/utils/profanityFilter";
import {
  ArrowLeft,
  Check,
  Globe,
  Lock,
  MessageSquare,
  Pencil,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type RoomMode = "picker" | "global" | "private";

interface Props {
  onBack: () => void;
}

export default function ChatPage({ onBack }: Props) {
  const { actor } = useActor();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [senderName, setSenderName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState("");
  const [roomMode, setRoomMode] = useState<RoomMode>("picker");
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Load stored name
  useEffect(() => {
    const stored = localStorage.getItem("arcadeHubChatName");
    if (stored) setSenderName(stored);
  }, []);

  // Focus edit input when editing starts
  useEffect(() => {
    if (isEditingName && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingName]);

  // Poll messages
  useEffect(() => {
    if (!actor || roomMode === "picker") return;
    let active = true;
    const poll = async () => {
      try {
        const msgs =
          roomMode === "private"
            ? await actor.getRoomMessages(roomCode)
            : await actor.getMessages();
        if (active) {
          const sorted = [...msgs]
            .sort((a, b) => Number(a.timestamp - b.timestamp))
            .slice(-100);
          setMessages(sorted);
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      } catch {
        // silently ignore poll errors
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [actor, roomMode, roomCode]);

  function handleSetName() {
    const name = nameInput.trim();
    if (!name) return;
    const filtered = filterProfanity(name);
    localStorage.setItem("arcadeHubChatName", filtered);
    setSenderName(filtered);
  }

  function handleConfirmEditName() {
    const name = editNameInput.trim();
    if (!name) return;
    const filtered = filterProfanity(name);
    localStorage.setItem("arcadeHubChatName", filtered);
    setSenderName(filtered);
    setIsEditingName(false);
  }

  function handleCancelEditName() {
    setIsEditingName(false);
  }

  function handleJoinRoom() {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;
    setRoomCode(code);
    setMessages([]);
    setRoomMode("private");
  }

  function handleEnterGlobal() {
    setMessages([]);
    setRoomMode("global");
  }

  function handleBackToPicker() {
    setRoomMode("picker");
    setMessages([]);
    setRoomCode("");
    setRoomCodeInput("");
  }

  function handleNavBack() {
    if (roomMode === "picker") {
      onBack();
    } else {
      handleBackToPicker();
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !senderName || isSending || !actor) return;
    setIsSending(true);
    setInputText("");
    const filteredText = filterProfanity(text);
    const filteredName = filterProfanity(senderName);
    try {
      if (roomMode === "private") {
        await actor.sendRoomMessage(roomCode, filteredName, filteredText);
        const msgs = await actor.getRoomMessages(roomCode);
        const sorted = [...msgs]
          .sort((a, b) => Number(a.timestamp - b.timestamp))
          .slice(-100);
        setMessages(sorted);
      } else {
        await actor.sendMessage(filteredName, filteredText);
        const msgs = await actor.getMessages();
        const sorted = [...msgs]
          .sort((a, b) => Number(a.timestamp - b.timestamp))
          .slice(-100);
        setMessages(sorted);
      }
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      // handle error silently
    } finally {
      setIsSending(false);
    }
  }

  function formatTime(timestamp: bigint) {
    const ms = Number(timestamp / 1_000_000n);
    const d = new Date(ms);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const headerLabel =
    roomMode === "private"
      ? `🔒 ROOM: ${roomCode}`
      : roomMode === "global"
        ? "🟢 GLOBAL CHAT"
        : "LIVE CHAT";

  const headerColor = roomMode === "private" ? "#f9a825" : "#00bcd4";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: "#2d2d2d",
          borderBottom: "3px solid #111",
          boxShadow: "0 4px 0 #111",
        }}
      >
        <button
          type="button"
          onClick={handleNavBack}
          data-ocid="chat.back_button"
          className="font-arcade text-[9px] mc-btn px-3 py-2 tracking-wider flex items-center gap-2"
          style={{ color: "#d0d0d0" }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" style={{ color: headerColor }} />
          <span
            className="font-arcade text-sm mc-text-shadow"
            style={{ color: headerColor }}
          >
            {headerLabel}
          </span>
        </div>
      </div>

      {/* Name prompt */}
      {!senderName && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className="mc-panel p-8 max-w-sm w-full text-center"
            data-ocid="chat.name_dialog"
          >
            <div className="text-4xl mb-4">💬</div>
            <h2
              className="font-arcade text-base mb-2"
              style={{ color: "#00bcd4" }}
            >
              JOIN THE CHAT
            </h2>
            <p
              className="font-arcade text-[9px] mb-6"
              style={{ color: "#888" }}
            >
              CHOOSE YOUR DISPLAY NAME
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetName()}
              placeholder="ENTER NAME..."
              maxLength={20}
              data-ocid="chat.name_input"
              className="w-full font-arcade text-[11px] px-4 py-3 mb-4 tracking-wider"
              style={{
                backgroundColor: "#1a1a1a",
                border: "2px solid #444",
                color: "#d0d0d0",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleSetName}
              disabled={!nameInput.trim()}
              data-ocid="chat.name_submit_button"
              className="w-full font-arcade text-[11px] mc-btn-green px-6 py-3 tracking-wider"
            >
              ENTER CHAT
            </button>
          </div>
        </div>
      )}

      {/* Room Picker */}
      {senderName && roomMode === "picker" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🎮</div>
              <h2
                className="font-arcade text-base mb-1"
                style={{ color: "#00bcd4" }}
              >
                CHOOSE CHAT ROOM
              </h2>
              <p className="font-arcade text-[9px]" style={{ color: "#666" }}>
                PLAYING AS{" "}
                <span style={{ color: "#5D8A2C" }}>{senderName}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Global Chat */}
              <button
                type="button"
                onClick={handleEnterGlobal}
                data-ocid="chat.global_button"
                className="mc-panel p-6 text-left hover:opacity-90 transition-opacity cursor-pointer"
                style={{
                  border: "3px solid #00bcd4",
                  backgroundColor: "#001e22",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-2"
                    style={{
                      backgroundColor: "#00bcd4",
                      display: "inline-flex",
                    }}
                  >
                    <Globe className="h-6 w-6" style={{ color: "#000" }} />
                  </div>
                  <span
                    className="font-arcade text-sm"
                    style={{ color: "#00bcd4" }}
                  >
                    GLOBAL CHAT
                  </span>
                </div>
                <p
                  className="font-arcade text-[9px] leading-relaxed"
                  style={{ color: "#5a9faa" }}
                >
                  CHAT WITH EVERYONE ON ARCADE HUB. OPEN TO ALL PLAYERS.
                </p>
                <div
                  className="mt-4 font-arcade text-[10px] px-4 py-2 text-center"
                  style={{
                    backgroundColor: "#00bcd4",
                    color: "#000",
                    fontWeight: "bold",
                  }}
                >
                  ENTER GLOBAL CHAT →
                </div>
              </button>

              {/* Private Room */}
              <div
                className="mc-panel p-6"
                style={{
                  border: "3px solid #f9a825",
                  backgroundColor: "#1e1500",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-2"
                    style={{
                      backgroundColor: "#f9a825",
                      display: "inline-flex",
                    }}
                  >
                    <Lock className="h-6 w-6" style={{ color: "#000" }} />
                  </div>
                  <span
                    className="font-arcade text-sm"
                    style={{ color: "#f9a825" }}
                  >
                    PRIVATE ROOM
                  </span>
                </div>
                <p
                  className="font-arcade text-[9px] mb-1"
                  style={{ color: "#c8941a" }}
                >
                  ENTER ROOM CODE
                </p>
                <p
                  className="font-arcade text-[8px] mb-3"
                  style={{ color: "#7a5c10" }}
                >
                  CREATE A NEW ROOM OR JOIN AN EXISTING ONE
                </p>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) =>
                    setRoomCodeInput(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 20),
                    )
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  placeholder="E.G. MYROOM123"
                  maxLength={20}
                  data-ocid="chat.room_code_input"
                  className="w-full font-arcade text-[11px] px-3 py-2 mb-3 tracking-widest"
                  style={{
                    backgroundColor: "#0e0900",
                    border: "2px solid #7a5c10",
                    color: "#f9a825",
                    outline: "none",
                    letterSpacing: "0.15em",
                  }}
                />
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  disabled={!roomCodeInput.trim()}
                  data-ocid="chat.join_room_button"
                  className="w-full font-arcade text-[10px] px-4 py-2 tracking-wider disabled:opacity-40"
                  style={{
                    backgroundColor: !roomCodeInput.trim()
                      ? "#3a2e00"
                      : "#f9a825",
                    color: !roomCodeInput.trim() ? "#5a4a00" : "#000",
                    fontWeight: "bold",
                    border: "none",
                    cursor: roomCodeInput.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  JOIN / CREATE →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat area (global or private) */}
      {senderName && roomMode !== "picker" && (
        <>
          {/* Private room banner */}
          {roomMode === "private" && (
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{
                backgroundColor: "#1e1500",
                borderBottom: "2px solid #7a5c10",
              }}
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" style={{ color: "#f9a825" }} />
                <span
                  className="font-arcade text-[10px] tracking-widest"
                  style={{ color: "#f9a825" }}
                >
                  ROOM: {roomCode}
                </span>
              </div>
              <span
                className="font-arcade text-[8px]"
                style={{ color: "#7a5c10" }}
              >
                SHARE THIS CODE TO INVITE FRIENDS
              </span>
            </div>
          )}

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ minHeight: 0 }}
            data-ocid="chat.panel"
          >
            {messages.length === 0 && (
              <div className="text-center py-16" data-ocid="chat.empty_state">
                <div className="text-5xl mb-4">💬</div>
                <p
                  className="font-arcade text-[10px]"
                  style={{ color: "#555" }}
                >
                  {roomMode === "private"
                    ? `ROOM ${roomCode} IS EMPTY. START THE CONVERSATION!`
                    : "NO MESSAGES YET. SAY HELLO!"}
                </p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.sender === senderName;
              return (
                <div
                  key={String(msg.id)}
                  className={`flex flex-col ${
                    isOwn ? "items-end" : "items-start"
                  }`}
                  data-ocid={`chat.item.${i + 1}`}
                >
                  <div
                    className="max-w-xs sm:max-w-md"
                    style={{
                      border: `2px solid ${
                        isOwn
                          ? roomMode === "private"
                            ? "#f9a825"
                            : "#00bcd4"
                          : "#444"
                      }`,
                      backgroundColor: isOwn
                        ? roomMode === "private"
                          ? "#1e1500"
                          : "#003a40"
                        : "#2d2d2d",
                      padding: "8px 12px",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-arcade text-[9px] tracking-wider"
                        style={{
                          color: isOwn
                            ? roomMode === "private"
                              ? "#f9a825"
                              : "#00bcd4"
                            : "#5D8A2C",
                        }}
                      >
                        {filterProfanity(msg.sender)}
                      </span>
                      <span
                        className="font-arcade text-[8px]"
                        style={{ color: "#555" }}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p
                      className="text-sm"
                      style={{ color: "#d0d0d0", wordBreak: "break-word" }}
                    >
                      {filterProfanity(msg.text)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            className="sticky bottom-0 p-4 flex items-center gap-3"
            style={{
              backgroundColor: "#2d2d2d",
              borderTop: "3px solid #111",
            }}
          >
            {/* Username display / edit */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              {isEditingName ? (
                <>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmEditName();
                      if (e.key === "Escape") handleCancelEditName();
                    }}
                    maxLength={20}
                    data-ocid="chat.edit_name_input"
                    className="font-arcade text-[9px] px-2 py-1 tracking-wider w-28"
                    style={{
                      backgroundColor: "#1a1a1a",
                      border: "2px solid #00bcd4",
                      color: "#d0d0d0",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmEditName}
                    disabled={!editNameInput.trim()}
                    data-ocid="chat.confirm_button"
                    title="Confirm name"
                    className="flex items-center justify-center p-1 disabled:opacity-40"
                    style={{
                      color: "#5D8A2C",
                      border: "1px solid #3a5a1a",
                      backgroundColor: "#1a2a0a",
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditName}
                    data-ocid="chat.cancel_button"
                    title="Cancel"
                    className="flex items-center justify-center p-1"
                    style={{
                      color: "#888",
                      border: "1px solid #444",
                      backgroundColor: "#2d2d2d",
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="font-arcade text-[9px] px-2 py-1"
                    style={{
                      color: "#5D8A2C",
                      border: "1px solid #3a5a1a",
                      backgroundColor: "#1a2a0a",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {senderName}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameInput(senderName);
                      setIsEditingName(true);
                    }}
                    data-ocid="chat.edit_button"
                    title="Change username"
                    className="flex items-center justify-center p-1"
                    style={{
                      color: "#888",
                      border: "1px solid #333",
                      backgroundColor: "#1a1a1a",
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              placeholder="TYPE A MESSAGE..."
              maxLength={500}
              data-ocid="chat.input"
              className="flex-1 font-arcade text-[11px] px-4 py-3 tracking-wider"
              style={{
                backgroundColor: "#1a1a1a",
                border: `2px solid ${roomMode === "private" ? "#7a5c10" : "#444"}`,
                color: "#d0d0d0",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isSending || !actor}
              data-ocid="chat.submit_button"
              className="font-arcade text-[9px] mc-btn px-4 py-3 tracking-wider flex items-center gap-2 disabled:opacity-50"
              style={{
                color: roomMode === "private" ? "#f9a825" : "#00bcd4",
                borderColor: roomMode === "private" ? "#f9a825" : "#00bcd4",
              }}
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">SEND</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import type { ChatMessage } from "@/backend.d";
import { useActor } from "@/hooks/useActor";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load stored name
  useEffect(() => {
    const stored = localStorage.getItem("arcadeHubChatName");
    if (stored) setSenderName(stored);
  }, []);

  // Poll messages every 2 seconds
  useEffect(() => {
    if (!actor) return;
    let active = true;
    const poll = async () => {
      try {
        const msgs = await actor.getMessages();
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
  }, [actor]);

  function handleSetName() {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem("arcadeHubChatName", name);
    setSenderName(name);
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !senderName || isSending || !actor) return;
    setIsSending(true);
    setInputText("");
    try {
      await actor.sendMessage(senderName, text);
      const msgs = await actor.getMessages();
      const sorted = [...msgs]
        .sort((a, b) => Number(a.timestamp - b.timestamp))
        .slice(-100);
      setMessages(sorted);
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
          onClick={onBack}
          data-ocid="chat.back_button"
          className="font-arcade text-[9px] mc-btn px-3 py-2 tracking-wider flex items-center gap-2"
          style={{ color: "#d0d0d0" }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" style={{ color: "#00bcd4" }} />
          <span
            className="font-arcade text-sm mc-text-shadow"
            style={{ color: "#00bcd4" }}
          >
            LIVE CHAT
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-arcade text-[8px]" style={{ color: "#888" }}>
            🟢 GLOBAL ROOM
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

      {/* Chat area */}
      {senderName && (
        <>
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
                  NO MESSAGES YET. SAY HELLO!
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
                      border: `2px solid ${isOwn ? "#00bcd4" : "#444"}`,
                      backgroundColor: isOwn ? "#003a40" : "#2d2d2d",
                      padding: "8px 12px",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-arcade text-[9px] tracking-wider"
                        style={{ color: isOwn ? "#00bcd4" : "#5D8A2C" }}
                      >
                        {msg.sender}
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
                      {msg.text}
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
            <div
              className="font-arcade text-[9px] px-2 py-1 hidden sm:block"
              style={{
                color: "#5D8A2C",
                border: "1px solid #3a5a1a",
                backgroundColor: "#1a2a0a",
                whiteSpace: "nowrap",
              }}
            >
              {senderName}
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
                border: "2px solid #444",
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
              style={{ color: "#00bcd4", borderColor: "#00bcd4" }}
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

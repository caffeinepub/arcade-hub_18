import { type Theme, useTheme } from "@/contexts/ThemeContext";
import {
  Check,
  Film,
  Gamepad2,
  MessageSquare,
  Music2,
  Palette,
  Search,
  Youtube,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  onNavClick?: (section: string) => void;
}

const NAV_LINKS = ["GAMES", "LEADERBOARD", "SHOP", "NEWS"];

const THEMES: { id: Theme; label: string }[] = [
  { id: "minecraft", label: "Minecraft" },
  { id: "neon", label: "Neon Arcade" },
  { id: "retro", label: "Retro Pixel" },
  { id: "space", label: "Space" },
];

export default function Header({ onNavClick }: Props) {
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setThemeOpen(false);
      }
    }
    if (themeOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [themeOpen]);

  return (
    <header
      className="sticky top-0 z-50 w-full mc-grass-border-bottom"
      style={{ backgroundColor: "var(--header-bg, #2d2d2d)" }}
    >
      <div
        className="w-full"
        style={{
          borderBottom: "3px solid #1a1a1a",
          boxShadow: "0 4px 0 #111",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            data-ocid="header.link"
          >
            <Gamepad2
              className="h-7 w-7"
              style={{ color: "var(--logo-color, #5D8A2C)" }}
            />
            <span
              className="font-arcade text-sm sm:text-base mc-text-shadow"
              style={{ color: "var(--logo-color, #5D8A2C)" }}
            >
              ARCADE HUB
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                type="button"
                onClick={() => onNavClick?.(link)}
                data-ocid={`nav.${link.toLowerCase()}.link`}
                className="font-arcade text-[9px] tracking-widest mc-text-shadow uppercase transition-colors"
                style={{ color: "#d0d0d0" }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color =
                    "var(--logo-color, #5D8A2C)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = "#d0d0d0";
                }}
              >
                {link}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <a
              href="https://soundinstants.com/"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="header.soundboard_button"
              className="font-arcade text-[9px] mc-btn px-3 py-2 tracking-wider flex items-center gap-1"
              style={{ color: "#a855f7", borderColor: "#a855f7" }}
            >
              <Music2 className="h-4 w-4" />
              <span className="hidden sm:inline">SOUNDBOARD</span>
            </a>
            <button
              type="button"
              onClick={() => onNavClick?.("CHAT")}
              data-ocid="header.livechat_button"
              className="font-arcade text-[9px] mc-btn px-3 py-2 tracking-wider flex items-center gap-1"
              style={{ color: "#00bcd4", borderColor: "#00bcd4" }}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">LIVE CHAT</span>
            </button>
            <a
              href="https://hydrahd.ru/movie/54297-watch-monster-house-2006-online"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="header.movies_button"
              className="font-arcade text-[9px] mc-btn px-3 py-2 tracking-wider flex items-center gap-1"
              style={{ color: "#e8a020", borderColor: "#e8a020" }}
            >
              <Film className="h-4 w-4" />
              <span className="hidden sm:inline">MOVIES</span>
            </a>
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="header.youtube_button"
              className="font-arcade text-[9px] mc-btn px-3 py-2 tracking-wider flex items-center gap-1"
              style={{ color: "#ff0000", borderColor: "#ff0000" }}
            >
              <Youtube className="h-4 w-4" />
              <span className="hidden sm:inline">YOUTUBE</span>
            </a>
            <button
              type="button"
              data-ocid="header.search_input"
              className="transition-colors"
              aria-label="Search"
              style={{ color: "#888888" }}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Theme Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setThemeOpen((o) => !o)}
                data-ocid="header.theme_button"
                className="mc-btn px-2 py-2 flex items-center gap-1"
                aria-label="Switch theme"
                title="Switch theme"
              >
                <Palette className="h-4 w-4" />
              </button>

              {themeOpen && (
                <div
                  className="absolute right-0 top-full mt-2 z-50 mc-panel min-w-[160px]"
                  data-ocid="header.theme_dropdown"
                  style={{ padding: "4px" }}
                >
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id);
                        setThemeOpen(false);
                      }}
                      data-ocid={`theme.${t.id}.button`}
                      className="font-arcade text-[8px] w-full text-left px-3 py-2 flex items-center justify-between gap-2 mc-btn tracking-wider"
                      style={{
                        color:
                          theme === t.id
                            ? "var(--logo-color, #5D8A2C)"
                            : "#d0d0d0",
                        marginBottom: "3px",
                      }}
                    >
                      <span>{t.label}</span>
                      {theme === t.id && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              data-ocid="header.login_button"
              className="font-arcade text-[9px] mc-btn px-3 py-2 tracking-wider"
            >
              LOGIN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

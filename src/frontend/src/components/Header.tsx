import { Gamepad2, Search, Youtube } from "lucide-react";

interface Props {
  onNavClick?: (section: string) => void;
}

const NAV_LINKS = ["GAMES", "LEADERBOARD", "SHOP", "NEWS"];

export default function Header({ onNavClick }: Props) {
  return (
    <header
      className="sticky top-0 z-50 w-full mc-grass-border-bottom"
      style={{ backgroundColor: "#2d2d2d" }}
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
            <Gamepad2 className="h-7 w-7" style={{ color: "#5D8A2C" }} />
            <span
              className="font-arcade text-sm sm:text-base mc-text-shadow"
              style={{ color: "#5D8A2C" }}
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
                  (e.target as HTMLElement).style.color = "#5D8A2C";
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
          <div className="flex items-center gap-3">
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

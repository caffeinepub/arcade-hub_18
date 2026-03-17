import { Button } from "@/components/ui/button";
import { Gamepad2, Search } from "lucide-react";

interface Props {
  onNavClick?: (section: string) => void;
}

const NAV_LINKS = ["GAMES", "LEADERBOARD", "SHOP", "NEWS"];

export default function Header({ onNavClick }: Props) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neon-cyan/20 bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          data-ocid="header.link"
        >
          <Gamepad2
            className="h-7 w-7 text-neon-cyan"
            style={{ filter: "drop-shadow(0 0 8px #21D4FF)" }}
          />
          <span
            className="font-arcade text-sm sm:text-base text-neon-cyan text-glow-cyan tracking-wider"
            style={{ textShadow: "0 0 10px #21D4FF, 0 0 20px #C83CFF" }}
          >
            PIXEL PALACE
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
              className="font-sans text-xs font-bold tracking-widest text-muted-foreground hover:text-neon-cyan transition-colors uppercase"
            >
              {link}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="header.search_input"
            className="text-muted-foreground hover:text-neon-cyan transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
          <Button
            variant="outline"
            size="sm"
            data-ocid="header.login_button"
            className="font-arcade text-[10px] border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan glow-cyan tracking-wider"
          >
            LOGIN
          </Button>
        </div>
      </div>
    </header>
  );
}

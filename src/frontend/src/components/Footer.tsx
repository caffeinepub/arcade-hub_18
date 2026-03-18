import { SiFacebook, SiInstagram, SiX, SiYoutube } from "react-icons/si";

const NAV_ITEMS = ["About", "Terms", "Support", "Careers"];
const SOCIAL = [
  { Icon: SiFacebook, label: "Facebook", href: "https://facebook.com" },
  { Icon: SiX, label: "X", href: "https://x.com" },
  { Icon: SiInstagram, label: "Instagram", href: "https://instagram.com" },
  { Icon: SiYoutube, label: "YouTube", href: "https://youtube.com" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`;

  return (
    <footer
      className="mc-dirt-border-top mt-16"
      style={{ backgroundColor: "#1c1c1c" }}
    >
      <div
        style={{
          borderTop: "3px solid #0a0a0a",
          boxShadow: "inset 0 2px 0 #2a2a2a",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href="/"
                className="text-xs font-arcade text-[8px] mc-text-shadow transition-colors"
                style={{ color: "#7a7a7a" }}
              >
                {item}
              </a>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground text-center font-arcade text-[8px] mc-text-shadow">
            &copy; {year}. Built with ❤️ using{" "}
            <a
              href={caffeineUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#5D8A2C" }}
            >
              caffeine.ai
            </a>
          </p>

          <div className="flex items-center gap-4">
            {SOCIAL.map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="transition-colors"
                style={{ color: "#7a7a7a" }}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

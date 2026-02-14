import { Link, useLocation } from "wouter";

export default function PublicHeader() {
  const [location] = useLocation();

  const navItems = [
    { label: "Today", href: "/devotional/today" },
    { label: "Archive", href: "/public/archive" },
    { label: "YouTube", href: "#" },
    { label: "Donate", href: "#" },
  ];

  return (
    <header
      style={{
        background: "#f9f6f1",
        borderBottom: "1px solid #e0d9cb",
      }}
      data-testid="public-header"
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(28px, 5vw, 52px) 24px clamp(24px, 4vw, 40px)",
          textAlign: "center",
        }}
      >
        <Link href="/devotional/today">
          <span
            data-testid="link-public-logo"
            style={{
              fontFamily: "'Playfair Display', 'Georgia', serif",
              fontSize: "clamp(28px, 5vw, 42px)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "#1a1a1a",
              textDecoration: "none",
              cursor: "pointer",
              display: "block",
              lineHeight: 1.15,
            }}
          >
            365 Daily Devotional
          </span>
        </Link>
        <p
          style={{
            fontSize: "clamp(12px, 1.5vw, 14px)",
            color: "#8a8172",
            marginTop: 8,
            marginBottom: "clamp(20px, 3vw, 32px)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          Daily Scripture. Prayer. Transformation.
        </p>
        <nav
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "clamp(24px, 4vw, 44px)",
            flexWrap: "wrap",
            rowGap: 12,
          }}
          data-testid="public-nav"
        >
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.label} href={item.href}>
                <span
                  data-testid={`link-public-nav-${item.label.toLowerCase()}`}
                  style={{
                    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                    fontSize: 15,
                    fontWeight: 550,
                    color: isActive ? "#1a1a1a" : "#5c5650",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "color 0.2s ease",
                    paddingBottom: 3,
                    borderBottom: isActive
                      ? "2px solid #c9a84c"
                      : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#1a1a1a";
                    if (!isActive) {
                      e.currentTarget.style.borderBottomColor = "#d4c9a8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#5c5650";
                      e.currentTarget.style.borderBottomColor = "transparent";
                    }
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

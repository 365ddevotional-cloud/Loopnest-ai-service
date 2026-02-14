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
        maxWidth: 1000,
        margin: "0 auto",
        padding: "48px 20px 32px 20px",
        textAlign: "center",
        borderBottom: "1px solid #e5e5e5",
        background: "#ffffff",
      }}
      data-testid="public-header"
    >
      <Link href="/devotional/today">
        <span
          data-testid="link-public-logo"
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 600,
            letterSpacing: "0.5px",
            color: "#111",
            textDecoration: "none",
            cursor: "pointer",
            display: "block",
            marginBottom: 6,
          }}
        >
          365 Daily Devotional
        </span>
      </Link>
      <p
        style={{
          fontSize: 14,
          color: "#777",
          marginBottom: 28,
          letterSpacing: "0.04em",
        }}
      >
        Daily Scripture. Prayer. Transformation.
      </p>
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 32,
          flexWrap: "wrap",
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
                  fontSize: 15,
                  fontWeight: 500,
                  color: isActive ? "#000" : "#444",
                  textDecoration: isActive ? "underline" : "none",
                  textUnderlineOffset: "4px",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#000";
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#444";
                    e.currentTarget.style.textDecoration = "none";
                  }
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

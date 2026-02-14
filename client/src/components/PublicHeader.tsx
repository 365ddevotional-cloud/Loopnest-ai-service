import { Link } from "wouter";

export default function PublicHeader() {
  return (
    <header
      style={{
        width: "100%",
        borderBottom: "1px solid #e5e5e5",
        backgroundColor: "#ffffff",
      }}
      data-testid="public-header"
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(32px, 5vw, 48px) 24px clamp(24px, 4vw, 36px)",
          textAlign: "center",
        }}
      >
        <Link href="/devotional/today">
          <span
            data-testid="link-public-logo"
            style={{
              fontFamily: "'Playfair Display', 'Georgia', serif",
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 700,
              color: "#111",
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
            fontSize: "clamp(14px, 1.8vw, 18px)",
            color: "#777",
            marginTop: 8,
            marginBottom: "clamp(20px, 3vw, 28px)",
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
            fontSize: "clamp(15px, 1.6vw, 18px)",
            fontWeight: 500,
            color: "#555",
          }}
          data-testid="public-nav"
        >
          <Link href="/devotional/today">
            <span
              data-testid="link-public-nav-today"
              style={{
                color: "#555",
                textDecoration: "none",
                cursor: "pointer",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#000")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Today
            </span>
          </Link>

          <Link href="/public/archive">
            <span
              data-testid="link-public-nav-archive"
              style={{
                color: "#555",
                textDecoration: "none",
                cursor: "pointer",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#000")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Archive
            </span>
          </Link>

          <a
            href="https://www.youtube.com/@365DailyDevotional"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-public-nav-youtube"
            style={{
              color: "#555",
              textDecoration: "none",
              cursor: "pointer",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#000")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            YouTube
          </a>

          <Link href="/donate">
            <span
              data-testid="link-public-nav-donate"
              style={{
                color: "#555",
                textDecoration: "none",
                cursor: "pointer",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#000")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Donate
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

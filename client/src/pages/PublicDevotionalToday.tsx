import { useTodayDevotional } from "@/hooks/use-devotionals";
import { SEOHead } from "@/components/SEOHead";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

function PublicFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: "1px solid #e5e2da",
        padding: "3rem 1.5rem",
        textAlign: "center",
        color: "#888",
        fontSize: "0.85rem",
        lineHeight: 1.8,
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p style={{ marginBottom: "0.75rem" }}>
          &copy; {currentYear} 365 Daily Devotional. All rights reserved.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1.25rem",
          }}
        >
          <Link href="/contact" style={{ color: "#888", textDecoration: "none" }}>
            Contact
          </Link>
          <Link href="/privacy-policy" style={{ color: "#888", textDecoration: "none" }}>
            Privacy
          </Link>
          <Link href="/terms-of-use" style={{ color: "#888", textDecoration: "none" }}>
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function PublicDevotionalToday() {
  const { data: devotional, isLoading, error } = useTodayDevotional();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9f9f7",
        }}
      >
        <Loader2
          className="animate-spin"
          style={{ width: 40, height: 40, color: "#c9a84c" }}
        />
      </div>
    );
  }

  if (error || !devotional) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f9f9f7",
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        }}
      >
        <SEOHead title="365 Daily Devotional" />
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "6rem 1.5rem",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', 'Georgia', serif",
              fontSize: "2rem",
              color: "#222",
              marginBottom: "1rem",
            }}
          >
            Today's Devotional
          </h1>
          <p style={{ color: "#666", fontSize: "1.1rem" }}>
            Today's message is not yet available. Please check back shortly.
          </p>
          <Link href="/public/archive">
            <span
              data-testid="link-public-archive"
              style={{
                display: "inline-block",
                marginTop: "2rem",
                color: "#c9a84c",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Browse the Archive
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const dateFormatted = (() => {
    try {
      return format(parseISO(devotional.date), "EEEE, MMMM d, yyyy");
    } catch {
      return devotional.date;
    }
  })();

  const seoDescription =
    devotional.content.length > 150
      ? devotional.content.substring(0, 150) + "..."
      : devotional.content;

  const regularDeclarations = (devotional.faithDeclarations || []).filter(
    (d: string) =>
      !d.startsWith("QUOTE:") && !d.startsWith("PROPHETIC:")
  );
  const quotes = (devotional.faithDeclarations || []).filter((d: string) =>
    d.startsWith("QUOTE:")
  );
  const prophetic = (devotional.faithDeclarations || []).filter((d: string) =>
    d.startsWith("PROPHETIC:")
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9f9f7",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        color: "#222",
      }}
    >
      <SEOHead
        title={`${devotional.title} — Today's Devotional`}
        description={seoDescription}
      />

      <header
        style={{
          textAlign: "center",
          padding: "2.5rem 1.5rem 1.5rem",
          borderBottom: "1px solid #e5e2da",
        }}
      >
        <Link href="/devotional/today">
          <span
            data-testid="link-public-home"
            style={{
              fontFamily: "'Playfair Display', 'Georgia', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#222",
              textDecoration: "none",
              letterSpacing: "-0.02em",
            }}
          >
            365 Daily Devotional
          </span>
        </Link>
        <p
          style={{
            color: "#888",
            fontSize: "0.9rem",
            marginTop: "0.35rem",
            letterSpacing: "0.05em",
          }}
        >
          Daily Scripture. Prayer. Transformation.
        </p>
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
        <p
          style={{
            color: "#c9a84c",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "0.75rem",
          }}
          data-testid="text-public-date"
        >
          {dateFormatted}
        </p>

        <h1
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 700,
            color: "#222",
            lineHeight: 1.2,
            marginBottom: "1.5rem",
          }}
          data-testid="text-public-title"
        >
          {devotional.title}
        </h1>

        <p
          style={{
            fontSize: "0.85rem",
            color: "#888",
            marginBottom: "2rem",
          }}
        >
          By {devotional.author || "Moses Afolabi"}
        </p>

        <blockquote
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: "1.15rem",
            lineHeight: 1.75,
            color: "#444",
            borderLeft: "3px solid #c9a84c",
            paddingLeft: "1.25rem",
            marginBottom: "2.5rem",
            fontStyle: "italic",
          }}
          data-testid="text-public-scripture"
        >
          <span>{devotional.scriptureText}</span>
          <span
            style={{
              display: "block",
              marginTop: "0.75rem",
              fontSize: "0.85rem",
              fontStyle: "normal",
              fontWeight: 600,
              color: "#c9a84c",
            }}
          >
            — {devotional.scriptureReference}
          </span>
        </blockquote>

        <article
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.85,
            color: "#333",
          }}
          data-testid="text-public-content"
        >
          {devotional.content.split("\n\n").map((paragraph: string, i: number) => (
            <p key={i} style={{ marginBottom: "1.5rem" }}>
              {paragraph}
            </p>
          ))}
        </article>

        {devotional.prayerPoints && devotional.prayerPoints.length > 0 && (
          <section style={{ marginTop: "3rem" }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#222",
                marginBottom: "1.25rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #e5e2da",
              }}
              data-testid="heading-prayer-points"
            >
              Prayer Points
            </h2>
            <ol
              style={{
                listStyleType: "decimal",
                paddingLeft: "1.25rem",
                fontSize: "1rem",
                lineHeight: 1.8,
                color: "#444",
              }}
            >
              {devotional.prayerPoints.map((point: string, i: number) => (
                <li key={i} style={{ marginBottom: "0.75rem" }}>
                  {point}
                </li>
              ))}
            </ol>
          </section>
        )}

        {regularDeclarations.length > 0 && (
          <section style={{ marginTop: "3rem" }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#222",
                marginBottom: "1.25rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #e5e2da",
              }}
              data-testid="heading-declarations"
            >
              Faith Declarations
            </h2>
            <ol
              style={{
                listStyleType: "decimal",
                paddingLeft: "1.25rem",
                fontSize: "1rem",
                lineHeight: 1.8,
                color: "#444",
              }}
            >
              {regularDeclarations.map((d: string, i: number) => (
                <li key={i} style={{ marginBottom: "0.75rem" }}>
                  {d}
                </li>
              ))}
            </ol>
          </section>
        )}

        {quotes.length > 0 && (
          <section style={{ marginTop: "3rem" }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#222",
                marginBottom: "1.25rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #e5e2da",
              }}
              data-testid="heading-quotes"
            >
              Christian Quotes
            </h2>
            {quotes.map((q: string, i: number) => (
              <blockquote
                key={i}
                style={{
                  fontFamily: "'Playfair Display', 'Georgia', serif",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  color: "#555",
                  borderLeft: "2px solid #e5e2da",
                  paddingLeft: "1rem",
                  marginBottom: "1rem",
                  fontStyle: "italic",
                }}
              >
                {q.replace("QUOTE: ", "").replace("QUOTE:", "")}
              </blockquote>
            ))}
          </section>
        )}

        {prophetic.length > 0 && (
          <section style={{ marginTop: "3rem" }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#222",
                marginBottom: "1.25rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #e5e2da",
              }}
              data-testid="heading-prophetic"
            >
              Prophetic Declaration
            </h2>
            {prophetic.map((p: string, i: number) => (
              <p
                key={i}
                style={{
                  fontSize: "1.05rem",
                  lineHeight: 1.8,
                  color: "#333",
                  fontWeight: 500,
                  backgroundColor: "#f3f0e8",
                  padding: "1.25rem",
                  borderRadius: "6px",
                }}
              >
                {p.replace("PROPHETIC: ", "").replace("PROPHETIC:", "")}
              </p>
            ))}
          </section>
        )}

        <div
          style={{
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: "1px solid #e5e2da",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <Link href="/public/archive">
            <span
              data-testid="button-public-archive"
              style={{
                display: "inline-block",
                padding: "0.7rem 1.5rem",
                backgroundColor: "#222",
                color: "#f9f9f7",
                borderRadius: "6px",
                fontSize: "0.9rem",
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Read Archive
            </span>
          </Link>
          <Link href="/">
            <span
              data-testid="button-public-app"
              style={{
                display: "inline-block",
                padding: "0.7rem 1.5rem",
                border: "1px solid #ccc",
                color: "#222",
                borderRadius: "6px",
                fontSize: "0.9rem",
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer",
                backgroundColor: "transparent",
              }}
            >
              Open the App
            </span>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

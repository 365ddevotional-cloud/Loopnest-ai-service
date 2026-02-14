import { useDevotionalsList } from "@/hooks/use-devotionals";
import { SEOHead } from "@/components/SEOHead";
import PublicHeader from "@/components/PublicHeader";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const ITEMS_PER_PAGE = 20;

export default function PublicArchive() {
  const { data: devotionals, isLoading } = useDevotionalsList();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = (devotionals || [])
    .filter(
      (d) =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.content.toLowerCase().includes(search.toLowerCase())
    )
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

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
        title="Devotional Archive"
        description="Browse past daily devotionals with scripture readings, prayer points, and faith declarations."
      />

      <PublicHeader />

      <main
        style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            fontWeight: 700,
            color: "#222",
            textAlign: "center",
            marginBottom: "0.5rem",
          }}
          data-testid="heading-public-archive"
        >
          Devotional Archive
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#888",
            fontSize: "1rem",
            marginBottom: "2rem",
          }}
        >
          Browse past messages of faith and encouragement.
        </p>

        <div style={{ maxWidth: 420, margin: "0 auto 2.5rem" }}>
          <input
            type="text"
            placeholder="Search by title or content..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            data-testid="input-public-search"
            style={{
              width: "100%",
              padding: "0.7rem 1rem",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "0.95rem",
              backgroundColor: "#fff",
              color: "#222",
              outline: "none",
            }}
          />
        </div>

        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "4rem 0",
            }}
          >
            <Loader2
              className="animate-spin"
              style={{ width: 36, height: 36, color: "#c9a84c" }}
            />
          </div>
        ) : pageItems.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "#888",
              padding: "3rem 0",
            }}
          >
            No devotionals found.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {pageItems.map((d) => {
                let dateStr: string;
                try {
                  dateStr = format(parseISO(d.date), "MMM d, yyyy");
                } catch {
                  dateStr = d.date;
                }
                return (
                  <Link key={d.id} href={`/devotional/${d.date}`}>
                    <div
                      data-testid={`card-public-devotional-${d.id}`}
                      style={{
                        display: "block",
                        padding: "1.25rem 1.5rem",
                        backgroundColor: "#fff",
                        border: "1px solid #eee",
                        borderRadius: "6px",
                        textDecoration: "none",
                        color: "#222",
                        cursor: "pointer",
                        transition: "box-shadow 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.boxShadow =
                          "0 2px 12px rgba(0,0,0,0.06)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.boxShadow = "none")
                      }
                    >
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "#c9a84c",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: "0.35rem",
                        }}
                      >
                        {dateStr}
                      </p>
                      <h3
                        style={{
                          fontFamily: "'Playfair Display', 'Georgia', serif",
                          fontSize: "1.15rem",
                          fontWeight: 600,
                          color: "#222",
                          marginBottom: "0.35rem",
                        }}
                      >
                        {d.title}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "#666",
                          lineHeight: 1.5,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {d.scriptureReference} — {d.content.substring(0, 120)}...
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginTop: "2.5rem",
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  data-testid="button-page-prev"
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    backgroundColor: currentPage <= 1 ? "#f0f0f0" : "#fff",
                    color: currentPage <= 1 ? "#aaa" : "#222",
                    cursor: currentPage <= 1 ? "default" : "pointer",
                  }}
                >
                  Previous
                </button>
                <span
                  style={{ fontSize: "0.85rem", color: "#888" }}
                  data-testid="text-page-info"
                >
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  data-testid="button-page-next"
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    backgroundColor:
                      currentPage >= totalPages ? "#f0f0f0" : "#fff",
                    color: currentPage >= totalPages ? "#aaa" : "#222",
                    cursor:
                      currentPage >= totalPages ? "default" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <div
          style={{
            marginTop: "3rem",
            textAlign: "center",
          }}
        >
          <Link href="/devotional/today">
            <span
              data-testid="link-back-today"
              style={{
                color: "#c9a84c",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
              }}
            >
              Back to Today's Devotional
            </span>
          </Link>
        </div>
      </main>

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
            &copy; {new Date().getFullYear()} 365 Daily Devotional. All rights reserved.
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
            <Link
              href="/privacy-policy"
              style={{ color: "#888", textDecoration: "none" }}
            >
              Privacy
            </Link>
            <Link
              href="/terms-of-use"
              style={{ color: "#888", textDecoration: "none" }}
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
}

export function SEOHead({
  title = "365 Daily Devotional — Daily Scripture. Prayer. Transformation.",
  description = "A daily devotional for believers seeking spiritual growth through Scripture, prayer points, faith declarations, and prophetic words.",
  url,
  image,
  type = "article",
}: SEOHeadProps) {
  const fullTitle = title.includes("365 Daily Devotional")
    ? title
    : `${title} | 365 Daily Devotional`;

  const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {currentUrl && <meta property="og:url" content={currentUrl} />}
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}

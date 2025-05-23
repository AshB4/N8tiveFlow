import { Helmet } from "react-helmet";

export default function SEOHead({ title, description, image, url, price, platform = "Cross-platform" }) {
  const isProduct = !!price;

  return (
    <Helmet>
      <title>{title}</title>
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={isProduct ? "product" : "website"} />
      <meta property="og:site_name" content="PostPunk" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@PostPunkAI" />

      {/* Schema.org (Software or Product) */}
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: title,
        description,
        operatingSystem: platform,
        applicationCategory: "DeveloperTool",
        ...(isProduct && {
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: price,
            url: url
          }
        }),
        author: {
          "@type": "Person",
          name: "Ashley Broussard"
        }
      })}</script>
    </Helmet>
  );
}


// Usage Example: Use on another page, mainpage or idk yet
// import SeoHead from "./SeoHead";

// <SeoHead
//   title="Post Punk Scheduler – Automate Your Dev Life"
//   description="Schedule content, automate tasks, and slay your GitHub goals with Post Punk."
//   url="https://yourdomain.com/postpunk"
//   image="https://yourdomain.com/assets/postpunk-banner.png"
// />

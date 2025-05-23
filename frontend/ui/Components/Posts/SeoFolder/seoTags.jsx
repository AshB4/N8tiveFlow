/** @format */
import { Helmet } from "react-helmet-async";
import PropTypes from "prop-types";
import { runSeoCheck } from "../utils/seoCheckRunner";

const defaultSchema = (meta) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "headline": meta.title,
  "description": meta.description,
  "url": meta.url,
  "image": meta.image,
  "author": {
    "@type": "Person",
    "name": "Ashley Broussard"
  }
});

const SeoTags = ({ seoKey, meta = {}, schema }) => {
  let finalMeta = { ...meta };
  let finalSchema = schema;

  if (seoKey) {
    const seo = runSeoCheck(seoKey);
    if (!seo.ok) return null;

    finalMeta = seo.meta;
    finalSchema = seo.schema;
  }

  if (!finalMeta.title) return null;

  const {
    title,
    description,
    keywords = "",
    image,
    url,
    type = finalSchema?.["@type"]?.toLowerCase() || "website"
  } = finalMeta;

  return (
    <Helmet>
      {/* Base tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Ashley Broussard" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Schema.org JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(finalSchema || defaultSchema(finalMeta))}
      </script>
    </Helmet>
  );
};

SeoTags.propTypes = {
  seoKey: PropTypes.string,
  meta: PropTypes.object,
  schema: PropTypes.object
};

export default SeoTags;

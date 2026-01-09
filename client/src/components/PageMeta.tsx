import { Helmet } from "react-helmet-async";

type PageMetaProps = {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
};

const PageMeta = ({ title, description, image, url, type = "website" }: PageMetaProps) => {
  const baseUrl = typeof window === "undefined" ? "" : window.location.origin;
  const fallbackImage = baseUrl ? `${baseUrl}/new_shred_day_logo.png` : undefined;
  const imageUrl = image || fallbackImage;
  const pageUrl = url || (typeof window === "undefined" ? undefined : window.location.href);
  const twitterCard = imageUrl ? "summary_large_image" : "summary";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Shred Day" />
      {pageUrl && <meta property="og:url" content={pageUrl} />}
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      <meta name="twitter:card" content={twitterCard} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};

export default PageMeta;

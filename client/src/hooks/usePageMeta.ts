import { useEffect } from "react";

type PageMeta = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
};

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
};

export const usePageMeta = ({ title, description, image, url, type, siteName }: PageMeta) => {
  useEffect(() => {
    if (title) {
      document.title = title;
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    }

    if (description) {
      upsertMeta('meta[name="description"]', { name: "description", content: description });
      upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    }

    if (url) {
      upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    }

    if (type) {
      upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    }

    if (siteName) {
      upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: siteName });
    }

    if (image) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
      upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    } else {
      upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
    }
  }, [title, description, image, url, type, siteName]);
};

import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import PageMeta from "@/components/PageMeta";

const renderWithHelmet = (ui: ReactElement) => {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
};

const getMeta = (selector: string) =>
  document.head.querySelector(selector) as HTMLMetaElement | null;

describe("PageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("sets title and meta tags using provided values", () => {
    renderWithHelmet(
      <PageMeta
        title="Page Title"
        description="Page description"
        image="https://example.com/preview.jpg"
        url="https://example.com/page"
      />
    );

    expect(document.title).toBe("Page Title");
    expect(getMeta('meta[name="description"]')?.content).toBe("Page description");
    expect(getMeta('meta[property="og:title"]')?.content).toBe("Page Title");
    expect(getMeta('meta[property="og:description"]')?.content).toBe("Page description");
    expect(getMeta('meta[property="og:type"]')?.content).toBe("website");
    expect(getMeta('meta[property="og:site_name"]')?.content).toBe("Shred Day");
    expect(getMeta('meta[property="og:url"]')?.content).toBe("https://example.com/page");
    expect(getMeta('meta[property="og:image"]')?.content).toBe("https://example.com/preview.jpg");
    expect(getMeta('meta[name="twitter:card"]')?.content).toBe("summary_large_image");
    expect(getMeta('meta[name="twitter:image"]')?.content).toBe("https://example.com/preview.jpg");
    expect(getMeta('meta[name="twitter:title"]')?.content).toBe("Page Title");
    expect(getMeta('meta[name="twitter:description"]')?.content).toBe("Page description");
  });

  it("falls back to the default logo when no image is provided", () => {
    renderWithHelmet(
      <PageMeta
        title="Fallback Page"
        description="Fallback description"
      />
    );

    const expectedImage = `${window.location.origin}/shread-day-logo_192x192.png`;
    expect(getMeta('meta[property="og:image"]')?.content).toBe(expectedImage);
    expect(getMeta('meta[name="twitter:image"]')?.content).toBe(expectedImage);
    expect(getMeta('meta[name="twitter:card"]')?.content).toBe("summary_large_image");
  });
});

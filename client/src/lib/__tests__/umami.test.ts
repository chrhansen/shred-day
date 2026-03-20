import {
  createUmamiBeforeSend,
  installUmamiTracking,
  normalizeUmamiPath,
  normalizeUmamiUrl,
} from "@/lib/umami";

describe("umami analytics", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("normalizes dynamic routes", () => {
    expect(normalizeUmamiPath("/d/day_123")).toBe("/d/:dayId");
    expect(normalizeUmamiPath("/days/day_123/edit")).toBe("/days/:id/edit");
    expect(normalizeUmamiPath("/photo-imports/pim_123")).toBe("/photo-imports/:importId");
    expect(normalizeUmamiPath("/text-imports/imp_123")).toBe("/text-imports/:importId");
    expect(normalizeUmamiPath("/stats")).toBe("/stats");
  });

  it("sanitizes tracked urls", () => {
    expect(
      normalizeUmamiUrl(
        "https://shred.day/d/day_123?code=secret#section",
        "https://shred.day",
      ),
    ).toBe("https://shred.day/d/:dayId");
  });

  it("installs the tracker once with privacy-safe attributes", () => {
    const fakeWindow = {
      location: {
        hostname: "shred.day",
        origin: "https://shred.day",
      },
    } as Window;

    installUmamiTracking(document, fakeWindow);
    installUmamiTracking(document, fakeWindow);

    const script = document.head.querySelector("script#shred-day-umami");

    expect(script).not.toBeNull();
    expect(document.head.querySelectorAll("script#shred-day-umami")).toHaveLength(1);
    expect(script).toHaveAttribute("src", "https://cloud.umami.is/script.js");
    expect(script).toHaveAttribute("data-website-id", "964b6450-2750-4608-82ba-07ca0eec63f4");
    expect(script).toHaveAttribute("data-before-send", "shredDayUmamiBeforeSend");
    expect(script).toHaveAttribute("data-do-not-track", "true");
    expect(script).toHaveAttribute("data-exclude-search", "true");
    expect(script).toHaveAttribute("data-exclude-hash", "true");
  });

  it("normalizes urls in before-send payloads", () => {
    const beforeSend = createUmamiBeforeSend("https://shred.day");

    expect(
      beforeSend("event", {
        url: "https://shred.day/text-imports/imp_123?draft=true",
        name: "Pageview",
      }),
    ).toEqual({
      url: "https://shred.day/text-imports/:importId",
      name: "Pageview",
    });
  });

  it("attaches the raw day id as event data", () => {
    const beforeSend = createUmamiBeforeSend("https://shred.day");

    expect(
      beforeSend("event", {
        url: "https://shred.day/d/day_123?draft=true",
        name: "Pageview",
      }),
    ).toEqual({
      url: "https://shred.day/d/:dayId",
      name: "Pageview",
      data: {
        day_id: "day_123",
      },
    });
  });

  it("merges the raw day id into existing event data", () => {
    const beforeSend = createUmamiBeforeSend("https://shred.day");

    expect(
      beforeSend("event", {
        url: "https://shred.day/d/day_123",
        name: "Opened Day",
        data: {
          source: "calendar",
        },
      }),
    ).toEqual({
      url: "https://shred.day/d/:dayId",
      name: "Opened Day",
      data: {
        source: "calendar",
        day_id: "day_123",
      },
    });
  });
});

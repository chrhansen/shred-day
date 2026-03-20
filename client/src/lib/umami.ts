const UMAMI_SCRIPT_ID = "shred-day-umami";
const UMAMI_BEFORE_SEND = "shredDayUmamiBeforeSend";
const UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js";
const UMAMI_WEBSITE_ID = "964b6450-2750-4608-82ba-07ca0eec63f4";

type UmamiPayload = {
  data?: Record<string, unknown>;
  url?: string;
  [key: string]: unknown;
};

type UmamiBeforeSend = (type: string, payload: UmamiPayload) => UmamiPayload | false | null | undefined;

const dynamicRouteMatchers: Array<[RegExp, string]> = [
  [/^\/d\/[^/]+$/, "/d/:dayId"],
  [/^\/days\/[^/]+\/edit$/, "/days/:id/edit"],
  [/^\/photo-imports\/[^/]+$/, "/photo-imports/:importId"],
  [/^\/text-imports\/[^/]+$/, "/text-imports/:importId"],
];

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

const dayRouteMatchers: RegExp[] = [/^\/d\/([^/]+)$/, /^\/days\/([^/]+)\/edit$/];

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const normalizeUmamiPath = (pathname: string) => {
  for (const [matcher, replacement] of dynamicRouteMatchers) {
    if (matcher.test(pathname)) {
      return replacement;
    }
  }

  return pathname;
};

export const normalizeUmamiUrl = (url: string, origin: string) => {
  const parsedUrl = new URL(url, origin);
  parsedUrl.pathname = normalizeUmamiPath(parsedUrl.pathname);
  parsedUrl.search = "";
  parsedUrl.hash = "";

  return parsedUrl.toString();
};

const extractUmamiDayId = (pathname: string) => {
  for (const matcher of dayRouteMatchers) {
    const matchedPath = pathname.match(matcher);

    if (matchedPath?.[1]) {
      return matchedPath[1];
    }
  }

  return null;
};

export const createUmamiBeforeSend = (origin: string): UmamiBeforeSend => {
  return (_type, payload) => {
    if (typeof payload?.url !== "string") {
      return payload;
    }

    const parsedUrl = new URL(payload.url, origin);
    const dayId = extractUmamiDayId(parsedUrl.pathname);
    const existingData = isObjectRecord(payload.data) ? payload.data : {};
    const data = dayId ? { ...existingData, day_id: dayId } : payload.data;

    return {
      ...payload,
      data,
      url: normalizeUmamiUrl(payload.url, origin),
    };
  };
};

export const installUmamiTracking = (doc: Document = document, win: Window = window) => {
  if (localHosts.has(win.location.hostname) || doc.getElementById(UMAMI_SCRIPT_ID)) {
    return;
  }

  const analyticsWindow = win as Window & Record<string, unknown>;
  analyticsWindow[UMAMI_BEFORE_SEND] = createUmamiBeforeSend(win.location.origin);

  const script = doc.createElement("script");
  script.id = UMAMI_SCRIPT_ID;
  script.defer = true;
  script.src = UMAMI_SCRIPT_SRC;
  script.dataset.websiteId = UMAMI_WEBSITE_ID;
  script.dataset.beforeSend = UMAMI_BEFORE_SEND;
  script.dataset.doNotTrack = "true";
  script.dataset.excludeSearch = "true";
  script.dataset.excludeHash = "true";

  doc.head.appendChild(script);
};

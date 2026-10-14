import { ApiError } from "./api";

export function signInCanceled(cause: unknown) {
  const error = cause as { code?: string; message?: string };
  return error?.code === "ERR_REQUEST_CANCELED" ||
    error?.code === "SIGN_IN_CANCELLED" ||
    /^sign-in cancel(?:ed|led)\.?$/i.test(error?.message || "");
}

export function providerSignInNotice(cause: unknown, provider: "apple" | "google") {
  const name = provider === "apple" ? "Apple" : "Google";
  const canceled = signInCanceled(cause);
  if (canceled) return { canceled, message: `${name} sign-in was canceled. Choose a way to continue.` };
  let message = `Couldn't sign in with ${name}. Please try again or use another sign-in method.`;
  if (cause instanceof ApiError && cause.status === 401) {
    const knownErrors: Record<string, string> = {
      "Multiple accounts use this email. Please contact support.":
        "More than one journal uses this email. Contact support so we can help you sign in.",
      "Sign in to your existing account again before linking this login.":
        `Sign in to your existing account again before connecting ${name}.`,
      "This login is linked to another account":
        `This ${name} login is connected to another account. Use a sign-in connected to this journal.`,
      "Apple sign-in expired. Please try again.": "Apple sign-in expired. Please try again.",
      "Please sign in again": `This ${name} sign-in has expired. Please try again.`,
      "Provider identity token required": `${name} didn't return a sign-in identity. Please try again.`,
      "Missing provider identity": `${name} returned an incomplete sign-in identity. Please try again.`,
      "Could not verify provider identity": `Couldn't verify your ${name} sign-in. Please try again.`,
      "Apple authorization code required": "Apple didn't complete your sign-in authorization. Please try again.",
      "Apple authorization could not be completed. Please try again.": "Apple couldn't authorize this sign-in. Please try again or use another sign-in method.",
      "Apple did not return a refresh token": "Apple couldn't set up this sign-in. Please try again or use another sign-in method.",
      "Apple authorization does not match this login": "Apple returned a different sign-in identity. Please try again.",
      "Apple login is not configured": "Apple sign-in is unavailable. Please use another sign-in method.",
      "Apple login is not configured correctly": "Apple sign-in couldn't be set up. Please use another sign-in method.",
      "Apple login is temporarily unavailable": "Apple's identity verification is temporarily unavailable. Please try again later.",
      "Apple authorization is temporarily unavailable": "Apple's sign-in authorization is temporarily unavailable. Please try again later.",
      "A verified email is required for a new account": `${name} didn't share a verified email address. Please try another sign-in method.`,
      "A verified email is required to sign in": `${name} didn't share a verified email address. Please try another sign-in method.`,
      "Could not create your account": "Couldn't create your account. Please try again or use another sign-in method.",
      "Could not sign in. Please try again or sign in to your existing account first.":
        "Couldn't complete this sign-in. Please try again or sign in to your existing account first.",
    };
    if (Object.hasOwn(knownErrors, cause.message)) message = knownErrors[cause.message];
  } else if (cause instanceof Error && cause.message === "Could not reach Shred.Day. Check your connection and try again.") {
    message = cause.message;
  }
  return { canceled, message };
}

export function emailValidation(email: string, password: string, register: boolean) {
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? undefined : "Enter a complete email address.",
    password: !password ? "Enter your password."
      : register && password.length < 8 ? "Use at least 8 characters." : undefined,
  };
}

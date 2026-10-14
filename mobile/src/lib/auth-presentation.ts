export function signInCanceled(cause: unknown) {
  const error = cause as { code?: string; message?: string };
  return error?.code === "ERR_REQUEST_CANCELED" ||
    error?.code === "SIGN_IN_CANCELLED" ||
    /^sign-in cancel(?:ed|led)\.?$/i.test(error?.message || "");
}

export function emailValidation(email: string, password: string, register: boolean) {
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? undefined : "Enter a complete email address.",
    password: !password ? "Enter your password."
      : register && password.length < 8 ? "Use at least 8 characters." : undefined,
  };
}

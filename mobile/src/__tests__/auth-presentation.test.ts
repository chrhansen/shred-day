import { emailValidation, signInCanceled } from "../lib/auth-presentation";

test("registration validates the full address and password length while login accepts an existing short password", () => {
  expect(emailValidation("skier@", "short", true)).toEqual({ email: "Enter a complete email address.", password: "Use at least 8 characters." });
  expect(emailValidation("skier@example.test", "short", false)).toEqual({ email: undefined, password: undefined });
});
test("provider cancellation is distinguished from network and credential failures", () => {
  expect(signInCanceled({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
  expect(signInCanceled(new Error("Sign-in canceled."))).toBe(true);
  expect(signInCanceled(new Error("Connection failed"))).toBe(false);
});

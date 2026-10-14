import { emailValidation, providerSignInNotice, signInCanceled } from "../lib/auth-presentation";
import { ApiError } from "../lib/api";

test("registration needs only a valid email while login still requires its password", () => {
  expect(emailValidation("skier@", "", true)).toEqual({ email: "Enter a complete email address.", password: undefined });
  expect(emailValidation("skier@example.test", "", true)).toEqual({ email: undefined, password: undefined });
  expect(emailValidation("skier@example.test", "", false).password).toBe("Enter your password.");
  expect(emailValidation("skier@example.test", "short", false)).toEqual({ email: undefined, password: undefined });
});
test("provider cancellation is distinguished from network and credential failures", () => {
  expect(signInCanceled({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
  expect(signInCanceled(new Error("Sign-in canceled."))).toBe(true);
  expect(signInCanceled(new Error("Connection failed"))).toBe(false);
});
test("provider notices distinguish cancellation, nonce expiry and transport failures without exposing unknown details", () => {
  expect(providerSignInNotice({ code: "ERR_REQUEST_CANCELED" }, "apple")).toEqual({ canceled: true,
    message: "Apple sign-in was canceled. Choose a way to continue." });
  expect(providerSignInNotice(new ApiError("Apple sign-in expired. Please try again.", 401), "apple").message)
    .toBe("Apple sign-in expired. Please try again.");
  expect(providerSignInNotice(new ApiError("Apple login is not configured correctly", 401), "apple").message)
    .toBe("Apple sign-in couldn't be set up. Please use another sign-in method.");
  expect(providerSignInNotice(new Error("Could not reach Shred.Day. Check your connection and try again."), "google").message)
    .toContain("Check your connection");
  for (const cause of [new Error("Private native details"), new ApiError("Private server details", 401), new ApiError("constructor", 401)]) {
    expect(providerSignInNotice(cause, "apple").message)
      .toBe("Couldn't sign in with Apple. Please try again or use another sign-in method.");
  }
});
test.each([
  ["This sign-in method needs ownership verification. Sign in using your confirmed account email.", "For security, this older sign-in needs an ownership check. Use Continue with Email to confirm your journal's address."],
  ["Provider identity token required", "Apple didn't return a sign-in identity. Please try again."],
  ["Missing provider identity", "Apple returned an incomplete sign-in identity. Please try again."],
  ["Could not verify provider identity", "Couldn't verify your Apple sign-in. Please try again."],
  ["Apple authorization code required", "Apple didn't complete your sign-in authorization. Please try again."],
  ["Apple authorization could not be completed. Please try again.", "Apple couldn't authorize this sign-in. Please try again or use another sign-in method."],
  ["Apple did not return a refresh token", "Apple couldn't set up this sign-in. Please try again or use another sign-in method."],
  ["Apple authorization does not match this login", "Apple returned a different sign-in identity. Please try again."],
  ["Apple login is not configured", "Apple sign-in is unavailable. Please use another sign-in method."],
  ["Apple login is temporarily unavailable", "Apple's identity verification is temporarily unavailable. Please try again later."],
  ["Apple authorization is temporarily unavailable", "Apple's sign-in authorization is temporarily unavailable. Please try again later."],
])("known provider rejection stays distinguishable: %s", (error, message) => {
  expect(providerSignInNotice(new ApiError(error, 401), "apple")).toEqual({ canceled: false, message });
  expect(providerSignInNotice(new ApiError(error, 500), "apple").message)
    .toBe("Couldn't sign in with Apple. Please try again or use another sign-in method.");
});

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDayActions } from "../hooks/use-day-actions";
import { shred } from "../services/shred";

const mockToast = jest.fn();
jest.mock("../services/shred", () => ({ shred: { deleteDay: jest.fn() } }));
jest.mock("../components/ui/toast", () => ({ useToast: () => mockToast }));

test("an unconfirmed DELETE reconciles owner queries and evicts public data without claiming success", async () => {
  const prompt = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const cached = { id: "day_1", date: "2026-10-11", resort: "Sölden" };
  client.setQueryData(["day", cached.id, "user_1"], cached);
  client.setQueryData(["days", 0, "user_1"], [cached]);
  client.setQueryData(["stats", 0, "user_1"], { total: 1 });
  client.setQueryData(["shared-day", cached.id], cached);
  (shred.deleteDay as jest.Mock).mockRejectedValue(new Error("Response lost"));
  const deleted = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(useDayActions, { wrapper });
  act(() => result.current.remove(cached, deleted));
  expect(shred.deleteDay).not.toHaveBeenCalled();
  act(() => prompt.mock.calls[0][2]!.find((button) => button.text === "Delete")!.onPress!());
  await waitFor(() => expect(prompt).toHaveBeenCalledWith("Couldn't confirm deletion", expect.any(String), expect.any(Array)));
  expect(deleted).not.toHaveBeenCalled();
  expect(mockToast).not.toHaveBeenCalled();
  expect(client.getQueryData(["shared-day", cached.id])).toBeUndefined();
  expect(client.getQueryData(["day", cached.id, "user_1"])).toEqual(cached);
  expect(client.getQueryState(["day", cached.id, "user_1"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["days", 0, "user_1"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["stats", 0, "user_1"])?.isInvalidated).toBe(true);
  unmount(); client.clear(); prompt.mockRestore();
});

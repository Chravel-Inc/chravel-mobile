jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import { parseNotificationPayload, getNotificationDeepLink } from "../notifications";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  addNotificationResponseReceivedListener: jest.fn(),
}));

jest.mock("expo-device", () => ({
  isDevice: true,
}));

describe("parseNotificationPayload", () => {
  it("parses a valid chat_message payload", () => {
    const data = { type: "chat_message", tripId: "trip-123", threadId: "t-1" };
    const result = parseNotificationPayload(data);
    expect(result).toEqual(data);
  });

  it("parses all valid push types", () => {
    const types = ["chat_message", "trip_update", "poll_update", "task_update", "calendar_event", "broadcast"];
    for (const type of types) {
      const result = parseNotificationPayload({ type, tripId: "trip-1" });
      expect(result).not.toBeNull();
      expect(result!.type).toBe(type);
    }
  });

  it("returns null for missing type", () => {
    expect(parseNotificationPayload({ tripId: "trip-1" })).toBeNull();
  });

  it("returns null for missing tripId", () => {
    expect(parseNotificationPayload({ type: "chat_message" })).toBeNull();
  });

  it("returns null for unknown type", () => {
    expect(parseNotificationPayload({ type: "unknown_type", tripId: "trip-1" })).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseNotificationPayload(null as any)).toBeNull();
  });

  it("returns null for non-string type", () => {
    expect(parseNotificationPayload({ type: 123, tripId: "trip-1" })).toBeNull();
  });
});

describe("getNotificationDeepLink", () => {
  it("returns chat path for chat_message", () => {
    expect(getNotificationDeepLink({ type: "chat_message", tripId: "t1" })).toBe("/trip/t1?tab=chat");
  });

  it("returns chat path with thread for chat_message", () => {
    expect(getNotificationDeepLink({ type: "chat_message", tripId: "t1", threadId: "th1" })).toBe(
      "/trip/t1?tab=chat&thread=th1"
    );
  });

  it("returns calendar path for calendar_event", () => {
    expect(getNotificationDeepLink({ type: "calendar_event", tripId: "t1" })).toBe("/trip/t1?tab=calendar");
  });

  it("returns calendar path with event for calendar_event", () => {
    expect(getNotificationDeepLink({ type: "calendar_event", tripId: "t1", eventId: "e1" })).toBe(
      "/trip/t1?tab=calendar&event=e1"
    );
  });

  it("returns chat path for poll_update", () => {
    expect(getNotificationDeepLink({ type: "poll_update", tripId: "t1", pollId: "p1" })).toBe(
      "/trip/t1?tab=chat&poll=p1"
    );
  });

  it("returns chat path for task_update", () => {
    expect(getNotificationDeepLink({ type: "task_update", tripId: "t1", taskId: "tk1" })).toBe(
      "/trip/t1?tab=chat&task=tk1"
    );
  });

  it("returns chat path for broadcast", () => {
    expect(getNotificationDeepLink({ type: "broadcast", tripId: "t1" })).toBe("/trip/t1?tab=chat");
  });

  it("returns trip path for trip_update", () => {
    expect(getNotificationDeepLink({ type: "trip_update", tripId: "t1" })).toBe("/trip/t1");
  });

  it("returns null for invalid payload", () => {
    expect(getNotificationDeepLink({ foo: "bar" })).toBeNull();
  });
});

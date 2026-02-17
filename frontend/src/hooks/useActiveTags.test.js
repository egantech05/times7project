/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import useActiveTags from "./useActiveTags";
import { fetchActiveTags } from "../services/gatewayClient";

// Factory mock: guarantees fetchActiveTags is a jest.fn()
jest.mock("../services/gatewayClient", () => ({
  fetchActiveTags: jest.fn(),
}));

// Helper to flush microtasks/promises
const flushPromises = () => new Promise((r) => setTimeout(r, 0));

describe("useActiveTags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should initialize with connecting status", () => {
    fetchActiveTags.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useActiveTags());

    expect(result.current.status).toBe("connecting");
    expect(result.current.scans).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  test("should set status to live after successful data fetch", async () => {
    const mockData = [
      { id: "tag1", timestamp: "2025-02-13T10:00:00" },
      { id: "tag2", timestamp: "2025-02-13T10:00:01" },
    ];
    fetchActiveTags.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useActiveTags());

    // tick() runs immediately, but it is async -> flush promises
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.status).toBe("live");
    expect(result.current.scans).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  test("should set status to error when fetch fails", async () => {
    fetchActiveTags.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useActiveTags());

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network error");
    // NOTE: hook does not clear scans on error; initial scans is [] so this is true for first-fail case
    expect(result.current.scans).toEqual([]);
  });

  test("should fetch data periodically at specified interval", async () => {
    fetchActiveTags.mockResolvedValue([{ id: "tag1" }]);

    renderHook(() => useActiveTags({ intervalMs: 500 }));

    // First immediate tick
    await act(async () => {
      await flushPromises();
    });
    expect(fetchActiveTags).toHaveBeenCalledTimes(1);

    // Next interval tick
    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });
    expect(fetchActiveTags).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });
    expect(fetchActiveTags).toHaveBeenCalledTimes(3);
  });

  test("should clean up interval timer on unmount", async () => {
    fetchActiveTags.mockResolvedValue([]);

    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { unmount } = renderHook(() => useActiveTags({ intervalMs: 1000 }));

    // let first tick finish
    await act(async () => {
      await flushPromises();
    });
    expect(fetchActiveTags).toHaveBeenCalledTimes(1);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  test("should not update state after unmount", async () => {
    let resolveCallback;
    const promise = new Promise((resolve) => {
      resolveCallback = resolve;
    });
    fetchActiveTags.mockReturnValue(promise);

    const { unmount, result } = renderHook(() => useActiveTags());

    // Unmount immediately
    unmount();

    // Resolve the in-flight promise
    resolveCallback([{ id: "tag1" }]);

    // Flush microtasks; state should NOT update because alive=false
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.scans).toEqual([]);
    // status stays whatever it was at render-time in this test setup
    expect(result.current.status).toBe("connecting");
  });

  test("should return empty array when data is null or undefined", async () => {
    fetchActiveTags.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useActiveTags());

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.scans).toEqual([]);
    expect(result.current.status).toBe("live");
    expect(result.current.error).toBeNull();
  });

  test("should handle Error objects without message property", async () => {
    const customError = { toString: () => "Custom error string" };
    fetchActiveTags.mockRejectedValueOnce(customError);

    const { result } = renderHook(() => useActiveTags());

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Custom error string");
  });

  test("should reset interval when interval prop changes", async () => {
    fetchActiveTags.mockResolvedValue([]);

    const setIntervalSpy = jest.spyOn(global, "setInterval");
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { rerender } = renderHook(
      ({ intervalMs }) => useActiveTags({ intervalMs }),
      { initialProps: { intervalMs: 1000 } }
    );

    await act(async () => {
      await flushPromises();
    });
    expect(fetchActiveTags).toHaveBeenCalledTimes(1);

    // Change interval -> triggers cleanup + new interval
    rerender({ intervalMs: 500 });

    expect(clearIntervalSpy).toHaveBeenCalled(); // cleanup ran
    expect(setIntervalSpy).toHaveBeenCalled();   // new interval set

    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });
    expect(fetchActiveTags).toHaveBeenCalledTimes(2);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  test("should maintain live status during consecutive data updates", async () => {
    const mockData1 = [{ id: "tag1" }];
    const mockData2 = [{ id: "tag1" }, { id: "tag2" }];

    fetchActiveTags
      .mockResolvedValueOnce(mockData1) // first tick
      .mockResolvedValueOnce(mockData2); // second tick

    const { result } = renderHook(() => useActiveTags({ intervalMs: 500 }));

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.scans).toEqual(mockData1);
    expect(result.current.status).toBe("live");
    expect(result.current.error).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(result.current.scans).toEqual(mockData2);
    expect(result.current.status).toBe("live");
    expect(result.current.error).toBeNull();
  });

  test("should recover from error state to live state", async () => {
    fetchActiveTags
      .mockRejectedValueOnce(new Error("Connection failed")) // first tick
      .mockResolvedValueOnce([{ id: "tag1" }]); // second tick

    const { result } = renderHook(() => useActiveTags({ intervalMs: 500 }));

    // first tick fails
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Connection failed");

    // second tick succeeds
    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(result.current.status).toBe("live");
    expect(result.current.error).toBeNull();
    expect(result.current.scans).toEqual([{ id: "tag1" }]);
  });
});
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

// 被测组件
import Dashboard from "./index";

// 1) mock hook：useActiveTags
jest.mock("../../hooks/useActiveTags", () => ({
  __esModule: true,
  default: jest.fn(),
}));
import useActiveTags from "../../hooks/useActiveTags";

// 2) mock supabase
jest.mock("../../data/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));
import { supabase } from "../../data/supabase";

// 3) mock 子组件（让测试只关注 Dashboard 逻辑）
jest.mock("../../components/itemCard", () => {
  const React = require("react");
  const { Text, Pressable } = require("react-native");
  return function ItemCard(props) {
    // 把关键 props 打印到测试树里，方便断言
    return (
      <Pressable
        testID={`item-${props.id}`}
        onPress={props.onPress}
        accessibilityRole="button"
      >
        <Text testID={`registered-${props.id}`}>
          {props.registered ? "registered" : "unregistered"}
        </Text>
      </Pressable>
    );
  };
});

jest.mock("../../components/statusDot", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function StatusDot({ live }) {
    return <Text testID="status-dot">{live ? "live" : "offline"}</Text>;
  };
});

jest.mock("../../components/viewItem", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function ViewItem() {
    return <Text testID="view-item">VIEW ITEM</Text>;
  };
});

jest.mock("../../components/newProduct", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function NewProduct() {
    return <Text testID="new-product">NEW PRODUCT</Text>;
  };
});

describe("Dashboard (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockSupabaseSelectTids(tids) {
    // supabase.from("product_info").select("tid") -> Promise<{data,error}>
    const select = jest.fn().mockResolvedValue({
      data: (tids ?? []).map((tid) => ({ tid })),
      error: null,
    });
    supabase.from.mockReturnValue({ select });
    return select;
  }

  test("renders 'Gateway Offline' when status is error", async () => {
    useActiveTags.mockReturnValue({
      scans: [],
      status: "error",
      error: "Network error",
    });

    mockSupabaseSelectTids(["tag1"]); // 即使有 registered，也不影响 offline UI

    const { getByText } = render(<Dashboard />);

    expect(getByText("Gateway Offline")).toBeTruthy();
  });

  test("renders 'No item in range' when live but scans empty", async () => {
    useActiveTags.mockReturnValue({
      scans: [],
      status: "live",
      error: null,
    });

    mockSupabaseSelectTids(["tag1"]);

    const { getByText } = render(<Dashboard />);
    expect(getByText("No item in range")).toBeTruthy();
  });

  test("fetches registered tids once on mount and marks items as registered/unregistered", async () => {
    useActiveTags.mockReturnValue({
      scans: [{ id: "tag1" }, { id: "tag2" }],
      status: "live",
      error: null,
    });

    const selectSpy = mockSupabaseSelectTids(["tag1"]); // tag1 已注册，tag2 未注册

    const { getByTestId } = render(<Dashboard />);

    // 等待 useEffect 的 supabase 查询完成
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("product_info");
      expect(selectSpy).toHaveBeenCalledWith("tid");
    });

    // 断言 ItemCard 收到 registered 标记（我们用 Text 暴露了出来）
    expect(getByTestId("registered-tag1")).toHaveTextContent("registered");
    expect(getByTestId("registered-tag2")).toHaveTextContent("unregistered");
  });

  test("opens ViewItem modal when clicking a registered item", async () => {
    useActiveTags.mockReturnValue({
      scans: [{ id: "tag1" }],
      status: "live",
      error: null,
    });

    mockSupabaseSelectTids(["tag1"]);

    const { getByTestId, queryByTestId } = render(<Dashboard />);

    // 等待 registeredTids 生效
    await waitFor(() => {
      expect(getByTestId("registered-tag1")).toHaveTextContent("registered");
    });

    fireEvent.press(getByTestId("item-tag1"));

    expect(queryByTestId("view-item")).toBeTruthy();
    expect(queryByTestId("new-product")).toBeNull();
  });

  test("opens NewProduct modal when clicking an unregistered item", async () => {
    useActiveTags.mockReturnValue({
      scans: [{ id: "tagX" }],
      status: "live",
      error: null,
    });

    mockSupabaseSelectTids(["tag1"]); // tagX 不在注册列表

    const { getByTestId, queryByTestId } = render(<Dashboard />);

    await waitFor(() => {
      expect(getByTestId("registered-tagX")).toHaveTextContent("unregistered");
    });

    fireEvent.press(getByTestId("item-tagX"));

    expect(queryByTestId("new-product")).toBeTruthy();
    expect(queryByTestId("view-item")).toBeNull();
  });

  test("shows StatusDot as live when status === live; otherwise offline", async () => {
    // live
    useActiveTags.mockReturnValue({ scans: [], status: "live", error: null });
    mockSupabaseSelectTids([]);
    const liveRender = render(<Dashboard />);
    expect(liveRender.getAllByTestId("status-dot")[0]).toHaveTextContent("live");

    // error -> offline
    useActiveTags.mockReturnValue({ scans: [], status: "error", error: "x" });
    mockSupabaseSelectTids([]);
    const offRender = render(<Dashboard />);
    expect(offRender.getAllByTestId("status-dot")[0]).toHaveTextContent("offline");
  });
});
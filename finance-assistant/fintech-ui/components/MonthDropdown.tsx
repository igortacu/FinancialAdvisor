import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  UIManager,
  findNodeHandle,
  Platform,
  Dimensions,
} from "react-native";

function MonthDropdown({
  value,
  options,
  onChange,
  buttonStyle,
  buttonTextStyle,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  buttonStyle: any;
  buttonTextStyle: any;
}) {
  // View on native; HTMLElement on web
  const btnRef = React.useRef<View | HTMLElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>(
    { top: 0, left: 0, width: 180 }
  );

  const openMenu = () => {
    const menuW = 180;

    if (Platform.OS === "web") {
      // Try to get the DOM node and read its rect
      const el =
        (btnRef.current as any) ??
        // some RNW components expose _node
        ((btnRef.current as any)?._node as HTMLElement | undefined);

      if (el && typeof (el as any).getBoundingClientRect === "function") {
        const r = (el as any).getBoundingClientRect();
        const screenW = window.innerWidth;
        const left = Math.min(
          Math.max(r.left + r.width - menuW + window.scrollX, 12),
          screenW - menuW - 12
        );
        setPos({ top: r.top + window.scrollY + 44, left, width: menuW });
      }
      setOpen(true);
      return;
    }

    // Native (iOS/Android)
    // Only call findNodeHandle on native
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { UIManager, findNodeHandle } = require("react-native");
    const node = findNodeHandle(btnRef.current);
    if (node && UIManager?.measureInWindow) {
      UIManager.measureInWindow(node, (x: number, y: number, w: number) => {
        const screenW = Dimensions.get("window").width;
        const left = Math.min(Math.max(x + w - menuW, 12), screenW - menuW - 12);
        setPos({ top: y + 44, left, width: menuW });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  const closeMenu = () => setOpen(false);

  return (
    <>
      {/* On web, the ref will become an HTMLElement; on native, a View */}
      <Pressable ref={btnRef as any} style={buttonStyle} onPress={openMenu}>
        <Text style={buttonTextStyle}>{value === "All" ? "All Months" : value}</Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 8, fontWeight: "600" }}>
          {open ? "▲" : "▼"}
        </Text>
      </Pressable>

      <Modal transparent visible={open} animationType={Platform.OS === "android" ? "fade" : "none"}>
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={{ flex: 1, backgroundColor: "transparent" }} />
        </TouchableWithoutFeedback>

        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            backgroundColor: "white",
            borderWidth: 2,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingVertical: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 24,
          }}
        >
          <Pressable
            onPress={() => {
              onChange("All");
              closeMenu();
            }}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
          >
            <Text style={{ fontSize: 14, fontWeight: value === "All" ? "700" : "500", color: value === "All" ? "#246BFD" : "#374151" }}>
              All Months
            </Text>
          </Pressable>

          {options.map((m, i) => (
            <Pressable
              key={m}
              onPress={() => {
                onChange(m);
                closeMenu();
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: i === options.length - 1 ? 0 : 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: value === m ? "700" : "500",
                  color: value === m ? "#246BFD" : "#374151",
                }}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}


import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { type ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home-filled",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "music.note": "music-note",
  "music.note.list": "queue-music",
  "magnifyingglass": "search",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "forward.fill": "skip-next",
  "backward.fill": "skip-previous",
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "slider.horizontal.3": "tune",
  "gearshape.fill": "settings",
  "square.and.arrow.up": "ios-share",
  "xmark": "close",
  "arrow.down": "keyboard-arrow-down",
} as IconMapping;

export function IconSymbol({ name, size = 24, color, style }: { name: IconSymbolName; size?: number; color: string | OpaqueColorValue; style?: StyleProp<TextStyle>; weight?: SymbolWeight }) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

import { Icon, IconButton } from "@chakra-ui/react";
import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { useThemePreference } from "../theme/ThemePreferenceProvider";

const modes = {
  auto: { icon: FiMonitor, label: "Auto", next: "dark" },
  dark: { icon: FiMoon, label: "Dark", next: "light" },
  light: { icon: FiSun, label: "Light", next: "auto" },
} as const;

export function ColorModeSwitcher() {
  const { preference, setPreference } = useThemePreference();
  const mode = modes[preference];
  const label = `Color theme: ${mode.label}. Switch to ${mode.next} mode`;
  return (
    <IconButton
      aria-label={label}
      title={label}
      icon={<Icon as={mode.icon} boxSize={5} />}
      onClick={() => setPreference(mode.next)}
      variant="ghost"
      size="md"
      minW="44px"
      h="44px"
      flexShrink={0}
    />
  );
}

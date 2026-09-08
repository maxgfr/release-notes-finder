import { Select } from "@chakra-ui/react";
import { useThemePreference } from "../theme/ThemePreferenceProvider";
import { ThemePreference } from "../theme/preference";
export function ColorModeSwitcher() {
  const { preference, setPreference } = useThemePreference();
  return (
    <Select
      aria-label="Color theme"
      title="Color theme"
      value={preference}
      onChange={(event) => setPreference(event.target.value as ThemePreference)}
      width="auto"
      minW="92px"
      size="sm"
      flexShrink={0}
    >
      <option value="auto">Auto</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </Select>
  );
}

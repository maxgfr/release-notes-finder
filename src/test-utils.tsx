import * as React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";

import { ThemePreferenceProvider } from "./theme/ThemePreferenceProvider";
import { themeStorageManager } from "./theme/preference";
import { theme } from "./theme";

const AllProviders = ({ children }: { children?: React.ReactNode }) => (
  <ChakraProvider theme={theme} colorModeManager={themeStorageManager}>
    {children}
  </ChakraProvider>
);

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllProviders, ...options });

export { customRender as render };

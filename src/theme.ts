import { extendTheme } from "@chakra-ui/react";
export const theme = extendTheme({
  styles: {
    global: {
      "::selection": { background: "teal.100", color: "gray.900" },
      "input, textarea": { caretColor: "teal.600" },
      a: { textUnderlineOffset: "0.15em" },
    },
  },
  components: {
    Input: {
      baseStyle: {
        field: {
          _placeholder: {
            color: "gray.600",
            _dark: { color: "gray.400" },
            opacity: 1,
          },
        },
      },
    },
    Button: {
      variants: {
        solid: ({
          colorScheme,
          colorMode,
        }: {
          colorScheme: string;
          colorMode: string;
        }) =>
          colorScheme === "teal"
            ? {
                bg: colorMode === "dark" ? "teal.200" : "teal.600",
                color: colorMode === "dark" ? "gray.900" : "white",
                _hover: { bg: colorMode === "dark" ? "teal.300" : "teal.700" },
              }
            : {},
      },
    },
  },
});

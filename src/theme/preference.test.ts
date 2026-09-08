import { readThemePreference, resolveTheme, THEME_KEY } from "./preference";
afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});
it("defaults to Auto, migrates explicit legacy choices, and prefers the new setting", () => {
  expect(readThemePreference()).toBe("auto");
  localStorage.setItem("chakra-ui-color-mode", "dark");
  expect(readThemePreference()).toBe("dark");
  localStorage.setItem(THEME_KEY, "auto");
  expect(readThemePreference()).toBe("auto");
});
it("works when storage is blocked or the system preference API is unavailable", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(readThemePreference()).toBe("auto");
  expect(resolveTheme("dark")).toBe("dark");
});

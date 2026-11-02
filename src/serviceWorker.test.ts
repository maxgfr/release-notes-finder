import { unregister } from "./serviceWorker";

const registration = (scope: string) => ({ scope, unregister: jest.fn() });

const env = process.env as Record<string, string | undefined>;
const publicUrl = env.PUBLIC_URL;
afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  env.PUBLIC_URL = publicUrl;
  window.history.replaceState({}, "", "/");
});

it("unregisters only this app's own worker, never another site's on the shared origin", async () => {
  // As built for GitHub Pages ("homepage": "."), served under the repository's path.
  env.PUBLIC_URL = ".";
  window.history.replaceState({}, "", "/release-notes-finder/?q=react");
  const own = registration(`${window.location.origin}/release-notes-finder/`);
  const otherSite = registration(`${window.location.origin}/another-app/`);
  const originWide = registration(`${window.location.origin}/`);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistrations: () => Promise.resolve([own, otherSite, originWide]),
    },
  });
  unregister();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(own.unregister).toHaveBeenCalled();
  expect(otherSite.unregister).not.toHaveBeenCalled();
  expect(originWide.unregister).not.toHaveBeenCalled();
});

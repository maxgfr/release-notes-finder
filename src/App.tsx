import * as React from "react";
import {
  Box,
  Button,
  HStack,
  Link,
  Switch,
  FormControl,
  FormLabel,
  Text,
  useToast,
} from "@chakra-ui/react";
import { Header } from "./components/Header";
import { SearchInput } from "./components/SearchInput";
import { SearchHistory } from "./components/SearchHistory";
import { PackageTabs } from "./components/PackageTabs";
import { GithubSettings } from "./components/GithubSettings";
import { Loading } from "./components/ReleasePanel";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { useNpmSearch } from "./hooks/useNpmSearch";
import { usePackageSearch } from "./hooks/usePackageSearch";
import { Navigation, navigationUrl, readNavigation } from "./domain/navigation";
import { normalizeName } from "./domain/package";
export function App() {
  const [navigation, setNavigation] = React.useState(readNavigation);
  const navigationRef = React.useRef(navigation);
  const [input, setInput] = React.useState(navigation.q);
  const [active, setActive] = React.useState("versions");
  const [authRevision, setAuthRevision] = React.useState(0);
  const [shareFallback, setShareFallback] = React.useState("");
  const toast = useToast();
  const history = useSearchHistory();
  const suggestions = useNpmSearch();
  const packages = usePackageSearch();
  const {
    searchPackage,
    fetchVersionReleaseNotes,
    packageData: pkg,
  } = packages;
  const { addToHistory } = history;
  const { clearSuggestions } = suggestions;
  const navigate = React.useCallback(
    (patch: Partial<Navigation>, replace = false) => {
      const next = { ...navigationRef.current, ...patch };
      const url = navigationUrl(next);
      if (url !== window.location.href)
        window.history[replace ? "replaceState" : "pushState"]({}, "", url);
      navigationRef.current = next;
      setNavigation(next);
      setShareFallback("");
    },
    [],
  );
  React.useEffect(() => {
    const onPop = () => {
      const next = readNavigation();
      navigationRef.current = next;
      setNavigation(next);
      setActive(
        next.from || next.to
          ? "compare"
          : next.version
            ? `version:${next.version}`
            : "versions",
      );
      setShareFallback("");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  React.useEffect(() => {
    setInput(navigation.q);
    clearSuggestions();
    setActive("versions");
    void searchPackage(navigation.q);
  }, [navigation.q, searchPackage, clearSuggestions]);
  React.useEffect(() => {
    if (pkg.packageName) addToHistory(pkg.packageName);
  }, [pkg.packageName, addToHistory]);
  React.useEffect(() => {
    if (!pkg.packageName) return;
    if (navigation.from || navigation.to) setActive("compare");
    else if (navigation.version && pkg.versions.includes(navigation.version)) {
      void fetchVersionReleaseNotes(navigation.version);
      setActive(`version:${navigation.version}`);
    }
  }, [
    navigation.from,
    navigation.to,
    navigation.version,
    pkg.packageName,
    pkg.versions,
    fetchVersionReleaseNotes,
  ]);
  const search = (value = input) => {
    const name = normalizeName(value);
    clearSuggestions();
    setInput(name);
    if (name === navigation.q) {
      setActive("versions");
      void searchPackage(name);
    }
    navigate({ q: name, version: "", from: "", to: "" });
  };
  const historySuggestions = React.useMemo(
    () =>
      history.searchHistory.filter((v) =>
        v.includes(input.toLowerCase().trim()),
      ),
    [history.searchHistory, input],
  );
  const selectTab = (key: string) => {
    setActive(key);
    if (key.startsWith("version:"))
      navigate({ version: key.slice(8), from: "", to: "" });
    else if (key !== "compare") navigate({ version: "", from: "", to: "" });
    else navigate({ version: "" });
  };
  return (
    <Box as="main" maxW="1200px" mx="auto" minH="100vh" p={{ base: 4, md: 6 }}>
      <Header />
      <Box display="flex" flexDirection="column" alignItems="center" mt={6}>
        <SearchInput
          inputValue={input}
          onInputChange={(value) => {
            setInput(value);
            suggestions.debouncedSearch(value);
          }}
          onSearch={() => search()}
          historySuggestions={historySuggestions}
          npmSuggestions={suggestions.npmSuggestions}
          isSearchingNpm={suggestions.isSearching}
          error={suggestions.error}
          onSelectSuggestion={search}
          onDismiss={clearSuggestions}
        />
        <Button
          colorScheme="teal"
          onClick={() => search()}
          my={4}
          isDisabled={!input.trim()}
        >
          Search
        </Button>
        <SearchHistory
          history={history.searchHistory}
          onSelect={search}
          onRemove={history.removeFromHistory}
        />
      </Box>
      <GithubSettings
        onToken={(token) => {
          packages.setGithubToken(token);
          setAuthRevision((v) => v + 1);
          if (packages.packageStatus.status === "loading")
            void searchPackage(navigation.q);
        }}
      />
      {packages.packageStatus.status === "loading" && (
        <Loading label="Loading package…" />
      )}
      {packages.packageStatus.status === "error" && (
        <Box py={4}>
          <Text role="alert" mb={3}>
            {packages.packageStatus.error}
          </Text>
          <Button onClick={() => void searchPackage(navigation.q)}>
            Retry package
          </Button>
        </Box>
      )}
      {pkg.packageName && (
        <>
          <HStack flexWrap="wrap" spacing={4} mb={3}>
            <Text fontWeight="bold" overflowWrap="anywhere">
              {pkg.packageName}
            </Text>
            <Link
              href={`https://www.npmjs.com/package/${pkg.packageName}`}
              isExternal
              color="teal.600"
              _dark={{ color: "teal.200" }}
            >
              View on npm
            </Link>
            {pkg.githubUrl && (
              <Link
                href={pkg.githubUrl}
                isExternal
                color="teal.600"
                _dark={{ color: "teal.200" }}
              >
                View on GitHub
              </Link>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActive("versions");
                navigate({ version: "", from: "", to: "" });
                void searchPackage(navigation.q, true);
              }}
            >
              Refresh package
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const url = navigationUrl(navigation);
                try {
                  await navigator.clipboard.writeText(url);
                  toast({
                    title: "Link copied",
                    status: "success",
                    duration: 2000,
                  });
                } catch {
                  setShareFallback(url);
                }
              }}
            >
              Copy link
            </Button>
          </HStack>
          {shareFallback && (
            <Box my={3}>
              <Text>Select and copy this link:</Text>
              <Link href={shareFallback} overflowWrap="anywhere">
                {shareFallback}
              </Link>
            </Box>
          )}
          <FormControl display="flex" alignItems="center" my={4}>
            <FormLabel htmlFor="prereleases" mb={0}>
              Include prereleases
            </FormLabel>
            <Switch
              id="prereleases"
              colorScheme="teal"
              isChecked={navigation.prereleases}
              onChange={(e) => navigate({ prereleases: e.target.checked })}
            />
          </FormControl>
          {navigation.version && !pkg.versions.includes(navigation.version) && (
            <Text role="alert">
              The version in this link does not exist in this package. Select a
              published version below.
            </Text>
          )}
          <PackageTabs
            pkg={pkg}
            openVersions={packages.openVersions}
            notes={packages.notes}
            changelog={packages.changelog}
            active={active}
            onActive={selectTab}
            onOpen={(version) => {
              void fetchVersionReleaseNotes(version);
              toast({
                title: `Opened ${version}`,
                description: "Select its tab to read the notes.",
                duration: 2000,
              });
            }}
            onClose={packages.closeVersionTab}
            loadRelease={packages.loadRelease}
            compareVersions={packages.compareVersions}
            loadChangelog={packages.loadChangelog}
            navigation={navigation}
            onNavigate={(patch) => navigate(patch)}
            authRevision={authRevision}
          />
        </>
      )}
      {packages.packageStatus.status === "idle" && (
        <Text textAlign="center" my={8}>
          Find a package to browse versions and read its release notes.
        </Text>
      )}
    </Box>
  );
}

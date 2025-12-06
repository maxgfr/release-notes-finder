import * as React from "react";
import { Button, Spinner, Box, HStack, Link } from "@chakra-ui/react";
import { Header } from "./components/Header";
import { SearchInput } from "./components/SearchInput";
import { SearchHistory } from "./components/SearchHistory";
import { GitHubLink } from "./components/GitHubLink";
import { ErrorMessages } from "./components/ErrorMessages";
import { PackageTabs } from "./components/PackageTabs";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { useNpmSearch } from "./hooks/useNpmSearch";
import { usePackageSearch } from "./hooks/usePackageSearch";

export const App = () => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");

  const { searchHistory, addToHistory, removeFromHistory } = useSearchHistory();
  const { npmSuggestions, isSearching, debouncedSearch, clearSuggestions } = useNpmSearch();
  const {
    packageData,
    githubInformation,
    isFetching,
    hasErrorSearch,
    hasErrorGithub,
    searchPackage,
    fetchVersionReleaseNotes,
    closeVersionTab,
  } = usePackageSearch();

  const onInputChange = (value: string) => {
    setInputValue(value);
    debouncedSearch(value);
  };

  const onSearch = async (searchValue?: string) => {
    const valueToSearch = searchValue || inputRef.current?.value || "";
    if (!valueToSearch) return;

    addToHistory(valueToSearch);
    clearSuggestions();
    await searchPackage(valueToSearch);
  };

  const onSelectFromHistory = (pkg: string) => {
    if (inputRef.current) {
      inputRef.current.value = pkg;
      setInputValue(pkg);
      clearSuggestions();
      onSearch(pkg);
    }
  };

  const onSelectSuggestion = (suggestion: string) => {
    if (inputRef.current) {
      inputRef.current.value = suggestion;
      setInputValue(suggestion);
      clearSuggestions();
      onSearch(suggestion);
    }
  };

  const getHistorySuggestions = () => {
    if (inputValue.length > 0) {
      return searchHistory.filter(item =>
        item.toLowerCase().includes(inputValue.toLowerCase())
      );
    }
    return searchHistory;
  };

  return (
    <Box display="flex" flexDirection="column" minH="100vh" p={3}>
      <Header />
      <Box display="flex" flexDirection="column" alignItems="center">
        <SearchInput
          inputRef={inputRef}
          inputValue={inputValue}
          onInputChange={onInputChange}
          onSearch={() => onSearch()}
          historySuggestions={getHistorySuggestions()}
          npmSuggestions={npmSuggestions}
          isSearchingNpm={isSearching}
          onSelectSuggestion={onSelectSuggestion}
        />
        <Button colorScheme="teal" onClick={() => onSearch()} marginY="4">
          Search
        </Button>
        <SearchHistory
          history={searchHistory}
          onSelect={onSelectFromHistory}
          onRemove={removeFromHistory}
        />
        {packageData.packageName && (
          <HStack spacing={4} marginY="2">
            <GitHubLink githubUrl={packageData.githubUrl} />
            <Link
              href={`https://www.npmjs.com/package/${packageData.packageName}`}
              isExternal
              color="teal.500"
              fontWeight="bold"
            >
              View on NPM
            </Link>
          </HStack>
        )}
        {isFetching && <Spinner />}
        <ErrorMessages
          hasErrorSearch={hasErrorSearch}
          hasErrorGithub={hasErrorGithub}
        />
      </Box>
      <PackageTabs
        versions={packageData.versions}
        githubInformation={githubInformation}
        changelog={packageData.changelog}
        onClickVersion={fetchVersionReleaseNotes}
        onCloseVersionTab={closeVersionTab}
        packageName={packageData.packageName}
        description={packageData.description}
        author={packageData.author}
        license={packageData.license}
        homepage={packageData.homepage}
        keywords={packageData.keywords}
        latestVersion={packageData.latestVersion}
        githubUrl={packageData.githubUrl}
      />
    </Box>
  );
};

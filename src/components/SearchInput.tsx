import * as React from "react";
import {
  Box,
  Input,
  List,
  ListItem,
  Text,
  Spinner,
  Badge,
} from "@chakra-ui/react";

interface NpmSuggestion {
  name: string;
  description?: string;
}

interface SearchInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSearch: () => void;
  historySuggestions: string[];
  npmSuggestions: NpmSuggestion[];
  isSearchingNpm: boolean;
  onSelectSuggestion: (suggestion: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  inputRef,
  inputValue,
  onInputChange,
  onSearch,
  historySuggestions,
  npmSuggestions,
  isSearchingNpm,
  onSelectSuggestion,
}) => {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const selectedItemRef = React.useRef<HTMLLIElement>(null);

  // Combiner toutes les suggestions dans un seul tableau
  const allSuggestions = React.useMemo(() => {
    const combined: string[] = [];
    historySuggestions.forEach(h => {
      combined.push(h);
    });
    npmSuggestions.forEach(n => {
      combined.push(n.name);
    });
    return combined;
  }, [historySuggestions, npmSuggestions]);

  // Reset selected index when suggestions change
  React.useEffect(() => {
    setSelectedIndex(-1);
  }, [inputValue]);

  // Scroll to the selected element
  React.useEffect(() => {
    if (selectedIndex >= 0 && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    // Delay to allow clicking on a suggestion
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === "Enter") {
        setShowSuggestions(false);
        onSearch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
          handleSelect(allSuggestions[selectedIndex]);
        } else {
          setShowSuggestions(false);
          onSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (suggestion: string) => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onSelectSuggestion(suggestion);
  };

  const handleInputChange = (value: string) => {
    if (!showSuggestions) {
      setShowSuggestions(true);
    }
    onInputChange(value);
  };

  const hasSuggestions =
    historySuggestions.length > 0 || npmSuggestions.length > 0 || isSearchingNpm;

  return (
    <Box position="relative" width="100%" maxWidth="500px">
      <Input
        ref={inputRef}
        placeholder="NPM package name (e.g. react, react-native, etc.)"
        value={inputValue}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {showSuggestions && hasSuggestions && (
        <List
          position="absolute"
          top="100%"
          left="0"
          right="0"
          bg="white"
          _dark={{ bg: "gray.700" }}
          boxShadow="md"
          borderRadius="md"
          zIndex={10}
          maxHeight="300px"
          overflowY="auto"
        >
          {historySuggestions.length > 0 && (
            <>
              <ListItem px={4} py={1} bg="gray.100" _dark={{ bg: "gray.600" }}>
                <Text fontSize="xs" fontWeight="bold" color="gray.500">
                  History
                </Text>
              </ListItem>
              {historySuggestions.map((suggestion, index) => (
                <ListItem
                  key={`history-${suggestion}`}
                  ref={selectedIndex === index ? selectedItemRef : null}
                  px={4}
                  py={2}
                  cursor="pointer"
                  bg={selectedIndex === index ? "teal.100" : "transparent"}
                  _dark={{
                    bg: selectedIndex === index ? "teal.700" : "transparent",
                  }}
                  _hover={{ bg: "teal.100", _dark: { bg: "teal.700" } }}
                  onClick={() => handleSelect(suggestion)}
                >
                  <Badge colorScheme="teal" mr={2}>
                    recent
                  </Badge>
                  {suggestion}
                </ListItem>
              ))}
            </>
          )}
          {isSearchingNpm && (
            <ListItem px={4} py={2} display="flex" alignItems="center">
              <Spinner size="sm" mr={2} />
              <Text fontSize="sm">Searching NPM...</Text>
            </ListItem>
          )}
          {npmSuggestions.length > 0 && (
            <>
              <ListItem px={4} py={1} bg="gray.100" _dark={{ bg: "gray.600" }}>
                <Text fontSize="xs" fontWeight="bold" color="gray.500">
                  NPM Packages
                </Text>
              </ListItem>
              {npmSuggestions.map((suggestion, index) => {
                const globalIndex = historySuggestions.length + index;
                return (
                  <ListItem
                    key={`npm-${suggestion.name}`}
                    ref={selectedIndex === globalIndex ? selectedItemRef : null}
                    px={4}
                    py={2}
                    cursor="pointer"
                    bg={
                      selectedIndex === globalIndex ? "teal.100" : "transparent"
                    }
                    _dark={{
                      bg:
                        selectedIndex === globalIndex
                          ? "teal.700"
                          : "transparent",
                    }}
                    _hover={{ bg: "teal.100", _dark: { bg: "teal.700" } }}
                    onClick={() => handleSelect(suggestion.name)}
                  >
                    <Text fontWeight="medium">{suggestion.name}</Text>
                    {suggestion.description && (
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>
                        {suggestion.description}
                      </Text>
                    )}
                  </ListItem>
                );
              })}
            </>
          )}
        </List>
      )}
    </Box>
  );
};

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@chakra-ui/icons";

const PAGE_SIZE = 50;
interface Props {
  id: string;
  label: string;
  versions: string[];
  value: string;
  onChange: (version: string) => void;
}

/** Search and paginate locally so even large registries remain fully reachable. */
export function VersionSelect({ id, label, versions, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [active, setActive] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  const highlight = useColorModeValue("teal.50", "teal.900");
  const selectedColor = useColorModeValue("teal.700", "teal.200");
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? versions.filter((version) => version.toLowerCase().includes(term))
      : versions;
  }, [query, versions]);
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, matches.length);
  const choose = (version: string) => {
    onChange(version);
    setOpen(false);
  };
  const moveTo = (index: number) => {
    setActive(index);
    setPage(Math.floor(index / PAGE_SIZE));
  };
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [page, query, open]);
  useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  return (
    <FormControl minW={0}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <Popover
        isOpen={open}
        onOpen={() => {
          setQuery("");
          setPage(0);
          setActive(-1);
          setOpen(true);
        }}
        onClose={() => setOpen(false)}
        initialFocusRef={searchRef}
        placement="bottom-start"
        matchWidth
        isLazy
      >
        <PopoverTrigger>
          <Button
            id={id}
            aria-label={`${label}: ${value || "Select a version"}`}
            variant="outline"
            width="100%"
            fontWeight="normal"
            rightIcon={<ChevronDownIcon />}
            justifyContent="space-between"
          >
            <Text
              as="span"
              minW={0}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {value || "Select a version"}
            </Text>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          aria-hidden={!open}
          aria-label={label}
          width="100%"
          maxW="calc(100vw - 32px)"
          shadow="lg"
        >
          <PopoverBody p={3}>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon />
              </InputLeftElement>
              <Input
                ref={searchRef}
                role="combobox"
                aria-label="Search versions"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={`${id}-options`}
                aria-describedby={`${id}-count`}
                aria-activedescendant={
                  active >= start && active < end
                    ? `${id}-option-${active}`
                    : undefined
                }
                placeholder="Search versions…"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                  setActive(-1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    if (matches.length)
                      moveTo(
                        active < 0
                          ? event.key === "ArrowDown"
                            ? start
                            : end - 1
                          : Math.max(
                              0,
                              Math.min(
                                matches.length - 1,
                                active + (event.key === "ArrowDown" ? 1 : -1),
                              ),
                            ),
                      );
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    if (active >= 0 && matches[active]) choose(matches[active]);
                    else if (matches.length === 1) choose(matches[0]);
                  }
                }}
              />
            </InputGroup>
            <Text id={`${id}-count`} role="status" fontSize="sm" my={2}>
              {matches.length
                ? `${(start + 1).toLocaleString("en-US")}–${end.toLocaleString("en-US")} of ${matches.length.toLocaleString("en-US")} versions`
                : "No versions found. Try another search."}
            </Text>
            <List
              ref={listRef}
              id={`${id}-options`}
              role="listbox"
              aria-label={`${label} options`}
              maxH="min(240px, 35dvh)"
              overflowY="auto"
              overscrollBehavior="contain"
            >
              {matches.slice(start, end).map((version, offset) => {
                const index = start + offset;
                return (
                  <ListItem
                    key={version}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={version === value}
                    aria-posinset={index + 1}
                    aria-setsize={matches.length}
                    ref={index === active ? activeRef : undefined}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={2}
                    minH="44px"
                    px={3}
                    py={2}
                    borderRadius="md"
                    cursor="pointer"
                    bg={index === active ? highlight : undefined}
                    color={version === value ? selectedColor : undefined}
                    fontWeight={version === value ? "semibold" : "normal"}
                    _hover={{ bg: highlight }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(version)}
                  >
                    <Box as="span" overflowWrap="anywhere">
                      {version}
                    </Box>
                    {version === value && (
                      <CheckIcon flexShrink={0} boxSize={3} />
                    )}
                  </ListItem>
                );
              })}
            </List>
            {matches.length > PAGE_SIZE && (
              <HStack justify="space-between" mt={3}>
                <Button
                  size="sm"
                  aria-label="Previous versions"
                  isDisabled={page === 0}
                  onClick={() => {
                    searchRef.current?.focus();
                    setPage(page - 1);
                    setActive(-1);
                  }}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  aria-label="Next versions"
                  isDisabled={end === matches.length}
                  onClick={() => {
                    searchRef.current?.focus();
                    setPage(page + 1);
                    setActive(-1);
                  }}
                >
                  Next
                </Button>
              </HStack>
            )}
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </FormControl>
  );
}

import * as React from "react";
import {
  Box,
  Input,
  List,
  ListItem,
  Text,
  Spinner,
  Badge,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { NpmSuggestion } from "../hooks/useNpmSearch";
interface Props {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSearch: () => void;
  historySuggestions: string[];
  npmSuggestions: NpmSuggestion[];
  isSearchingNpm: boolean;
  onSelectSuggestion: (value: string) => void;
  onDismiss: () => void;
  error?: string;
}
export function SearchInput(props: Props) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(-1);
  const id = React.useId();
  const suggestions = React.useMemo(() => {
    const seen = new Set<string>();
    return [
      ...props.historySuggestions.map((name) => ({
        name,
        description: "",
        history: true,
      })),
      ...props.npmSuggestions.map((v) => ({ ...v, history: false })),
    ].filter((v) => {
      if (seen.has(v.name)) return false;
      seen.add(v.name);
      return true;
    });
  }, [props.historySuggestions, props.npmSuggestions]);
  React.useEffect(() => setSelected(-1), [props.inputValue, suggestions]);
  const dismiss = () => {
    setOpen(false);
    setSelected(-1);
    props.onDismiss();
  };
  const choose = (value: string) => {
    dismiss();
    props.onSelectSuggestion(value);
  };
  const visible =
    open && (suggestions.length > 0 || props.isSearchingNpm || !!props.error);
  return (
    <FormControl maxW="500px" position="relative">
      <FormLabel htmlFor={id}>npm package</FormLabel>
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!!visible}
        aria-controls={`${id}-list`}
        aria-activedescendant={
          visible && selected >= 0 ? `${id}-${selected}` : undefined
        }
        placeholder="react, next, @babel/core…"
        autoComplete="off"
        value={props.inputValue}
        onChange={(e) => {
          setOpen(true);
          props.onInputChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={dismiss}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Escape") {
            e.preventDefault();
            dismiss();
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setSelected((prev) =>
              Math.max(
                -1,
                Math.min(
                  suggestions.length - 1,
                  prev + (e.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (visible && suggestions[selected])
              choose(suggestions[selected].name);
            else {
              dismiss();
              props.onSearch();
            }
          }
        }}
      />
      {visible && (
        <Box
          position="absolute"
          top="100%"
          insetX={0}
          bg="white"
          _dark={{ bg: "gray.700" }}
          shadow="md"
          borderRadius="md"
          zIndex={10}
          maxH="300px"
          overflowY="auto"
        >
          <List
            id={`${id}-list`}
            role="listbox"
            aria-label="Package suggestions"
          >
            {suggestions.map((item, index) => (
              <ListItem
                key={item.name}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === selected}
                ref={(el) => {
                  if (index === selected)
                    el?.scrollIntoView?.({ block: "nearest" });
                }}
                p={3}
                cursor="pointer"
                bg={index === selected ? "teal.50" : undefined}
                _dark={{ bg: index === selected ? "teal.900" : undefined }}
                _hover={{ bg: "teal.50", _dark: { bg: "teal.900" } }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item.name)}
              >
                <Text fontWeight="medium">
                  {item.name}{" "}
                  {item.history && <Badge colorScheme="teal">Recent</Badge>}
                </Text>
                {item.description && (
                  <Text fontSize="sm" noOfLines={1}>
                    {item.description}
                  </Text>
                )}
              </ListItem>
            ))}
          </List>
          {props.isSearchingNpm && (
            <Text role="status" p={3}>
              <Spinner size="xs" mr={2} />
              Searching npm…
            </Text>
          )}
          {props.error && (
            <Text role="status" p={3} fontSize="sm">
              {props.error}
            </Text>
          )}
        </Box>
      )}
    </FormControl>
  );
}

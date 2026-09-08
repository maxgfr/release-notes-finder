import {
  Box,
  Text,
  Wrap,
  WrapItem,
  Button,
  CloseButton,
  HStack,
} from "@chakra-ui/react";
export function SearchHistory({
  history,
  onSelect,
  onRemove,
}: {
  history: string[];
  onSelect: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  if (!history.length) return null;
  return (
    <Box my={2}>
      <Text fontSize="sm" mb={2}>
        Recent searches
      </Text>
      <Wrap justify="center">
        {history.map((name) => (
          <WrapItem key={name}>
            <HStack spacing={0} borderWidth="1px" borderRadius="md">
              <Button
                variant="ghost"
                size="sm"
                colorScheme="teal"
                onClick={() => onSelect(name)}
              >
                {name}
              </Button>
              <CloseButton
                size="sm"
                aria-label={`Remove ${name} from history`}
                onClick={() => onRemove(name)}
              />
            </HStack>
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  );
}

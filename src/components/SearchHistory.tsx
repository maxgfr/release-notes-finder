import {
  Box,
  Text,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
} from "@chakra-ui/react";

interface SearchHistoryProps {
  history: string[];
  onSelect: (packageName: string) => void;
  onRemove: (packageName: string) => void;
}

export const SearchHistory = ({
  history,
  onSelect,
  onRemove,
}: SearchHistoryProps) => {
  if (history.length === 0) return null;

  return (
    <Box marginY="2">
      <Text fontSize="sm" color="gray.500" marginBottom="2">
        Historique de recherche:
      </Text>
      <Wrap justify="center">
        {history.map(item => (
          <WrapItem key={item}>
            <Tag
              size="md"
              borderRadius="full"
              variant="solid"
              colorScheme="teal"
              cursor="pointer"
            >
              <TagLabel onClick={() => onSelect(item)}>{item}</TagLabel>
              <TagCloseButton onClick={() => onRemove(item)} />
            </Tag>
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  );
};

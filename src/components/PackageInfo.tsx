import { Box, Heading, Text, Badge, HStack, VStack, Link } from "@chakra-ui/react";

export const PackageInfo = ({
  packageName,
  description,
  author,
  license,
  homepage,
  keywords,
  latestVersion,
  githubUrl,
}: {
  packageName: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  keywords: string[];
  latestVersion: string;
  githubUrl: string;
}) => {
  if (!packageName) return null;

  return (
    <Box p={6} borderRadius="md" bg="white" _dark={{ bg: "gray.700" }} boxShadow="md">
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="lg" mb={2}>
            {packageName}
          </Heading>
          {latestVersion && (
            <Badge colorScheme="teal" fontSize="md">
              v{latestVersion}
            </Badge>
          )}
        </Box>

        {description && (
          <Box>
            <Text fontSize="md" color="gray.600" _dark={{ color: "gray.300" }}>
              {description}
            </Text>
          </Box>
        )}

        <HStack spacing={4} wrap="wrap">
          {author && (
            <Box>
              <Text fontSize="sm" fontWeight="bold" color="gray.500">
                Auteur
              </Text>
              <Text fontSize="sm">{author}</Text>
            </Box>
          )}
          {license && (
            <Box>
              <Text fontSize="sm" fontWeight="bold" color="gray.500">
                License
              </Text>
              <Text fontSize="sm">{license}</Text>
            </Box>
          )}
        </HStack>

        {homepage && (
          <Box>
            <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={1}>
              Site web
            </Text>
            <Link href={homepage} isExternal color="teal.500" fontSize="sm">
              {homepage}
            </Link>
          </Box>
        )}

        {githubUrl && (
          <Box>
            <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={1}>
              GitHub
            </Text>
            <Link href={githubUrl} isExternal color="teal.500" fontSize="sm">
              {githubUrl}
            </Link>
          </Box>
        )}

        {keywords && keywords.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={2}>
              Keywords
            </Text>
            <HStack spacing={2} wrap="wrap">
              {keywords.map(keyword => (
                <Badge key={keyword} colorScheme="gray" fontSize="xs">
                  {keyword}
                </Badge>
              ))}
            </HStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

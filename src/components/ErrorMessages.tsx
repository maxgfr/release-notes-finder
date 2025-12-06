import { Text } from "@chakra-ui/react";

export const ErrorMessages = ({
  hasErrorSearch,
  hasErrorGithub,
  hasRateLimitError,
}: {
  hasErrorSearch: boolean;
  hasErrorGithub: boolean;
  hasRateLimitError: boolean;
}) => {
  return (
    <>
      {hasErrorSearch && (
        <Text color="red.500">The package was not found on NPM</Text>
      )}
      {hasRateLimitError && (
        <Text color="orange.500">
          GitHub API rate limit exceeded. Please try again later or use a GitHub token.
        </Text>
      )}
      {hasErrorGithub && !hasRateLimitError && (
        <Text color="red.500">
          No release notes found on GitHub for this version or no GitHub
          repository is linked in package.json
        </Text>
      )}
    </>
  );
};

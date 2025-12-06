import { Text } from "@chakra-ui/react";

export const ErrorMessages = ({
  hasErrorSearch,
  hasErrorGithub,
}: {
  hasErrorSearch: boolean;
  hasErrorGithub: boolean;
}) => {
  return (
    <>
      {hasErrorSearch && (
        <Text color="red.500">The package was not found on NPM</Text>
      )}
      {hasErrorGithub && (
        <Text color="red.500">
          No release notes has found on Github for this version or no Github
          repository is linked on package.json
        </Text>
      )}
    </>
  );
};

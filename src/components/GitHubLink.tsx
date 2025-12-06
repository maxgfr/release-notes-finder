import { HStack, Link } from "@chakra-ui/react";

export const GitHubLink = ({
  githubUrl,
}: {
  githubUrl: string;
}) => {
  if (!githubUrl) {
    return null;
  }

  return (
    <HStack marginY="2">
      <Link
        href={githubUrl}
        isExternal
        color="teal.500"
        fontWeight="bold"
      >
        Voir sur GitHub
      </Link>
    </HStack>
  );
};

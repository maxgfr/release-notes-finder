import { Flex, Heading, Image } from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
export function Header() {
  return (
    <Flex as="header" align="center" gap={3}>
      <Image
        src={`${process.env.PUBLIC_URL || "."}/icon.svg`}
        alt=""
        boxSize={{ base: "40px", md: "56px" }}
      />
      <Heading as="h1" size={{ base: "md", md: "lg" }} flex={1}>
        Release Notes Finder
      </Heading>
      <ColorModeSwitcher />
    </Flex>
  );
}

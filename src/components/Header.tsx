import { Box, Heading, Image } from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";

export const Header = () => {
  return (
    <>
      <Box display="flex" flexDirection="row" justifyContent="space-between">
        <Box />
        <Heading textAlign="center">Release notes finder</Heading>
        <ColorModeSwitcher />
      </Box>
      <Box display="flex" justifyContent="center" marginY="4">
        <Image src="icon.svg" width="120px" height="120px" />
      </Box>
    </>
  );
};

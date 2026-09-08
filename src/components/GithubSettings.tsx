import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Text,
} from "@chakra-ui/react";
export function GithubSettings({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [enabled, setEnabled] = useState(false);
  return (
    <Box as="details" my={4} maxW="600px">
      <Box as="summary" cursor="pointer" py={2}>
        GitHub access {enabled ? "(token active)" : "(optional)"}
      </Box>
      <Text fontSize="sm" my={3}>
        Public packages work without signing in. Add a GitHub token if you need
        a higher request limit. It stays in this tab’s memory and is cleared
        when you reload.
      </Text>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            onToken(draft.trim());
            setEnabled(true);
            setDraft("");
          }
        }}
      >
        <FormControl>
          <FormLabel htmlFor="github-token">GitHub token</FormLabel>
          <Input
            id="github-token"
            type="password"
            value={draft}
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter an optional token"
            onChange={(e) => setDraft(e.target.value)}
          />
        </FormControl>
        <HStack mt={3}>
          <Button type="submit" size="sm" isDisabled={!draft.trim()}>
            {enabled ? "Replace token" : "Use token"}
          </Button>
          {enabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onToken("");
                setDraft("");
                setEnabled(false);
              }}
            >
              Remove token
            </Button>
          )}
        </HStack>
      </form>
      <Text role="status" mt={2} fontSize="sm">
        {enabled
          ? "Requests use your token for this session."
          : "Using public GitHub access."}
      </Text>
    </Box>
  );
}

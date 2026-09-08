import { lazy, Suspense } from "react";
import { Box, Button, Link, Spinner, Text } from "@chakra-ui/react";
import { Resource } from "../hooks/usePackageSearch";
import { ReleaseNotes } from "../services/releases";
export const MarkdownContent = lazy(() => import("./MarkdownContent"));
export const Loading = ({ label = "Loading…" }: { label?: string }) => (
  <Text role="status" py={4}>
    <Spinner size="sm" mr={2} />
    {label}
  </Text>
);
export function ReleasePanel({
  resource,
  onRetry,
}: {
  resource?: Resource<ReleaseNotes>;
  onRetry: () => void;
}) {
  if (!resource || resource.status === "idle" || resource.status === "loading")
    return <Loading label="Loading release notes…" />;
  if (resource.status === "error")
    return (
      <Box>
        <Text role="alert" mb={3}>
          {resource.error}
        </Text>
        <Button onClick={onRetry}>Retry release notes</Button>
      </Box>
    );
  const notes = resource.data!;
  return (
    <Box>
      {notes.url && (
        <Link
          href={notes.url}
          isExternal
          color="teal.600"
          _dark={{ color: "teal.200" }}
          display="inline-block"
          mb={4}
        >
          View source on GitHub
        </Link>
      )}
      {notes.status === "notes" ? (
        <Suspense fallback={<Loading />}>
          <MarkdownContent body={notes.body} baseUrl={notes.baseUrl} />
        </Suspense>
      ) : (
        <Text role="status">
          {notes.status === "empty"
            ? "This release has no written release notes."
            : notes.status === "tag-only"
              ? "A Git tag exists, but no release notes were published for this version."
              : "No release notes or matching tag were found. The package may use a different release naming convention or have no linked GitHub repository."}
        </Text>
      )}
    </Box>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Link,
  List,
  ListItem,
  Text,
  Badge,
} from "@chakra-ui/react";
import { PackageData } from "../domain/package";
import { GitComparison, CompareLoader } from "../services/comparison";
import { errorMessage, isAbort } from "../services/client";
import { Loading } from "./ReleasePanel";
export function RepositoryChanges({
  pkg,
  from,
  to,
  load,
  authRevision,
}: {
  pkg: PackageData;
  from: string;
  to: string;
  load: CompareLoader;
  authRevision: number;
}) {
  const [result, setResult] = useState<GitComparison>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileLimit, setFileLimit] = useState(30);
  const active = useRef<AbortController>();
  const request = useCallback(
    async (previous?: GitComparison) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      setLoading(true);
      setError("");
      try {
        const next = await load(
          from,
          to,
          controller.signal,
          previous?.nextPage || 1,
          previous,
        );
        if (controller.signal.aborted) return;
        setResult(
          previous
            ? {
                ...next,
                files: previous.files,
                filesMayBeTruncated: previous.filesMayBeTruncated,
                commits: Array.from(
                  new Map(
                    [...previous.commits, ...next.commits].map((commit) => [
                      commit.sha,
                      commit,
                    ]),
                  ).values(),
                ),
              }
            : next,
        );
      } catch (error) {
        if (!controller.signal.aborted && !isAbort(error))
          setError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [from, to, load],
  );
  useEffect(() => {
    setResult(undefined);
    setFileLimit(30);
    void request();
    return () => active.current?.abort();
  }, [request, pkg.packageName, authRevision]);
  return (
    <Box as="section" mb={8} aria-label="Repository changes">
      <Heading size="md" mb={3}>
        Repository changes
      </Heading>
      {pkg.repository?.directory && (
        <Text fontSize="sm" mb={3}>
          This comparison covers the whole repository and may include other
          packages in this monorepo. Package directory:{" "}
          {pkg.repository.directory}.
        </Text>
      )}
      {error && (
        <Box mb={3}>
          <Text role="alert" mb={2}>
            {error}
          </Text>
          <Button size="sm" onClick={() => void request(result)}>
            Retry repository changes
          </Button>
        </Box>
      )}
      {loading && <Loading label="Loading repository changes…" />}
      {result && (
        <>
          <HStack flexWrap="wrap" mb={4}>
            <Text>
              {result.totalCommits.toLocaleString()} commits ·{" "}
              {result.files.length}
              {result.filesMayBeTruncated ? "+" : ""} changed files
            </Text>
            <Link
              href={result.url}
              isExternal
              color="teal.600"
              _dark={{ color: "teal.200" }}
            >
              View full diff on GitHub
            </Link>
          </HStack>
          {result.status === "identical" && (
            <Text mb={4}>
              Both versions point to the same Git history. Package contents or
              release metadata may still differ.
            </Text>
          )}
          {(result.status === "diverged" || result.status === "behind") && (
            <Text mb={4} role="status">
              These references do not form a straight upgrade. GitHub reports{" "}
              {result.status} history; the comparison is relative to their
              common ancestor.
            </Text>
          )}
          <Heading size="sm" mb={2}>
            Commits introduced in the target
          </Heading>
          <List spacing={3} mb={4}>
            {result.commits.map((commit) => (
              <ListItem key={commit.sha}>
                <Link href={commit.url} isExternal>
                  {commit.title}
                </Link>
                <Text fontSize="sm">
                  {commit.sha.slice(0, 7)}
                  {commit.author ? ` · ${commit.author}` : ""}
                </Text>
              </ListItem>
            ))}
          </List>
          {result.nextPage && (
            <Button
              size="sm"
              mb={5}
              isDisabled={loading}
              onClick={() => void request(result)}
            >
              Load more commits ({result.commits.length} of{" "}
              {result.totalCommits})
            </Button>
          )}
          <Box as="details">
            <Box as="summary" cursor="pointer" fontWeight="semibold" py={2}>
              Changed files ({result.files.length}
              {result.filesMayBeTruncated ? "+" : ""})
            </Box>
            {result.filesMayBeTruncated && (
              <Text fontSize="sm" mb={3}>
                GitHub returns at most 300 files for a comparison. This list may
                be incomplete; use the full diff link.
              </Text>
            )}
            <List spacing={3} mt={3}>
              {result.files.slice(0, fileLimit).map((file) => (
                <ListItem key={file.path} overflowWrap="anywhere">
                  <Link href={file.url} isExternal>
                    {file.path}
                  </Link>
                  <HStack fontSize="sm" flexWrap="wrap">
                    <Badge>{file.status}</Badge>
                    <Text>
                      +{file.additions} / −{file.deletions}
                    </Text>
                    {file.previousPath && (
                      <Text>Previously {file.previousPath}</Text>
                    )}
                  </HStack>
                </ListItem>
              ))}
            </List>
            {fileLimit < result.files.length && (
              <Button
                size="sm"
                mt={3}
                onClick={() => setFileLimit((value) => value + 30)}
              >
                Show more files
              </Button>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

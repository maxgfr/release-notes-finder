import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Text,
  Wrap,
  WrapItem,
  HStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { filterVersions, FilterType } from "../domain/package";
interface Props {
  versions: string[];
  latestVersion: string;
  includePrereleases: boolean;
  onClickVersion: (version: string) => void;
}
export function FilterTab({
  versions,
  latestVersion,
  includePrereleases,
  onClickVersion,
}: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<FilterType>("all");
  const [major, setMajor] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [includePrereleases]);
  const majors = useMemo(
    () => Array.from(new Set(versions.map((v) => v.split(".")[0]))),
    [versions],
  );
  const filtered = useMemo(
    () =>
      filterVersions(versions, {
        query,
        type,
        major,
        prereleases: includePrereleases,
      }),
    [versions, query, type, major, includePrereleases],
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 50) - 1),
  );
  const reset = () => {
    setQuery("");
    setType("all");
    setMajor("");
    setPage(0);
  };
  return (
    <Box>
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4} maxW="750px" mb={4}>
        <FormControl>
          <FormLabel htmlFor="version-query">Find a version</FormLabel>
          <Input
            id="version-query"
            placeholder="e.g. 18.2"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="version-type">Version type</FormLabel>
          <Select
            id="version-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as FilterType);
              setPage(0);
            }}
          >
            <option value="all">All versions</option>
            <option value="major">Major (x.0.0)</option>
            <option value="minor">Minor (x.y.0)</option>
            <option value="patch">Patch (x.y.z)</option>
            <option value="latest">Latest per major</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="version-major">Major version</FormLabel>
          <Select
            id="version-major"
            value={major}
            onChange={(e) => {
              setMajor(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All majors</option>
            {majors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </FormControl>
      </SimpleGrid>
      <HStack justify="space-between" mb={3}>
        <Text role="status" fontSize="sm">
          {filtered.length.toLocaleString()} versions found
        </Text>
        <Button size="sm" variant="outline" onClick={reset}>
          Reset filters
        </Button>
      </HStack>
      {filtered.length === 0 && (
        <Text py={6}>
          No versions match these filters. Try another search or include
          prereleases.
        </Text>
      )}
      <Wrap spacing={2}>
        {filtered
          .slice(currentPage * 50, (currentPage + 1) * 50)
          .map((version) => (
            <WrapItem key={version}>
              <Button
                size="sm"
                variant="outline"
                colorScheme="teal"
                onClick={() => onClickVersion(version)}
                aria-label={`Open notes for ${version}`}
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {version}
                {version === latestVersion && (
                  <Badge ml={2} colorScheme="teal">
                    latest
                  </Badge>
                )}
              </Button>
            </WrapItem>
          ))}
      </Wrap>
      {filtered.length > 50 && (
        <HStack mt={5}>
          <Button
            size="sm"
            onClick={() => setPage(currentPage - 1)}
            isDisabled={currentPage === 0}
          >
            Previous page
          </Button>
          <Text fontSize="sm">
            Page {currentPage + 1} of {Math.ceil(filtered.length / 50)}
          </Text>
          <Button
            size="sm"
            onClick={() => setPage(currentPage + 1)}
            isDisabled={(currentPage + 1) * 50 >= filtered.length}
          >
            Next page
          </Button>
        </HStack>
      )}
    </Box>
  );
}

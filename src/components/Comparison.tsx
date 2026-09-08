import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { gt, valid } from "semver";
import { PackageData, versionRange } from "../domain/package";
import { Navigation } from "../domain/navigation";
import { Resource } from "../hooks/usePackageSearch";
import { ReleaseNotes } from "../services/releases";
import { ApiError, isAbort } from "../services/client";
import { ReleasePanel } from "./ReleasePanel";
import { RepositoryChanges } from "./RepositoryChanges";
import { CompareLoader } from "../services/comparison";
interface Props {
  pkg: PackageData;
  navigation: Navigation;
  onNavigate: (patch: Partial<Navigation>) => void;
  notes: Record<string, Resource<ReleaseNotes>>;
  load: (version: string, retry?: boolean) => Promise<ReleaseNotes>;
  authRevision: number;
  compareVersions: CompareLoader;
}
export function Comparison({
  pkg,
  navigation,
  onNavigate,
  notes,
  load,
  authRevision,
  compareVersions,
}: Props) {
  const [from, setFrom] = useState(navigation.from);
  const [to, setTo] = useState(navigation.to);
  const [view, setView] = useState(navigation.view);
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const run = useRef(0);
  const cancelRun = useCallback(() => {
    run.current++;
  }, []);
  const latestNotes = useRef(notes);
  latestNotes.current = notes;
  const options = useMemo(
    () => pkg.versions.filter((v) => !from || v.includes(from)).slice(0, 50),
    [pkg.versions, from],
  );
  const targets = useMemo(
    () => pkg.versions.filter((v) => !to || v.includes(to)).slice(0, 50),
    [pkg.versions, to],
  );
  const validPair =
    pkg.versions.includes(navigation.from) &&
    pkg.versions.includes(navigation.to) &&
    !!valid(navigation.from) &&
    !!valid(navigation.to) &&
    gt(navigation.to, navigation.from);
  const versions = useMemo(
    () =>
      !validPair
        ? []
        : navigation.view === "side-by-side"
          ? [navigation.from, navigation.to]
          : versionRange(
              pkg.versions,
              navigation.from,
              navigation.to,
              navigation.prereleases,
            ),
    [
      validPair,
      pkg.versions,
      navigation.from,
      navigation.to,
      navigation.view,
      navigation.prereleases,
    ],
  );
  const versionsRef = useRef(versions);
  versionsRef.current = versions;
  const loadBatch = async (batch: string[], retry = false) => {
    const id = ++run.current;
    setRunning(true);
    setMessage("");

    for (const version of batch) {
      if (id !== run.current) return;
      setVisible((prev) =>
        prev.includes(version) ? prev : [...prev, version],
      );
      if (latestNotes.current[version]?.status === "success") continue;
      try {
        await load(version, retry);
      } catch (error) {
        if (id !== run.current || isAbort(error)) break;
        if (
          error instanceof ApiError &&
          ["rate-limit", "auth", "forbidden"].includes(error.kind)
        ) {
          setMessage(error.message);
          break;
        }
      }
    }
    if (id === run.current) setRunning(false);
  };
  const loadBatchRef = useRef(loadBatch);
  loadBatchRef.current = loadBatch;
  useEffect(() => {
    setFrom(navigation.from);
    setTo(navigation.to);
    setView(navigation.view);
    setVisible([]);
    setMessage("");
    setRunning(false);
    if (versionsRef.current.length)
      void loadBatchRef.current(versionsRef.current);
    return cancelRun;
  }, [
    navigation.from,
    navigation.to,
    navigation.view,
    navigation.prereleases,
    pkg.packageName,
    authRevision,
    cancelRun,
  ]);
  const draftValid =
    pkg.versions.includes(from) &&
    pkg.versions.includes(to) &&
    !!valid(from) &&
    !!valid(to) &&
    gt(to, from);
  const hasNewSelection =
    from !== navigation.from ||
    to !== navigation.to ||
    view !== navigation.view;
  const completed = visible.filter(
    (v) => notes[v]?.status === "success",
  ).length;
  const unresolved = versions.filter((v) => notes[v]?.status !== "success");
  const missing = visible.filter(
    (v) => notes[v]?.status === "success" && notes[v]?.data?.status !== "notes",
  ).length;
  return (
    <Box>
      <Heading size="md" mb={2}>
        Compare versions
      </Heading>
      <Text mb={5}>
        See what changed after your current version, up to and including the
        target version.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <FormControl>
          <FormLabel htmlFor="compare-from">From version</FormLabel>
          <Input
            id="compare-from"
            list="from-options"
            placeholder="Search or enter a version"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <datalist id="from-options">
            {options.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="compare-to">To version</FormLabel>
          <Input
            id="compare-to"
            list="to-options"
            placeholder="Search or enter a version"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <datalist id="to-options">
            {targets.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="compare-view">View</FormLabel>
          <Select
            id="compare-view"
            value={view}
            onChange={(e) => setView(e.target.value as Navigation["view"])}
          >
            <option value="changes">Changes between versions</option>
            <option value="range">Release notes only</option>
            <option value="side-by-side">Endpoint notes side by side</option>
          </Select>
        </FormControl>
      </SimpleGrid>
      <Button
        my={4}
        colorScheme="teal"
        isDisabled={!draftValid || (running && !hasNewSelection)}
        onClick={() => onNavigate({ from, to, view, version: "" })}
      >
        Compare
      </Button>
      {(from || to) && !draftValid && (
        <Text mb={4}>
          Choose two published versions. The target version must be newer than
          the starting version.
        </Text>
      )}
      {validPair && (
        <>
          <Heading size="md" mb={2}>
            {navigation.from} → {navigation.to}
          </Heading>
          <Text mb={5}>
            {navigation.view === "side-by-side"
              ? "These are the two endpoint notes only. Choose Changes between versions to include the full upgrade history."
              : `Changes introduced after ${navigation.from}, through ${navigation.to}. ${versions.length} published versions in this interval.`}
          </Text>
          {navigation.view === "changes" && (
            <RepositoryChanges
              pkg={pkg}
              from={navigation.from}
              to={navigation.to}
              load={compareVersions}
              authRevision={authRevision}
            />
          )}
          <Heading size="md" mb={3}>
            {navigation.view === "side-by-side"
              ? "Endpoint release notes"
              : "Release notes throughout the upgrade"}
          </Heading>
          <Text role="status" mb={3}>
            {completed} of {versions.length} versions checked
            {missing > 0 ? ` · ${missing} without written notes` : ""}
            {running ? " · Loading…" : ""}
          </Text>
          {message && (
            <Text role="alert" mb={3}>
              {message}
            </Text>
          )}
          <HStack flexWrap="wrap" mb={5}>
            {running ? (
              <Button
                onClick={() => {
                  run.current++;
                  setRunning(false);
                  setMessage(
                    "Stopped. The current request may finish; no further versions will be requested.",
                  );
                }}
              >
                Stop loading
              </Button>
            ) : (
              <>
                {unresolved.length > 0 && (
                  <Button onClick={() => void loadBatch(unresolved, true)}>
                    Resume / retry unfinished
                  </Button>
                )}
              </>
            )}
          </HStack>
          <SimpleGrid
            columns={{
              base: 1,
              lg: navigation.view === "side-by-side" ? 2 : 1,
            }}
            spacing={8}
          >
            {visible.map((version) => (
              <VStack
                key={version}
                align="stretch"
                minW={0}
                spacing={3}
                borderTopWidth="1px"
                pt={5}
              >
                <Heading size="md">{version}</Heading>
                {!notes[version] ? (
                  <Text>Waiting to load.</Text>
                ) : (
                  <ReleasePanel
                    resource={notes[version]}
                    onRetry={() => void loadBatch([version], true)}
                  />
                )}
              </VStack>
            ))}
          </SimpleGrid>
          {!running && completed === versions.length && (
            <Text mt={5} role="status">
              {missing
                ? "All selected versions were checked. Some have no published notes; this is not a complete change history."
                : "All selected release notes have been loaded."}
            </Text>
          )}
        </>
      )}
    </Box>
  );
}

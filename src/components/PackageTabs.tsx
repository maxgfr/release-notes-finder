import { lazy, Suspense, useEffect } from "react";
import {
  Box,
  Button,
  CloseButton,
  HStack,
  Link,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { PackageData } from "../domain/package";
import { Navigation } from "../domain/navigation";
import { Resource } from "../hooks/usePackageSearch";
import { Changelog, ReleaseNotes } from "../services/releases";
import { FilterTab } from "./FilterTab";
import { PackageInfo } from "./PackageInfo";
import { ReleasePanel, MarkdownContent, Loading } from "./ReleasePanel";
import { CompareLoader } from "../services/comparison";
const Comparison = lazy(() =>
  import("./Comparison").then((module) => ({ default: module.Comparison })),
);
interface Props {
  compareVersions: CompareLoader;
  pkg: PackageData;
  openVersions: string[];
  notes: Record<string, Resource<ReleaseNotes>>;
  changelog: Resource<Changelog | null>;
  active: string;
  onActive: (key: string) => void;
  onOpen: (version: string) => void;
  onClose: (version: string) => void;
  loadRelease: (version: string, retry?: boolean) => Promise<ReleaseNotes>;
  loadChangelog: (retry?: boolean) => Promise<void>;
  navigation: Navigation;
  onNavigate: (patch: Partial<Navigation>) => void;
  authRevision: number;
}
export function PackageTabs(props: Props) {
  const {
    pkg,
    active,
    notes,
    changelog,
    loadChangelog,
    loadRelease,
    authRevision,
  } = props;
  const ids = [
    "versions",
    "compare",
    ...props.openVersions.map((v) => `version:${v}`),
    "changelog",
    "info",
  ];
  const index = Math.max(0, ids.indexOf(active));
  useEffect(() => {
    if (active === "changelog") void loadChangelog();
    if (active.startsWith("version:"))
      void loadRelease(active.slice(8)).catch(() => undefined);
  }, [active, loadChangelog, loadRelease, authRevision]);
  const retry = (version: string) => {
    void loadRelease(version, true).catch(() => undefined);
  };
  return (
    <Tabs
      mt={6}
      index={index}
      onChange={(i) => props.onActive(ids[i])}
      isLazy
      lazyBehavior="keepMounted"
      variant="line"
      colorScheme="teal"
    >
      <TabList
        overflowX="auto"
        overflowY="hidden"
        whiteSpace="nowrap"
        aria-label="Package views"
      >
        <Tab>Versions</Tab>
        <Tab>Compare</Tab>
        {props.openVersions.map((version) => (
          <HStack key={version} spacing={0} align="stretch">
            <Tab>{version}</Tab>
            <CloseButton
              alignSelf="center"
              size="sm"
              aria-label={`Close notes for ${version}`}
              onClick={() => {
                if (active === `version:${version}`) props.onActive("versions");
                props.onClose(version);
              }}
            />
          </HStack>
        ))}
        <Tab>Changelog</Tab>
        <Tab>Info</Tab>
      </TabList>
      <TabPanels>
        <TabPanel px={{ base: 0, md: 4 }}>
          <FilterTab
            key={pkg.packageName}
            versions={pkg.versions}
            latestVersion={pkg.latestVersion}
            includePrereleases={props.navigation.prereleases}
            onClickVersion={props.onOpen}
          />
        </TabPanel>
        <TabPanel px={{ base: 0, md: 4 }}>
          {active === "compare" && (
            <Suspense fallback={<Loading label="Loading comparison…" />}>
              <Comparison
                pkg={pkg}
                compareVersions={props.compareVersions}
                navigation={props.navigation}
                onNavigate={props.onNavigate}
                notes={notes}
                load={loadRelease}
                authRevision={authRevision}
              />
            </Suspense>
          )}
        </TabPanel>
        {props.openVersions.map((version) => (
          <TabPanel key={version} px={{ base: 0, md: 4 }}>
            {active === `version:${version}` && (
              <ReleasePanel
                resource={notes[version]}
                onRetry={() => retry(version)}
              />
            )}
          </TabPanel>
        ))}
        <TabPanel px={{ base: 0, md: 4 }}>
          {(changelog.status === "idle" || changelog.status === "loading") && (
            <Loading label="Loading changelog…" />
          )}
          {changelog.status === "error" && (
            <Box>
              <Text role="alert" mb={3}>
                {changelog.error}
              </Text>
              <Button onClick={() => void loadChangelog(true)}>
                Retry changelog
              </Button>
            </Box>
          )}
          {active === "changelog" &&
            changelog.status === "success" &&
            (changelog.data ? (
              <>
                <Link
                  isExternal
                  href={changelog.data.url}
                  display="inline-block"
                  mb={4}
                >
                  View changelog on GitHub
                </Link>
                <Suspense fallback={<Loading />}>
                  <MarkdownContent
                    body={changelog.data.body}
                    baseUrl={changelog.data.baseUrl}
                  />
                </Suspense>
              </>
            ) : (
              <Text>
                No changelog was found in the package directory or repository
                root.
                {pkg.githubUrl && (
                  <>
                    {" "}
                    <Link href={pkg.githubUrl} isExternal>
                      Browse the repository.
                    </Link>
                  </>
                )}
              </Text>
            ))}
        </TabPanel>
        <TabPanel px={{ base: 0, md: 4 }}>
          <PackageInfo {...pkg} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

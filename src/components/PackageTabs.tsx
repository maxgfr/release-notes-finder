import * as React from "react";
import { Tab, TabList, TabPanels, Tabs, TabPanel } from "@chakra-ui/react";
import type { TabInformation } from "../types";
import { FilterTab } from "./FilterTab";
import { MemoizeTab } from "./MemoizeTab";
import { ClosableTab } from "./ClosableTab";
import { PackageInfo } from "./PackageInfo";

interface PackageTabsProps {
  versions: string[];
  githubInformation: TabInformation[];
  changelog: string;
  onClickVersion: (version: string) => void;
  onCloseVersionTab: (version: string) => void;
  packageName: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  keywords: string[];
  latestVersion: string;
  githubUrl: string;
}

export const PackageTabs: React.FC<PackageTabsProps> = ({
  versions,
  githubInformation,
  changelog,
  onClickVersion,
  onCloseVersionTab,
  packageName,
  description,
  author,
  license,
  homepage,
  keywords,
  latestVersion,
  githubUrl,
}) => {
  const [tabIndex, setTabIndex] = React.useState(0);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  const handleCloseVersionTab = (version: string) => {
    onCloseVersionTab(version);
    setTabIndex(0);
  };

  if (versions.length === 0) {
    return null;
  }

  return (
    <Tabs marginTop="4" index={tabIndex} onChange={handleTabChange}>
      <TabList>
        {versions.length > 0 && <Tab>VERSIONS</Tab>}
        {githubInformation.length > 0 &&
          githubInformation.map(info => (
            <ClosableTab
              key={`tab-${info.version}`}
              label={`v${info.version}`}
              onClose={() => handleCloseVersionTab(info.version)}
            />
          ))}
        {changelog && <Tab>CHANGELOG.md</Tab>}
        <Tab>INFO</Tab>
      </TabList>
      <TabPanels>
        {versions.length > 0 && (
          <FilterTab onClickVersion={onClickVersion} versions={versions} />
        )}
        {githubInformation.length > 0 &&
          githubInformation.map(info => (
            <MemoizeTab
              key={`tabpanel-${info.version}`}
              info={info.releaseInformation}
            />
          ))}
        {changelog && <MemoizeTab info={changelog} />}
        <TabPanel>
          <PackageInfo
            packageName={packageName}
            description={description}
            author={author}
            license={license}
            homepage={homepage}
            keywords={keywords}
            latestVersion={latestVersion}
            githubUrl={githubUrl}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

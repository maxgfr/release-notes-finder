import * as React from "react";
import {
  Input,
  Button,
  Spinner,
  Box,
  Image,
  Tab,
  TabList,
  TabPanels,
  Tabs,
  Text,
  Heading,
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./components/ColorModeSwitcher";
import { GithubReleaseTag, TabInformation } from "./types";
import { FilterTab } from "./components/FilterTab";
import { MemoizeTab } from "./components/MemoizeTab";

export const App = () => {
  const inputRef = React.createRef<HTMLInputElement>();
  const [githubInformation, setGithubInformation] = React.useState<
    TabInformation[]
  >([]);
  const [githubUser, setGithubUser] = React.useState<string>("");
  const [githubRepoName, setGithubRepoName] = React.useState<string>("");
  const [npmReadme, setNpmReadme] = React.useState<string>("");
  const [versions, setVersions] = React.useState<string[]>([]);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [hasErrorSearch, setHasErrorSearch] = React.useState<boolean>(false);
  const [hasErrorGithub, setHasErrorGithub] = React.useState<boolean>(false);
  const [selectedVersion, setSelectedVersion] = React.useState<string[]>([]);
  const [changelog, setChangelog] = React.useState<string>("");
  const [readme, setReadme] = React.useState<string>("");

  const resetAll = () => {
    setGithubInformation([]);
    setGithubUser("");
    setGithubRepoName("");
    setNpmReadme("");
    setVersions([]);
    setHasErrorSearch(false);
    setChangelog("");
    setReadme("");
  };

  const onSearch = async () => {
    let npmInfo = null;
    resetAll();
    setIsFetching(true);
    setHasErrorSearch(false);
    setHasErrorGithub(false);
    try {
      npmInfo = await fetch(
        `https://registry.npmjs.org/${inputRef.current?.value}`
      );
    } catch {
      setIsFetching(false);
      setHasErrorSearch(true);
    }
    if (npmInfo) {
      const npmInfoJson = await npmInfo.json();
      const versions = Object.keys(npmInfoJson.versions)
        .filter(version => !version.includes("-"))
        .sort((a, b) => {
          const aSplit = a.split(".");
          const bSplit = b.split(".");
          if (aSplit[0] !== bSplit[0]) {
            return parseInt(bSplit[0]) - parseInt(aSplit[0]);
          }
          if (aSplit[1] !== bSplit[1]) {
            return parseInt(bSplit[1]) - parseInt(aSplit[1]);
          }
          return parseInt(bSplit[2]) - parseInt(aSplit[2]);
        });
      setVersions(versions);
      setNpmReadme(npmInfoJson.readme);
      const githubUrl = npmInfoJson.repository.url ?? npmInfoJson.homepage;
      const githubUser = githubUrl.split("/")[3];
      const githubRepoName = githubUrl
        .split("/")[4]
        .split(".")[0]
        .split("#")[0];
      setGithubUser(githubUser);
      setGithubRepoName(githubRepoName);
      Promise.all([
        fetch(
          `https://api.github.com/repos/${githubUser}/${githubRepoName}/contents/README.md`
        ),
        fetch(
          `https://api.github.com/repos/${githubUser}/${githubRepoName}/contents/CHANGELOG.md`
        ),
      ])
        .then(async ([readme, changelog]) => {
          const readmeJson = await readme.json();
          const changelogJson = await changelog.json();
          setReadme(atob(readmeJson.content));
          setChangelog(atob(changelogJson.content));
        })
        .finally(() => {
          setIsFetching(false);
        });
    }
  };

  const onClickVersion = (version: string) => {
    setIsFetching(true);
    setHasErrorGithub(false);
    const newSelectedVersion = [...selectedVersion, version];
    const uniqueSelectedVersion = newSelectedVersion.filter(
      (v, i, a) => a.indexOf(v) === i
    );
    setSelectedVersion(uniqueSelectedVersion);
    fetch(
      `https://api.github.com/repos/${githubUser}/${githubRepoName}/releases/tags/v${version}`
    )
      .then(res => res.json())
      .then((res: GithubReleaseTag) => {
        if (res.body) {
          const info: TabInformation = {
            releaseInformation: res.body,
            version,
          };
          const newGithubInformation = [...githubInformation, info];
          const uniqueGithubInformation = newGithubInformation.filter(
            (v, i, a) => a.findIndex(t => t.version === v.version) === i
          );
          setGithubInformation(uniqueGithubInformation);
        } else {
          setHasErrorGithub(true);
        }
      })
      .catch(err => {
        console.error(err);
        setHasErrorGithub(true);
      })
      .finally(() => {
        setIsFetching(false);
      });
  };

  return (
    <Box display="flex" flexDirection="column" minH="100vh" p={3}>
      <Box display="flex" flexDirection="row" justifyContent="space-between">
        <Box />
        <Heading textAlign="center">Release notes finder</Heading>
        <ColorModeSwitcher />
      </Box>
      <Box display="flex" flexDirection="column" alignItems="center">
        <Image src="icon.svg" width="120px" height="120px" />
        <Input
          ref={inputRef}
          placeholder="NPM package name (e.g. react, react-native, etc.)"
          maxWidth="500px"
          onKeyPress={e => {
            if (e.key === "Enter") {
              onSearch();
            }
          }}
        />
        <Button colorScheme="teal" onClick={onSearch} marginY="4">
          Search
        </Button>
        {isFetching && <Spinner />}
        {hasErrorSearch && (
          <Text color="red.500">The package was not found on NPM</Text>
        )}
        {hasErrorGithub && (
          <Text color="red.500">
            No release notes has found on Github for this version or no Github
            repository is linked on package.json
          </Text>
        )}
      </Box>
      {versions.length > 0 && (
        <Tabs marginTop="4">
          <TabList>
            {npmReadme && <Tab>README.md (npm)</Tab>}
            {readme && <Tab>README.md (github)</Tab>}
            {changelog && <Tab>CHANGELOG.md</Tab>}
            {versions && versions.length > 0 && <Tab>Versions</Tab>}
            {githubInformation &&
              githubInformation.length > 0 &&
              githubInformation.map(info => (
                <Tab key={`tabpanel-${info.version}`}>
                  Version {info.version}
                </Tab>
              ))}
          </TabList>
          <TabPanels>
            {npmReadme && <MemoizeTab info={npmReadme} />}
            {readme && <MemoizeTab info={readme} />}
            {changelog && <MemoizeTab info={changelog} />}
            {versions && versions.length > 0 && (
              <FilterTab onClickVersion={onClickVersion} versions={versions} />
            )}
            {githubInformation &&
              githubInformation.length > 0 &&
              githubInformation.map(info => (
                <MemoizeTab
                  key={`tabpanel-${info.version}`}
                  info={info.releaseInformation}
                />
              ))}
          </TabPanels>
        </Tabs>
      )}
    </Box>
  );
};

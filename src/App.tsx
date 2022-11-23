import * as React from "react";
import {
  Input,
  Button,
  Link,
  Spinner,
  Box,
  Image,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Badge,
  Text,
  Heading,
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { GithubReleaseTag, TabInformation } from "./types";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import ReactMarkdown from "react-markdown";

export const App = () => {
  const [libName, setLibName] = React.useState<string>("");
  const [githubInformation, setGithubInformation] = React.useState<
    TabInformation[]
  >([]);
  const [githubUser, setGithubUser] = React.useState<string>("");
  const [githubRepoName, setGithubRepoName] = React.useState<string>("");
  const [npmReadme, setNpmReadme] = React.useState<string>("");
  const [versions, setVersions] = React.useState<string[]>([]);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [filteredVersion, setFilteredVersion] = React.useState<string[]>([]);
  const [filter, setFilter] = React.useState<string>("");
  const [hasErrorSearch, setHasErrorSearch] = React.useState<boolean>(false);
  const [hasErrorGithub, setHasErrorGithub] = React.useState<boolean>(false);
  const [selectedVersion, setSelectedVersion] = React.useState<string[]>([]);
  const [changelog, setChangelog] = React.useState<string>("");

  const resetAll = () => {
    setGithubInformation([]);
    setGithubUser("");
    setGithubRepoName("");
    setNpmReadme("");
    setVersions([]);
    setFilteredVersion([]);
    setFilter("");
    setHasErrorSearch(false);
  };

  const onSearch = () => {
    resetAll();
    setIsFetching(true);
    setHasErrorSearch(false);
    setHasErrorGithub(false);
    fetch(`https://registry.npmjs.org/${libName}`)
      .then(res => res.json())
      .then(res => {
        const versions = Object.keys(res.versions)
          .filter(version => !version.includes("-"))
          .sort((a, b) => {
            const aSplit = a.split(".");
            const bSplit = b.split(".");
            if (aSplit[0] !== bSplit[0]) {
              return parseInt(aSplit[0]) - parseInt(bSplit[0]);
            }
            if (aSplit[1] !== bSplit[1]) {
              return parseInt(aSplit[1]) - parseInt(bSplit[1]);
            }
            return parseInt(aSplit[2]) - parseInt(bSplit[2]);
          });
        setVersions(versions);
        setFilteredVersion(versions);
        setNpmReadme(res.readme);
        const githubUrl = res.repository.url ?? res.homepage;
        const githubUser = githubUrl.split("/")[3];
        const githubRepoName = githubUrl
          .split("/")[4]
          .split(".")[0]
          .split("#")[0];
        setGithubUser(githubUser);
        setGithubRepoName(githubRepoName);
        return { githubUser, githubRepoName };
      })
      .then(async res => {
        const fetchResult = await fetch(
          `https://api.github.com/repos/${res.githubUser}/${res.githubRepoName}/contents/CHANGELOG.md`
        );
        const json = await fetchResult.json();
        const base64 = json.content;
        const changelog = atob(base64);
        setChangelog(changelog);
      })
      .catch(err => {
        console.error(err);
        setHasErrorSearch(true);
      })
      .finally(() => {
        setIsFetching(false);
      });
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

  const onChangeFilter = (v: string) => {
    setFilter(v);
    setFilteredVersion(versions.filter(version => version.includes(v)));
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
          placeholder="NPM package name (e.g. react, react-native, etc.)"
          value={libName}
          onChange={e => setLibName(e.target.value)}
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
            {npmReadme && <Tab>Presentation</Tab>}
            {versions && versions.length > 0 && <Tab>Versions</Tab>}
            {changelog && <Tab>Changelog</Tab>}
            {githubInformation &&
              githubInformation.length > 0 &&
              githubInformation.map(info => (
                <Tab key={`tabpanel-${info.version}`}>
                  Version {info.version}
                </Tab>
              ))}
          </TabList>
          <TabPanels>
            {npmReadme && (
              <TabPanel>
                <ReactMarkdown
                  components={ChakraUIRenderer()}
                  children={npmReadme}
                  skipHtml
                />
              </TabPanel>
            )}
            {versions && versions.length > 0 && (
              <TabPanel>
                <Box display="flex" flexDirection="column">
                  <Input
                    placeholder="Version"
                    value={filter}
                    onChange={e => onChangeFilter(e.target.value)}
                  />
                  <Box
                    display="flex"
                    flexDirection="row"
                    marginTop="6"
                    flexWrap="wrap"
                    justifyContent="left"
                  >
                    {filteredVersion.map(version => (
                      <Box key={`list-${version}`} margin="2">
                        <Link onClick={() => onClickVersion(version)}>
                          <Badge fontSize="medium">{version}</Badge>
                        </Link>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </TabPanel>
            )}
            {changelog && (
              <TabPanel>
                <ReactMarkdown
                  components={ChakraUIRenderer()}
                  children={changelog}
                  skipHtml
                />
              </TabPanel>
            )}
            {githubInformation &&
              githubInformation.length > 0 &&
              githubInformation.map(info => (
                <TabPanel key={`tabpanel-${info.version}`}>
                  <ReactMarkdown
                    components={ChakraUIRenderer()}
                    children={info.releaseInformation}
                    skipHtml
                  />
                </TabPanel>
              ))}
          </TabPanels>
        </Tabs>
      )}
    </Box>
  );
};

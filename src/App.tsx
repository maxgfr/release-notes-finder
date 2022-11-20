import * as React from "react";
import {
  ChakraProvider,
  VStack,
  Grid,
  theme,
  Input,
  Button,
  Link,
  Spinner,
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { GithubReleaseTag } from "./types";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import ReactMarkdown from "react-markdown";

export const App = () => {
  const [libName, setLibName] = React.useState<string>("");
  const [githubInformation, setGithubInformation] =
    React.useState<GithubReleaseTag | null>(null);
  const [githubUser, setGithubUser] = React.useState<string>("");
  const [githubRepoName, setGithubRepoName] = React.useState<string>("");
  const [npmReadme, setNpmReadme] = React.useState<string>("");
  const [versions, setVersions] = React.useState<string[]>([]);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [filteredVersion, setFilteredVersion] = React.useState<string[]>([]);
  const [filter, setFilter] = React.useState<string>("");
  const [hasErrorSearch, setHasErrorSearch] = React.useState<boolean>(false);
  const [hasErrorGithub, setHasErrorGithub] = React.useState<boolean>(false);

  const resetAll = () => {
    setGithubInformation(null);
    setGithubUser("");
    setGithubRepoName("");
    setNpmReadme("");
    setVersions([]);
    setFilteredVersion([]);
    setFilter("");
    setHasErrorSearch(false);
  };

  const onSearch = () => {
    resetAll()
    setIsFetching(true);
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
        setGithubUser(githubUrl.split("/")[3]);
        setGithubRepoName(githubUrl.split("/")[4].split(".")[0].split("#")[0]);
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
    fetch(
      `https://api.github.com/repos/${githubUser}/${githubRepoName}/releases/tags/v${version}`
    )
      .then(res => res.json())
      .then(res => {
        setGithubInformation(res);
      })
      .catch(err => {
        console.error(err);
        setHasErrorGithub(true);
      })
      .finally(() => {
        setIsFetching(false);
      });
  };

  const onChangeFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filter = e.target.value;
    setFilter(filter);
    setFilteredVersion(versions.filter(version => version.includes(filter)));
  };

  return (
    <ChakraProvider theme={theme}>
      <Grid minH="100vh" p={3}>
        <ColorModeSwitcher justifySelf="flex-end" />
        <VStack spacing={8}>
          <Input
            placeholder="Search the package name"
            value={libName}
            onChange={e => setLibName(e.target.value)}
          />
          <Button colorScheme="teal" onClick={onSearch}>
            Search
          </Button>
        </VStack>
        {isFetching && <Spinner/>}
        <ReactMarkdown
          components={ChakraUIRenderer()}
          children={npmReadme ?? ""}
          skipHtml
        />
        {filteredVersion && filteredVersion.length > 0 && (
          <>
            <Input
              placeholder="Search a specific version"
              value={filter}
              onChange={onChangeFilter}
            />
            {filteredVersion.map(version => (
              <Link key={version} onClick={() => onClickVersion(version)}>
                {version}
              </Link>
            ))}
          </>
        )}
        <ReactMarkdown
          components={ChakraUIRenderer()}
          children={githubInformation?.body ?? ""}
          skipHtml
        />
        {hasErrorSearch && <p>The package was not found on NPM</p>}
        {hasErrorGithub && <p>No release notes has found on Github for this version or no Github repository is linked on package.json</p>}
      </Grid>
    </ChakraProvider>
  );
};

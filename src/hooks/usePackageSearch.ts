import * as React from "react";
import type { TabInformation } from "../types";

interface PackageData {
  versions: string[];
  githubUser: string;
  githubRepoName: string;
  githubUrl: string;
  changelog: string;
  packageName: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  keywords: string[];
  latestVersion: string;
}

interface UsePackageSearchReturn {
  packageData: PackageData;
  githubInformation: TabInformation[];
  isFetching: boolean;
  hasErrorSearch: boolean;
  hasErrorGithub: boolean;
  hasRateLimitError: boolean;
  searchPackage: (packageName: string) => Promise<void>;
  fetchVersionReleaseNotes: (version: string) => Promise<void>;
  closeVersionTab: (version: string) => void;
  resetAll: () => void;
}

const initialPackageData: PackageData = {
  versions: [],
  githubUser: "",
  githubRepoName: "",
  githubUrl: "",
  changelog: "",
  packageName: "",
  description: "",
  author: "",
  license: "",
  homepage: "",
  keywords: [],
  latestVersion: "",
};

export const usePackageSearch = (): UsePackageSearchReturn => {
  const [packageData, setPackageData] = React.useState<PackageData>(initialPackageData);
  const [githubInformation, setGithubInformation] = React.useState<TabInformation[]>([]);
  const [isFetching, setIsFetching] = React.useState(false);
  const [hasErrorSearch, setHasErrorSearch] = React.useState(false);
  const [hasErrorGithub, setHasErrorGithub] = React.useState(false);
  const [hasRateLimitError, setHasRateLimitError] = React.useState(false);

  // Ref to always have the latest values in callbacks
  const packageDataRef = React.useRef<PackageData>(initialPackageData);
  React.useEffect(() => {
    packageDataRef.current = packageData;
  }, [packageData]);

  const resetAll = React.useCallback(() => {
    setPackageData(initialPackageData);
    setGithubInformation([]);
    setHasErrorSearch(false);
    setHasErrorGithub(false);
    setHasRateLimitError(false);
  }, []);

  const searchPackage = React.useCallback(async (searchValue: string) => {
    if (!searchValue) return;

    resetAll();
    setIsFetching(true);

    try {
      const npmInfo = await fetch(`https://registry.npmjs.org/${searchValue}`);

      if (!npmInfo.ok) {
        setIsFetching(false);
        setHasErrorSearch(true);
        return;
      }

      const npmInfoJson = await npmInfo.json();

      const sortedVersions = Object.keys(npmInfoJson.versions)
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

      // Retrieve NPM info
      const description = npmInfoJson.description || "";
      const author = typeof npmInfoJson.author === "string" 
        ? npmInfoJson.author 
        : npmInfoJson.author?.name || "";
      const license = npmInfoJson.license || "";
      const homepage = npmInfoJson.homepage || "";
      const keywords = npmInfoJson.keywords || [];

      // Extract GitHub URL from repository or bugs
      let githubUrl = "";
      let extractedGithubUser = "";
      let extractedGithubRepoName = "";
      
      // Priority: repository.url, then bugs.url (to get the correct GitHub link)
      const repoUrl = npmInfoJson.repository?.url || "";
      const bugsUrl = npmInfoJson.bugs?.url || "";
      
      if (repoUrl?.includes("github.com")) {
        githubUrl = repoUrl;
      } else if (bugsUrl?.includes("github.com")) {
        githubUrl = bugsUrl;
      } else if (homepage?.includes("github.com")) {
        githubUrl = homepage;
      }

      // Clean githubUrl before extracting user and repo name
      const cleanGithubUrl = githubUrl.replace("git+", "").replace(/\.git$/, "");

      if (cleanGithubUrl) {
        extractedGithubUser = cleanGithubUrl.split("/")[3] || "";
        // Extract repo name: remove .git extension and fragment (#...), but keep dots in name (e.g., next.js)
        const repoPath = cleanGithubUrl.split("/")[4] || "";
        extractedGithubRepoName = repoPath?.split("#")[0] || ""; // Remove fragment (#...)
      }

      setPackageData({
        versions: sortedVersions,
        packageName: searchValue,
        githubUser: extractedGithubUser,
        githubRepoName: extractedGithubRepoName,
        githubUrl: cleanGithubUrl,
        changelog: "",
        description,
        author,
        license,
        homepage,
        keywords,
        latestVersion: npmInfoJson["dist-tags"]?.latest || sortedVersions[0] || "",
      });

      // Fetch only the CHANGELOG from GitHub if available
      if (extractedGithubUser && extractedGithubRepoName) {
        fetch(`https://api.github.com/repos/${extractedGithubUser}/${extractedGithubRepoName}/contents/CHANGELOG.md`)
          .then(async (changelogRes) => {
            try {
              const changelogJson = await changelogRes.json();
              if (changelogJson.content) {
                setPackageData(prev => ({
                  ...prev,
                  changelog: atob(changelogJson.content),
                }));
              }
            } catch {
              // CHANGELOG not found
            }
          })
          .finally(() => {
            setIsFetching(false);
          });
      } else {
        setIsFetching(false);
      }
    } catch {
      setIsFetching(false);
      setHasErrorSearch(true);
    }
  }, [resetAll]);

  const fetchVersionReleaseNotes = React.useCallback(async (version: string) => {
    const { githubUser, githubRepoName, packageName } = packageDataRef.current;
    
    if (!githubUser || !githubRepoName) {
      setHasErrorGithub(true);
      return;
    }

    setIsFetching(true);
    setHasErrorGithub(false);
    setHasRateLimitError(false);

    // Try the most common format first: v{version}
    const primaryFormat = `v${version}`;
    let found = false;
    let shouldTryAlternatives = false;
    
    try {
      const releaseRes = await fetch(
        `https://api.github.com/repos/${githubUser}/${githubRepoName}/releases/tags/${primaryFormat}`
      );
      
      if (releaseRes.status === 403) {
        setHasRateLimitError(true);
        setIsFetching(false);
        return;
      }
      
      if (releaseRes.ok) {
        const releaseData = await releaseRes.json();
        if (releaseData.body) {
          const info: TabInformation = {
            releaseInformation: releaseData.body,
            version,
          };
          setGithubInformation(prev => {
            const exists = prev.find(v => v.version === version);
            if (exists) return prev;
            return [...prev, info];
          });
          found = true;
        }
      } else if (releaseRes.status === 404) {
        // Release not found with this format, try alternatives
        shouldTryAlternatives = true;
      }
    } catch {
      // Network error, try alternatives
      shouldTryAlternatives = true;
    }

    // If not found with v{version}, try other formats only if 404
    if (!found && shouldTryAlternatives) {
      const alternativeFormats = [version, `${packageName}@${version}`];

      // If it's a scoped package, add the format without scope
      if (packageName.startsWith("@")) {
        const scopedName = packageName.split("/")[1];
        if (scopedName) {
          alternativeFormats.push(`${scopedName}@${version}`);
        }
      }

      for (const tagFormat of alternativeFormats) {
        if (found) break;
        
        try {
          const releaseRes = await fetch(
            `https://api.github.com/repos/${githubUser}/${githubRepoName}/releases/tags/${tagFormat}`
          );
          
          if (releaseRes.status === 403) {
            setHasRateLimitError(true);
            setIsFetching(false);
            return;
          }
          
          if (releaseRes.ok) {
            const releaseData = await releaseRes.json();
            if (releaseData.body) {
              const info: TabInformation = {
                releaseInformation: releaseData.body,
                version,
              };
              setGithubInformation(prev => {
                const exists = prev.find(v => v.version === version);
                if (exists) return prev;
                return [...prev, info];
              });
              found = true;
              break;
            }
          } else if (releaseRes.status !== 404) {
            // If it's not a 404, stop trying
            break;
          }
        } catch {
          // Format failed, continue
        }
      }
    }

    // As a last resort, check if a tag exists (without release) - only if we had to try alternatives
    if (!found && shouldTryAlternatives) {
      const allFormats = [
        `v${version}`,
        version,
        `${packageName}@${version}`,
      ];

      if (packageName.startsWith("@")) {
        const scopedName = packageName.split("/")[1];
        if (scopedName) {
          allFormats.push(`${scopedName}@${version}`);
        }
      }

      for (const tagFormat of allFormats) {
        if (found) break;
        
        try {
          const tagRes = await fetch(
            `https://api.github.com/repos/${githubUser}/${githubRepoName}/git/refs/tags/${tagFormat}`
          );
          
          if (tagRes.status === 403) {
            setHasRateLimitError(true);
            setIsFetching(false);
            return;
          }
          
          if (tagRes.ok) {
            const tagData = await tagRes.json();
            if (tagData.object) {
              const info: TabInformation = {
                releaseInformation: `# Version ${version}\n\nNo release notes available for this version.\n\n[View on GitHub](https://github.com/${githubUser}/${githubRepoName}/releases/tag/${tagFormat})`,
                version,
              };
              setGithubInformation(prev => {
                const exists = prev.find(v => v.version === version);
                if (exists) return prev;
                return [...prev, info];
              });
              found = true;
              break;
            }
          } else if (tagRes.status !== 404) {
            // If it's not a 404, stop trying
            break;
          }
        } catch {
          // Tag not found
        }
      }
    }

    if (!found) {
      setHasErrorGithub(true);
    }
    setIsFetching(false);
  }, []);

  const closeVersionTab = React.useCallback((version: string) => {
    setGithubInformation(prev => prev.filter(info => info.version !== version));
  }, []);

  return {
    packageData,
    githubInformation,
    isFetching,
    hasErrorSearch,
    hasErrorGithub,
    hasRateLimitError,
    searchPackage,
    fetchVersionReleaseNotes,
    closeVersionTab,
    resetAll,
  };
};

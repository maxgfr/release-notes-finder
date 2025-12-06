import {
  Input,
  Link,
  Badge,
  Box,
  TabPanel,
  HStack,
  Button,
  Text,
  Select,
} from "@chakra-ui/react";
import React from "react";

type Props = {
  versions: string[];
  onClickVersion: (version: string) => void;
};

type FilterType = "all" | "major" | "minor" | "patch" | "latest";

export const FilterTab = (props: Props) => {
  const [filteredVersion, setFilteredVersion] = React.useState<string[]>(
    props.versions
  );
  const [textFilter, setTextFilter] = React.useState<string>("");
  const [filterType, setFilterType] = React.useState<FilterType>("all");
  const [majorFilter, setMajorFilter] = React.useState<string>("");

  // Extraire les versions majeures uniques
  const majorVersions = React.useMemo(() => {
    const majors = new Set<string>();
    props.versions.forEach(version => {
      const major = version.split(".")[0];
      majors.add(major);
    });
    return Array.from(majors).sort((a, b) => parseInt(b) - parseInt(a));
  }, [props.versions]);

  // Obtenir la dernière version de chaque majeure (triées par ordre décroissant)
  const latestPerMajor = React.useMemo(() => {
    const latest: Record<string, string> = {};
    props.versions.forEach(version => {
      const major = version.split(".")[0];
      if (!latest[major]) {
        latest[major] = version;
      }
    });
    return Object.values(latest).sort((a, b) => {
      const aMajor = parseInt(a.split(".")[0]);
      const bMajor = parseInt(b.split(".")[0]);
      return bMajor - aMajor;
    });
  }, [props.versions]);

  // Filtrer les versions majeures uniquement (x.0.0)
  const getMajorVersions = React.useCallback(() => {
    return props.versions.filter(version => {
      const parts = version.split(".");
      return parts[1] === "0" && parts[2] === "0";
    });
  }, [props.versions]);

  // Filtrer les versions mineures uniquement (x.y.0)
  const getMinorVersions = React.useCallback(() => {
    return props.versions.filter(version => {
      const parts = version.split(".");
      return parts[2] === "0";
    });
  }, [props.versions]);

  // Filtrer les versions patch (toutes sauf x.y.0)
  const getPatchVersions = React.useCallback(() => {
    return props.versions.filter(version => {
      const parts = version.split(".");
      return parts[2] !== "0";
    });
  }, [props.versions]);

  const applyFilters = React.useCallback(() => {
    let result = props.versions;

    // Appliquer le filtre par type
    switch (filterType) {
      case "major":
        result = getMajorVersions();
        break;
      case "minor":
        result = getMinorVersions();
        break;
      case "patch":
        result = getPatchVersions();
        break;
      case "latest":
        result = latestPerMajor;
        break;
      default:
        result = props.versions;
    }

    // Appliquer le filtre par version majeure
    if (majorFilter) {
      result = result.filter(version => version.startsWith(majorFilter + "."));
    }

    // Appliquer le filtre texte
    if (textFilter) {
      result = result.filter(version => version.includes(textFilter));
    }

    setFilteredVersion(result);
  }, [props.versions, filterType, majorFilter, textFilter, getMajorVersions, getMinorVersions, getPatchVersions, latestPerMajor]);

  React.useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const resetFilters = () => {
    setTextFilter("");
    setFilterType("all");
    setMajorFilter("");
  };

  return (
    <TabPanel>
      <Box display="flex" flexDirection="column">
        <HStack spacing={4} marginBottom={4} flexWrap="wrap">
          <Box>
            <Text fontSize="sm" marginBottom={1}>
              Recherche
            </Text>
            <Input
              placeholder="Ex: 18.2"
              value={textFilter}
              onChange={e => setTextFilter(e.target.value)}
              width="150px"
            />
          </Box>
          <Box>
            <Text fontSize="sm" marginBottom={1}>
              Type de version
            </Text>
            <Select
              value={filterType}
              onChange={e => setFilterType(e.target.value as FilterType)}
              width="150px"
            >
              <option value="all">Toutes</option>
              <option value="major">Majeures (x.0.0)</option>
              <option value="minor">Mineures (x.y.0)</option>
              <option value="patch">Patch (x.y.z)</option>
              <option value="latest">Dernières par majeure</option>
            </Select>
          </Box>
          <Box>
            <Text fontSize="sm" marginBottom={1}>
              Version majeure
            </Text>
            <Select
              value={majorFilter}
              onChange={e => setMajorFilter(e.target.value)}
              width="100px"
              placeholder="Toutes"
            >
              {majorVersions.map(major => (
                <option key={major} value={major}>
                  v{major}
                </option>
              ))}
            </Select>
          </Box>
          <Box alignSelf="flex-end">
            <Button size="sm" onClick={resetFilters} variant="outline">
              Réinitialiser
            </Button>
          </Box>
        </HStack>
        <Text fontSize="sm" color="gray.500" marginBottom={2}>
          {filteredVersion.length} version(s) trouvée(s)
        </Text>
        <Box
          display="flex"
          flexDirection="row"
          marginTop="2"
          flexWrap="wrap"
          justifyContent="left"
        >
          {filteredVersion.map(version => (
            <Box key={`list-${version}`} margin="2">
              <Link onClick={() => props.onClickVersion(version)}>
                <Badge fontSize="medium" colorScheme="teal">
                  {version}
                </Badge>
              </Link>
            </Box>
          ))}
        </Box>
      </Box>
    </TabPanel>
  );
};

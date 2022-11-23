import { Input, Link, Badge, Box, TabPanel } from "@chakra-ui/react";
import React from "react";

type Props = {
  versions: string[];
  onClickVersion: (version: string) => void;
};

export const FilterTab = (props: Props) => {
  const [filteredVersion, setFilteredVersion] = React.useState<string[]>(
    props.versions
  );
  const [filter, setFilter] = React.useState<string>("");

  const onChangeFilter = (v: string) => {
    setFilter(v);
    setFilteredVersion(props.versions.filter(version => version.includes(v)));
  };

  return (
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
              <Link onClick={() => props.onClickVersion(version)}>
                <Badge fontSize="medium">{version}</Badge>
              </Link>
            </Box>
          ))}
        </Box>
      </Box>
    </TabPanel>
  );
};

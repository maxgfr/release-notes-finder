import { TabPanel } from "@chakra-ui/react";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import React from "react";

type Props = {
  info: string;
};

const Tab = (props: Props) => {
  return (
    <TabPanel>
      <ReactMarkdown
        components={ChakraUIRenderer()}
        children={props.info}
        rehypePlugins={[rehypeRaw]}
      />
    </TabPanel>
  );
};

export const MemoizeTab = React.memo(Tab);

import { Box, Heading } from "@chakra-ui/react";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
const components = ChakraUIRenderer();
export const resolveMarkdownUrl = (
  value: string,
  baseUrl: string,
  image = false,
) => {
  if (!value.trim()) return "";
  try {
    const url = new URL(value, baseUrl || window.location.href);
    if (
      !["https:", "http:", ...(image ? [] : ["mailto:"])].includes(url.protocol)
    )
      return "";
    if (
      image &&
      url.hostname === "github.com" &&
      url.pathname.includes("/blob/")
    ) {
      url.hostname = "raw.githubusercontent.com";
      url.pathname = url.pathname.replace("/blob/", "/");
    }
    return url.href;
  } catch {
    return "";
  }
};
export default function MarkdownContent({
  body,
  baseUrl,
}: {
  body: string;
  baseUrl: string;
}) {
  return (
    <Box
      maxW="75ch"
      overflowWrap="anywhere"
      sx={{
        "pre, table": { maxWidth: "100%", overflowX: "auto" },
        table: { display: "block" },
        img: { maxWidth: "100%" },
        a: { textDecoration: "underline", textUnderlineOffset: "0.15em" },
      }}
    >
      <ReactMarkdown
        components={{
          ...components,
          h1: ({ children }) => (
            <Heading as="h3" size="lg" mt={6} mb={3}>
              {children}
            </Heading>
          ),
          h2: ({ children }) => (
            <Heading as="h4" size="md" mt={5} mb={3}>
              {children}
            </Heading>
          ),
          a: ({ href, children }) => {
            const target = resolveMarkdownUrl(href || "", baseUrl);
            return target ? (
              <a href={target} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          img: ({ src, alt }) => (
            <img
              src={resolveMarkdownUrl(src || "", baseUrl, true) || undefined}
              alt={alt || ""}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ),
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
      >
        {body}
      </ReactMarkdown>
    </Box>
  );
}

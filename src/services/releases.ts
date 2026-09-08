import { PackageData, record, text, tagFormats } from "../domain/package";
import { ApiClient, ApiError } from "./client";
export interface ReleaseNotes {
  version: string;
  tag?: string;
  body: string;
  url: string;
  baseUrl: string;
  status: "notes" | "empty" | "tag-only" | "missing";
}
export interface Changelog {
  body: string;
  url: string;
  baseUrl: string;
}
export class ReleaseService {
  private formats = new Map<string, number>();
  constructor(private client: ApiClient) {}
  async release(
    pkg: PackageData,
    version: string,
    signal?: AbortSignal,
  ): Promise<ReleaseNotes> {
    const repo = pkg.repository;
    if (!repo)
      return { version, body: "", url: "", baseUrl: "", status: "missing" };
    const root = `https://api.github.com/repos/${repo.owner}/${repo.name}`;
    const formats = tagFormats(pkg.packageName, version);
    const preferred = this.formats.get(pkg.packageName) || 0;
    const order = [
      preferred,
      ...formats.map((_, i) => i).filter((i) => i !== preferred),
    ];
    const baseUrl = `${repo.url}/blob/HEAD/${repo.directory ? repo.directory + "/" : ""}`;
    for (const index of order) {
      const tag = formats[index];
      if (!tag) continue;
      try {
        const data = record(
          await this.client.get(
            `${root}/releases/tags/${encodeURIComponent(tag)}`,
            signal,
          ),
        );
        if (typeof data.tag_name !== "string")
          throw new ApiError(
            "GitHub returned invalid release data. Try again.",
            "invalid",
          );
        this.formats.set(pkg.packageName, index);
        const body = text(data.body);
        return {
          version,
          tag: data.tag_name,
          body,
          url: `${repo.url}/releases/tag/${encodeURIComponent(data.tag_name)}`,
          baseUrl,
          status: body.trim() ? "notes" : "empty",
        };
      } catch (error) {
        if (!(error instanceof ApiError) || error.kind !== "missing")
          throw error;
      }
    }
    for (const index of order) {
      const tag = formats[index];
      if (!tag) continue;
      try {
        const data = record(
          await this.client.get(
            `${root}/git/ref/tags/${encodeURIComponent(tag)}`,
            signal,
          ),
        );
        if (!data.object)
          throw new ApiError(
            "GitHub returned invalid tag data. Try again.",
            "invalid",
          );
        this.formats.set(pkg.packageName, index);
        return {
          version,
          tag,
          body: "",
          url: `${repo.url}/tree/${encodeURIComponent(tag)}`,
          baseUrl,
          status: "tag-only",
        };
      } catch (error) {
        if (!(error instanceof ApiError) || error.kind !== "missing")
          throw error;
      }
    }
    return {
      version,
      body: "",
      url: `${repo.url}/releases`,
      baseUrl,
      status: "missing",
    };
  }
  async changelog(
    pkg: PackageData,
    signal?: AbortSignal,
  ): Promise<Changelog | null> {
    const repo = pkg.repository;
    if (!repo) return null;
    const directories = repo.directory ? [repo.directory + "/", ""] : [""];
    for (const directory of directories)
      for (const filename of [
        "CHANGELOG.md",
        "changelog.md",
        "CHANGES.md",
        "HISTORY.md",
      ]) {
        const path = directory + filename;
        try {
          const data = record(
            await this.client.get(
              `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${path.split("/").map(encodeURIComponent).join("/")}`,
              signal,
            ),
          );
          if (data.encoding !== "base64" || typeof data.content !== "string")
            throw new ApiError(
              "This changelog cannot be read through the GitHub contents API. Open the repository to view it.",
              "invalid",
            );
          const bytes = Uint8Array.from(
            atob(data.content.replace(/\s/g, "")),
            (c) => c.charCodeAt(0),
          );
          const url = `${repo.url}/blob/HEAD/${path}`;
          return { body: new TextDecoder().decode(bytes), url, baseUrl: url };
        } catch (error) {
          if (!(error instanceof ApiError) || error.kind !== "missing")
            throw error;
        }
      }
    return null;
  }
}

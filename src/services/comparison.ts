import { PackageData, record, text } from "../domain/package";
import { ApiClient, ApiError } from "./client";
import { ReleaseService } from "./releases";
export interface CommitChange {
  sha: string;
  title: string;
  author: string;
  url: string;
}
export interface FileChange {
  path: string;
  previousPath: string;
  status: string;
  additions: number;
  deletions: number;
  url: string;
}
export interface GitComparison {
  base: string;
  head: string;
  url: string;
  status: "ahead" | "behind" | "diverged" | "identical";
  totalCommits: number;
  commits: CommitChange[];
  files: FileChange[];
  filesMayBeTruncated: boolean;
  nextPage?: number;
}
export type CompareLoader = (
  from: string,
  to: string,
  signal: AbortSignal,
  page?: number,
  refs?: Pick<GitComparison, "base" | "head">,
) => Promise<GitComparison>;

const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
export class ComparisonService {
  constructor(
    private client: ApiClient,
    private releases: ReleaseService,
  ) {}
  async compare(
    pkg: PackageData,
    from: string,
    to: string,
    signal?: AbortSignal,
    page = 1,
    refs?: Pick<GitComparison, "base" | "head">,
  ): Promise<GitComparison> {
    const repo = pkg.repository;
    if (!repo)
      throw new ApiError(
        "This package has no linked GitHub repository. Published release notes may still describe the upgrade.",
        "missing",
      );
    const resolve = async (version: string) => {
      const sha = pkg.gitHeads?.[version];
      if (sha) return sha;
      const release = await this.releases.release(pkg, version, signal);
      if (!release.tag)
        throw new ApiError(
          `No Git reference was found for ${version}. The release notes below are still available where published.`,
          "missing",
        );
      return release.tag;
    };
    const base = refs?.base || (await resolve(from));
    const head = refs?.head || (await resolve(to));
    const range = `${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
    const data = record(
      await this.client.get(
        `https://api.github.com/repos/${repo.owner}/${repo.name}/compare/${range}?per_page=100&page=${page}`,
        signal,
      ),
    );
    if (
      !Array.isArray(data.commits) ||
      !["ahead", "behind", "diverged", "identical"].includes(data.status) ||
      typeof data.total_commits !== "number"
    )
      throw new ApiError(
        "GitHub returned invalid comparison data. Try again.",
        "invalid",
      );
    const commits = data.commits.map((value: unknown) => {
      const item = record(value);
      const commit = record(item.commit);
      const sha = text(item.sha);
      if (!sha || !text(commit.message))
        throw new ApiError(
          "GitHub returned an incomplete commit. Try again.",
          "invalid",
        );
      return {
        sha,
        title: text(commit.message).split("\n")[0],
        author: text(record(commit.author).name),
        url: `${repo.url}/commit/${encodeURIComponent(sha)}`,
      };
    });
    const files = (Array.isArray(data.files) ? data.files : []).map(
      (value: unknown) => {
        const file = record(value);
        const path = text(file.filename);
        return {
          path,
          previousPath: text(file.previous_filename),
          status: text(file.status),
          additions: count(file.additions),
          deletions: count(file.deletions),
          url: `${repo.url}/blob/${encodeURIComponent(file.status === "removed" ? base : head)}/${path.split("/").map(encodeURIComponent).join("/")}`,
        };
      },
    );
    if (data.total_commits > (page - 1) * 100 && commits.length === 0)
      throw new ApiError(
        "GitHub returned an incomplete comparison page. Try again.",
        "invalid",
      );
    return {
      base,
      head,
      url: `${repo.url}/compare/${range}`,
      status: data.status,
      totalCommits: data.total_commits,
      commits,
      files,
      filesMayBeTruncated: files.length >= 300,
      nextPage: page * 100 < data.total_commits ? page + 1 : undefined,
    };
  }
}

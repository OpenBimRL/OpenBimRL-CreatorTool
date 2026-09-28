export const creatorToolVersion = __CREATOR_TOOL_VERSION__;
export const creatorToolBuildDate = __CREATOR_TOOL_BUILD_DATE__;
export const creatorToolGitSha = __CREATOR_TOOL_GIT_SHA__;
export const creatorToolGitBranch = __CREATOR_TOOL_GIT_BRANCH__;

export function formatBuildDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString();
}

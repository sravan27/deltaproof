export function toWorkspaceSlug(workspaceName: string): string {
  return workspaceName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
    .slice(0, 48)
}

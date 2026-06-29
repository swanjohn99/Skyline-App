export const APP_NAME = 'Workspace';

export function formatPageTitle(pageTitle, appName) {
  const name = appName || APP_NAME;
  if (!pageTitle) return name;
  return `${pageTitle} · ${name}`;
}

export function setDocumentTitle(pageTitle, appName) {
  document.title = formatPageTitle(pageTitle, appName);
}

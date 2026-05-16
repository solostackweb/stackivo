/**
 * Canonical route paths for the Welcome Document feature.
 *
 *   /dashboard/welcome             — list of welcome documents (owner)
 *   /dashboard/welcome/new         — builder (template picker → editor)
 *   /dashboard/welcome/<id>        — detail / edit / send
 *   /w/<token>                     — public viewer (mobile-friendly)
 */

export const WELCOME_DOCUMENTS_INDEX = "/dashboard/welcome";
export const WELCOME_DOCUMENT_NEW = "/dashboard/welcome/new";
export const welcomeDocumentDetail = (id: string): string =>
  `/dashboard/welcome/${id}`;
export const welcomeDocumentEdit = (id: string): string =>
  `/dashboard/welcome/${id}/edit`;
export const welcomeDocumentPublic = (token: string): string => `/w/${token}`;
export const welcomeDocumentPdf = (id: string): string =>
  `/api/welcome-documents/${id}/pdf`;

/** Build an absolute share URL for a public token. */
export function getWelcomeShareUrl(
  token: string,
  origin?: string,
): string {
  const base =
    origin ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://app.stackivo.in";
  return `${base.replace(/\/$/, "")}${welcomeDocumentPublic(token)}`;
}

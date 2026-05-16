import "server-only";

/**
 * Render a React-PDF `<Document />` tree to a Buffer the HTTP layer can
 * stream. Kept in a dedicated module so routes can import just this
 * function without pulling the JSX templates into their bundle graph.
 */

import type { ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

export async function renderPdfToBuffer(
  doc: ReactElement<DocumentProps>,
): Promise<Buffer> {
  return renderToBuffer(doc);
}

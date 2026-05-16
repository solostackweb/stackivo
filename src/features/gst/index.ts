/**
 * Public barrel for the GST utility module.
 *
 * Anchors:
 *   - State / UT registry          → ./state-codes.ts
 *   - GSTIN + PAN validators        → ./validation.ts
 *   - Invoice tax decision engine   → ./decision.ts
 */

export type { IndianState } from "./state-codes";
export {
  INDIAN_STATES,
  getStateByCode,
  getStateName,
  isValidStateCode,
} from "./state-codes";

export type { ParsedGstin } from "./validation";
export {
  isValidGstin,
  isValidPan,
  normaliseGstin,
  parseGstin,
} from "./validation";

export type {
  InvoiceClassification,
  TaxDecision,
  TaxDecisionInput,
  TaxMode,
} from "./decision";
export { decideTax } from "./decision";

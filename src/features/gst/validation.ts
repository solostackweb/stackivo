/**
 * GSTIN + PAN validators.
 *
 * Per the GST compliance doc § 8 ("MVP Validation"):
 *   - GSTIN length = 15 characters
 *   - alphanumeric format
 *   - state-code validity
 *
 * GSTIN structure (15 chars, all uppercase):
 *   01-02  state code              (digits)
 *   03-07  PAN issuer block        (5 letters)
 *   08-11  PAN sequence            (4 digits)
 *   12     PAN check letter        (1 letter)
 *   13     entity number           (1 digit or letter, 1-9 + A-Z)
 *   14     fixed "Z"
 *   15     checksum                (alphanumeric)
 *
 * The full ISD-spec checksum verification is intentionally out of scope for
 * the MVP — the doc explicitly defers proper API verification to a later
 * roadmap item.
 */

import { isValidStateCode } from "./state-codes";

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export interface ParsedGstin {
  raw: string;
  stateCode: string;
  pan: string;
  entityNumber: string;
  checksum: string;
}

/**
 * Returns true when `value` is a syntactically valid GSTIN AND its first two
 * characters resolve to a known state code. Whitespace is trimmed; case is
 * normalised before the check.
 */
export function isValidGstin(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalised = value.trim().toUpperCase();
  if (!GSTIN_REGEX.test(normalised)) return false;
  return isValidStateCode(normalised.slice(0, 2));
}

/**
 * Parse a GSTIN into its semantic components. Returns null if invalid.
 */
export function parseGstin(value: string | null | undefined): ParsedGstin | null {
  if (!value) return null;
  const raw = value.trim().toUpperCase();
  if (!isValidGstin(raw)) return null;
  return {
    raw,
    stateCode: raw.slice(0, 2),
    pan: raw.slice(2, 12),
    entityNumber: raw.slice(12, 13),
    checksum: raw.slice(14, 15),
  };
}

/**
 * Normalises a candidate GSTIN to the canonical form (trimmed + uppercased).
 * Does NOT validate — pair with `isValidGstin` for that.
 */
export function normaliseGstin(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidPan(value: string | null | undefined): boolean {
  if (!value) return false;
  return PAN_REGEX.test(value.trim().toUpperCase());
}

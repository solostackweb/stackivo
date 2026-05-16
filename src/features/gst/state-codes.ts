/**
 * Indian state / UT codes used as the first two characters of every GSTIN.
 *
 * Source: Government of India — GST jurisdiction codes.
 * Codes 01..38 are stable; we keep the full list here so the same array
 * powers GSTIN validation, the state picker dropdown, and the intra-state
 * vs inter-state decision.
 */

export interface IndianState {
  /** Two-digit GST state code (e.g. "27" for Maharashtra). */
  code: string;
  /** Display name. */
  name: string;
  /** Two-letter ISO 3166-2 sub-region (without the IN- prefix). */
  isoAlpha: string;
}

export const INDIAN_STATES: readonly IndianState[] = [
  { code: "01", name: "Jammu and Kashmir",                      isoAlpha: "JK" },
  { code: "02", name: "Himachal Pradesh",                       isoAlpha: "HP" },
  { code: "03", name: "Punjab",                                 isoAlpha: "PB" },
  { code: "04", name: "Chandigarh",                             isoAlpha: "CH" },
  { code: "05", name: "Uttarakhand",                            isoAlpha: "UT" },
  { code: "06", name: "Haryana",                                isoAlpha: "HR" },
  { code: "07", name: "Delhi",                                  isoAlpha: "DL" },
  { code: "08", name: "Rajasthan",                              isoAlpha: "RJ" },
  { code: "09", name: "Uttar Pradesh",                          isoAlpha: "UP" },
  { code: "10", name: "Bihar",                                  isoAlpha: "BR" },
  { code: "11", name: "Sikkim",                                 isoAlpha: "SK" },
  { code: "12", name: "Arunachal Pradesh",                      isoAlpha: "AR" },
  { code: "13", name: "Nagaland",                               isoAlpha: "NL" },
  { code: "14", name: "Manipur",                                isoAlpha: "MN" },
  { code: "15", name: "Mizoram",                                isoAlpha: "MZ" },
  { code: "16", name: "Tripura",                                isoAlpha: "TR" },
  { code: "17", name: "Meghalaya",                              isoAlpha: "ML" },
  { code: "18", name: "Assam",                                  isoAlpha: "AS" },
  { code: "19", name: "West Bengal",                            isoAlpha: "WB" },
  { code: "20", name: "Jharkhand",                              isoAlpha: "JH" },
  { code: "21", name: "Odisha",                                 isoAlpha: "OD" },
  { code: "22", name: "Chhattisgarh",                           isoAlpha: "CG" },
  { code: "23", name: "Madhya Pradesh",                         isoAlpha: "MP" },
  { code: "24", name: "Gujarat",                                isoAlpha: "GJ" },
  { code: "25", name: "Daman and Diu",                          isoAlpha: "DD" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", isoAlpha: "DN" },
  { code: "27", name: "Maharashtra",                            isoAlpha: "MH" },
  { code: "28", name: "Andhra Pradesh (Old)",                   isoAlpha: "AP" },
  { code: "29", name: "Karnataka",                              isoAlpha: "KA" },
  { code: "30", name: "Goa",                                    isoAlpha: "GA" },
  { code: "31", name: "Lakshadweep",                            isoAlpha: "LD" },
  { code: "32", name: "Kerala",                                 isoAlpha: "KL" },
  { code: "33", name: "Tamil Nadu",                             isoAlpha: "TN" },
  { code: "34", name: "Puducherry",                             isoAlpha: "PY" },
  { code: "35", name: "Andaman and Nicobar Islands",            isoAlpha: "AN" },
  { code: "36", name: "Telangana",                              isoAlpha: "TG" },
  { code: "37", name: "Andhra Pradesh",                         isoAlpha: "AD" },
  { code: "38", name: "Ladakh",                                 isoAlpha: "LA" },
] as const;

const CODE_INDEX: Map<string, IndianState> = new Map(
  INDIAN_STATES.map((s) => [s.code, s]),
);

export function isValidStateCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return CODE_INDEX.has(code);
}

export function getStateByCode(code: string): IndianState | null {
  return CODE_INDEX.get(code) ?? null;
}

export function getStateName(code: string | null | undefined): string {
  if (!code) return "";
  return CODE_INDEX.get(code)?.name ?? code;
}

# Signature System — Quick Reference

## One-Line Summary
**Custom lightweight client signature system with draw/type/upload options, comprehensive audit trail, and legal metadata capture.**

---

## Architecture at a Glance

```
Client Flow:
Open /c/{token}
    ↓
Click "Sign contract"
    ↓
SignatureCaptureModal opens
    ├─ Draw (primary) → canvas signature
    ├─ Type (fallback) → stylized text
    └─ Upload (optional) → image file
    ↓
Enter legal name + accept agreements
    ↓
signContractPublicAction (server action)
    ├─ Capture metadata (IP, device, browser)
    ├─ Generate PDF snapshot hash
    ├─ Create audit record
    ├─ Update contract status
    ├─ Send notification
    └─ Redirect to confirmation
```

---

## Key Files

| File | Purpose |
|------|---------|
| `signature-capture-modal.tsx` | Client-side UI (draw/type/upload tabs) |
| `signature-utils.ts` | Metadata capture (IP, device, user-agent) |
| `public-actions.ts` | Server action to process signatures |
| `pdf-snapshot.ts` | PDF hashing & verification (MVP foundation) |
| `0011_contract_signatures.sql` | Database schema |
| `SIGNATURE_SYSTEM.md` | Complete documentation |
| `SIGNATURE_TESTING_DEPLOYMENT.md` | Testing & deployment guide |

---

## Database Schema

```sql
-- contracts table (new columns)
signature_type              -- 'draw' | 'type' | 'upload'
signature_image_url         -- Base64 PNG
signature_text_value        -- Text if typed
signature_font_family       -- Font family if typed
signature_metadata          -- JSONB audit trail
pdf_snapshot_hash           -- SHA-256 verification hash
viewed_at                   -- When client viewed

-- contract_signatures table (new, append-only audit log)
id, contract_id, user_id, signature_type, signature_image_url,
signature_text_value, signature_font_family, legal_name, 
signed_ip, signed_user_agent, signed_device (JSONB),
signed_at, pdf_snapshot_url, pdf_snapshot_hash, metadata (JSONB)
```

---

## API Quick Reference

### SignatureCaptureModal Component
```tsx
<SignatureCaptureModal
  open={isOpen}
  onClose={handleClose}
  onSignatureCapture={async (signature) => {
    // signature.type: 'draw' | 'type' | 'upload'
    // signature.imageUrl?: string (base64 PNG)
    // signature.textValue?: string
    // signature.fontFamily?: string
    // signature.legalName: string
  }}
  contractTitle="Service Agreement"
/>
```

### Server Action: signContractPublicAction
```typescript
// Input (FormData)
token: string
signatureType: 'draw' | 'type' | 'upload'
signatureImageUrl?: string (base64)
signatureTextValue?: string
signatureFontFamily?: string
legalName: string

// Output
Redirects to /c/{token}?signed=1

// Side Effects
- Updates contract status to "signed"
- Creates contract_signatures audit record
- Sends notification to freelancer
- Records activity event
```

### Signature Metadata Captured
```typescript
{
  signed_ip: string              // "192.168.1.1"
  signed_user_agent: string      // "Mozilla/5.0..."
  signed_device: {
    os: string                   // "Windows 10"
    browser: string              // "Chrome 120"
    device_type: string          // "desktop"
  }
  signed_at: string              // "2026-05-09T15:30:45Z"
}
```

---

## Integration Checklist

### Frontend Integration
```tsx
// In public contract page
<ContractSigningPanel
  token={token}
  signed={status === "signed"}
  contractTitle={viewModel.title}  // Required for modal
/>
```

### Backend Requirements
- ✅ Database migration applied (0011_contract_signatures.sql)
- ✅ Service-role client configured
- ✅ Headers middleware functional
- ✅ Activity event system working
- ✅ Notification system working

### Dependencies
- `react-signature-canvas` - Canvas drawing
- `ua-parser-js` - Device parsing

### Environment
- HTTPS required (for legal validity)
- X-Forwarded-For header forwarded (for proxy support)

---

## Common Tasks

### Check if Contract is Signed
```sql
SELECT status FROM contracts WHERE id = $1;
-- Result: 'signed' or other status
```

### View Signing Details
```sql
SELECT
  c.id,
  c.title,
  c.signed_at,
  cs.legal_name,
  cs.signed_ip,
  cs.signature_type,
  cs.signed_device
FROM contracts c
LEFT JOIN contract_signatures cs ON c.id = cs.contract_id
WHERE c.id = $1;
```

### Get Signing Audit Trail
```sql
SELECT
  signed_at,
  legal_name,
  signature_type,
  signed_ip,
  signed_device ->> 'browser' as browser,
  pdf_snapshot_hash
FROM contract_signatures
WHERE contract_id = $1
ORDER BY signed_at DESC;
```

### Count Signatures by Method
```sql
SELECT
  signature_type,
  COUNT(*) as count
FROM contract_signatures
GROUP BY signature_type;
-- Result: draw: 150, type: 30, upload: 20
```

---

## Security Checklist

- ✅ All inputs validated server-side
- ✅ Signature type must be one of: 'draw', 'type', 'upload'
- ✅ Legal name required (not null, trimmed)
- ✅ Token validated against public_share_token
- ✅ Metadata captured server-side (not trusted from client)
- ✅ HTTPS enforced for legal validity
- ✅ PDF snapshot hash verifiable
- ✅ Audit records immutable (append-only)

---

## Troubleshooting Quick Guide

| Issue | Check | Fix |
|-------|-------|-----|
| Modal won't open | Browser console errors | Verify `react-signature-canvas` loaded |
| Signature not saving | Database records check | Verify server action called with correct params |
| Metadata NULL | signContractPublicAction logs | Verify `await captureSignatureMetadata()` called |
| Draw canvas blank | Browser console | Check canvas dimensions (width/height) |
| Mobile touch issues | Canvas event listeners | Verify touch event handlers enabled |
| Type preview not showing | Font loading | Check CSS font imports |
| Upload not working | File type validation | Verify accepted types: PNG, JPG, WEBP |

---

## Future Enhancements (Post-MVP)

**Phase 2**
- Actual PDF generation with signature layer
- Dashboard view of signatures
- Multi-signature support

**Phase 3**
- Signature expiration & re-request
- Identity verification integration
- Blockchain notarization

**Phase 4**
- Mobile biometric (fingerprint/Face ID)
- Advanced analytics
- Compliance certifications

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Signature capture | < 3s | ✅ |
| Database query | < 1s | ✅ |
| Canvas FPS | 60 | ✅ |
| Base64 file size | < 200KB | ✅ |
| Notification latency | < 5s | ✅ |

---

## Legal Notes

✅ **E-SIGN Act Compliant** - Creates legally binding signatures in US
✅ **Audit Trail** - Demonstrates intent, consent, identification
✅ **Immutable Records** - Cannot be changed after signing
⚠️ **Regional Variations** - Consult legal for your jurisdiction

---

## Testing Quick Start

```bash
# 1. Start dev server
npm run dev

# 2. Open contract
open http://localhost:3000/c/{token}

# 3. Sign with draw method
# 4. Check database
psql -U postgres -h localhost -d stackivo_db
SELECT * FROM contract_signatures LIMIT 1;

# 5. Verify notification sent
# Check dashboard activity timeline
```

---

## Code Examples

### Drawing Signature (Client)
```tsx
import SignatureCanvas from "react-signature-canvas";

const ref = useRef<SignatureCanvas>(null);

// Save as base64
const dataUrl = ref.current?.toDataURL("image/png");

// Embed in canvas element
<SignatureCanvas ref={ref} canvasProps={{width: 500, height: 200}} />
```

### Capturing Metadata (Server)
```typescript
import { captureSignatureMetadata } from "@/features/contracts/signature-utils";

const metadata = await captureSignatureMetadata();
// Returns: { signed_ip, signed_user_agent, signed_device, signed_at }
```

### Generating Hash (Server)
```typescript
import { generatePdfSnapshotHash } from "@/features/contracts/pdf-snapshot";

const hash = generatePdfSnapshotHash(
  contractContent,
  new Date().toISOString(),
  "John Doe"
);
// Returns: "a1b2c3d4e5f6..." (64-char hex)
```

### Inserting Signature Record (Server)
```typescript
const signatureRecord = {
  contract_id: contractId,
  user_id: userId,
  signature_type: "draw",
  signature_image_url: base64Data,
  legal_name: "John Doe",
  signed_ip: metadata.signed_ip,
  signed_user_agent: metadata.signed_user_agent,
  signed_device: metadata.signed_device,
  pdf_snapshot_hash: hash,
};

await admin.from("contract_signatures").insert(signatureRecord);
```

---

## Documentation Map

- **SIGNATURE_SYSTEM.md** - Full architecture & design
- **SIGNATURE_TESTING_DEPLOYMENT.md** - Testing & deployment
- **client.md** - Product requirements (original BRD)
- **This file** - Quick reference

---

## Support

For issues:
1. Check troubleshooting table above
2. Review SIGNATURE_SYSTEM.md architecture section
3. Check SIGNATURE_TESTING_DEPLOYMENT.md testing section
4. Review code comments in signature-*.ts files
5. Check browser console for client-side errors
6. Check server logs for action errors


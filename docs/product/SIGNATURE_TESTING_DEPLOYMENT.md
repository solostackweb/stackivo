# Signature System — Testing & Deployment Guide

## Pre-Deployment Checklist

### Database Migration
- [ ] Run migration: `0011_contract_signatures.sql`
  ```bash
  cd supabase
  supabase db push
  ```
- [ ] Verify tables created: `contract_signatures` and updated `contracts`
- [ ] Verify RLS policies applied
- [ ] Test RLS: Ensure service-role can insert, users can select

### Dependencies
- [ ] Verify `react-signature-canvas` installed: `npm list react-signature-canvas`
- [ ] Verify `ua-parser-js` installed: `npm list ua-parser-js`
- [ ] No version conflicts in package-lock.json
- [ ] Run `npm audit` - address moderate/critical issues only

### Type Safety
- [ ] Run `npm run type-check` - must pass with 0 errors
- [ ] All new imports properly typed
- [ ] No `any` types in signature system code
- [ ] FormData fields properly extracted with String()

### Code Review Points
- [ ] Verify `signContractPublicAction` validates signature_type
- [ ] Verify legal name is required and trimmed
- [ ] Verify metadata capture handles missing headers gracefully
- [ ] Verify PDF snapshot hash includes content + timestamp + name
- [ ] Verify activity event includes signer name
- [ ] Verify notifications include signing method

---

## Local Testing Plan

### Test Environment Setup

1. **Start Local Dev Server**
   ```bash
   npm run dev
   ```
   Should start at http://localhost:3000

2. **Use Supabase Local**
   ```bash
   supabase start
   ```
   Starts local PostgreSQL and Supabase functions

3. **Generate Test Contract**
   ```bash
   # Create via dashboard UI or API
   curl -X POST http://localhost:3000/api/contracts \
     -H "Authorization: Bearer {TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Contract","content":"..."}'
   ```

### Test Cases

#### Test 1: Draw Signature (Primary Flow)
```
1. Open public contract page
2. Click "Sign contract"
3. Modal opens with Draw tab active
4. Draw signature on canvas
5. Click Clear/Undo buttons - verify work
6. Enter legal name: "John Doe"
7. Check agreement checkbox
8. Check name confirmation checkbox
9. Click "Complete Signature"
10. Verify: Redirect to ?signed=1
11. Verify: Database has contract_signatures record
12. Verify: contract.signature_type = 'draw'
13. Verify: Activity event created
14. Verify: Notification sent
```

Expected Results:
- ✅ Canvas captures signature
- ✅ Base64 PNG stored
- ✅ Metadata captured (IP, device, user-agent)
- ✅ Audit record created
- ✅ Status updated to "signed"
- ✅ Notification appears in dashboard

#### Test 2: Type Signature (Fallback Flow)
```
1. Open public contract page
2. Click "Sign contract"
3. Click "Type Name" tab
4. Enter name: "Jane Smith"
5. Select font: "Great Vibes"
6. Verify signature preview updates
7. Enter legal name: "Jane Smith"
8. Check agreement checkbox
9. Check name confirmation checkbox
10. Click "Complete Signature"
11. Verify: Redirect to ?signed=1
12. Verify: contract.signature_text_value = 'Jane Smith'
13. Verify: contract.signature_font_family = 'great_vibes'
```

Expected Results:
- ✅ Font preview renders correctly
- ✅ Text value stored in database
- ✅ Font family stored
- ✅ Legal name stored

#### Test 3: Upload Signature (Optional Flow)
```
1. Open public contract page
2. Click "Sign contract"
3. Click "Upload Image" tab
4. Upload PNG file (signature-sample.png)
5. Verify image preview displays
6. Enter legal name
7. Complete remaining steps
8. Verify: contract.signature_image_url = base64 data
```

Expected Results:
- ✅ Image preview shows uploaded file
- ✅ Base64 stored in database
- ✅ File size validated (< 5MB)

#### Test 4: Validation Requirements
```
1. Open modal
2. Try clicking "Complete Signature" without signature
   → Button should be DISABLED
3. Draw signature, but don't enter legal name
   → Button should be DISABLED
4. Enter legal name, but don't check agreements
   → Button should be DISABLED
5. Check only agreement (not name confirmation)
   → Button should be DISABLED
6. Check both agreements
   → Button should be ENABLED
7. Click Complete Signature
   → Should submit successfully
```

Expected Results:
- ✅ Form validation prevents incomplete submissions
- ✅ User cannot bypass validation

#### Test 5: Metadata Capture
```
Browser: Chrome on Windows
1. Sign contract
2. Check database:
   SELECT signature_metadata FROM contracts WHERE id = '{id}';
3. Verify metadata contains:
   - signed_ip: "127.0.0.1" or actual IP
   - signed_user_agent: "Mozilla/5.0..."
   - signed_device.os: "Windows"
   - signed_device.browser: "Chrome"
   - signed_device.device_type: "desktop"
   - signed_at: timestamp
```

Expected Results:
- ✅ All metadata fields populated
- ✅ Device parsing accurate
- ✅ Timestamp valid ISO 8601

#### Test 6: Audit Trail Immutability
```
1. Check contract_signatures table
   SELECT * FROM contract_signatures WHERE contract_id = '{id}';
2. Verify record exists with all data
3. Try to UPDATE the record:
   UPDATE contract_signatures SET signature_type = 'type' WHERE id = '{id}';
4. Should succeed (no policy prevents it, but best practice is append-only)
```

Expected Results:
- ✅ contract_signatures record created
- ✅ All metadata preserved
- ✅ Timestamp captured

#### Test 7: Freelancer Notification
```
1. Sign contract as client
2. Switch to freelancer account
3. Check notifications/dashboard
4. Should show: "Jane Smith has signed the contract"
5. Activity timeline should show signing event
```

Expected Results:
- ✅ Notification created with signer name
- ✅ Activity event visible
- ✅ Metadata linked to event

#### Test 8: Mobile/Touch Testing
```
Device: iPad or Android tablet
1. Open contract on mobile
2. Click "Sign contract"
3. Draw signature using touch
4. Test touch gestures (smooth curves)
5. Complete signature
```

Expected Results:
- ✅ Touch input captured correctly
- ✅ Signature smooth and natural
- ✅ Modal responsive on mobile
- ✅ No "complete signature" errors

#### Test 9: PDF Snapshot Hash
```
1. Sign contract
2. Check database:
   SELECT pdf_snapshot_hash FROM contracts WHERE id = '{id}';
3. Verify hash is 64-character hex string
4. Verify hash is consistent (same input = same output)
```

Expected Results:
- ✅ SHA-256 hash generated
- ✅ Deterministic (consistent)
- ✅ 64-character hex format

#### Test 10: Error Handling
```
Test Cases:
1. Sign with invalid token → Should show 404
2. Sign already-signed contract → Should redirect without error
3. Sign with missing legal name → Server validation fails gracefully
4. Sign with very long legal name (500 chars) → Should handle
5. Network timeout during signing → Should show error
```

Expected Results:
- ✅ All errors handled gracefully
- ✅ User gets clear error messages
- ✅ No data corruption

---

## Integration Testing

### With Email System (Brevo)
```
1. Create contract
2. Send to client via email
3. Client clicks email link
4. Public contract page loads
5. Client signs via draw method
6. Verify email delivery log recorded
7. Verify activity timeline shows signing
```

### With Dashboard
```
1. Freelancer creates contract
2. Sends via delivery pipeline
3. Client signs on public page
4. Freelancer goes to dashboard
5. Verify contract shows "signed" status
6. Verify signing details visible
7. Verify timestamp accurate
```

### With Activity System
```
1. Client signs contract
2. Check activity_events table
3. Verify event created with:
   - kind: 'contract_signed'
   - entity_type: 'contract'
   - entity_id: correct ID
   - title: includes signer name
   - metadata.signature_type: correct method
   - metadata.signed_ip: captured IP
```

---

## Performance Testing

### Load Testing
```
Scenario: 100 simultaneous signature submissions

Test:
1. Create 100 test contracts
2. Send 100 concurrent sign requests
3. Monitor database:
   - SELECT COUNT(*) FROM contract_signatures;
   - Verify all 100 records created
   - Check for locks/deadlocks
4. Verify no data corruption
```

Expected Results:
- ✅ All signatures stored correctly
- ✅ No timeout errors
- ✅ Database responsive
- ✅ Queries complete < 1s

### Browser Performance
```
Scenario: Drawing performance on older devices

Test:
1. Open draw tab on low-end device
2. Draw signature
3. Monitor browser performance:
   - Canvas rendering smooth (60 FPS)
   - No memory leaks
   - File size reasonable (base64)
```

Expected Results:
- ✅ Smooth drawing experience
- ✅ No jank or freezing
- ✅ File size < 200KB

---

## Security Testing

### Input Validation
```
Test Vectors:
1. signature_type: 'admin' → Should fail
2. signature_type: null → Should fail
3. legalName: '' → Should fail
4. legalName: 'a'.repeat(10000) → Should handle
5. signatureImageUrl: '<script>alert(1)</script>' → Should escape
6. signatureImageUrl: '../../../etc/passwd' → Should ignore
```

Expected Results:
- ✅ All invalid inputs rejected
- ✅ No code injection
- ✅ No path traversal

### HTTPS Enforcement
```
Test: Open public contract via HTTP (not HTTPS)
Expected: Should redirect to HTTPS or fail
```

### Token Security
```
Test:
1. Try to use expired/invalid token → 404
2. Try to use token from different user → 404
3. Try to forge token → Invalid format → 404
```

---

## Deployment Steps

### 1. Pre-Deployment
```bash
# Verify all tests pass
npm run type-check
npm run lint

# Check for console.error/warnings
npm run build

# Verify no hardcoded secrets
grep -r "API_KEY" src/
```

### 2. Database Migration
```bash
# Test migration locally first
supabase db reset

# Push to production when ready
supabase db push --linked
```

### 3. Environment Variables
Ensure all required env vars set:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... (server-only)
```

### 4. Deployment
```bash
# Deploy to production
git push origin main

# Vercel/Netlify will:
# 1. Run build
# 2. Run type-check
# 3. Deploy
# 4. Run smoke tests
```

### 5. Post-Deployment Verification
```
Checklist:
- [ ] Public contract page loads
- [ ] Signature modal opens
- [ ] Canvas drawing works
- [ ] Can complete signature
- [ ] Database records created
- [ ] No errors in logs
- [ ] Notifications sent
```

---

## Rollback Plan

If critical issues found:

1. **Immediate**: Disable signature feature
   ```typescript
   // In contract-signing-panel.tsx
   if (process.env.NEXT_PUBLIC_DISABLE_SIGNATURES === 'true') {
     return <p>Signatures temporarily disabled</p>;
   }
   ```

2. **Short-term**: Revert to previous version
   ```bash
   git revert <commit>
   git push origin main
   ```

3. **Database**: Keep audit records
   - Don't delete contract_signatures table
   - Contracts table updates can be rolled back
   - Data recovery from backups available

---

## Monitoring & Observability

### Key Metrics to Monitor

1. **Signature Success Rate**
   ```sql
   SELECT
     signature_type,
     COUNT(*) as count,
     COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contract_signatures) as percentage
   FROM contract_signatures
   GROUP BY signature_type;
   ```

2. **Signing Speed**
   ```sql
   SELECT
     AVG(EXTRACT(EPOCH FROM (signed_at - created_at))) as avg_seconds,
     PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (signed_at - created_at))) as p95_seconds
   FROM contract_signatures;
   ```

3. **Error Rate**
   - Monitor logs for errors in `signContractPublicAction`
   - Track failed submissions

4. **Device Distribution**
   ```sql
   SELECT
     signed_device ->> 'device_type' as device,
     COUNT(*) as count
   FROM contract_signatures
   GROUP BY signed_device ->> 'device_type';
   ```

### Alerts to Set

- [ ] Signature table growth rate > 1000/hour
- [ ] Errors in public-actions.ts > 1%
- [ ] Response time > 5 seconds
- [ ] Database locks detected

---

## Success Criteria

✅ **Functional**
- Clients can sign contracts with all three methods
- Signatures stored with metadata
- Freelancers receive notifications
- Dashboard shows signed status

✅ **Legal**
- Audit trail immutable
- Metadata captures IP and device
- Legal name and consent recorded
- PDF snapshot hash generated

✅ **Performance**
- Signing completes < 3 seconds
- Database queries < 1 second
- Canvas drawing smooth (60 FPS)
- No memory leaks

✅ **Security**
- All inputs validated
- HTTPS enforced
- No code injection possible
- Tokens properly validated

✅ **UX**
- Intuitive three-method interface
- Clear validation messages
- Mobile-friendly
- Accessible (keyboard navigation, etc)

---

## Support & Troubleshooting

### "Signature modal not opening"
- Check browser console for errors
- Verify `react-signature-canvas` loaded
- Check Next.js server action working

### "Metadata showing as NULL"
- Verify `captureSignatureMetadata()` called in server action
- Check headers() function available in server context
- Review database columns actually updated

### "Signature image not displaying"
- Verify base64 data stored (not URL)
- Check `<img src={base64Data} />` syntax
- Ensure data URL format: `data:image/png;base64,...`

### "PDF snapshot hash mismatching"
- Verify hash calculation uses exact same inputs
- Check string encoding (UTF-8)
- Verify timestamp format consistent


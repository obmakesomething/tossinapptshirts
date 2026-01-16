# Issue Resolution Report - 2026-01-16

## Summary
This document tracks the issues reported by the user and their resolution status.

---

## Critical Issues Reported

### Issue 1: PNG 배경 제거한 사진에 체크표시 나옴 ✅ RESOLVED
**Problem**: When uploading PNG images with transparent backgrounds, a checkered pattern was visible behind the image.

**Root Cause**:
- DesignStage container had `backgroundColor: theme.colors.surface`
- Placeholder View was rendering behind transparent PNG images

**Solution Applied**:
- Changed DesignStage container `backgroundColor` from `theme.colors.surface` to `'transparent'` ([DesignStage.tsx:332](src/components/DesignStage.tsx#L332))
- Removed placeholder View rendering when no image exists ([DesignStage.tsx:281](src/components/DesignStage.tsx#L281))
- Already had `backgroundColor: 'transparent'` on designImage style ([DesignStage.tsx:355](src/components/DesignStage.tsx#L355))

**Files Modified**:
- `src/components/DesignStage.tsx`

**Status**: ✅ RESOLVED (commit: f886a60)

---

### Issue 2: 검정색 티셔츠 이미지 문제 ✅ RESOLVED
**Problem**: Black t-shirt mockup images were using old/incorrect files.

**Root Cause**:
- The file `server-public/mockups/tshirt_white_back.jpg` actually contained the correct black t-shirt image
- This file was meant to be used for both front and back of black t-shirt
- Wrong files were being used in `public/mockups/` and `assets/mockups/`

**Solution Applied**:
Copied the correct black t-shirt image to all necessary locations:
```bash
cp server-public/mockups/tshirt_white_back.jpg public/mockups/tshirt_black_front.jpg
cp server-public/mockups/tshirt_white_back.jpg public/mockups/tshirt_black_back.jpg
cp server-public/mockups/tshirt_white_back.jpg assets/mockups/tshirt_black_front.jpg
cp server-public/mockups/tshirt_white_back.jpg assets/mockups/tshirt_black_back.jpg
```

**Files Updated**:
- `public/mockups/tshirt_black_front.jpg`
- `public/mockups/tshirt_black_back.jpg`
- `assets/mockups/tshirt_black_front.jpg`
- `assets/mockups/tshirt_black_back.jpg`

**Status**: ✅ RESOLVED (commit: cffd198)

---

### Issue 3: 다음 주소 검색 입력 안 됨 ❌ NOT RESOLVED
**Problem**: After selecting an address in Daum Postcode modal, the address is not being filled into the input fields and the modal doesn't close.

**Attempted Solutions**:

1. **First Attempt**: Added `autoClose: true` to Daum Postcode configuration
   - **Result**: FAILED - autoClose doesn't work in WebView environment

2. **Second Attempt**: Changed to type-based message protocol
   - Added `type: 'complete'` and `type: 'close'` messages
   - **Result**: FAILED - Messages still not being delivered

3. **Third Attempt** (current): Enhanced logging and multiple message bridge attempts
   - Added DOMContentLoaded event listener
   - Try both `window.ReactNativeWebView.postMessage` and `webkit.messageHandlers`
   - Added comprehensive logging to diagnose where the message fails
   - Added 100ms delay before closing modal to ensure state updates complete

**Current Implementation**: [DaumPostcodeModal.tsx:36-138](src/components/DaumPostcodeModal.tsx#L36-L138)

**What We Need to Debug**:
- Check if `[DaumPostcode WebView] oncomplete FIRED` appears in logs
- Check if `ReactNativeWebView` is available in the WebView
- Check if messages are being sent successfully
- Check if React Native `handleMessage` is being called

**Diagnostic Logs Added**:
```
[DaumPostcode WebView] Script loaded, initializing...
[DaumPostcode WebView] DOM ready, creating Postcode instance
[DaumPostcode WebView] Daum Postcode embed() called successfully
[DaumPostcode WebView] ========== oncomplete FIRED ==========
[DaumPostcode WebView] Message send result: true/false
[DaumPostcode] Received raw message: {...}
[DaumPostcode] ===== ADDRESS SELECTED =====
```

**Files Modified**:
- `src/components/DaumPostcodeModal.tsx`
- `src/pages/order.tsx` (enhanced logging in handleAddressSelect)

**Status**: ❌ NOT RESOLVED - Needs Railway/app logs to diagnose further

**Next Steps**:
1. Check app logs when selecting address
2. Verify if WebView console.log messages appear
3. If oncomplete fires but message doesn't reach React Native, may need alternative approach
4. Consider using native address picker if WebView bridge is fundamentally broken

---

### Issue 4: 토스 결제 API 연결 실패 ❌ NOT RESOLVED
**Problem**: Payment API failing with error:
```
error:05800074:x509 certificate routines::key values mismatch
```

**Root Cause**:
The private key (MTLS_KEY_BASE64) and certificate (MTLS_CERT_BASE64) in Railway environment variables don't match - they are from different certificate pairs.

**Attempted Solutions**:

1. **Initial Approach**: Installed axios and configured mTLS with https.Agent
   - Added `getHttpsAgent()` function to decode base64 certificates
   - Configured axios with `httpsAgent` option
   - **Result**: FAILED - Got "key values mismatch" error

2. **Current Approach**: Enhanced logging to diagnose the certificate issue
   - Log decoded key and cert lengths
   - Log first 60 characters of key and cert to verify format
   - Check for encrypted keys
   - Detailed error logging

**Current Implementation**: [server/index.js:136-186](server/index.js#L136-L186)

**Diagnostic Logs Added**:
```
[mTLS] Decoded key length: XXX chars
[mTLS] Decoded cert length: XXX chars
[mTLS] Key header: -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY-----
[mTLS] Cert header: -----BEGIN CERTIFICATE-----
[mTLS] HTTPS Agent configured successfully
[Payment] Request failed: { error: 'error:05800074:x509...', ... }
```

**What the Error Means**:
- `x509 certificate routines::key values mismatch` means the public key embedded in the certificate doesn't match the private key
- This happens when:
  1. MTLS_KEY_BASE64 and MTLS_CERT_BASE64 are from different certificate pairs
  2. They were swapped (key in cert variable, cert in key variable)
  3. One of them was corrupted during base64 encoding

**Files Modified**:
- `server/index.js` (added mTLS configuration and enhanced logging)
- `package.json` (added axios dependency)

**Status**: ❌ NOT RESOLVED - Need to verify Railway environment variables

**Next Steps**:
1. Check Railway logs for `[mTLS] Key header:` and `[mTLS] Cert header:` output
2. Verify that:
   - MTLS_KEY_BASE64 contains the private key (`-----BEGIN PRIVATE KEY-----` or `-----BEGIN RSA PRIVATE KEY-----`)
   - MTLS_CERT_BASE64 contains the certificate (`-----BEGIN CERTIFICATE-----`)
3. Ensure both are from the same certificate pair
4. If they don't match, re-encode and update Railway environment variables:
   ```bash
   cat private.key | base64 | tr -d '\n'  # Copy this to MTLS_KEY_BASE64
   cat public.crt | base64 | tr -d '\n'   # Copy this to MTLS_CERT_BASE64
   ```

---

## Additional Improvements

### Enhanced Logging
Added comprehensive logging throughout the codebase to help diagnose issues:

1. **DaumPostcode WebView**: Every step from script load to message sending
2. **DaumPostcode React Native**: Message reception and parsing
3. **Order Page**: Address selection and state updates
4. **Payment API**: Request creation, mTLS configuration, and error details

### Code Quality
- Removed unused `removingBg` state variable from upload page
- Disabled style transfer feature as requested (commented out button)
- Maintained consistent error handling patterns

---

## Commits Made

1. **00acadd**: `fix: implement mTLS authentication for Toss Payment API`
   - Installed axios
   - Added getHttpsAgent() with mTLS configuration
   - Replaced fetch() with axios for payment endpoint

2. **88ff5d0**: `fix: enhance Daum Postcode address search with detailed logging`
   - Added DOMContentLoaded event handling
   - Multiple message bridge attempts
   - Comprehensive logging for debugging

3. **f886a60**: `fix: remove PNG background artifacts and enhance mTLS logging`
   - Made DesignStage container transparent
   - Removed placeholder View
   - Enhanced mTLS diagnostic logging

4. **cffd198**: `fix: replace black t-shirt mockup images with correct files`
   - Updated all black t-shirt mockup images with correct file

---

## Outstanding Issues Summary

| Issue | Status | Blocker | Next Action |
|-------|--------|---------|-------------|
| PNG 투명 배경 체크무늬 | ✅ RESOLVED | No | Deployed |
| 검정색 티셔츠 이미지 | ✅ RESOLVED | No | Deployed |
| 주소 검색 입력 안 됨 | ❌ NOT RESOLVED | **YES** | Check app logs, may need native solution |
| 토스 결제 API 실패 | ❌ NOT RESOLVED | **YES** | Fix Railway env vars (MTLS certificates) |

---

## Required Actions

### For Address Search Issue:
1. Run the app and try selecting an address
2. Check console logs for WebView messages
3. If `oncomplete FIRED` appears but React Native doesn't receive message, WebView bridge may be broken
4. May need to switch to native address picker module if available

### For Payment API Issue:
1. Check Railway logs for mTLS diagnostic output
2. Verify certificate headers match expected format
3. If key/cert don't match, get correct certificate pair from Toss Apps-in-Toss console
4. Update Railway environment variables with correct base64-encoded values
5. Restart Railway deployment after updating env vars

---

## Test Plan

### After Fixing Payment API:
1. Navigate to order page
2. Fill in order details
3. Click "토스페이로 결제하기"
4. Should redirect to Toss payment page (not show mTLS error)

### After Fixing Address Search:
1. Navigate to order page
2. Click "주소 검색" button
3. Search for and select an address
4. Modal should close automatically
5. Address fields should be filled with selected data
6. Focus should move to detail address input

---

## Notes

- **DO NOT commit mTLS certificates to git** - they should only exist in Railway environment variables
- The test page `test-features.html` can be used to test address search and payment API without the Toss app
- Railway CLI link command failed due to TTY requirement - need to link via Railway web dashboard if needed
- All builds completed successfully with 0 errors and 0 warnings

---

Generated: 2026-01-16 15:26 KST

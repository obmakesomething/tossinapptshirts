# Mockup Images Upload Guide

## Problem
React Native Apps-in-Toss bundles (.ait) don't include asset images with `require()`. Mockup images must be served from external URLs (S3).

## Solution
Upload mockup images to S3 and reference them via URL.

## Steps

### 1. Upload images to S3

Use the AWS CLI or Railway S3 dashboard:

```bash
# Using AWS CLI
aws s3 cp public/mockups/tshirt_black_front.jpg s3://merch-tshirts-assets/mockups/tshirt_black_front.jpg --acl public-read
aws s3 cp public/mockups/tshirt_black_back.jpg s3://merch-tshirts-assets/mockups/tshirt_black_back.jpg --acl public-read
aws s3 cp public/mockups/tshirt_white_front.jpg s3://merch-tshirts-assets/mockups/tshirt_white_front.jpg --acl public-read
aws s3 cp public/mockups/tshirt_white_back.jpg s3://merch-tshirts-assets/mockups/tshirt_white_back.jpg --acl public-read
```

Or using the upload script:
```bash
node scripts/upload-mockups.js
```

### 2. Verify URLs

Check that images are accessible:
- https://storage.railway.app/merch-tshirts-assets/mockups/tshirt_black_front.jpg
- https://storage.railway.app/merch-tshirts-assets/mockups/tshirt_black_back.jpg
- https://storage.railway.app/merch-tshirts-assets/mockups/tshirt_white_front.jpg
- https://storage.railway.app/merch-tshirts-assets/mockups/tshirt_white_back.jpg

### 3. Deploy

```bash
npm run build
git add -A
git commit -m "fix: use S3 URLs for mockup images"
git push origin feat/mockup-lite
```

## Important Notes

- Mockup images MUST be on S3, not in the .ait bundle
- Update `src/data/catalog.ts` if S3_PUBLIC_BASE_URL changes
- All products (티셔츠, 후드, 맨투맨, 에코백) use the same mockup images (temporary)

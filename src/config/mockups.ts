// Mockup image configuration
// These values are set during build or fallback to server static files

export const MOCKUP_CONFIG = {
  // S3 configuration (from Railway env vars)
  s3BaseUrl: process.env.S3_PUBLIC_BASE_URL || 'https://storage.railway.app',
  s3Bucket: process.env.S3_BUCKET || 'customizable-box-u-iz3yrp',

  // Fallback to server static files
  serverBaseUrl: 'https://tossinapptshirts-production.up.railway.app/mockups',

  // Use S3 if available, fallback to server
  get baseUrl() {
    // For now, use server static files (proven to work)
    // After S3 upload completes, switch to S3
    return this.serverBaseUrl;
    // return `${this.s3BaseUrl}/${this.s3Bucket}/mockups`;
  },
};

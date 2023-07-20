/* eslint-disable unicorn/prefer-module */
const { GoogleDriveToS3 } = require('../lib');
// Note: Ensure download credentials (.json) from service accounts created in GCloud
// Refer README.md
const googleServiceAccountCredentials = require('./service_account_key.json');

const googleDriveFolderId = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';
const s3BucketName = 'YOUR_S3_BUCKET_NAME';
const s3BucketPrefix = 'YOUR_S3_BUCKET_PREFIX';
const awsAccessKeyId = 'YOUR_AWS_ACCESS_KEY_ID';
const awsSecretAccessKey = 'YOUR_AWS_SECRET_ACCESS_KEY';
const awsRegion = 'YOUR_AWS_REGION';

try {
  const credentials = {
    aws: {
      accessKeyId: awsAccessKeyId,
      region: awsRegion,
      secretAccessKey: awsSecretAccessKey,
    },
    google: googleServiceAccountCredentials,
  };

  const migration = new GoogleDriveToS3(
    credentials,
    googleDriveFolderId,
    s3BucketName,
    s3BucketPrefix
  );

  migration.startMigration();
} catch (error) {
  console.error(error);
}

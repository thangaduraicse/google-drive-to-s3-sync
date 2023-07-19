<div align="center">

  [![License](https://img.shields.io/badge/License-MIT-blue)](#license "Go to license section")

  [![Made with Node](https://img.shields.io/badge/node->=v18.17.0-green)](https://nodejs.org "Go to Node.js homepage")
  [![Made with Npm](https://img.shields.io/badge/npm->=v9.6.7-blue)](https://www.npmjs.com/ "Go to Npm.js homepage")

  <br/>
</div>

<h1>Google Drive to Amazon S3 Sync</h1>

- [Overview](#overview)
- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)

<br />

## Overview
This is a Node.js package that simplifies the process of transferring files from Google Drive to Amazon S3. This package utilizes AWS S3 and Google Drive APIs to securely and efficiently sync files from a specified Google Drive folder to a designated bucket on Amazon S3.

<br />

## Features
- Sync files from Google Drive to Amazon S3.
- Secure access with AWS IAM user credentials.
- Authenticate using Google Drive service account.
- Effortless file transfer between Google Drive and Amazon S3.

<br />

## System Requirements
Before using the package, make sure you have the following:

**AWS Account and IAM User:**
- Create an IAM user in your AWS account with S3FULLACCESS permissions.
- Create an S3 bucket where the Google Drive files will be synced.
Google Cloud Platform Account:

**Create a project on Google Cloud Platform (GCP).**
- Generate a service account for the project and download the credentials as a JSON file.
- Enable the Google Drive API for the project in the GCP dashboard.

**Google Drive Setup:**
- Identify the folder in your Google Drive that you want to sync with Amazon S3.
- Share the folder with the client_email present in the service account credentials JSON.

**Node.js and NPM:**
- Ensure you have Node.js >=18.17.0 and NPM >=9.6.7 (Node Package Manager) installed on your system.

<br />

## Installation
Install the package via NPM:

```
npm install google-drive-to-s3-sync
```

<br />

## Configuration
Before using the package, set up the configuration:

1. Copy the downloaded service account credentials json to project folder and rename it as 'service_account_key.json'
2. Set GOOGLE_DRIVE_FOLDER_ID to the folder ID of the Google Drive folder you want to sync.
3. Set S3_BUCKET_NAME to the name of your AWS S3 bucket.
4. Set S3_BUCKET_PREFIX if you want to specify.
5. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION to access the s3 bucket and sync.

<br />

## Usage
Use the package in your Node.js application:

  ```
  const GoogleDriveToS3 = require('google-drive-to-s3-sync');
  const googleServiceAccountCredentials = require('./service_account_key.json');

  const googleDriveFolderId = 'GOOGLE_DRIVE_FOLDER_ID';
  const s3BucketName = 'S3_BUCKET_NAME';
  const s3BucketPrefix = 'S3_BUCKET_PREFIX';
  const awsAccessKeyId = 'AWS_ACCESS_KEY_ID';
  const awsSecretAccessKey = 'AWS_SECRET_ACCESS_KEY';
  const awsRegion = 'AWS_REGION';

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
  ```
The package will start syncing files from the specified Google Drive folder to the Amazon S3 bucket.

> <ins>Note:</ins><br />
> Ensure that you have proper network connectivity, and both your AWS and GCP credentials are correctly configured before using the package.

<br />

## License
This project is licensed under the [MIT License](LICENSE)

import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const validateAgainstSchema = (object, schema) => {
  for (const key in schema) {
    const expectedType = schema[key];
    const actualType = typeof object[key];

    if (!(key in object)) {
      throw new Error(`Missing property: ${key}`);
    }

    if (typeof expectedType === 'object') {
      validateAgainstSchema(object[key], expectedType);
    } else {
      if (actualType !== expectedType) {
        throw new Error(
          `Invalid type for property ${key}. Expected: ${expectedType}, Actual: ${actualType}`
        );
      }
    }
  }

  return true;
};

class GoogleDriveToS3 {
  #googleDriveFolderId;
  #s3BucketName;
  #s3BucketPrefix;
  #s3Client;
  #googleDrive;

  static validateConfig(credentials, googleDriveFolderId, s3BucketName) {
    const config = { credentials, googleDriveFolderId, s3BucketName };
    const schema = {
      credentials: {
        aws: {
          accessKeyId: 'string',
          region: 'string',
          secretAccessKey: 'string',
        },
        google: {
          auth_provider_x509_cert_url: 'string',
          auth_uri: 'string',
          client_email: 'string',
          client_id: 'string',
          client_x509_cert_url: 'string',
          private_key: 'string',
          private_key_id: 'string',
          project_id: 'string',
          token_uri: 'string',
          type: 'string',
          universe_domain: 'string',
        },
      },
      googleDriveFolderId: 'string',
      s3BucketName: 'string',
    };

    return validateAgainstSchema(config, schema);
  }

  constructor(credentials, googleDriveFolderId, s3BucketName, s3BucketPrefix) {
    GoogleDriveToS3.validateConfig(credentials, googleDriveFolderId, s3BucketName);

    const {
      aws: { accessKeyId, region, secretAccessKey },
      google: googleCredentials,
    } = credentials;
    const googleAuth = new google.auth.GoogleAuth({
      credentials: googleCredentials,
      scopes: 'https://www.googleapis.com/auth/drive.readonly',
    });

    this.#s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.#googleDrive = google.drive({ version: 'v3', auth: googleAuth });

    this.#googleDriveFolderId = googleDriveFolderId;
    this.#s3BucketName = s3BucketName;
    this.#s3BucketPrefix = s3BucketPrefix;
  }

  async #createWriteStream(fileId, parameters, extension, type = 'get') {
    const response = await this.#googleDrive.files[type](parameters, {
      responseType: 'stream',
    });
    let _extension = extension;

    !_extension && (_extension = response.headers?.['content-disposition']?.split('=')[1]);
    const fileName = _extension ? `${fileId}.${_extension}` : fileId;
    const filePath = path.join('temp', fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const writeStream = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      response.data
        .on('end', () => resolve(filePath))
        .on('error', (error) => reject(error))
        .pipe(writeStream);
    });
  }

  #getMimeTypeAndExtension(mimeType) {
    let _mimeType, alt, extension, type;

    if (mimeType.startsWith('application/vnd.google-apps')) {
      type = 'export';

      switch (mimeType) {
        case 'application/vnd.google-apps.document': {
          _mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          extension = 'docx';

          break;
        }
        case 'application/vnd.google-apps.spreadsheet': {
          _mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';

          break;
        }
        case 'application/vnd.google-apps.presentation': {
          _mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          extension = 'pptx';

          break;
        }
        case 'application/vnd.google-apps.drawing': {
          _mimeType = 'image/png';
          extension = 'png';

          break;
        }
        default: {
          throw new Error(`Unsupported Google Docs file format: ${mimeType}`);
        }
      }
    } else {
      _mimeType = mimeType;
      alt = 'media';
      type = 'get';

      mimeType === 'video/mp4' && (extension = 'mp4');
    }

    return [_mimeType, alt, extension, type];
  }

  async #downloadFile(fileId, mimeType) {
    const [_mimeType, alt, extension, type] = this.#getMimeTypeAndExtension(mimeType);
    const parameters = { alt, fileId, mimeType: _mimeType };

    return this.#createWriteStream(fileId, parameters, extension, type);
  }

  async #uploadToS3(file, fileName) {
    const parameters = {
      Bucket: this.#s3BucketName,
      Key: this.#s3BucketPrefix + fileName,
      Body: fs.createReadStream(file),
    };

    await this.#s3Client.send(new PutObjectCommand(parameters));
  }

  async #sleep(milliseconds) {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async #copyFileToS3(fileName, fileId, mimeType) {
    console.log(`Downloading file: ${fileName}`);

    try {
      const downloadedFilePath = await this.#downloadFile(fileId, mimeType);
      await this.#sleep(500);
      await this.#uploadToS3(downloadedFilePath, fileName + path.extname(downloadedFilePath));
      await this.#sleep(500);
      fs.unlinkSync(downloadedFilePath);
      await this.#sleep(500);

      console.log(`Successfully copied ${fileName} to S3`);
    } catch (error) {
      if (error?.response?.status === 403) {
        console.log(`Skipping file: ${fileName} (Forbidden to download)`);
      } else {
        console.error(`Error copying ${fileName} to S3:`, error);
      }
    }
  }

  async #copyFilesRecursive(folderId, folderPath = '') {
    let pageToken;
    let files = [];
    do {
      const fileListResponse = await this.#googleDrive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(name, id, parents, mimeType)',
        pageSize: 1000,
        orderBy: 'name',
        pageToken: pageToken,
      });

      files = fileListResponse.data.files;
      pageToken = fileListResponse.data.nextPageToken;

      if (files.length > 0) {
        for (const file of files) {
          const filePath = [folderPath, file.name].filter(Boolean).join('/');

          if (file.mimeType === 'application/vnd.google-apps.shortcut') {
            continue;
          }

          await (file.mimeType === 'application/vnd.google-apps.folder'
            ? this.#copyFilesRecursive(file.id, filePath)
            : this.#copyFileToS3(filePath, file.id, file.mimeType));
        }
      }
    } while (pageToken);
  }

  async startMigration() {
    try {
      await this.#copyFilesRecursive(this.#googleDriveFolderId);
      console.log('File migration completed successfully!');
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }
}

export default GoogleDriveToS3;

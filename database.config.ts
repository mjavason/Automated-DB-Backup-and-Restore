import axios from 'axios';
import fs from 'fs'; // Use 'fs' instead of 'fs/promises' for stream operations
import fsPromises from 'fs/promises'; // Keep this for promise-based operations
import path from 'path';
import sqlite3 from 'better-sqlite3';
import { Profile, User } from './user.model';
import { Sequelize } from 'sequelize-typescript';
import {
  fetchLatestUploadedFileInFolder,
  uploadRawFileToCloudinary,
} from './cloudinary.util';

const databaseFile = 'database.sqlite';
const backupDatabaseFile = 'backup-database.sqlite';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: `./${databaseFile}`,
  // logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  models: [User, Profile],
});

// Test the connection
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error: any) {
    console.error('Unable to connect to the database:', error.message);
  }
}

// Initialize Database
export async function initDB() {
  try {
    const backupRestored = await restoreBackup();
    if (backupRestored) {
      await sequelize.sync({ force: false, alter: true });
      console.log('Database synced successfully');
    } else {
      console.log('Backup restoration failed; sync skipped.');
    }
  } catch (err) {
    console.error('Unable to sync database:', err);
  }
}

// Function to copy the SQLite database file
export async function copyDatabaseFile() {
  const db = sqlite3(databaseFile);
  await db.backup(backupDatabaseFile);
}

// Function to get the size of the current database file
async function getCurrentDatabaseSize(): Promise<number> {
  const stats = await fsPromises.stat(databaseFile);
  return stats.size;
}

// Function to get the latest backup size and etag from Cloudinary
async function getLatestBackupInfo(): Promise<{
  size: number;
  etag: string;
} | null> {
  const latest = await fetchLatestUploadedFileInFolder('Backups');
  return latest ? { size: latest.bytes, etag: latest.etag } : null;
}

// Create Backup with size and etag comparison
export async function createBackup() {
  console.log('Creating backup');

  const currentSize = await getCurrentDatabaseSize();
  const latestBackupInfo = await getLatestBackupInfo();
  console.log({ currentSize, latestBackupInfo });

  // Compare size and etag
  if (latestBackupInfo && currentSize == latestBackupInfo.size) {
    console.log('No changes detected. Backup not created.');
    return;
  }

  await copyDatabaseFile();
  console.log('Uploading backup to Cloudinary');
  await uploadRawFileToCloudinary(backupDatabaseFile, 'Backups');
}

// Restore Backup
export async function restoreBackup(): Promise<boolean> {
  try {
    const latest = await fetchLatestUploadedFileInFolder('Backups');
    if (!latest) {
      console.log('No backup found in the folder.');
      return false;
    }

    const fileUrl = latest.secure_url; // Cloudinary URL of the latest file
    const outputFilePath = path.join(__dirname, databaseFile); // Local file path

    // Remove existing database file if it exists
    try {
      await fsPromises.unlink(outputFilePath);
      console.log('Existing database file deleted.');
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error; // Ignore if file doesn't exist
    }

    // Download and save the file
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(outputFilePath);
    response.data.pipe(writer);

    return new Promise<boolean>((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Backup restored successfully.');
        resolve(true);
      });

      writer.on('error', (err: any) => {
        console.error('Error during download:', err);
        reject(false);
      });
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
}

// Set up periodic backups
// setInterval(createBackup, 1000 * 60); // Create backups every hour

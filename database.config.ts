import axios from 'axios';
import fs from 'fs/promises';
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
  dialect: 'sqlite', // Choose your database dialect
  storage: `./${databaseFile}`,
  logging: false,
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
    console.log('Database connection has been established successfully.');
  } catch (error: any) {
    console.error('Unable to connect to the database:', error.message);
  }
}

// Initialize Database
export async function initDB() {
  try {
    await restoreBackup();
    await sequelize.sync({ force: false, alter: true }); // `force: true` will drop tables
    console.log('Database synced successfully');
  } catch (err) {
    console.error('Unable to sync database:', err);
  }
}

// Function to copy the SQLite database file
export async function copyDatabaseFile() {
  const db = sqlite3(databaseFile);
  const file = await db.backup(backupDatabaseFile);
  return file;
}

export async function createBackup() {
  console.log('Creating backup');
  const isCopied = await copyDatabaseFile();
  console.log('Uploading backup to cloudinary');
  if (isCopied)
    return await uploadRawFileToCloudinary(backupDatabaseFile, 'Backups');
}

export async function restoreBackup(): Promise<boolean> {
  try {
    // Fetch the latest backup file
    const latest = await fetchLatestUploadedFileInFolder('Backups');

    if (!latest) {
      console.log('No backup found in the folder.');
      return false;
    }

    const fileUrl = latest.secure_url; // Cloudinary URL of the latest file
    const outputFilePath = path.join(__dirname, databaseFile); // Local file path

    // Check if the file exists, and remove it if it does
    try {
      await fs.access(outputFilePath); // Check file existence
      console.log('Existing database file found. Deleting it...');
      await fs.unlink(outputFilePath); // Delete the file
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error; // Ignore if file doesn't exist
    }

    // Download and save the file
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream', // Stream the response directly to the file system
    });

    const writer = await fs.open(outputFilePath, 'w');
    response.data.pipe(writer.createWriteStream());

    // Return a Promise that resolves when the download completes
    return new Promise<boolean>((resolve, reject) => {
      response.data.on('end', () => {
        console.log('Backup restored successfully.');
        writer.close();
        resolve(true);
      });

      response.data.on('error', (err: any) => {
        console.error('Error during download:', err);
        reject(false);
      });
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
}

setInterval(() => createBackup(), 1000 * 60 * 60); //create backups every hour

import fs from 'fs';
import sqlite3 from 'better-sqlite3';
import { Profile, User } from './user.model';
import { Sequelize } from 'sequelize-typescript';
import {
  uploadRawFileToCloudinary,
  uploadToCloudinary,
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
  const isCopied = await copyDatabaseFile();
  if (isCopied)
    return await uploadRawFileToCloudinary(backupDatabaseFile, 'Backups');
}

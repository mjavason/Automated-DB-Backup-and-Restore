import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { setupSwagger } from './swagger.config';
import { Profile, User } from './user.model';
import { copyDatabaseFile, createBackup, initDB } from './database.config';

//#region App Setup
const app = express();

dotenv.config({ path: './.env' });
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
setupSwagger(app, BASE_URL);

//#endregion App Setup

app.get('/copy', async (req, res) => {
  const result = await createBackup();
  return res.send({ result });
});

//#region Code here
/**
 * @swagger
 * /user:
 *   post:
 *     summary: Create a new user
 *     description: Adds a new user to the database.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: securepassword
 *               bio:
 *                 type: string
 *                 example: This is a sample bio
 *               avatarURL:
 *                 type: string
 *                 example: http://awesome.com/image.jpg
 *     responses:
 *       201:
 *         description: User created successfully
 *       500:
 *         description: Internal server error
 */
app.post('/user', async (req: Request, res: Response) => {
  try {
    const { username, email, password, bio, avatarURL } = req.body;

    const profile = await Profile.create({ bio, avatarURL });
    const user = await User.create({
      username,
      email,
      password,
      profileId: profile.id,
    });

    return res
      .status(201)
      .json({ success: true, message: 'Successful', data: user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users from the database.
 *     tags: [User]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Internal server error
 */
app.get('/user', async (req: Request, res: Response) => {
  try {
    const users = await User.findAll({ include: Profile });
    return res.json({ success: true, message: 'Successful', data: users });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Retrieve a single user by their unique ID.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user's ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
app.get('/user/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user)
      return res.json({ success: true, message: 'Successful', data: user });

    return res.status(404).json({ error: 'User not found' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/{id}:
 *   put:
 *     summary: Update a user by ID
 *     description: Update an existing user's details.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user's ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: newpassword
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
app.put('/user/:id', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.findByPk(req.params.id);
    if (user) {
      user.username = username;
      user.email = email;
      user.password = password;
      await user.save();
      return res.json({ success: true, message: 'Successful', data: user });
    } else {
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /user/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     description: Remove a user from the database by their unique ID.
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user's ID
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
app.delete('/user/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      await user.destroy();
      return res.status(204).send();
    } else {
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

//#endregion

//#region Server Setup

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Call a demo external API (httpbin.org)
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/api', async (req: Request, res: Response) => {
  try {
    const result = await axios.get('https://httpbin.org');
    return res.send({
      message: 'Demo API called (httpbin.org)',
      data: result.status,
    });
  } catch (error: any) {
    console.error('Error calling external API:', error.message);
    return res.status(500).send({ error: 'Failed to call external API' });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Health check
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/', (req: Request, res: Response) => {
  return res.send({ message: 'API is Live!' });
});

/**
 * @swagger
 * /obviously/this/route/cant/exist:
 *   get:
 *     summary: API 404 Response
 *     description: Returns a non-crashing result when you try to run a route that doesn't exist
 *     tags: [Default]
 *     responses:
 *       '404':
 *         description: Route not found
 */
app.use((req: Request, res: Response) => {
  return res
    .status(404)
    .json({ success: false, message: 'API route does not exist' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // throw Error('This is a sample error');

  console.log(`${'\x1b[31m'}${err.message}${'\x1b][0m]'} `);
  return res
    .status(500)
    .send({ success: false, status: 500, message: err.message });
});

app.listen(PORT, async () => {
  initDB();
  console.log(`Server running on port ${PORT}`);
});

// (for render services) Keep the API awake by pinging it periodically
// setInterval(pingSelf(BASE_URL), 600000);

//#endregion

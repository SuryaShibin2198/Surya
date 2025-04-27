import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import UserRouter from './routes/userRoutes';
import loggingMiddleware from './middlewares/loggingMiddleware';
import './config/NodeValidator';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(bodyParser.json());
app.use(loggingMiddleware);
app.use(cors());
app.use('/api', UserRouter);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shoppify';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
  });

export { app, server, io }; 


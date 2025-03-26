import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const prisma = new PrismaClient();

// Middleware

app.use(cors({
  origin: 'http://localhost:3000', // Specify exact origin instead of wildcard
  credentials: true                // Allow credentials
}));
app.use(express.json());

// Routes
import authRoutes from './routes/auth.routes';
import chroniclesRoutes from './routes/chronicles.routes';
import searchRoutes from './routes/search.routes';
import userRoutes from './routes/user.routes';
// Add this import
import directSearchRouter from './routes/direct-search';

// Add this route (along with your other routes)
app.use('/api/search/direct', directSearchRouter);
app.use('/api/auth', authRoutes);
app.use('/api/chronicles', chroniclesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
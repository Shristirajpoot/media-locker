const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets if needed, but remember original files are SECURED and preview images are streamed
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Paid Media Locker API is running',
    version: '1.0.0'
  });
});

// Import routers
const authRoutes = require('./routes/auth');
const mediaRoutes = require('./routes/media');
const walletRoutes = require('./routes/wallet');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/wallet', walletRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Initialize DB and start server
const startServer = async () => {
  try {
    await db.initDb();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

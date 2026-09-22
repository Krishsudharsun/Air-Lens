import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRouter from './src/routes/api.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// simple request log — helpful when demoing live
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'AIR LENS API',
    status: 'ok',
    endpoints: ['GET /api/health', 'POST /api/routes'],
  });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`AIR LENS backend listening on http://localhost:${PORT}`);
});

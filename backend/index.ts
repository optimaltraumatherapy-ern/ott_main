import express from 'express';

const app = express();
const PORT = 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

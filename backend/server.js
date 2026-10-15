const express = require('express');
const cors = require('cors');
require('dotenv').config();

const interviewRoutes = require('./routes/interview');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/interview', interviewRoutes);

app.get('/', (req, res) => {
  res.send('AI Interviewer Backend is Running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server chal raha hai port ${PORT} par`);
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/lib/mongoDB');
const authRoutes = require('./src/routes/authRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const subscriptionsRoutes = require('./src/routes/subscriptionRoutes');
const userRoutes = require('./src/routes/userRoutes');
const webhookRoutes = require('./src/routes/webhook');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3500;

app.use(
  cors({
    origin: [process.env.CLIENT_URL, 'http://localhost:3500', 'http://localhost:3500'],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use('/webhook',
  express.raw({ type: 'application/json' }),
  webhookRoutes
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
connectDB()

app.get('/api/invoice/:filename', (req, res) => {
  const { filename } = req.params;
  const invoicePath = path.resolve(__dirname, 'src', 'invoices', filename);

  console.log('Looking for invoice at:', invoicePath);
  if (!fs.existsSync(invoicePath)) {
    console.error('❌ File not found on disk!');
    return res.status(404).send(`Invoice not found: ${filename}`);
  }

  console.log('✅ Found it, sending file…');
  res.sendFile(invoicePath, (err) => {
    if (err) {
      console.error('sendFile error:', err);
      res.status(err.status || 500).end();
    }
  });
});

// mount routes
app.use('/api/auth', authRoutes);
app.use('/api', transactionRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', subscriptionsRoutes);
app.use('/api', userRoutes);
app.get('/', (req, res) => {
  res.send('👋 Express API is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

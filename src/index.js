require('dotenv').config();
const express = require('express');
const webhookRouter = require('./routes/webhook');
const dashboardRouter = require('./routes/dashboard');
const { iniciarTelegram } = require('./services/telegram');

const app = express();
app.use(express.json());
app.use('/webhook', webhookRouter);
app.use('/dashboard', dashboardRouter);
app.get('/', (req, res) => res.send('Barbara System rodando'));

iniciarTelegram();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));

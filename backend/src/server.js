require('dotenv').config();

const app = require('./app');
const { startScheduler } = require('./services/schedulerService');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`TicketHub API listening on port ${PORT}`);
  startScheduler();
});

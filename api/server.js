const app = require('./app');
const config = require('./config');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const PORT = config.port || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

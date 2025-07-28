import express from 'express';
import dotenv from 'dotenv';


const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
dotenv.config();
const PORT = process.env.PORT || 2000;

app.get('/', (req, res) => {
  res.send('Server is working!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
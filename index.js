import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
dotenv.config();
const PORT = process.env.PORT || 2000;
const MONGOURL = process.env.MONGO_URL;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

mongoose
  .connect(MONGOURL)
  .then(() => {
    console.log("Connected to database:", mongoose.connection.name);
    app.listen(9000, () => {
      console.log("Server is running on http://localhost:${PORT}");
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
app.use(express.static(path.join(__dirname, "/public")));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'loginPage.html'));
});
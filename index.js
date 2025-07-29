import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import Advisor from './models/advisorModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate JWT token
const generateToken = (advisorId) => {
  return jwt.sign({ advisorId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
};

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
dotenv.config();
const PORT = process.env.PORT || 2000;
const MONGOURL = process.env.MONGO_URL;

mongoose
  .connect(MONGOURL)
  .then(() => {
    console.log("Connected to database:", mongoose.connection.name);
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'loginPage.html'));
});

app.get('/mainDashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mainDashboardComponent', 'mainDashboard.html'));
});

app.post("/api/advisorLogin", async (req, res) => {
  console.log("Received advisor login request:", req.body);
  let { email, password } = req.body;
  if (!email || !password) {
    console.log("Missing email or password");
    return res.status(400).json({ message: "Email and password are required" });
  }
  email = email.trim().toLowerCase();
  console.log("Processing login for email:", email);
  try {
    const advisor = await Advisor.findOne({ Email: email });
    if (!advisor) {
      console.log("Advisor not found for email:", email);
      return res.status(404).json({ message: "Advisor not found" });
    }

    if (password !== advisor.Password) {
      console.log("Invalid password for advisor:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { Password, ...advisorData } = advisor.toObject();
    const token = generateToken(advisor._id);

    console.log("Login successful for advisor:", email);
    res.status(200).json({
      message: "Login successful",
      token,
      advisor: advisorData,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


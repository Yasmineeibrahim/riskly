import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import jwt from 'jsonwebtoken';
import { AdvisorSQL } from './models/advisorModel.js';
import studentRoutes from './routes/studentRoutes.js';
import advisorRoutes from './routes/advisorRoutes.js';
import sequelize from './config/database.js';

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

// Add student routes
app.use('/api/students', studentRoutes);

// Add advisor routes
app.use('/api/advisors', advisorRoutes);

// Connect to MySQL database
sequelize.authenticate()
.then(() => {
  console.log("Connected to MySQL database");
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})
.catch((error) => {
  console.error("Database connection error:", error);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'loginPageComponent', 'loginPage.html'));

});

app.get('/mainDashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mainDashboardComponent', 'mainDashboard.html'));
});

// Route to fetch all advisors from SQL database (for testing)
app.get("/api/advisors", async (req, res) => {
  try {
    const advisors = await AdvisorSQL.findAll();
    res.status(200).json({
      message: "Advisors fetched successfully",
      advisors: advisors
    });
  } catch (error) {
    console.error("Error fetching advisors:", error);
    res.status(500).json({ message: "Internal server error" });
  }
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
    // Find advisor in SQL database
    const advisor = await AdvisorSQL.findOne({ 
      where: { Email: email } 
    });
    
    if (!advisor) {
      console.log("Advisor not found for email:", email);
      return res.status(404).json({ message: "Advisor not found" });
    }

    // Check password
    if (password !== advisor.Password) {
      console.log("Invalid password for advisor:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Prepare advisor data
    const { Password, ...advisorData } = advisor.toJSON();

    const token = generateToken(advisor._id);

    console.log("Advisor data being sent:", advisorData);
    console.log("Students array present:", advisorData.Students);
    console.log("Login successful for advisor:", email);
    res.status(200).json({
      message: "Login successful",
      token,
      advisor: advisorData
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


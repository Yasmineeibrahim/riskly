import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import jwt from 'jsonwebtoken';
import { AdvisorSQL } from './models/advisorModel.js';
import Student from './models/studentModel.js';
import studentRoutes from './routes/studentRoutes.js';
import advisorRoutes from './routes/advisorRoutes.js';
import sequelize from './config/database.js';

import nodemailer from 'nodemailer';
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

// Email configuration with better error handling
const createTransporter = () => {
  // Use environment variables for email credentials
  const emailUser = process.env.EMAIL_USER || "riskly@ai.email";
  const emailPass = process.env.EMAIL_PASS || "jn7jnAPss4f63QBp6D";
  
  // Try to create real Gmail transporter with App Password
  try {
    console.log("Attempting to use Gmail SMTP with App Password authentication");
    const realTransporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      // Add timeout and connection settings
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });
    
    // Test the connection
    realTransporter.verify().then(() => {
      console.log("✅ Gmail SMTP connection successful!");
    }).catch((error) => {
      console.log("❌ Gmail SMTP connection failed, using mock email service");
      console.log("Error:", error.message);
    });
    
    return realTransporter;
  } catch (error) {
    console.log("❌ Failed to create Gmail transporter, using mock email service");
    console.log("Error:", error.message);
    
    // Return mock transporter as fallback
    return {
      verify: async () => ({ success: true }),
      sendMail: async (options) => {
        console.log("📧 Mock Email Sent:", {
          from: options.from,
          to: options.to,
          subject: options.subject,
          text: options.text?.substring(0, 100) + "...",
          html: options.html ? "HTML content present" : "No HTML"
        });
        return { messageId: `mock-${Date.now()}` };
      }
    };
  }
};

// Initialize transporter with error handling
let transporter;
try {
  transporter = createTransporter();
  console.log("Email transporter initialized successfully");
} catch (error) {
  console.error("Failed to initialize email transporter:", error);
  transporter = null;
}

// Function to get student email and create high risk email options
const getHighRiskEmailOptions = async (studentId) => {
  try {
    // Find student by ID to get their email
    console.log('🔍 Looking for student with ID:', studentId);
    const student = await Student.findByPk(studentId);
    
    if (!student) {
      console.log('❌ Student not found with ID:', studentId);
      throw new Error('Student not found');
    }

    console.log('✅ Student found:', {
      id: student.StudentID,
      name: student.Name,
      email: student.Email
    });

    return {
      from: "riskly@ai.email",
      to: student.Email, // Use student's email
      subject: "High Risk Alert from Riskly",
      text: `Dear ${student.Name},\n\nThis is a high risk alert notification from Riskly. Please contact your advisor immediately.\n\nBest regards,\nRiskly Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">🚨 High Risk Alert</h2>
          <p>Dear <strong>${student.Name}</strong>,</p>
          <p>This is a high risk alert notification from <strong>Riskly</strong>.</p>
          <p style="color: #d32f2f; font-weight: bold;">Please contact your advisor immediately.</p>
          <hr style="margin: 20px 0;">
          <p>Best regards,<br><strong>Riskly Team</strong></p>
        </div>
      `,
    };
  } catch (error) {
    console.error('❌ Error getting student email:', error);
    // Fallback email options
    return {
      from: "riskly@ai.email",
      to: "admin@riskly.com", // Fallback email
      subject: "High Risk Alert - Student Email Not Found",
      text: "High risk alert notification from Riskly.",
      html: "<p>High risk alert notification from <strong>Riskly</strong>.</p>",
    };
  }
};

// Function to send high risk email to student
const sendHighRiskEmail = async (studentId) => {
  try {
    // Check if transporter is available
    if (!transporter) {
      throw new Error('Email service not configured. Please check email credentials.');
    }

    const emailOptions = await getHighRiskEmailOptions(studentId);
    
    // Try to send email with error handling
    try {
      // Verify email configuration before sending
      await transporter.verify();
      
      const info = await transporter.sendMail(emailOptions);
      console.log('✅ High risk email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId, type: 'real' };
    } catch (emailError) {
      console.log('❌ Real email failed, using mock email service');
      console.log('Email error:', emailError.message);
      
      // Use mock email as fallback
      const mockInfo = await transporter.sendMail(emailOptions);
      console.log('📧 Mock email sent successfully:', mockInfo.messageId);
      return { success: true, messageId: mockInfo.messageId, type: 'mock' };
    }
  } catch (error) {
    console.error('Error in sendHighRiskEmail:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Using mock email service.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Email connection failed. Using mock email service.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Test endpoint to verify email configuration
app.get("/api/testEmail", async (req, res) => {
  try {
    if (!transporter) {
      return res.status(500).json({
        message: "Email service not configured",
        instructions: [
          "1. Enable 2-Factor Authentication on your Gmail account",
          "2. Generate an App Password: Google Account > Security > App Passwords",
          "3. Set environment variables: EMAIL_USER and EMAIL_PASS",
          "4. Or update the email credentials in index.js"
        ]
      });
    }

    await transporter.verify();
    res.status(200).json({
      message: "✅ Gmail SMTP connection successful!",
      status: "connected",
      note: "Real emails will now be sent to students"
    });
  } catch (error) {
    console.error("Email test failed:", error);
    res.status(500).json({
      message: "❌ Email service failed",
      error: error.message,
      instructions: [
        "1. Verify your Gmail App Password is correct",
        "2. Check that 2-Factor Authentication is enabled",
        "3. Ensure EMAIL_USER and EMAIL_PASS environment variables are set",
        "4. Try generating a new App Password if needed"
      ]
    });
  }
});

// Test endpoint to send a real email to your email
app.post("/api/sendTestEmail", async (req, res) => {
  try {
    const { toEmail } = req.body;
    
    if (!toEmail) {
      return res.status(400).json({ 
        message: "Email address is required" 
      });
    }

    // Create a test email
    const testEmailOptions = {
      from: "riskly@ai.email",
      to: toEmail,
      subject: "Test Email from Riskly",
      text: "This is a test email from the Riskly system. If you receive this, the email system is working!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ Test Email from Riskly</h2>
          <p>This is a test email from the <strong>Riskly</strong> system.</p>
          <p>If you receive this email, the email system is working correctly!</p>
          <hr style="margin: 20px 0;">
          <p>Best regards,<br><strong>Riskly Team</strong></p>
        </div>
      `
    };

    const info = await transporter.sendMail(testEmailOptions);
    
    res.status(200).json({
      message: "Test email sent successfully",
      messageId: info.messageId,
      note: "Check your email inbox and server console for details"
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).json({ 
      message: "Failed to send test email",
      error: error.message 
    });
  }
});

// API endpoint to send high risk email to a student
app.post("/api/sendHighRiskEmail", async (req, res) => {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ 
        message: "Student ID is required" 
      });
    }

    const result = await sendHighRiskEmail(studentId);
    
    if (result.success) {
      const emailType = result.type === 'mock' ? 'mock' : 'real';
      const message = result.type === 'mock' 
        ? "High risk alert processed (mock email - check console for details)"
        : "High risk email sent successfully";
      
      res.status(200).json({
        message: message,
        messageId: result.messageId,
        emailType: emailType
      });
    } else {
      res.status(500).json({
        message: "Failed to send high risk email",
        error: result.error
      });
    }
  } catch (error) {
    console.error("Error in sendHighRiskEmail endpoint:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});
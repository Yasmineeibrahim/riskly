import Student from '../models/studentModel.js';
import Risk from '../models/riskModel.js';
import sequelize from '../config/database.js';

// Get students by IDs (for advisor's assigned students)
export const getStudentsByIds = async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ 
        message: "Student IDs array is required" 
      });
    }

    const students = await Student.findAll({
      where: {
        StudentID: studentIds
      },
      raw: true
    });

    // Get risks from the risks table
    const risks = await Risk.findAll({
      where: {
        StudentID: studentIds
      },
      raw: true
    });

    // Create a map of risks by StudentID for quick lookup
    const riskMap = {};
    risks.forEach(risk => {
      riskMap[risk.StudentID] = risk;
    });

    // Combine student data with risk data
    const studentsWithRisks = students.map(student => {
      const risk = riskMap[student.StudentID] || {
        DropoutRisk: 0,
        UnderperformRisk: 0
      };
      
      // Convert boolean values (0/1) to string format for frontend
      const dropoutRisk = risk.DropoutRisk === 1 ? "At Risk" : "No Risk";
      const underperformRisk = risk.UnderperformRisk === 1 ? "At Risk" : "No Risk";
      
      let riskCount = 0;
      if (dropoutRisk === "At Risk") riskCount++;
      if (underperformRisk === "At Risk") riskCount++;
      
      // Debug logging for risk calculation
      console.log(`Student ${student.StudentID} (${student.Name}):`, {
        dropoutRisk: risk.DropoutRisk,
        underperformRisk: risk.UnderperformRisk,
        dropoutRiskString: dropoutRisk,
        underperformRiskString: underperformRisk,
        riskCount: riskCount
      });
      
      const riskClass = riskCount === 0 ? "no-risk" : 
                       riskCount === 1 ? "medium-risk" : "high-risk";
      
      console.log(`Risk class assigned: ${riskClass}`);
      
      return {
        ...student,
        DropoutRisk: dropoutRisk,
        Underperform: underperformRisk,
        riskClass: riskClass
      };
    });

    res.status(200).json({
      message: "Students retrieved successfully",
      students: studentsWithRisks
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

// Get predicted students by advisor email
export const getPredictedStudents = async (req, res) => {
  try {
    const { advisorEmail } = req.body;
    
    if (!advisorEmail) {
      return res.status(400).json({ 
        message: "Advisor email is required" 
      });
    }

    // Query the predicted_students table directly using sequelize
    const predictedStudents = await sequelize.query(
      `SELECT * FROM predicted_students WHERE advisor_email = ?`,
      {
        replacements: [advisorEmail],
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Transform the data to match the expected format
    const transformedStudents = predictedStudents.map(student => {
      // Convert numeric risks to string format
      const dropoutRisk = student.dropout_risk === 1 ? "At Risk" : "No Risk";
      const underperformRisk = student.underperform_risk === 1 ? "At Risk" : "No Risk";
      
      let riskCount = 0;
      if (dropoutRisk === "At Risk") riskCount++;
      if (underperformRisk === "At Risk") riskCount++;
      
      const riskClass = riskCount === 0 ? "no-risk" : 
                       riskCount === 1 ? "medium-risk" : "high-risk";
      
      return {
        StudentID: `P${student.id || Math.random().toString(36).substr(2, 9)}`, // Generate unique ID for predicted students
        Name: student.Name,
        Gender: student.Gender,
        AttendanceRate: student.AttendanceRate,
        StudyHoursPerWeek: student.StudyHoursPerWeek,
        PreviousGrade: student.PreviousGrade,
        ExtracurricularActivities: student.ExtracurricularActivities,
        ParentalSupport: student.ParentalSupport,
        FinalGrade: student.FinalGrade,
        Email: student.Email,
        DropoutRisk: dropoutRisk,
        Underperform: underperformRisk,
        riskClass: riskClass,
        dropout_probability: student.dropout_probability,
        underperform_probability: student.underperform_probability,
        isPredicted: true // Flag to identify predicted students
      };
    });

    res.status(200).json({
      message: "Predicted students retrieved successfully",
      students: transformedStudents
    });
  } catch (error) {
    console.error("Error fetching predicted students:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

// Get all students (for admin purposes)
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      raw: true
    });

    res.status(200).json({
      message: "All students retrieved successfully",
      students: students
    });
  } catch (error) {
    console.error("Error fetching all students:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

// Test database connection
export const testConnection = async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ 
      message: "Database connection successful" 
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ 
      message: "Database connection failed",
      error: error.message 
    });
  }
}; 
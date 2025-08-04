import { AdvisorSQL } from "../models/advisorModel.js";
//delete advisor using advisor id from SQL database
export const deleteAdvisors = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Find and delete from SQL database
    const sqlAdvisor = await AdvisorSQL.findByPk(id);
    if (!sqlAdvisor) {
      return res.status(404).json({ message: "Advisor not found" });
    }
    
    await sqlAdvisor.destroy();
    
    return res.status(200).json({ 
      message: "Advisor deleted successfully"
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
//update advisor parameters using advisor id from SQL database
export const updateAdvisor = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("Update advisor request body:", req.body);
    
    // Find and update in SQL database
    const sqlAdvisor = await AdvisorSQL.findByPk(id);
    if (!sqlAdvisor) {
      return res.status(404).json({ message: "Advisor not found" });
    }
    
    await sqlAdvisor.update(req.body);
    const updatedSQLAdvisor = await AdvisorSQL.findByPk(id);
    
    return res.status(200).json({
      message: "Advisor updated successfully",
      advisor: updatedSQLAdvisor
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
//add new advisor to SQL database
//primary key is the advisor's email address
export const addNewAdvisor = async (req, res) => {
  try {
    const { Email, Password, advisor_name, Students } = req.body;
    
    // Check if advisor exists in SQL database
    const existingSQLAdvisor = await AdvisorSQL.findOne({ where: { Email } });
    
    if (existingSQLAdvisor) {
      return res.status(400).json({ message: "Email already exists" });
    }
    
    // Generate a unique ID
    const advisorId = Math.random().toString(36).substr(2, 9);
    
    // Create advisor data
    const advisorData = {
      _id: advisorId,
      Email,
      Password,
      advisor_name,
      Students: Students || []
    };
    
    // Save to SQL database
    const sqlAdvisor = await AdvisorSQL.create(advisorData);
    
    return res.status(201).json({ 
      message: "Advisor added successfully", 
      advisor: sqlAdvisor
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

//get all advisors from SQL database
export const fetchAdvisors = async (req, res) => {
  try {
    // Fetch from SQL database
    const sqlAdvisors = await AdvisorSQL.findAll();
    
    res.status(200).json({
      message: "Advisors fetched successfully",
      advisors: sqlAdvisors,
      count: sqlAdvisors.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch a specific advisor by ID from SQL database
export const fetchAdvisorById = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Find advisor in SQL database
    const advisor = await AdvisorSQL.findByPk(id);
    
    if (!advisor) {
      return res.status(404).json({ message: "Advisor not found" });
    }
    
    res.status(200).json({
      advisor: advisor
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

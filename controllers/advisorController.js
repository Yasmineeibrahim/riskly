import Advisor from "../models/teacherModel.js";
//delete advisor using advisor id from teachers collection
export const deleteTeachers = async (req, res) => {
  try {
    const id = req.params.id;
    const teacherExists = await Advisor.findById({ _id: id });
    if (!teacherExists) {
      return res.status(404).json({ message: "Advisor not found" });
    }
    await Advisor.findByIdAndDelete(id);
    return res.status(200).json({ message: "Advisor deleted successfully" });
  } catch (errror) {
    return res.status(400).json({ message: error.message });
  }
};
//update advisor parameters using advisor id
//this will update the advisor's information in the teachers collection
export const updateTeacher = async (req, res) => {
  try {
    const id = req.params.id;
    const teacherExists = await Advisor.findOne({ _id: id });
    if (!teacherExists) {
      return res.status(404).json({ message: "Advisor not found" });
    }
    console.log("Update advisor request body:", req.body);
    const updatedTeacher = await Advisor.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    return res
      .status(200)
      .json({
        message: "Advisor updated successfully",
        Advisor: updatedTeacher,
      });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
//add new advisor to the teachers collection
//primary key is the teachers email address
//if the input is an array, it will add multiple teachers at once
export const addNewTeacher = async (req, res) => {
  try {
    const teacherData = new Advisor(req.body);
    const { Teacher_Name, Email, Password, Courses } = teacherData;

    const existingTeacher = await Advisor.findOne({ Email });
    if (existingTeacher) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const savedTeacher = await teacherData.save();
    return res
      .status(201)
      .json({ message: "Advisor added successfully", Advisor: savedTeacher });
    //if the email already exists, it will return an error message
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

//get all teachers from the teachers collection
export const fetchTeachers = async (req, res) => {
  try {
    const teachers = await Advisor.find();
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Fetch a specific advisor by ID
export const fetchTeacherById = async (req, res) => {
  try {
    const advisor = await Advisor.findById(req.params.id);
    if (!advisor) return res.status(404).json({ message: "Advisor not found" });
    res.status(200).json(advisor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

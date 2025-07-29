import mongoose from "mongoose";
const advisorSchema = new mongoose.Schema({
  Email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  Password: {
    type: String,
    required: true,
  },
  advisor_name: {
    type: String,
    required: true,
  },
Students: [{ type: Number }],
});
export default mongoose.model("Advisor", advisorSchema);

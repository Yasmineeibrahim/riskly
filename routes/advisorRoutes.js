import express from "express";
import {
  fetchAdvisors,
  deleteAdvisors,
  updateAdvisor,
  addNewAdvisor,
  fetchAdvisorById,
} from "../controllers/advisorController.js";

// Create a new router instance
// This router will handle all advisor-related routes
const advisorrouter = express.Router();

// GET route to fetch all advisors
advisorrouter.get("/fetchadvisors", fetchAdvisors);
// POST route to add a new advisor
advisorrouter.post("/createadvisors", addNewAdvisor);
// PUT route to update a advisor by ID
advisorrouter.put("/updateadvisor/:id", updateAdvisor);
// DELETE route to delete a advisor by ID
advisorrouter.delete("/deleteadvisor/:id", deleteAdvisors);
// GET route to fetch a advisor by ID
advisorrouter.get("/:id", fetchAdvisorById);

export default advisorrouter;

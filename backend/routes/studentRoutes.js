const express = require("express");
const { getDashboard, getResume } = require("../controllers/studentController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("candidate"));
router.get("/dashboard", getDashboard);
router.get("/resume/:id", getResume);

module.exports = router;

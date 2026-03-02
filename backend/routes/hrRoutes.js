const express=require('express')
const {
  getAllCandidates,
  getDashboardStats,
  getMyCandidateDashboard,
  getSingleCandidate,
  deleteCandidate
}=require("../controllers/hrController")
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const router=express.Router();

router.get("/candidates", protect, authorizeRoles("hr","admin"), getAllCandidates)
router.get("/candidate/me/dashboard", protect, authorizeRoles("candidate"), getMyCandidateDashboard);
router.get("/candidate/:id", protect, authorizeRoles("hr","admin","candidate"), getSingleCandidate);
router.delete("/candidate/:id", protect, authorizeRoles("hr","admin"), deleteCandidate);

router.get("/dashboard-stats", protect, authorizeRoles("hr","admin"), getDashboardStats);

module.exports=router

const express=require('express')
const { getAllCandidates,getDashboardStats,getSingleCandidate}=require("../controllers/hrController")
const router=express.Router();

router.get("/candidates",getAllCandidates)
router.get("/candidate/:id", getSingleCandidate);

router.get("/dashboard-stats", getDashboardStats);

module.exports=router
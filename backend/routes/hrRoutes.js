const express=require('express')
const { getAllCandidates,getDashboardStats}=require("../controllers/hrController")
const router=express.Router();

router.get("/candidates",getAllCandidates)

router.get("/dashboard-stats", getDashboardStats);

module.exports=router
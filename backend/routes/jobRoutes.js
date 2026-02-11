const express=require('express')

const {createJob,getJobs,updateJob,deleteJob}=require("../controllers/jobController")
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { AuthType } = require('@google/genai');

const router=express.Router()

router.post("/create",protect,authorizeRoles("hr","admin"),createJob)
router.get("/", getJobs);
router.put("/:id",protect,authorizeRoles("hr","admin") ,updateJob);
router.delete("/:id",protect,authorizeRoles("hr","admin"), deleteJob);

module.exports=router
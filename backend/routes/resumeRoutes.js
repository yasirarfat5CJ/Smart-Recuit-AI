const express=require('express')
const multer=require('multer')
const fs = require("fs");
const path = require("path");

const {uploadResume} =require("../controllers/resumeControllers")
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router=express.Router();

const uploadsDir = path.join(process.cwd(), "uploads");


// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
router.post('/upload', protect, authorizeRoles("candidate"), (req, res, next) => {
  upload.single("resume")(req, res, (error) => {
    if (error) {
      return res.status(500).json({ message: `Resume upload failed: ${error.message}` });
    }
    next();
  });
}, uploadResume)

module.exports=router
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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF resumes are supported"));
    }
    cb(null, true);
  }
});
router.post('/upload', protect, authorizeRoles("candidate"), (req, res, next) => {
  upload.single("resume")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: `Resume upload failed: ${error.message}` });
    }
    next();
  });
}, uploadResume)

module.exports=router

const express=require('express')
const multer=require('multer')

const {uploadResume} =require("../controllers/resumeControllers")

const router=express.Router();


// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
router.post('/upload',upload.single("resume"),uploadResume)

module.exports=router
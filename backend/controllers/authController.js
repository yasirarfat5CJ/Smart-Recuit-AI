const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// REGISTER
exports.register = async (req,res)=>{

  try{

    const { name,email,password } = req.body;

    const existingUser = await User.findOne({ email });

    if(existingUser){
      return res.status(400).json({ message:"User exists" });
    }

    const hashedPassword = await bcrypt.hash(password,10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "candidate"
    });

    res.status(201).json({
      message:"User registered",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  }catch(err){

    res.status(500).json({ message: err.message });

  }

};


// LOGIN
exports.login = async (req,res)=>{

  try{

    const { email,password } = req.body;

    const user = await User.findOne({ email });

    if(!user){
      return res.status(400).json({ message:"Invalid credentials"});
    }

    const isMatch = await bcrypt.compare(password,user.password);

    if(!isMatch){
      return res.status(400).json({ message:"Invalid credentials"});
    }

    if (user.role !== "candidate") {
      user.role = "candidate";
      await user.save();
    }

    const token = jwt.sign(

      {
        id:user._id,
        role:user.role
      },

      process.env.JWT_SECRET || "secretkey",

      { expiresIn:"1d" }

    );

    res.json({

      token,
      role:user.role,
      userId:user._id

    });

  }catch(err){

    res.status(500).json({ message: err.message });

  }

};

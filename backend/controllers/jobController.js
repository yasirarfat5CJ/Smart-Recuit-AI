const Job = require("../models/job");

const createJob = async (req, res) => {

  try {

    const job = await Job.create(req.body);

    res.json({
      message: "Job created successfully",
      job
    });

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};
const getJobs = async (req, res) => {
  try {

    const jobs = await Job.find();

    res.json(jobs);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }
};

const updateJob = async (req,res)=>{

  try{

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new:true }
    );

    res.json(job);

  }catch(err){

    res.status(500).json({message:err.message});

  }

};


const deleteJob = async (req,res)=>{

  try{

    await Job.findByIdAndDelete(req.params.id);

    res.json({message:"Job deleted"});

  }catch(err){

    res.status(500).json({message:err.message});

  }

};

module.exports = { createJob,getJobs ,updateJob, deleteJob };




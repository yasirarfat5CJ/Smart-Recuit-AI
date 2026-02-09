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

module.exports = { createJob };

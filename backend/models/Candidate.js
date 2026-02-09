const mongoose=require('mongoose')
const { stream } = require('pdf-parse-new')

const candidateSchema=new mongoose.Schema(
    {
        name:{
            type:String,
            default:"",
        },
        email:{
            type:String,
            default:""
        },
        parsedResume:{
            type:Object,
            required:true
        },
        atsScore:{
            type:Number,
            default:0,
        },
        interviewStatus:{
            type:String,
            default:"pending",
        },
    },
    {timestamps:true}
);

module.exports=mongoose.model("candidate",candidateSchema)
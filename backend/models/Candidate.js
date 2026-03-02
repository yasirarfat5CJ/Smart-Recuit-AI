const mongoose=require('mongoose')
const { stream } = require('pdf-parse-new')

const candidateSchema=new mongoose.Schema(
    {
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
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
        isArchivedByHR: {
            type: Boolean,
            default: false
        },
        archivedAt: {
            type: Date,
            default: null
        }
    },
    {timestamps:true}
);

module.exports=mongoose.model("candidate",candidateSchema)

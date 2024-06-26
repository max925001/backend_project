import mongoose ,{Schema} from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const userSchema = new Schema({
username:{
    type: String,
    required: true,
    unique: true,
    lowercase:true,
    trim:true,
    index:true // use for searching
},
email:{
    type: String,
    required: true,
    unique: true,
    lowercase:true,
    trim:true,
   
},
fullName:{
    type: String,
    required: true,
    trim:true,
    index:true
   
},
avatar:{
    type: String,
    required:true

},
coverImage:{
    type: String,
    
},

watchHistory:[
    {
       type:Schema.Types.ObjectId,
       ref:"Vedio"
    }
],
password:{
    type:String,
    required:[true,"password is required"]
},
refreshToken:{
    type:String
}




},{timestamps:true})

// pre ish liye use kar rhe hai taki hum save hone se phle kuch kam kra sake 
//
userSchema.pre("save", async function(next){
    if(!this.isModified("password")){
return next()
    }
this.password = await bcrypt.hash(this.password, 10)
next()
} )


userSchema.methods.isPsswordCorrect = async function(password){
  return await bcrypt.compare(password ,this.password)

}


userSchema.methods.generateAccessToken = function(){
 return jwt.sign({
    _id:this._id,
    email:this.email,
    username:this.username,
    fullName:this.fullName
    //ye data milega  payload me
},
process.env.ACCESS_TOKEN_SECRET,
{
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY
}

)
    
}
userSchema.methods.generateRefreshToken = function(){


    return jwt.sign({
        _id:this._id,
    
       // ishme data kam rhta hai
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
    
    )



}


export const User = mongoose.model("User" ,userSchema)
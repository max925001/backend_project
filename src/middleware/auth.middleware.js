import { config } from "dotenv";
config()

import { User } from "../models/user.model.js";
import { ApiError } from "../utilis/ApiError.js";
import { asyncHandler } from "../utilis/asyncHandler.js";
import jwt from "jsonwebtoken"




export const verifyJWT = asyncHandler(async(req,_,next)=>{


try {
    const token =req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    

    // console.log("token",token)
    if(!token){
        throw new ApiError(401, "Unauthorized request")
    }
    const decodedToken= jwt.verify(token ,process.env.ACCESS_TOKEN_SECRET)
    
    const user =await User.findById(decodedToken?._id).select("-password -refreshToken")
    // console.log("user",user)
    
    if(!user){
    
        throw new ApiError(401,"Invalid Access Token")
    }
    
    
    req.user = user
    // console.log(req.user)
    
    next()
} catch (errors) {
   
    
    throw new ApiError(401,errors?.message || "Invalid access token")
}

})
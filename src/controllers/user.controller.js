import {asyncHandler } from '../utilis/asyncHandler.js'
import {ApiError} from '../utilis/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utilis/cloudinary.js'
import { ApiResponse } from '../utilis/ApiResponse.js'
import path from 'path'
const registerUser =asyncHandler(async (req,res) =>{

//get user details from frontend
//validation -not empty
//check if user already exists 
//check for images ,check for avatar
//upload then to cloudinary ,avatar
// create user object - create entry in db
// remove password and refresh token field from response
//check for user creation
// return response

const {fullName ,email ,username,password}=req.body
console.log(req.body)
console.log(req.files)
// if(fullName ===""){
//   throw  new ApiError(400 , "fullName is required")
// }
 

if([fullName ,email ,username ,password].some((field) =>field?.trim ==="")){
  throw new ApiError(400 ,"All fields are required")
}


const existedUser=  await User.findOne({
$or: [{username} ,{email}]

})


if(existedUser){
  throw new ApiError(409 ,"User already exists")
}

const avatarLocalPath = req.files?.avatar[0]?.path
console.log("file",avatarLocalPath)
//const coverImageLocalPath = req.files?.coverImage[0]?.path


let coverImageLocalPath

if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
  coverImageLocalPath=req.files.coverImage[0].path
}

if(!avatarLocalPath){
  throw new ApiError(400,"Avatar file is required ")
}


  const avatar = await uploadOnCloudinary(avatarLocalPath)
       const coverImage  = await uploadOnCloudinary(coverImageLocalPath)

       if(!avatar){


        throw new ApiError(400,"Avatar file is required")
       }

        const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?. url || "",
        password,
        username,
email


       })

         const createdUser = await User.findById(user._id).select(

          "-password -refreshToken" // space dena hai 
         )

         if(!createdUser){
          throw new ApiError(500 ,"Something went wrong while registring")
         }

         return res.status(201).json(
          new ApiResponse(200,createdUser ,"user registered successfully")

         )

})


export {registerUser}
import {asyncHandler } from '../utilis/asyncHandler.js'
import {ApiError} from '../utilis/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utilis/cloudinary.js'
import { ApiResponse } from '../utilis/ApiResponse.js'
import jwt from "jsonwebtoken"


const generateAccessAndRefreashTokens = async(userId) =>{
try{
 const user =await User.findById(userId)

 const accessToken = user.generateAccessToken()
 const refreshToken=user.generateRefreshToken()
 
 
user.refreshToken =refreshToken
await user.save({validateBeforeSave:false})

return {accessToken ,refreshToken}



}catch(error){

  throw new ApiError(500,"Something went wrong while generating tokens")
}

}




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



const loginUser = asyncHandler(async(req,res) =>{

//take data from user
//user give all data
//find the user
//check password
//access and refresh token generate
//send cookies


const {email ,username ,password} = req.body

if(!username && !email){
  throw new ApiError(400 ,"username or email is required")


}

   const user =await User.findOne({

  $or : [{username} ,{email}]
})

if(!user){

  throw new ApiError(404, "User does not exist")


}

 const isPasswordValid =await user.isPsswordCorrect(password)

if(!isPasswordValid){
  throw new ApiError(401, "Wrong password")
}



  const {accessToken ,refreshToken} =await generateAccessAndRefreashTokens(user._id)

const loggedInUser = await User.findById(user._id).select(

  "-password -refreshToken"
)

// generate cookies
const options ={
httpOnly: true,
secure:true


}


return res.status(200).cookie("accessToken",
accessToken ,options).cookie("refreshToken" ,refreshToken,options)
.json(
  new ApiResponse(
    200,{
      user:loggedInUser,accessToken,refreshToken
    },
      "User loggedIn succesfully"
  
  )
)

})





const logoutUser = asyncHandler(async(req,res) =>{
// ye user ke req middlwware se aa rha hai
// console.log("requser",req.user._id)
 await User.findByIdAndUpdate(
  req.user._id,
  {
    $unset: {
      refreshToken:1
    }
   
  },
  {
    new: true
  }
)

const options ={
  httpOnly: true,
  secure:true
  
  
  }
  return res
  .status(200)
  .clearCookie("accessToken" ,options)
  .clearCookie("refreshToken" ,options)
  .json(new ApiResponse(200, {} ,"User logged out "))

})



const refreshAccessToken = asyncHandler(async(req,res)=>{

const incomingRefreshToken =req.cookies.refreshAccessToken || req.body.refreshAccessToken
if(!incomingRefreshToken){
  throw new ApiError(401,"Unauthorized request")

}

try {
  const decodedToken = jwt.verify(
  
    incomingRefreshToken , 
    process.env.REFRESH_TOKEN_SECRET
  )
  
  
  
   const user =await User.findById(decodedToken?._id)
  
  
  if(!user){
  
    throw new ApiError(401 ,"Invalid Refresh token")
    
  }
  
  
  if(incomingRefreshToken !== user?.refreshToken){
    throw new ApiError(401 ,"Refresh token expired")
  }
  
  const options = {
  
  httpOnly:true,
  secure:true
  
  }
  const {accessToken ,newrefreshToken} =await generateAccessAndRefreashTokens(user._id)
  
  
  return res
  .status(200)
  .cookie("accessToken" ,accessToken,options)
  .cookie("refreshToken" ,newrefreshToken,options)
  .json(
    new ApiResponse(
      200,
      {accessToken ,refreshToken:newrefreshToken},
      "Access token refreshed"
  
    )
  )
} catch (errors) {

  throw new ApiError(401,errors?.message ||"Invalid refresh token")
  
}


}



)



export {registerUser ,loginUser ,logoutUser ,refreshAccessToken}
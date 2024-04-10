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




const changeCurrentPassword = asyncHandler(async(req,res)=>{


  const {oldPssword , newPassword} =req.body

//agar user password change kar rha hai to iska mtlb hai vo login hai to hum authmiddleware ka use karke id le sakte haii

const user =User.findById(req.user?._id)
 const isPasswordCorrect =await user.isPsswordCorrect(oldPssword)
 if(!isPasswordCorrect){

  throw new ApiError(400,"Invalid old password")


 }

 user.password =newPassword
 await user.save({validateBeforeSave:false})

 return res
 .status(200)
 .json(new ApiResponse(200,{} ,"Password change successfully"))


  
})

const getCurrentUser = asyncHandler(async(req,res)=>{

return res.status(200)
.json(new ApiResponse(200,req.user,"current user fetched successfully"))


})

const updateAccountDetails = asyncHandler(async(req,res) =>{

const {fullName ,email} = req.body

if(!fullName || !email){
  throw new ApiError(400 ,"All fields are required")


}

const user = await User.findByIdAndUpdate(req.user?._id,
{
$set:{ // iski help new value set hoga

  fullName,
  email
}

},
{new:true}

).select("-password")


return res
.status(200)
.json(new ApiResponse(200 ,user ,"Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{

  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400 ,"Avatar file missing")


  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400,"Error while uploading on avatar")

  }

  const user =await User.findByIdAndUpdate(req.user?._id
  ,
{
  $set:{
    avatar:avatar.url // yha url ish liye likha hai kyu ki humko bas url dena hai avatar me pura object nhi barna hai

  }
},
{new: true})

return res.status(200)
.json(
  new ApiResponse(200 ,user,"avatar image update successfully")
)

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{

  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
    throw new ApiError(400 ,"coverImage file missing")


  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
    throw new ApiError(400,"Error while uploading on avatar")

  }

  const user = await User.findByIdAndUpdate(req.user?._id
  ,
{
  $set:{
    avatar:avatar.url // yha url ish liye likha hai kyu ki humko bas url dena hai avatar me pura object nhi barna hai

  }
},
{new: true}).select("-password")


return res.status(200)
.json(
  new ApiResponse(200 ,user,"CoverImage image update successfully")
)
})




const getUserChannelProfile = asyncHandler(async(req,res)=>{
  
const {username } =req.params
if(!username?.trim()){
  throw new ApiError(400 ,"username is required")}



//User.find({username})


//aggreation ek array leta hai
  const channel =await User.aggregate([
  {
    $match:{
      username:username?.toLowerCase()
    }
  },
  {
    $lookup:{
      from:"subscriptions",
      localField:"_id",
      foreignField:"channel",
      as:"subscribers"
    }
  },
  {

   
    $lookup:{
      from:"subscriptions",
      localField:"_id",
      foreignField:"subscriber",
      as:"subscribedTo"
    }



  },


  // additional models
{
  

  $addFields:{
    
    subscribersCount:{$size:"$subscribers"},
    channelSubscribedToCount:{$size:"$subscribedTo"},

    isSubscribed:{
      $cond:{
        if:{
          $in:[req.user._id, "$subscribers.subscriber"]
        },
        then:true,
        else:false
  
      }
    },
    

  },
 
  

},
{


  $project:{
fullName:1,
username:1,
subscribersCount:1,
channelSubscribedToCount:1,
isSubscribed:1, 
avatar:1,
coverImage:1,
email:1,






  }




}



])

if(!channel?.length){
  throw new ApiError(404 ,"No channel found")
}
return res
.status(200)
.json(
  new ApiResponse(200 ,channel[0],"Channel fetched successfully")
)

})



export {registerUser ,loginUser ,logoutUser ,refreshAccessToken
,getCurrentUser,
changeCurrentPassword
,updateAccountDetails,
updateUserAvatar,
updateUserCoverImage,
getUserChannelProfile
}
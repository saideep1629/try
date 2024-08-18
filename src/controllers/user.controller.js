import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAndAccessTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong when generating access and refresh tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation (not empty)
    // check if user already exits (username or email)
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response 
    // check for user creation 
    // return response or send error
    
    // get user details from frontend
    const {username, email, fullName, password} = req.body
    // console.log("email: ", email);

    // if(fullName === ""){
    //     throw new ApiError(400, "fullname is required");
    // }

    // validation (not empty)
    if( [fullName, password, username, email].some((field) => field?.trim() === "") )
        {
            throw new ApiError(400, "All fields are mandatory")
        }
    
    // check if user already exits (username or email)
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser) {
        throw new ApiError(409, "User already exists");
    }
    
    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    } 

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is required ");
    }
    
    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "avatar file is required");
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar?.url,
        username: username.toLowerCase(),
        coverImage: coverImage?.url || "",
        email,
        password
    })

    // check for user creation //remove password and refresh token field from response 
    const checkCreatedUser = await User.findById(user._id).select("-password -refreshToken")

    if(!checkCreatedUser){
        throw new ApiError(500, "Something went wrong");
    }

    return res.status(201).json(
        new ApiResponse(200, checkCreatedUser, "User registered successfully")
    )


})

const loginUser = asyncHandler(async (req, res) => {
    // username or email
    // check if user exists
    // password checking (matching)
    // access and refresh tokens 
    //send cookie 
    // send successfully or not successfully message


    // taking user input
    const {email, username, password} = req.body

    if(!username && !email){
        throw new ApiError(400, "Username or email is required")
    }
    
    // check if user exists
    const findUser = await User.findOne({
        $or : [{ username }, { email }]
    })

    if(!findUser){
        throw new ApiError(404, "user does not found");
    }
    
    // password checking (matching)
    const isPasswordValid = await findUser.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Password not match")
    }

    const {accessToken, refreshToken} = await generateAndAccessTokens(findUser._id)

    const loggedInUser =await User.findById(findUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        // secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            {
                message: "User successfully logged in"
            }
        )
    )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:
            {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "user logged out")
    )

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshAccessToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options ={
            httpOnly: true,
            // secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAndAccessTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refresh successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
        
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordRight = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordRight) {
        throw new ApiError(404, "Password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "password is changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res.status(200)
    .json(
        new ApiResponse(
            200, 
            req.user, 
            "current user fetched successfully"))
})

const updateUserDetails = asyncHandler(async (req, res) =>{
    const {fullName, email} = req.body

    if(!fullName && !email){
        throw new ApiError(400, "All fields are mandatory")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Fullname and email are updated successfully"
        )
    )

})

const updateAvatar = asyncHandler(async (req, res) =>{
    const avatarFileLocalPath = req.file?.path

    if(!avatarFileLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const uploadedAvatar = await uploadOnCloudinary(avatarFileLocalPath)

    if(!uploadedAvatar.url){
        throw new ApiError(400, "Error while uploading avatar file on cloudinary")
    }

    const avatar = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: updateAvatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            avatar,
            "Avatar is updated successfully"
        )
    )

})

const updatecoverImage = asyncHandler(async (req, res) =>{
    const coverImageFileLocalPath = req.file?.path

    if(!coverImageFileLocalPath){
        throw new ApiError(400, "coverImage file is missing")
    }

    const uploadedcoverImage = await uploadOnCloudinary(coverImageFileLocalPath)

    if(!uploadedcoverImage.url){
        throw new ApiError(400, "Error while uploading cover image file on cloudinary")
    }

    const coverImage = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: uploadedcoverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            coverImage,
            "coverImage is updated successfully"
        )
    )

})

const getUserChannelProfile = asyncHandler(async (req, res) =>{
    const {username} = req.params

    if (!username.trim()) {
        throw new ApiError(400, "username is missing")
    }

   const channel = await User.aggregate([
    {
        $match: {
            username: username
        }
    },
    {
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
        }
    },
    {
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
        }
    },
    {
        $addFields: {
            subscribersCount: {
                $size: "$subscribers"
            },
            channelSubscribeToCount: {
                $size: "$subscribedTo"
            },
            isSubscribed: {
                $cond: {
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }
    },
    {
        $project: {
            fullName: 1,
            username: 1,
            email: 1,
            subscribersCount: 1,
            channelSubscribeToCount: 1,
            avatar: 1,
            coverImage: 1,
            isSubscribed: 1
        }
    }
   ])

   if(!channel?.length){
    throw new ApiError(404, "channel does not exits")
   }

   return res.status(200)
   .json(
       new ApiResponse(
        200,
        channel[0],
        "User channel fetched successfully"

       )
   )
  
})

const getWatchHistory = asyncHandler(async (req, res) =>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetched successfully"
        )
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateAvatar,
    updatecoverImage,
    getUserChannelProfile,
    getWatchHistory
}
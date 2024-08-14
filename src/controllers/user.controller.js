import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
    
}
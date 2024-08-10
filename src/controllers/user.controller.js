import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
        throw new ApiError(400, "avatar file is required 1");
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


export {registerUser}
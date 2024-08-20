import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    if(!title && !description){
        throw new ApiError(400, "title and description are required")
    }

    const videoLocalPath = req.file?.video[0]?.path;
    console.log(videoLocalPath)

    if(!videoLocalPath){
        throw new ApiError(400, "video file is required")
    }

    const videoUploaded = await uploadOnCloudinary(videoLocalPath);
   
    if(!videoUploaded){
        throw new ApiError(500, "Video upload failed")
    }

    const { public_id } = videoUploaded;

    const videoMetadata = await cloudinary.v2.api.resource(public_id, {
        resource_type: 'video',
        fields: 'duration'
    });

    const duration = videoMetadata.duration;
    const owner = req.user._id;

   const video = await Video.create({
        videoFile: videoUploaded,
        owner,
        title: title,
        description: description,
        duration,
        isPublished: true
    })
    
    const checkUploadedVideo = await Video.findById(video._id)

    if(!checkUploadedVideo){
        throw new ApiError(400, "something went wrong")
    }

    return res.status(201).json(
        new ApiResponse(200, checkUploadedVideo, "Video is uploaded successfully")
    )
   // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
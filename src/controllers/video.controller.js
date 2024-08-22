import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { json } from "express"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
  
    if(!title && !description){
        throw new ApiError(400, "title and description are required")
    }
    
    const videoLocalPath = req.files?.video[0]?.path;
    // console.log(videoLocalPath)

    if(!videoLocalPath){
        throw new ApiError(400, "video file is required")
    }

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    // console.log(thumbnailLocalPath)

    if(!thumbnailLocalPath){
        throw new ApiError(400, "thumbnail file is required")
    }

    const videoUploaded = await uploadOnCloudinary(videoLocalPath);
    const thumbnailUploaded = await uploadOnCloudinary(thumbnailLocalPath);

    if(!videoUploaded){
        throw new ApiError(500, "Video upload failed")
    }

    if(!thumbnailUploaded){
        throw new ApiError(500, "thumbnail upload failed")
    }

    const { duration } = videoUploaded;
    // console.log("duration",duration)

    const owner = req.user?._id
    console.log(owner)

   const video = await Video.create({
        videoFile: videoUploaded.url,
        thumbnail: thumbnailUploaded.url,
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
    // console.log("videoId",videoId)

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videId")
    }

    const video = await Video.findById(videoId)
    // console.log(video)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200, video, "video is found successfully"
        ))
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videId")
    }

    const video = await Video.findById(videoId)
    // console.log(video)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

    const {title, description} = req.body
    // console.log("title",title)
    // console.log("description",description)

    if(!title && !description){
        throw new ApiError(400, "All fields are mandatory")
    }

    const thumbnailFileLocalPath = req.file?.path

    if(!thumbnailFileLocalPath){
        throw new ApiError(400, "Thumbnail file is missing")
    }

    const uploadedThumbnail = await uploadOnCloudinary(thumbnailFileLocalPath)

    if(!uploadedThumbnail.url){
        throw new ApiError(400, "Error while uploading avatar file on cloudinary")
    }

    const videodetails = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: uploadedThumbnail.url
            }
        },
        {new: true}
    ).select("-views -duration")

    // console.log(videodetails)

    return res.status(200)
    .json(
        new ApiResponse(
              200,
              videodetails,
              "video details are updated successfully"
        )
    )
})


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videId")
    }

    const video = await Video.findById(videoId)
    // console.log(video)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

   const deleteVideo = await Video.findByIdAndDelete(videoId)
//    console.log(deleteVideo)

   return res.status(200)
   .json(
    new ApiResponse(
        200,{},"Video is deleted successfully"
    )
   )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videId")
    }

    const video = await Video.findById(videoId)
    // console.log(video)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

    if(video.isPublished == "true"){
        video.isPublished = "false"
    }
    else video.isPublished == "true"

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "toggle function is working"
        )
    )

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
import { Router } from "express";
import { 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAvatar, 
    updatecoverImage, 
    updateUserDetails } 
    from "../controllers/user.controller.js";
    
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

userRouter.route("/login").post(loginUser)

userRouter.route("/logout").post(verifyJWT, logoutUser)
userRouter.route("/refresh-token").post(refreshAccessToken)
userRouter.route("/change-password").post(verifyJWT, changeCurrentPassword)
userRouter.route("/current-user").post(verifyJWT, getCurrentUser)
userRouter.route("/update-account").patch(verifyJWT, updateUserDetails)

userRouter.route("/change-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
userRouter.route("/change-cover-image").patch(verifyJWT, upload.single("coverImage"), updatecoverImage)

userRouter.route("/c/:username").get(verifyJWT, getUserChannelProfile)
userRouter.route("/watch-history").get(verifyJWT, getWatchHistory)

export default userRouter;
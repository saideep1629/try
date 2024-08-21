import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { getVideoById, publishAVideo } from "../controllers/video.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js";



const videoRouter = Router();
videoRouter.use(verifyJWT)

videoRouter.route("/upload-video").post(
    upload.fields([
        {
            name: "video",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishAVideo)

videoRouter.route("/:videoId").get(getVideoById)

export default videoRouter;
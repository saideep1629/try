import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { publishAVideo } from "../controllers/video.controller.js"

const videoRouter = Router();

videoRouter.route("/upload-video").post(
    upload.fields([
        {
            name: "video",
            maxCount: 1
        }
    ]),
    publishAVideo)

export default videoRouter;
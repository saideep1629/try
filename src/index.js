import dotenv from "dotenv";
import connectDB from "./db/db1.js"

dotenv.config({
    path: "./env"
})

connectDB()




// require('dotenv').config({path: './env'})

import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDB();









/*

import express from "express"
const app = express();

//learn about ifiy in javascript ()() to immideately run the function
;( async () => {
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       //the app has listeners and using on it can listen to many events and one such event is error 
       //and so it listens for errors where the database got connected but error occuring for express app to communicate 
       app.on("error", (error) => {
        console.log("ERROR: ", error);
        throw error
       })

       app.listen(process.env.PORT, () => {
        console.log(`App is listening on port ${process.env.PORT}`);
       })
    } catch (error) {
        console.error("ERROR: ", error)

    }
})()

*/
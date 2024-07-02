import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshTokens = async(userId) =>{

    try {
        const user = await User.findById(userId);
        const refreshToken = user.generateAccessToken();
        const accessToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        //console.log("token generated successfully");
        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // res.status(200).json({
    //     message: "ok"
    // })

    //get user details from frontend
    //add validation
    //check if user already exists :username/email
    // check from images, check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in db
    //remove password and refresh token field from response
    //return res

     const {fullName, email, userName, password } = req.body;
     console.log("email : ", email);

    //  if(fullName === "")
    //     {
    //         throw new ApiError(400, "fullname is requried"); }
    
    if( [fullName, email, userName, password].some( (field) => field?.trim() === "") )
        {
            throw new ApiError(400, "All fields are required");
        }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })
    
    if(existedUser) {
        throw new ApiError(409, "Email or Username already exists ");
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    
    //This handling of req files with ? for optional files was giving error
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    //  for handling optional files (here coverImage is optional)
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
        {
            coverImageLocalPath = req.files.coverImage[0].path;
        }


    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
   
    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    const newUser = await User.create(
        {
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            userName: userName.toLowerCase()
        }
    )

   const newlyCreatedUser =  await User.findById(newUser._id).select(
    "-password -refreshToken "
   )

   if(!newlyCreatedUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
   }

   return res.status(201).json(
    new ApiResponse(200, newlyCreatedUser, "User Registered Successfully")
   )

} )

const loginUser = asyncHandler(async (req, res) => {

    //get user details from frontend(req body)
    //login via username or email
    //validate user details
    //find user and check whether exist 
        
    //generate tokens
    //send tokens within cookies

    const {email, userName, password} = req.body;
    console.log(email);
    
    
    if(!(email || userName))
        {
            throw new ApiError(400, "Username or email is required")
        }
    
    const user = await User.findOne({
        $or:[{userName}, {email}]
    })

    if(!user)
        {
            throw new ApiError(404, "User does not exist");

        }
    
    const isvalidPassword = await user.isPasswordCorrect(password)
    
    if(!isvalidPassword)
        {
            throw new ApiError(401, "Invalid Password");

        }
        // else{
        //     console.log("Correct password");
        // }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshTokens(user._id)
    
    const loggedInUser = User.findById(user._id).select("-password -refreshToken")

    //designing options for cookies 
    const options = {
        httpOnly : true,
        secure : true
    }

    loggedInUser.toJSON = function(){
        return {
            id : this.id,
            userName : this.userName,
            email : this.email,
            fullName : this.fullName,
            avatar : this.avatar,
            coverImage : this.coverImage,
            watchHistory : this.watchHistory
        }
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser.toJSON(), 
                accessToken, 
                refreshToken
            },
            "User logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler(async( req, res ) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out!!"))

})

const refreshAccessToken = asyncHandler(async (req, res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken){
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id);
        if(!user)
        {
            throw new ApiError(401, "Invalid refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken)
        {
            throw new ApiError(401, "Refresh token is expired or used");
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
        const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshTokens(user._id)
    
        return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(
                    new ApiResponse(
                        200,
                        {accessToken, refreshToken : newRefreshToken},
                        "Access token refreshed !"
                    )
                )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }


} )


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/ApiResponse.js"


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

    const existedUser = User.findOne({
        $or: [{ userName }, { email }]
    })
    
    if(existedUser) {
        throw new ApiError(409, "Email or Username already exists ");
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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



export {registerUser}
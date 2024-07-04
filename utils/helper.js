import cloudinary from "cloudinary";
import dotenv from "dotenv";
dotenv.config({path: "../config.env"});
import { db } from "../db/firebase.js";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
export async function handleUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
  });
  console.log(res , " what res looks like \n");
  return res;
}


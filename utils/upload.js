import multer from "multer";
import { handleUpload } from "./helper.js";
import { db } from "../db/firebase.js";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  arrayUnion,
} from "firebase/firestore";
import { formatDateToDDMMYYY } from "./formatDate.js";

const storage = multer.memoryStorage();
const upload = multer({ storage }); //for uploading only a single file
const myUploadMiddleware = upload.single("file"); // this has to be same as the field in FormData

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

const handler = async (req, res) => {
  try {
    await runMiddleware(req, res, myUploadMiddleware); //parsing the file contained in the request body 
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    console.log(`${JSON.stringify(cldRes)} --- response from cloudinary \n`);

    //get the username find the document corresponding to that username 
    //in the firstore and create a field called pdfs
    // this pdf field would contain an array of objects { url , date }

    const username = req.session.username;
    const usersRef = await doc( db , "users",username);
    const date = formatDateToDDMMYYY(new Date());;
    

    await updateDoc( usersRef , {
      uploadedPdfs: arrayUnion({ uploadDate: date , fileUrl: cldRes.secure_url  })
    })

    res.status(200).json({ message: "Upload Successful!!!"});

  } catch (error) {
    /*console.log(error);
    res.send({
      message: error.message,
    });*/
    console.log(error , `happened while uploading pdf to cloud`);
    res.status(404).json({ message: "Could not Upload Pdf"});
  }
};
export default handler;

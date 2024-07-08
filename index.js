import express from "express";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import bcrypt from "bcryptjs";
import session from "express-session";
import cors from "cors";
import { isAuthenticated } from "./utils/Auth.js";
import { db } from "./db/firebase.js";
import multer from "multer";
import handler from "./utils/upload.js";
import bodyParser from "body-parser";
dotenv.config({ path: "./config.env" });
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: "GET,POST,PUT,DELETE",
  })
);

if (!(process.env.NODE_ENV === "development")) {
  app.set("trust proxy", 1); // you need to add this
}

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    expires: new Date(Date.now() + (30 * 24 * 3600 * 1000)), 
    proxy: process.env.NODE_ENV === "production" && true, // this is optional it depend which server you host, i am not sure about Heroku if you need it or not
    cookie: {
      secure: "auto",
      maxAge: 1000 * 60 * 60 * 4, 
      sameSite: process.env.NODE_ENV === "development" ? false : "none", //by default in developement this is false if you're in developement mode
    },
  })
);

app.get("/", (req, res) => {
  console.log("hello from the server");
  res.send("<h1>Hello</h1>");
});

app.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  console.log(
    JSON.stringify(req.body),
    " post req received to the register route   \n"
  );

  //check if user already exists ?
  // Check if user already exists
  const q = query(collection(db, "users"), where("username", "==", username));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return res.status(400).json({ message: "User already exists" });
  }

  //salt and hash the password
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      //store the password , username and email in db

      await setDoc(doc(db, "users", username), {
        username,
        hash,
        email,
        uploadedPdfs: [],
      });

      if (err) {
        console.log(err, "while storing the password \n");
      }

      res.status(200).json({ message: "User Created Successfully" });
    });

    if (err) {
      console.log(err, " happened while salting password ");
    }
  });
});

app.post("/login", async (req, res) => {
  console.log(
    JSON.stringify(req.body),
    " post req received to the login route \n"
  );

  const { username, password } = req.body;

  //load the hash from the database

  //none of the log statements in the code is being logged in the terminal none 
  try {
     const q = query(
       collection(db, "users"),
       where("username", "==", username)
     );

     const querySnapshot = await getDocs(q);

      console.log("Query executed, processing results");
      if (querySnapshot.empty) {
        console.log("No user found with the provided username");
        return res.status(409).json({ message: "User does not exist" });
      }

     querySnapshot.forEach((doc) => {
       console.log(doc.id, " => ", doc.data());

       const validatePassword = bcrypt.compareSync(password, doc.data().hash);

       console.log(validatePassword, " --- is password correct ?");

       console.log(`${doc.data().username} - username ${process.env.websiteAdmin} - admin`)

       if (validatePassword) {
         if (doc.data().username === process.env.websiteAdmin) {
           console.log("User is Admin \n");

           req.session.username = doc.data().username;
           req.session.email = doc.data().email;
           req.session.isAuthenticated = true;
           req.session.isAdmin = true;

           res.status(200).json({
             message: "Authenticated",
             isAuthenticated: true,
             isAdmin: true,
             user: { username: doc.data().username, email: doc.data().email },
           });
         } else {
           console.log("User is not Admin \n");

           req.session.username = doc.data().username;
           req.session.email = doc.data().email;
           req.session.isAuthenticated = true;
           req.session.isAdmin = false;

           res.status(200).json({
             message: "Authenticated",
             isAuthenticated: "true",
             isAdmin: "false",
             user: { username: doc.data().username, email: doc.data().email },
           });
         }
       } else {
         console.log("User dne !");
         res.status(409).json({ message: "User does not exist" });
       }
     });
    
  } catch (error) {
    console.log(error , "error happened in /login route unexpected \n")
  }

 
});



app.post("/loginStatus", (req, res) => {
  console.log(
    ` ${JSON.stringify(req.session)} --- session object in a /loginStatus `
  );

  if (req.session.isAuthenticated) {
    res
      .status(200)
      .json({
        user: { username: req.session.username, email: req.session.email },
        isAdmin: req.session.isAdmin,
      });
  } else {
    res.status(401).json({ message: "Unauthenticated!!!" });
  }
});

app.post("/logout", (req, res) => {
  console.log(
    ` ${JSON.stringify(req.session)} --- session object in a /logout `
  );

  if (req.session.isAuthenticated) {
    req.session.destroy();
    res.status(200).json({ message: "Logged Out!" });
  } else {
    res.status(401).json({ message: "Already Logged Out!!!" });
  }
});

app.post("/uploadPdf", (req, res) => {
  console.log( req.session , `received to /uploadPdfs endpoint`);

    if (req.session.isAuthenticated) {
      handler(req, res);
     
    } else {
      res.status(401).json({ message: "Unauthenticated!!!" });
    }

  
});

app.post("/viewUserUploads", async (req, res) => {


  console.log( req.session , "you have hit /viewUserUploads with a post req \n");


  if (req.session.isAuthenticated) {

    if (req.session.isAdmin) {

      try {
         let userAndPdfArray = [];
         const querySnapshot = await getDocs(collection(db, "users"));

         querySnapshot.forEach((doc) => {
           let tempObject = {};
           tempObject["username"] = doc.data().username;
           tempObject["email"] = doc.data().email;
           tempObject["uploadedPdfs"] = doc.data().uploadedPdfs;
           userAndPdfArray.push(tempObject);
         });

          res.status(200).json({ userAndPdfArray });
        
      } catch (error) {
        console.log( error , " error happened while retrieving all user uploads \n");

        res.status(500).json({ message: "Db Error" , errorMessage: error })
        
      }


    } else {
      res.status(401).json({message: "Unauthorized to view the Resource"})
    }

  } else {

    res.status(401).json({ message: "Unauthenticated"})

  }



});

app.post("/viewYourUploads", async (req, res) => {

  console.log(req.session , `/viewYourUploads hit with post req \n`);

  if ( req.session.isAuthenticated ) {

    const currentUsername = req.session.username;
    const q = query(
      collection(db, "users"),
      where("username", "==" , currentUsername)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("user dne \n");
      res.status(409).json({ message: "User does not exist "});
      
    } else {

      querySnapshot.forEach((doc) => {
        res.status(200).json({ uploadedPdfs: doc.data().uploadedPdfs})
      })

    }


  } else {
    res.status(401).json({ message: "Unauthenticated"})
  }



});

const PORT = process.env.PORT || 6012;

app.listen(PORT, () => {
  console.log(`SERVER listening on ${PORT} \n`);
});

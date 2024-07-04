export const isAuthenticated = ( req ,res , next  ) => {
    console.log(req.session , " in isAuthenticated ")
    if ( req.session.isAuthenticated) {
       return  next();
    } else {

       console.log(`Unauthorized`);
       throw "Not Authenticated";
       res.status(401).send("Unauthorized");
    }

}
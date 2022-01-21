const express = require('express');
const mariadb = require("mariadb");
const { body, validationResult } = require('express-validator');
const port = process.env.PORT || 8080;

const app =  express();
var db;


app.set("view engine","ejs")
//app.use(express.json())
//app.use(express.urlencoded({extended:false}))

const pool = mariadb.createPool(
{
  host:'localhost',
  port:3306,
  user:'v1n3', 
  password:'vineshop',
  database:"MOVIES",
  connectionLimit:1
});

pool.getConnection()
.then(connection =>
{
      db = connection;
      console.log("Connected to "+ db.serverVersion());
})
.catch(e =>{console.log(e)})

// log evvery urls 
app.get("*",(req,res, next)=>{
    console.log(" req for :"+req.url)
    next();
})

//home endpoint, which eventually redirects
app.get("/",(req, res, next)=>
{
    //root will redirect to latest movies
    res.redirect("/movies/0")
})


// new latest movies
app.get("/movies/:page",(req,res)=>
{
    //find total pages, 
    db.query(`select COUNT(id) AS totalMovies from movies;`)
    .then((rows)=>
    {
        // 4 => size of page
        var totalPages = rows[0].totalMovies/4;
        const  page = req.params.page || 0; 
        const q = `WITH latest AS (SELECT *, ROW_NUMBER() OVER(ORDER BY releaseDate DESC) pid FROM movies) SELECT * FROM latest WHERE pid > ${page * 4} LIMIT 4;`

        db.query(q)
        .then((rows)=>
        {  
              res.render("pages/index", {movies : rows, current : page, totalPages:totalPages,
                                        resultType:"Latest Movies",path:"/movies", query:null, error:false})
        })
        .catch((err)=> {res.send(err); console.log(err)})
    })
    .catch(err => console.log(err))
});

/*
+-----+----------+----------+
| code| type     | value    |
+-----+----------+----------+
|   1 | LANGUAGE | Konkani  |
|   2 | LANGUAGE | Hindi    |
|   3 | LANGUAGE | English  |
|   4 | GENRE    | Action   |
|   5 | GENRE    | Comedy   |
|   6 | GENRE    | Drama    |
|   7 | GENRE    | Thriller |
|   8 | GENRE    | Horror   |
|   9 | LANGUAGE | Marathi  |
+-----+----------+----------+
*/

// api endpoint for movies list
app.get("/sortFilter/:page",
//body("genre").trim().escape(),
//body("page").toInt(),
//body("lang").trim().escape(),
//body("sortType").trim().escape(),
(req,res,next)=>
{
        /*
        //send error to client, for invalid data 
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }*/
        var genre = req.query.genre || false;
        var page = req.params.page || 0;
        var language = req.query.lang || false;
        var sortType = req.query.sortType || "releaseDate";
        var query = '?' + req.url.split('?')[1]
        //encode the genre & langauge to number
        switch(genre)
        {
            case "Action": genre = 4; break;
            case "Comedy": genre = 5; break;
            case "Drama": genre = 6; break;
            case "Thriller": genre = 7; break;
            case "Horror": genre = 8;
        }

        switch(language)
        {
            case "Konkani": language = 1; break;
            case "Hindi": language = 2; break;
            case "English": language = 3; break;
            case "Marathi": language = 9; 
        }

        sortType == "Movie Length" ? sortType = "duration": sortType="releaseDate";

        //find total pages
        db.query(`select COUNT(id) AS totalMovies from movies;`)
        .then((rows)=>
        {

            // 4 => size of page
            var totalPages = rows[0].totalMovies/4;

            //when SORT is BASED on language & genre
            if( language && genre )
            {
                db.query(`SELECT *, ROW_NUMBER() OVER(ORDER BY ${sortType} DESC) pid FROM movies WHERE id IN (SELECT mid FROM  (SELECT mid FROM movieCategory WHERE cid = ${language} ) AS lang WHERE mid  IN (SELECT mid FROM movieCategory  WHERE cid = ${genre}))`)
                .then((rows) => {
                    console.log(rows)
                  res.render("pages/index",{movies:rows , current:page, totalPages:totalPages,
                                resultType:"Sort Results",path:"/sortFilter", query:query ,error:false})
                  return;
                })
                .catch((err) => {console.log(err); res.render("pages/index",{movies:err, current:0, 
                                                        resultType:"Error Occured", path:"/sortFilter", query:query ,error:true})})
           
            }

            //when SORT is BASED on language OR genre, any one
            else if( category = (genre || language) )
            {
                db.query(`WITH filter AS (SELECT *, ROW_NUMBER() OVER(ORDER BY ${sortType} DESC) pid FROM movies WHERE id IN (SELECT mid FROM movieCategory WHERE cid = ${category})) select  * from filter  WHERE pid > ${page} LIMIT 4;`)
                .then((rows)=> {
                    console.log(rows)
                    res.render("pages/index",{movies:rows, current: page, totalPages: totalPages,
                                                resultType:"Sort Result",path:"/sortFilter",query:query, error:false})
                    return;
                 })
                .catch((err) => {console.log(err); res.render("pages/index",{movies:err, current:0, 
                                                        resultType:"Error Occured", path:"/sortFilter", query:query ,error:true })})
            }

    })
    .catch(er => console.log(err))

   
    //default case, if anything goes wrong
    //      res.render("pages/index",{movies:0, current: 0, totalPages: 0,
     //                                       resultType:"ERROR OCCURED",path:"/sortFilter", error:true})
    //next()
})

/*
// 404, URL not found
app.get("*",(req,res)=>{
    console.log(" req for :"+req.url)
    res.redirect("/movies/0");
})
*/

app.listen(port,()=>{
    console.log("listening on port: "+port)
})

const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');
const randtoken = require('rand-token');


//bcrypt hashing
const bcrypt = require('bcrypt');
const saltRounds = 10;

let timeOut;
let availableTokens = [];

const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const SEE_OTHER = 303;
const BAD_REQUEST = 400;
const NOT_AUTHORIZED = 401;
const NOT_FOUND = 404;
const SERVER_ERROR = 500;

function serve(port, model, sslPath, timeout) {
  const app = express();
  app.locals.model = model;
  app.locals.port = port;
  app.locals.timeOut = timeout;
  setupRoutes(app);

  https.createServer({
    key: fs.readFileSync(sslPath + '/key.pem'),
    cert: fs.readFileSync(sslPath + '/cert.pem'),
  }, app).listen(port, function(){
    console.log(`listening on port ${port}`);
  });
} 

function setupRoutes(app) {

  app.use(bodyParser.json()); //parse body before operations //specify this to some requests
  app.put('/users/:id', newUser(app));  //not REST but illustrates PUT
  app.get('/users/:id', getJson(app));
  app.use('/users/:id/auth', cacheUser(app));
  app.put('/users/:id/auth', authUser(app));
}


function getUser(app) {
  return function(request, response) {
    const id = request.params.id;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.getUser(id). //call getUser func
        then((results) => response.json(results)).
        //if results none get else update
        catch((err) => {
          if (err.toString().includes("cannot find")){ //if error message includes cannot find return relevant error
            console.error(err)
            response.sendStatus(NOT_FOUND);
          }
          else{
            console.error(err)
            response.sendStatus(SERVER_ERROR);
            }
        });
    }
  };
}

function getJson(app){
  return function(request, response){
    const id = request.params.id;

    let obj = availableTokens.find(o => o.id === id); //confirm object with required id exists in the token array

    let token;

    if (obj){
      if (request.headers.authorization && request.headers.authorization.split(' ')[0] === 'Bearer') { //parse Bearer token
        token = request.headers.authorization.split(' ')[1]; //parse Auth token
        if (obj.authToken === token){ //compare authtoken
          request.app.locals.model.users.getUser(id).
            then(function(user) {
              response.json(user.body)
            }).
            catch((err) => {
              console.error(err);
              response.sendStatus(SERVER_ERROR);
            });
        }
        else{
          response.status(NOT_AUTHORIZED).json({ 
          "status": "ERROR_UNAUTHORIZED",
          "info": "/users/" + id + " requires a bearer authorization header"
          });  
        }
      }
      else{
        response.status(NOT_AUTHORIZED).json({ 
          "status": "ERROR_UNAUTHORIZED",
          "info": "/users/" + id + " requires a bearer authorization header"
        });
      } 
    }
    else{
      response.status(NOT_AUTHORIZED).json({  
        "status": "ERROR_NOT_FOUND",
        "info": "user" + id + "not found",
      });
    }
  }
}

function authUser(app) {
  return function(request, response){
    const id = request.params.id;
    const body = request.body;

    let objSize = Object.keys(body).length; ////-- count propeties in password object //// and grab the first property only
    let firstProperty;
    /////////////////////////--------------------- grab first property since that is supposed to be "pw"
    for (let nm in body){
      firstProperty = nm
    }    
    if (request.user){ //use cache to decide if user with id exists
      if (firstProperty === "pw" && objSize == 1 ){
        request.app.locals.model.users.verifyPassword(id, body[Object.keys(body)[0]]). //compare hash to user given password within body
          then(function(result, error){
            if (result){
              response.status(OK).json({ 
                "status": "OK",
                "authToken": generateToken(id,app.locals.timeOut),
              });
            }
            if (error)
              console.err(error + " rejected")
          }).catch((err) => {
              response.status(NOT_AUTHORIZED).json({ 
                "status": "ERROR_UNAUTHORIZED",
                "info": "/users/" + id + "/auth requires a valid 'pw' password query parameter",
              });
            })
      }
      else{
        response.status(BAD_REQUEST).json({ 
          "status": "BAD_REQUEST",
          "info": "JSON body which must be of the form {\"pw\": PASSWORD }",
        }); 
      }
    }
    else{
      response.status(NOT_FOUND).json({//Not found 
        "status": "ERROR_NOT_FOUND",
        "info": "user" + id + "not found",
      }); 
    } 
     
  }
}

function generateToken(id,timeout){ /// token generator function that handles storing of token in an array and assigning

  let token = randtoken.generate(16);
  let obj = availableTokens.find(o => o.id === id);
    if (obj !== undefined){ // if id already exists just reassign its value
      obj.authToken = token
    }
    else{
      obj = {
        id : id,
        authToken : token
      }
      availableTokens.push(obj) //else push new object
    }

    setTimeout(function(){ //set timeout to the token
      obj.authToken = null;

    }, (timeout)*1000); 

    return token;
}

function newUser(app) {
  return function(request, response) {
    const id = request.params.id;
    const body = request.body;
    if (typeof body === 'undefined' || typeof body !== 'object'){
      console.err('no body');
      response.sendStatus(BAD_REQUEST); 
    }   
    else if (typeof id === 'undefined') {
      console.err('undefined id')
      response.sendStatus(BAD_REQUEST);   
    }
    else {
      const user = response.locals.user;
      //func this above 
      bcrypt.hash(request.query.pw, saltRounds, function(err, hash) { //crypt with saltRounds as 10
        request.app.locals.model.users.newUser(body, id, hash). //call new user function on database
        then(function(result){
          response.append('Location', requestUrl(request) + '/' + id);
          response.status(CREATED).json({ 
            "status": "CREATED",
            "authToken": generateToken(id,app.locals.timeOut), 
          });
            }).
            catch((err) => {
              if(err.toString().includes("duplicate key")){ //if error message is a duplicate key error 
                response.append('Location', requestUrl(request) + '/' + id);
                response.status(SEE_OTHER).json({ 
                  "status" : "EXISTS",
                  "info" : "user " + id + " already exists"
                });
                
              }
              else{
                console.error(err) //server error if initial request fails in the first place
                response.sendStatus(SERVER_ERROR);
              }
            });
      });
 
    }
    
  };
}

function cacheUser(app) {
  return function(request, response, next) {
    const id = request.params.id;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.getUser(id).
        then(function(user) {
          request.user = user;
          next(); //go to the next func from this middleware
        }).
        catch((err) => {
          console.error(err);
          response.sendStatus(SERVER_ERROR);
        });
    }
  }
}

function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}

module.exports = {
  serve: serve
}
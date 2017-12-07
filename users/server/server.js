const express = require('express');
const bodyParser = require('body-parser');


const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const SEE_OTHER = 303;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const SERVER_ERROR = 500;

function serve(port, model) {
  const app = express();
  app.locals.model = model;
  app.locals.port = port;
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

function setupRoutes(app) {
  app.use(bodyParser.json()); //parse body before operations
  app.put('/users/:id/', newUser(app));  //not REST but illustrates PUT
  app.get('/users/:id', getUser(app));
  app.delete('/users/:id', deleteUser(app));
  app.post('/users/:id/', updateUser(app));
}

function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}

function newUser(app) {
  return function(request, response) {
    const id = request.params.id;
    const body = request.body;
    if (typeof id === 'undefined') //typeof body.id === 'undefined' ||
      response.sendStatus(BAD_REQUEST);   
    else {
      const user = response.locals.user;
      request.app.locals.model.users.newUser(body, id). //call new user function on database
        then(function(id) {
        response.append('Location', requestUrl(request) + '/' + id);
        response.sendStatus(CREATED); //
            }).
            catch((err) => {
              if(err.toString().includes("duplicate key")){ //if error message is a duplicate key error 
                request.app.locals.model.users.updateUser(body, id). //call update function with the same values
                then(function(id){
                  response.append('Location', requestUrl(request) + '/' + id);
                  response.sendStatus(NO_CONTENT); //n
                  }).
                  catch((err) => { 
                    console.error(err);
                    response.sendStatus(NOT_FOUND);
                  });
                }
              else{
                console.error(err) //server error if initial request fails in the first place
                response.sendStatus(SERVER_ERROR);
              }
            });
    }
  };
}

function getUser(app) {
  let results;
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

function updateUser(app) { //post kinda dif
  return function(request, response) {
    const body = request.body;
    const id = request.params.id;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.updateUser(body, id).  //update func 
        then(function(id) {
        response.append('Location', requestUrl(request) + '/' + id);
        response.sendStatus(SEE_OTHER);
        }).
        catch((err) => {
          if (err.toString().includes("updated 0")){ //if not updates send relevant error
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
    
function deleteUser(app) {
  return function(request, response) {
    const id = request.params.id; //grab id
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.deleteUser(id).
      	then(() => response.end()).
      	catch((err) => {
      	  if (err.toString().includes("cannot delete")){ //grab cannot delete error
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

module.exports = {
  serve: serve
}
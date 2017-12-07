const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

const USERS = 'users';

function Users(db) {
  this.db = db;
  this.users = db.collection(USERS);
}

Users.prototype.newUser = function(body, id) {
  return this.users.insertOne({_id: new ObjectID(id), body}).
    then(function(results) {
      return new Promise(function(resolve, reject){
        if (results.insertedCount === 1)  
          resolve()  //resolve on successful rinsert
        else
          reject(new Error(`cannot create user ${id}`));
      });    
    });
}

Users.prototype.deleteUser = function(id) {
  return this.users.deleteOne({_id: new ObjectID(id)}).
    then(function(results) {
      return new Promise(function(resolve, reject) {
      	if (results.deletedCount === 1) { //resolve on successful delete confirmed by deletedCount property
      	  resolve();
      	}
      	else {
      	  reject(new Error(`cannot delete user ${id}`));
      	}
      });
    });
}

Users.prototype.getUser = function(id) {
  const searchSpec = { _id: new ObjectID(id)}; //search temp array
  return this.users.find(searchSpec).toArray(). 
    then(function(users) {
      return new Promise(function(resolve, reject) {
        if (users.length === 1) {
          resolve(users[0]); //return array
        }
        else {
          reject(new Error(`cannot find user ${id}`));
        }
      });
    });
}

Users.prototype.updateUser = function(body, id) {
  const replacement = { _id: new ObjectID(id)};  //replacement array
  return this.users.replaceOne(replacement, body). 
    then(function(result) {
      return new Promise(function(resolve, reject) {
        if (result.modifiedCount != 1) { 
          reject(new Error(`updated ${result.modifiedCount} users`));
        }
        else {
          resolve(); //resolve on modify 
        }
      });
    });
}

module.exports = {
  Users: Users,
};

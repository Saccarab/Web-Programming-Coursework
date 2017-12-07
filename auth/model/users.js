const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;
const randtoken = require('rand-token');
const bcrypt = require('bcrypt');
const USERS = 'users';

function Users(db) {
  this.db = db;
  this.users = db.collection(USERS);
}

Users.prototype.newUser = function(body, id, hash) {
  return this.users.insertOne({_id: new ObjectID(id), 
                              body: body,
                                pw: hash
                              }).
    then(function(results) {
      return new Promise(function(resolve, reject){
        if (results.insertedCount === 1)  
          resolve(true)  //resolve on successful rinsert
        else
          reject(new Error(`cannot create user ${id}`));
      });    
    });
}

Users.prototype.verifyPassword = function(id, query_password) {
  const searchSpec = { _id: new ObjectID(id)}; //search temp array
  return this.users.find(searchSpec).toArray(). 
    then(function(users) {
      return new Promise(function(resolve, reject) {
        if (users.length === 1) {
          bcrypt.compare(query_password, users[0].pw, function(err, res) { //compare hash to text pw
                //return true if ok!
              if (res){
                resolve(true);
              }
              else {
                reject(new Error(`cannot verify password on user ${id}`));
              }
          });
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

module.exports = {
  Users: Users,
};

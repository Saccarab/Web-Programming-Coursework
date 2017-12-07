'use strict';

const assert = require('assert');
const mongo = require('mongodb').MongoClient;


//used to build a mapper function for the update op.  Returns a
//function F = arg => body.  Subsequently, the invocation,
//F.call(null, value) can be used to map value to its updated value.
function newMapper(arg, body) {
  return new (Function.prototype.bind.call(Function, Function, arg, body));
}

//print msg on stderr and exit.
function error(msg) {
  console.error(msg);
  process.exit(1);
}

//export error() so that it can be used externally.
module.exports.error = error;

//try return
//auxiliary functions; break up your code into small functions with
//well-defined responsibilities.

//perform op on mongo db specified by url.
function dbOp(url, op) {

	var data = JSON.parse(op)
	var argsArray = []; 
	var argsAssign = []
	argsArray = data.args
	var size;

	if (argsArray === undefined){ //Pass null to read function when args is empty since it doesnt work when you pass undefined
		argsArray = [] //reassign 
		size = 1 //default value to use on for loops to do the read and delete operations
	}
	else
		size = Object.keys(data.args).length; //set for loop size !could just use for.each but w/e

	var operation = data.op

	if( Object.prototype.toString.call(argsArray) !== '[object Array]' ) { //check if args is passed inside an array or just a single object
		argsAssign.push(data.args)										   //if its a single objects put it inside an array
		argsArray = argsAssign
	}

	console.log(operation + " operation called")

	mongo.connect(url, function(err, db) {

		  var collect = data.collection
		  console.log("Connected correctly to server.");

		  switch(operation) {
			case "create":
				db.collection(collect, function(err, space){
					if (err)
						throw err;
					else 
						space.insertMany(data.args);
				
				});
				db.close();
				break;

			case "read":
				for (var p = 0 ; p < size ; p++){
					db.collection(collect).find(argsArray[p]).toArray()
						.then(function(value, err){
							if (err)
								throw err;
							else {
								 // ignore empty "[]" strings
								console.log(value);
							}
						});
				}
				db.close();
				break;

			case "delete":

				for (var d = 0 ; d < size ; d++){
					db.collection(collect, function(err, result){
						result.remove(argsArray[d])
					});
				}
				db.close();
				break;

			case "update":
				//if fn is existing!!!
				var mapFunc = newMapper(data.fn[0], data.fn[1])

				var read;

				db.collection(collect).find().toArray()
					.then(function(value, err){
						if (err)
							throw err; //could specify each error with a console.log of its own in a bigger scale program
						else{
							// if (value.length > 2){ // ignore "[]" string
							read = value;	
							read.forEach(function(element){ //read existing db before calling mapper fnc on them
								db.collection(collect).update(element, mapFunc.call(null, element, function(err, result){
									if (err)
										throw err;
									//cosole.log result	
									db.close();
								}));
							});
						
						db.close();
				}});
				break;
			}

		  assert.equal(null, err);
		  
	});

}

//make main dbOp() function available externally
module.exports.dbOp = dbOp;


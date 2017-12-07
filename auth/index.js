#!/usr/bin/env node

const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const process = require('process');

const option = require('./options')
const model = require('./model/model');
const server = require('./server/server');
const users = require('./model/users');

const DB_URL = 'mongodb://localhost:27017/users';

const port = option.options.port;
const timeout = option.options.authTimeout;
const sslDir = option.options.sslDir;


mongo.connect(DB_URL).
  // then((db) => products.initProducts(db)).
  then(function(db) {
    const model1 = new model.Model(db);
    server.serve(port, model1, sslDir, timeout);
    // console.log("succ").///
    //db.close();
  }).
  catch((e) => console.error(e));
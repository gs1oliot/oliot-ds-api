var MongoClient = require('mongodb').MongoClient
  , assert = require('assert')
  , config = require('../conf.json');

// Connection URL
var url = 'mongodb://'+config.MONGO_ADDRESS+'/discoveryservice'


module.exports.insertData=function(data, callback) {
	// Use connect method to connect to the Server
	MongoClient.connect(url, function(err, db) {
		if(err)
			return callback(err);
		console.log("Connected correctly to server");
		// Get the documents collection
		var collection = db.collection('documents');
		// Insert some documents
		collection.ensureIndex({location: "2dsphere"}, function(err, result) {
		    if(err) 
		    	return callback(err);
			console.log(data);
		    collection.insert(data, function(err, result){
				if(err) 
					return callback(err);
				if(result.result.n!=1)
					return callback("result.n is not 1");
				if(result.ops.length!=1)
					return callback("result.ops.length is not 1");
				return callback(null, {result:"success"});
			});
		});
	});
}

module.exports.getData=function(gs1code, from, to, where, range, callback) {
	// Use connect method to connect to the Server
	MongoClient.connect(url, function(err, db) {
		if(err)
			return callback(err);
		console.log("Connected correctly to server");
		// Get the documents collection
		var collection = db.collection('documents');
		var findQuery = {
			"gs1code":gs1code
		};
		if(where && range){
			findQuery["location"] = {
				$near: {
					$geometry: {
						type: "Point",
						coordinates: where
					},
					$maxDistance: range
				}
			};
		}
		if(from && to){
			findQuery["timestamp"] = {
				$gt: new Date(from),
				$lt: new Date(to)
			}
		}
		console.log(findQuery);
		collection.find(findQuery).toArray(function(err, docs) {
			if(err) 
				return callback(err);
			return callback(null, docs);
		});
	});
}
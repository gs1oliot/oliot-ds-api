var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/discveryservice';


module.exports.insertData=function(data, callback) {
	// Use connect method to connect to the Server
	MongoClient.connect(url, function(err, db) {
		if(err)
			return callback(err);
		console.log("Connected correctly to server");
		// Get the documents collection
		var collection = db.collection('documents');
		// Insert some documents
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
}
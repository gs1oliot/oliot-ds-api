var bodyParser = require('body-parser'),
	oauthserver = require('oauth2-server');
	//pg = require('pg'),
	md5 =  require('md5'),
	auth = require('./models/auth'),
	User = require('./models/user'),
	Thing = require('./models/thing'),
	//connString = "postgres://postgres:resl18519@localhost:5433/discovery_service"


exports.configure = function (app) {	
	 
	app.use(bodyParser.urlencoded({ extended: true }));
	 
	app.use(bodyParser.json());
	 
	app.oauth = oauthserver({
	  model: require('./models/auth'), 
	  grants: ['password'],
	  debug: true
	});

	app.all('/oauth/token', app.oauth.grant()); 
	
	app.use(app.oauth.errorHandler());
	
	app.del('/thing', app.oauth.authorise(), function (req, res){
		
		Thing.delall(function(err){
			if(err) return err;
			
		});
		
	});
	
	app.del('/thing/:gs1code', app.oauth.authorise(), function (req, res){
		Thing.get(req.params.gs1code, function (err, thing){
			if (err) return next(err);
			thing.del(function(err){
				if (err) 
					return res.send({error: err});
				res.send({result: "success"});
			});
		})
	});

	app.post('/user/:username/friendship', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);

		User.get(req.params.username, function (err1, user) {
			if(err1) return res.send({ error : err1});
			User.get(req.body.username, function (err2, other) {
				if(err2) return res.send({error : err2});
				user.unfamilyship(other, function (err3){
					if(err3) return res.send({error : err3});
					user.friendship(other, function (err4){
						if(err4) return res.send({error : err3});
				    	res.send({result: "success"});
					});
				});
			});
		});
	});
	
	app.post('/user/:username/unfriendship', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);

		User.get(req.params.username, function (err1, user) {
			if(err1) return res.send({ error : err1});
			User.get(req.body.username, function (err2, other) {
				if(err2) return res.send({error : err2});
				user.unfriendship(other, function (err3){
					if(err3) return res.send({error : err3});
			    	res.send({result: "success"});
				});
			});
		});
	});
	

	app.post('/user/:username/familyship', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);

		User.get(req.params.username, function (err1, user) {
			if(err1) return res.send({ error : err1});
			User.get(req.body.username, function (err2, other) {
				if(err2) return res.send({error : err2});
				user.unfriendship(other, function (err3){
					if(err3) return res.send({error : err3});
					user.familyship(other, function (err4){
						if(err4) return res.send({error : err4});
				    	res.send({result: "success"});
					});
				});
			});
		});
	});
	
	app.post('/user/:username/unfamilyship', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);

		User.get(req.params.username, function (err1, user) {
			if(err1) return res.send({ error : err1});
			User.get(req.body.username, function (err2, other) {
				if(err2) return res.send({error : err2});
				user.unfamilyship(other, function (err3){
					if(err3) return res.send({error : err3});
			    	res.send({result: "success"});
				});
			});
		});
	});
	
	
	
	
	app.get('/user/:username/ownership', app.oauth.authorise(), function (req, res){
	    User.get(req.params.username, function (err, user) {
	        // TODO: Gracefully "no such user" error. E.g. 404 page.
	        if (err) return next(err);
	        // TODO: Also fetch and show followers? (Not just follow*ing*.)
	        user.getOwnership(function (err, ownerships) {
	        	 if (err) 
	        		 return res.send({error: err});
	        	 //if (!ownerships)
	        	 //	 return res.send({ownerships:"empty"});
	        	 //var results = {ownerships:ownerships};
	        	 res.send({ownerships:ownerships});
	        });
	    });
	});
	
	app.post('/user/:username/ownership', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);
		Thing.create({'gs1code':req.body.gs1code}, function(err1, thing){
			if(err1){
				res.send({ error : err1});
				return;
			}
			User.get(req.params.username, function (err2, user) {
		        if (err2) return res.send({ error : err2});
				user.ownership(thing, function(err3){
					if(err3) return res.send({ error : err3});
			    	res.send({result: "success"});
				});
			});
		});
	});
	
	
	app.get('/user/:username/othership', app.oauth.authorise(), function (req, res){
	    User.get(req.params.username, function (err, user) {
	        // TODO: Gracefully "no such user" error. E.g. 404 page.
	        if (err) return next(err);
	        // TODO: Also fetch and show followers? (Not just follow*ing*.)
	        user.getFriendFamilyAndOthers(function (err, friendships, familyships, others) {
	        	 if (err) 
	        		 return res.send({error: err});
	        	 //if (!ownerships)
	        	 //	 return res.send({ownerships:"empty"});
	        	 //var results = {ownerships:ownerships};
	        	 var results = {
	        			 friendships: friendships,
	        			 familyships: familyships,
	        			 others: others
	        	 }
	        	 res.send(results);
	        });
	    });
	});
	

	app.post('/thing/:gs1code/friendship', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);

		Thing.get(req.params.gs1code, function (err1, thing) {
			if(err1) return res.send({ error : err1});
			User.get(req.body.username, function (err2, other) {
				if(err2) return res.send({error : err2});
				thing.unfamilyship(other, function (err3) {
					if(err3) return res.send({error : err3});
					thing.friendship(other, function (err4){
						if(err4) return res.send({error : err4});
				    	res.send({result: "success"});
					});
					
				});
			});
		});
	});
	
	app.post('/thing/:gs1code/unfriendship', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);

		Thing.get(req.params.gs1code, function (err1, thing) {
			if(err1) return res.send({ error : err1});
			User.get(req.body.username, function (err2, other) {
				if(err2) return res.send({error : err2});
				thing.unfriendship(other, function (err3){
					if(err3) return res.send({error : err3});
			    	res.send({result: "success"});
				});
			});
		});
	});
	

	app.post('/thing/:gs1code/familyship', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);

		Thing.get(req.params.gs1code, function (err1, thing) {
			if(err1) return res.send({ error : err1});
			User.get(req.body.username, function (err2, other) {
				if(err2) return res.send({error : err2});
				thing.unfriendship(other, function (err3){
					if(err3) return res.send({error : err3});
					thing.familyship(other, function (err4){
						if(err4) return res.send({error : err4});
				    	res.send({result: "success"});
					});
				});
			});
		});
	});
	
	app.post('/thing/:gs1code/unfamilyship', app.oauth.authorise(), function (req, res){
		//console.log("aaa");
		//console.log(req.body.gs1code);

		Thing.get(req.params.gs1code, function (err1, thing) {
			if(err1) return res.send({ error : err1});
			User.get(req.body.username, function (err2, other) {
				if(err2) return res.send({error : err2});
				thing.unfamilyship(other, function (err3){
					if(err3) return res.send({error : err3});
			    	res.send({result: "success"});
				});
			});
		});
	});
	
	
	
	
	app.get('/thing/:gs1code/othership', app.oauth.authorise(), function (req, res){
	    Thing.get(req.params.gs1code, function (err, thing) {
	        // TODO: Gracefully "no such user" error. E.g. 404 page.
	        if (err) return next(err);
	        // TODO: Also fetch and show followers? (Not just follow*ing*.)
	        thing.getFriendFamilyAndOthers(function (err, friendships, familyships, others) {
	        	 if (err) 
	        		 return res.send({error: err});
	        	 //if (!ownerships)
	        	 //	 return res.send({ownerships:"empty"});
	        	 //var results = {ownerships:ownerships};
	        	 var results = {
	        			 friendships: friendships,
	        			 familyships: familyships,
	        			 others: others
	        	 }
	        	 res.send(results);
	        });
	    });
	});
	
	
	app.post('/signup', function (req, res){
		
		auth.getUserbyUsername(req.body.username, function(err1, result){
			if(err1 || result){
				res.send(err1? { error : err1 }: { error : "user already exists"});
				return;
			} 
			auth.saveUser(req.body.username, req.body.password, function(err2){
				if(err2){
					res.send({ error : err2 });
					return;
				}
				auth.saveOauthClient(req.body.username.replace(/\./gi,"").replace(/@/gi,""), req.body.password, '/', function(err3, result){
					if(err3){
						res.send({ error : err3 });
						return;
					}
					User.create({'username':req.body.username}, function(err4, user){
		    			if(err4){
							res.send({ error : err4 });
							return;
		    			}
				    	res.send({result: "success"});
		    		});
				});
			});
		});
		
		/*pg.connect(connString, function (err, client, done) {
			if (err){
				res.send('{ error:'+ err +'}');
				return console.error('[psql] connection error',err);
			}
			client.query('SELECT id FROM users' +
			'WHERE ($1)', [req.body.username],
			function (err1, result1){
				if (err1){
					res.send('{ error:'+ err1 +'}');
					return console.error('[psql] query error1',err);
				}
			    client.query('INSERT INTO users(id, username, password) ' +
				'VALUES (gen_random_uuid(), $1, md($2))', [req.body.username, req.body.password],
				function (err2, result2) {
			    	if (err2){
			    		res.send('{ error:'+ err2 +'}');
						return console.error('[psql] query error2',err);
			    	}
			    	done();
			    	res.send({"result": "success"});
			    });
			});
		});*/
	});
	
};
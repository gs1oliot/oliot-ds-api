var bodyParser = require('body-parser'),
	oauthserver = require('oauth2-server');
	pg = require('pg'),
	md5 =  require('md5'),
	connString = "postgres://postgres:resl18519@localhost:5433/discovery_service"


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
	
	app.post('/signup', function (req, res){
		pg.connect(connString, function (err, client, done) {
			if (err){
				res.send('{ error:'+ err +'}');
				return callback(err);
			}
		    client.query('INSERT INTO users(id, username, password) ' +
		    'VALUES (gen_random_uuid(), $1, $2)', [req.username, req.password],
		    function (err, result) {
		    	if (err){
					res.send('{ error:'+ err +'}');
		    		return callback(err);
		    	}
		    	done();
		    	res.send('{result:'+result+'}');
		    });
		});
	});
	
};
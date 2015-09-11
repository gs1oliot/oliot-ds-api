// user.js
// User model logic.

var neo4j = require('neo4j');
var errors = require('./errors');
var Thing = require('./thing')

var db = new neo4j.GraphDatabase({
    // Support specifying database info via environment variables,
    // but assume Neo4j installation defaults.
    url: process.env['NEO4J_URL'] || process.env['GRAPHENEDB_URL'] ||
        'http://neo4j:resl18519@localhost:7474',
    auth: process.env['NEO4J_AUTH'],
});

// Private constructor:

var User = module.exports = function User(_node) {
    // All we'll really store is the node; the rest of our properties will be
    // derivable or just pass-through properties (see below).
    this._node = _node;
}

// Public constants:

User.VALIDATION_INFO = {
    'username': {
        required: true,
        minLength: 2,
        maxLength: 25,
        pattern: /^[A-Za-z0-9_@.]+$/,
        message: '2-25 characters; letters, numbers, underscores, \'.\', and \'@\' only.'
    },
};

// Public instance properties:

// The user's username, e.g. 'aseemk'.
Object.defineProperty(User.prototype, 'username', {
    get: function () { return this._node.properties['username']; }
});

// Private helpers:

// Takes the given caller-provided properties, selects only known ones,
// validates them, and returns the known subset.
// By default, only validates properties that are present.
// (This allows `User.prototype.patch` to not require any.)
// You can pass `true` for `required` to validate that all required properties
// are present too. (Useful for `User.create`.)
function validate(props, required) {
    var safeProps = {};

    for (var prop in User.VALIDATION_INFO) {
        var val = props[prop];
        validateProp(prop, val, required);
        safeProps[prop] = val;
    }

    return safeProps;
}

// Validates the given property based on the validation info above.
// By default, ignores null/undefined/empty values, but you can pass `true` for
// the `required` param to enforce that any required properties are present.
function validateProp(prop, val, required) {
    var info = User.VALIDATION_INFO[prop];
    var message = info.message;

    if (!val) {
        if (info.required && required) {
            throw new errors.ValidationError(
                'Missing ' + prop + ' (required).');
        } else {
            return;
        }
    }

    if (info.minLength && val.length < info.minLength) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (too short). Requirements: ' + message);
    }

    if (info.maxLength && val.length > info.maxLength) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (too long). Requirements: ' + message);
    }

    if (info.pattern && !info.pattern.test(val)) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (format). Requirements: ' + message);
    }
}

function isConstraintViolation(err) {
    return err instanceof neo4j.ClientError &&
        err.neo4j.code === 'Neo.ClientError.Schema.ConstraintViolation';
}

// Public instance methods:

// Atomically updates this user, both locally and remotely in the db, with the
// given property updates.
User.prototype.patch = function (props, callback) {
    var safeProps = validate(props);

    var query = [
        'MATCH (user:User {username: {username}})',
        'SET user += {props}',
        'RETURN user',
    ].join('\n');

    var params = {
        username: this.username,
        props: safeProps,
    };

    var self = this;

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (isConstraintViolation(err)) {
            // TODO: This assumes username is the only relevant constraint.
            // We could parse the constraint property out of the error message,
            // but it'd be nicer if Neo4j returned this data semantically.
            // Alternately, we could tweak our query to explicitly check first
            // whether the username is taken or not.
            err = new errors.ValidationError(
                'The username ‘' + props.username + '’ is taken.');
        }
        if (err) return callback(err);

        if (!results.length) {
            err = new Error('User has been deleted! Username: ' + self.username);
            return callback(err);
        }

        // Update our node with this updated+latest data from the server:
        self._node = results[0]['user'];

        callback(null);
    });
};

User.prototype.del = function (callback) {
    // Use a Cypher query to delete both this user and his/her following
    // relationships in one query and one network request:
    // (Note that this'll still fail if there are any relationships attached
    // of any other types, which is good because we don't expect any.)
    var query = [
        'MATCH (user:User {username: {username}})',
        'OPTIONAL MATCH (user) -[rel1:friendship]- (other)',
        'OPTIONAL MATCH (user) -[rel1:familyship]- (other)',
        'DELETE user, rel1, rel2',
    ].join('\n')

    var params = {
        username: this.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

User.prototype.friendship = function (other, callback) {
    var query = [
        'MATCH (user:User {username: {thisUsername}})',
        'MATCH (other:User {username: {otherUsername}})',
        'MERGE (user) -[rel:friendship]-> (other)',
    ].join('\n')

    var params = {
        thisUsername: this.username,
        otherUsername: other.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

User.prototype.unfriendship = function (other, callback) {
    var query = [
        'MATCH (user:User {username: {thisUsername}})',
        'MATCH (other:User {username: {otherUsername}})',
        'MATCH (user) -[rel:friendship]-> (other)',
        'DELETE rel',
    ].join('\n')

    var params = {
        thisUsername: this.username,
        otherUsername: other.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};


User.prototype.familyship = function (other, callback) {
    var query = [
        'MATCH (user:User {username: {thisUsername}})',
        'MATCH (other:User {username: {otherUsername}})',
        'MERGE (user) -[rel:familyship]-> (other)',
    ].join('\n')

    var params = {
        thisUsername: this.username,
        otherUsername: other.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

User.prototype.unfamilyship = function (other, callback) {
    var query = [
        'MATCH (user:User {username: {thisUsername}})',
        'MATCH (other:User {username: {otherUsername}})',
        'MATCH (user) -[rel:familyship]-> (other)',
        'DELETE rel',
    ].join('\n')

    var params = {
        thisUsername: this.username,
        otherUsername: other.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};


User.prototype.ownership = function (other, callback) {
    var query = [
        'MATCH (user:User {username: {thisUsername}})',
        'MATCH (other:Thing {gs1code: {otherGs1code}})',
        'MERGE (user) -[rel:ownership]-> (other)',
    ].join('\n')

    var params = {
        thisUsername: this.username,
        otherGs1code: other.gs1code,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

User.prototype.unownership = function (other, callback) {
    var query = [
        'MATCH (user:User {username: {thisUsername}})',
        'MATCH (other:Thing {gs1code: {otherGs1code}})',
        'MATCH (user) -[rel:ownership]-> (other)',
        'DELETE rel',
    ].join('\n')

    var params = {
        thisUsername: this.username,
        otherGs1code: other.gs1code,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};



// Calls callback w/ (err, following, others), where following is an array of
// users this user follows, and others is all other users minus him/herself.
User.prototype.getFriendFamilyAndOthers = function (callback) {
    // Query all users and whether we follow each one or not:
    var query = [
        'MATCH (user:User {username: {thisUsername}})',
        'MATCH (other:User)',
        'OPTIONAL MATCH (user) -[rel1:friendship]-> (other)',
        'OPTIONAL MATCH (user) -[rel2:familyship]-> (other)',
        'RETURN other, COUNT(rel1), COUNT(rel2)', // COUNT(rel) is a hack for 1 or 0
    ].join('\n')

    var params = {
        thisUsername: this.username,
    };

    var user = this;
    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);

        var friendships = [];
        var familyships = [];
        var others = [];

        for (var i = 0; i < results.length; i++) {
            var other = new User(results[i]['other']);
            var friends = results[i]['COUNT(rel1)'];
            var familys = results[i]['COUNT(rel2)'];

            if (user.username === other.username) {
                continue;
            } else if (friends) {
                friendships.push(other.username);
            } else if (familys) {
                familyships.push(other.username);
            } else {
                others.push(other.username);
            }
        }

        callback(null, friendships, familyships, others);
    });
};


User.prototype.getOwnership = function (callback) {

    // Query all users and whether we follow each one or not:
    var query = [
        'MATCH (user:User {username: {thisUsername}})-[:ownership]->(thing:Thing)',
        'RETURN thing', // COUNT(rel) is a hack for 1 or 0
    ].join('\n')

    var params = {
        thisUsername: this.username,
    };

    var user = this;
    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);

        var ownerships = [];

        for (var i = 0; i < results.length; i++) {
            //, function(err,thing){
            //	if(thing)
        	var gs1code = Thing.getGs1code(results[i]['thing']);
        	if(!gs1code)
        		return callback("Thing exists, but its gs1code does not exist");
        	ownerships.push(gs1code);
        	//var things = new thing.Thing(results[i]['thing']);
            //ownerships.push(things.gs1code);
        	//var users = new User(results[i]['thing']);
        	//ownerships.push(users.username);
        }
        //if (ownerships.length == 0)
        //	callback(null,null);
        callback(null, ownerships);
    });
};


// Static methods:

User.get = function (username, callback) {
    var query = [
        'MATCH (user:User {username: {username}})',
        'RETURN user',
    ].join('\n')

    var params = {
        username: username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);
        if (!results.length) {
            err = new Error('No such user with username: ' + username);
            return callback(err);
        }
        var user = new User(results[0]['user']);
        callback(null, user);
    });
};


User.getUsername = function (_node) {
	
	var user = new User(_node);
	if(!user.username){
		return null;
	}
	return user.username;
};


User.getAll = function (callback) {
    var query = [
        'MATCH (user:User)',
        'RETURN user',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, results) {
        if (err) return callback(err);
        var users = results.map(function (result) {
            return new User(result['user']);
        });
        callback(null, users);
    });
};

// Creates the user and persists (saves) it to the db, incl. indexing it:
User.create = function (props, callback) {
    var query = [
        'CREATE (user:User {props})',
        'RETURN user',
    ].join('\n');

    var params = {
        props: validate(props)
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (isConstraintViolation(err)) {
            // TODO: This assumes username is the only relevant constraint.
            // We could parse the constraint property out of the error message,
            // but it'd be nicer if Neo4j returned this data semantically.
            // Alternately, we could tweak our query to explicitly check first
            // whether the username is taken or not.
            err = new errors.ValidationError(
                'The username ‘' + props.username + '’ is taken.');
        }
        if (err) return callback(err);
        var user = new User(results[0]['user']);
        callback(null, user);
    });
};

// Static initialization:

// Register our unique username constraint.
// TODO: This is done async'ly (fire and forget) here for simplicity,
// but this would be better as a formal schema migration script or similar.
db.createConstraint({
    label: 'User',
    property: 'username',
}, function (err, constraint) {
    if (err) throw err;     // Failing fast for now, by crash the application.
    if (constraint) {
        console.log('(Registered unique usernames constraint.)');
    } else {
        // Constraint already present; no need to log anything.
    }
})

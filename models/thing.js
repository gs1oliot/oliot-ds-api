// thing.js
// Thing model logic.

var neo4j = require('neo4j');
var errors = require('./errors');
var User = require('./user');
var config = require('../conf.json');
var neo4j_url = "http://"+config.NEO_ID+":"+config.NEO_PW+"@"+config.NEO_ADDRESS;

var db = new neo4j.GraphDatabase({
    // Support specifying database info via environment variables,
    // but assume Neo4j installation defaults.
    url: process.env['NEO4J_URL'] || process.env['GRAPHENEDB_URL'] ||
        neo4j_url,
    auth: process.env['NEO4J_AUTH'],
});

// Private constructor:

var Thing = module.exports = function Thing(_node) {
    // All we'll really store is the node; the rest of our properties will be
    // derivable or just pass-through properties (see below).
    this._node = _node;
}

// Public constants:

Thing.VALIDATION_INFO = {
    'gs1code': {
        required: true,
        minLength: 2,
        maxLength: 25,
        pattern: /^[a-z0-9.]+$/,
        message: '2-25 characters; letters, numbers, and \'.\' only.'
    },
};

// Public instance properties:

// The thing's gs1code, e.g. 'aseemk'.
Object.defineProperty(Thing.prototype, 'gs1code', {
    get: function () { return this._node.properties['gs1code']; }
});

// Private helpers:

// Takes the given caller-provided properties, selects only known ones,
// validates them, and returns the known subset.
// By default, only validates properties that are present.
// (This allows `Thing.prototype.patch` to not require any.)
// You can pass `true` for `required` to validate that all required properties
// are present too. (Useful for `Thing.create`.)
function validate(props, required) {
    var safeProps = {};

    for (var prop in Thing.VALIDATION_INFO) {
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
    var info = Thing.VALIDATION_INFO[prop];
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

// Atomically updates this thing, both locally and remotely in the db, with the
// given property updates.
Thing.prototype.patch = function (props, callback) {
    var safeProps = validate(props);

    var query = [
        'MATCH (thing:Thing {gs1code: {gs1code}})',
        'SET thing += {props}',
        'RETURN thing',
    ].join('\n');

    var params = {
        gs1code: this.gs1code,
        props: safeProps,
    };

    var self = this;

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (isConstraintViolation(err)) {
            // TODO: This assumes gs1code is the only relevant constraint.
            // We could parse the constraint property out of the error message,
            // but it'd be nicer if Neo4j returned this data semantically.
            // Alternately, we could tweak our query to explicitly check first
            // whether the gs1code is taken or not.
            err = new errors.ValidationError(
                'The gs1code ‘' + props.gs1code + '’ is taken.');
        }
        if (err) return callback(err);

        if (!results.length) {
            err = new Error('Thing has been deleted! Gs1code: ' + self.gs1code);
            return callback(err);
        }

        // Update our node with this updated+latest data from the server:
        self._node = results[0]['thing'];

        callback(null);
    });
};

Thing.prototype.del = function (callback) {
    // Use a Cypher query to delete both this thing and his/her following
    // relationships in one query and one network request:
    // (Note that this'll still fail if there are any relationships attached
    // of any other types, which is good because we don't expect any.)
    var query = [
                 'MATCH (thing:Thing {gs1code: {gs1code}})',
                 'OPTIONAL MATCH (thing)-[r]-()',
                 'DELETE thing, r',
    ].join('\n')

    var params = {
        gs1code: this.gs1code,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};





Thing.prototype.friendship = function (other, callback) {
    var query = [
        'MATCH (thing:Thing {gs1code: {thisGs1code}})',
        'MATCH (other:User {username: {otherUsername}})',
        'MERGE (thing) -[rel:friendship]-> (other)',
    ].join('\n')

    var params = {
        thisGs1code: this.gs1code,
        otherUsername: other.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};


Thing.prototype.unfriendship = function (other, callback) {
    var query = [
        'MATCH (thing:Thing {gs1code: {thisGs1code}})',
        'MATCH (other:User {username: {otherUsername}})',
        'MATCH (thing) -[rel:friendship]-> (other)',
        'DELETE rel',
    ].join('\n')

    var params = {
        thisGs1code: this.gs1code,
        otherUsername: other.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};


Thing.prototype.familyship = function (other, callback) {
    var query = [
        'MATCH (thing:Thing {gs1code: {thisGs1code}})',
        'MATCH (other:User {username: {otherUsername}})',
        'MERGE (thing) -[rel:familyship]-> (other)',
    ].join('\n')

    var params = {
        thisGs1code: this.gs1code,
        otherUsername: other.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

Thing.prototype.unfamilyship = function (other, callback) {
    var query = [
        'MATCH (thing:Thing {gs1code: {thisGs1code}})',
        'MATCH (other:User {username: {otherUsername}})',
        'MATCH (thing) -[rel:familyship]-> (other)',
        'DELETE rel',
    ].join('\n')

    var params = {
        thisGs1code: this.gs1code,
        otherUsername: other.username,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};



// Calls callback w/ (err, following, others), where following is an array of
// things this thing follows, and others is all other things minus him/herself.
Thing.prototype.getFriendFamilyAndOthers = function (callback) {
    // Query all things and whether we follow each one or not:
    var query = [
        'MATCH (thing:Thing {gs1code: {thisGs1code}})',
        'MATCH (other:User)',
        'OPTIONAL MATCH (thing) -[rel1:friendship]-> (other)',
        'OPTIONAL MATCH (thing) -[rel2:familyship]-> (other)',
        'OPTIONAL MATCH (thing) <-[rel3:ownership]- (other)',
        'RETURN other.username, COUNT(rel1), COUNT(rel2), COUNT(rel3)', // COUNT(rel) is a hack for 1 or 0
    ].join('\n')

    var params = {
        thisGs1code: this.gs1code,
    };

    //var thing = this;
    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);

        var friendList = [];
        var familyList = [];
        var others = [];

        for (var i = 0; i < results.length; i++) {
        	console.log(results);
            var username = results[i]['other.username']; //to be changed later
            var friends = results[i]['COUNT(rel1)'];
            var familys = results[i]['COUNT(rel2)'];
            var owner = results[i]['COUNT(rel3)'];

            if (owner) {
                continue;
            } else if (friends) {
                friendList.push(username);
            } else if (familys) {
                familyList.push(username);
            } else {
                others.push(username);
            }
        }

        callback(null, friendList, familyList, others);
    });
};

// Static methods:

Thing.get = function (gs1code, callback) {
    var query = [
        'MATCH (thing:Thing {gs1code: {gs1code}})',
        'RETURN thing',
    ].join('\n')

    var params = {
        gs1code: gs1code,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);
        if (!results.length) {
            err = new Error('No such thing with gs1code: ' + gs1code);
            return callback(err);
        }
        var thing = new Thing(results[0]['thing']);
        callback(null, thing);
    });
};



Thing.getGs1code = function (_node) {
	
	var thing = new Thing(_node);
	if(!thing.gs1code){
		return null;
	}
	return thing.gs1code;
};


Thing.getAll = function (callback) {
    var query = [
        'MATCH (thing:Thing)',
        'RETURN thing',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, results) {
        if (err) return callback(err);
        var things = results.map(function (result) {
            return new Thing(result['thing']);
        });
        callback(null, things);
    });
};

// Creates the thing and persists (saves) it to the db, incl. indexing it:
Thing.create = function (props, callback) {
    var query = [
        'CREATE (thing:Thing {props})',
        'RETURN thing',
    ].join('\n');

    var params = {
        props: validate(props)
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (isConstraintViolation(err)) {
            // TODO: This assumes gs1code is the only relevant constraint.
            // We could parse the constraint property out of the error message,
            // but it'd be nicer if Neo4j returned this data semantically.
            // Alternately, we could tweak our query to explicitly check first
            // whether the gs1code is taken or not.
            err = new errors.ValidationError(
                'The gs1code ‘' + props.gs1code + '’ is taken.');
        }
        if (err) return callback(err);
        var thing = new Thing(results[0]['thing']);
        callback(null, thing);
    });
};


Thing.delall = function (callback) {
    // Use a Cypher query to delete both this thing and his/her following
    // relationships in one query and one network request:
    // (Note that this'll still fail if there are any relationships attached
    // of any other types, which is good because we don't expect any.)
    var query = [
        'MATCH (thing:Thing)',
        'OPTIONAL MATCH (thing)-[r]-()',
        'DELETE thing, r',
    ].join('\n')

    var params = {
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};


// Static initialization:

// Register our unique gs1code constraint.
// TODO: This is done async'ly (fire and forget) here for simplicity,
// but this would be better as a formal schema migration script or similar.
db.createConstraint({
    label: 'Thing',
    property: 'gs1code',
}, function (err, constraint) {
    if (err) throw err;     // Failing fast for now, by crash the application.
    if (constraint) {
        console.log('(Registered unique gs1codes constraint.)');
    } else {
        // Constraint already present; no need to log anything.
    }
})

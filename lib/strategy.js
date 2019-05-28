/**
 * Dependencies
 */
var OAuth2Strategy      = require('passport-oauth2')
  , InternalOAuthError  = require('passport-oauth2').InternalOAuthError
  , util                = require('util');

/**
 * `Strategy` constructor.
 *
 * The Discord authentication strategy authenticates requests by delegating to
 * Discord via the OAuth2.0 protocol
 *
 * Applications must supply a `verify` callback which accepts an `accessToken`,
 * `refreshToken` and service-specific `profile`, and then calls the `cb`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid. If an exception occured, `err` should be set.
 *
 * Options:
 *   - `clientID`       OAuth ID to discord
 *   - `clientSecret`   OAuth Secret to verify client to discord
 *   - `callbackURL`    URL that discord will redirect to after auth
 *   - `scope`          Array of permission scopes to request
 *                      Check the official documentation for valid scopes to pass as an array.
 * 
 * @constructor
 * @param {object} options
 * @param {function} verify
 * @access public
 */
function Strategy(options, verify) {
    options = options || {};
    options.authorizationURL = options.authorizationURL || 'https://discordapp.com/api/oauth2/authorize';
    options.tokenURL = options.tokenURL || 'https://discordapp.com/api/oauth2/token';
    options.scopeSeparator = options.scopeSeparator || ' ';

    OAuth2Strategy.call(this, options, verify);
    this.name = 'discord';
    this._oauth2.useAuthorizationHeaderforGET(true);
}

/**
 * Inherits from `OAuth2Strategy`
 */
util.inherits(Strategy, OAuth2Strategy);

/**
 * Retrieve user profile from Discord.
 *
 * This function constructs a normalized profile.
 * Along with the properties returned from /users/@me, properties returned include:
 *   - `connections`      Connections data if you requested this scope
 *   - `guilds`           Guilds data if you requested this scope
 *   - `fetchedAt`        When the data was fetched as a `Date`
 *   - `accessToken`      The access token used to fetch the (may be useful for refresh)
 *
 * @param {string} accessToken
 * @param {function} done
 * @access protected
 */
Strategy.prototype.userProfile = function(accessToken, done) {
    var self = this;
    this._oauth2.get('https://discordapp.com/api/users/@me', accessToken, function(err, body, res) {
        if (err) {
            return done(new InternalOAuthError('Failed to fetch the user profile.', err))
        }

        try {
            var parsedData = JSON.parse(body);
        }
        catch (e) {
            return done(new Error('Failed to parse the user profile.'));
        }

        var profile = parsedData; // has the basic user stuff
        profile.provider = 'discord';
        profile.accessToken = accessToken;

        self.checkScope('connections', accessToken, function(errx, connections) {
            if (errx) done(errx);
            if (connections) profile.connections = connections;
            self.checkScope('guilds', accessToken, function(erry, guilds) {
                if (erry) done(erry);
                if (guilds) profile.guilds = guilds;

                profile.fetchedAt = new Date();
                return done(null, profile)
            });
        });
    });
};

Strategy.prototype.checkScope = function(scope, accessToken, cb) {
    if (this._scope && this._scope.indexOf(scope) !== -1) {
        this._oauth2.get('https://discordapp.com/api/users/@me/' + scope, accessToken, function(err, body, res) {
            if (err) return cb(new InternalOAuthError('Failed to fetch user\'s ' + scope, err));
            try {
                var json = JSON.parse(body);
            }
            catch (e) {
                return cb(new Error('Failed to parse user\'s ' + scope));
            }
            cb(null, json);
        });
    } else {
        cb(null, null);
    }
}

/**
 * Return extra parameters to be included in the authorization request.
 *
 * @param {Object} options
 * @return {Object}
 * @api protected
 */
Strategy.prototype.authorizationParams = function(options) {
    var params = {};
    if (typeof options.permissions !== 'undefined') {
        params.permissions = options.permissions;
    }
    return params;
};


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var fs = require('fs');

var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var secret = 'secretcode';
var payload;

var cookieParser = require('cookie-parser');

var app = express();
app.use(cookieParser()); // for setting and parsing cookies
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static('public'));

var events = require('./events.json');

async function isCollege(req, res, next) {
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    } else {
        return next();
    }
}

async function isEvent(req, res, next) {
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    } else {
        return next();
    }
}

async function tokenHandler(req, res, next) {
    try {
        req.formality_payload = await jwt.verify(req.cookies.jwtoken, secret, { algorithms: 'HS256' });
        return next();
    } catch (e) {
        if (req.cookies.jwrefresh === undefined) {
            return res.status(403).send('sign in to perform action');
        }
        if (e.name === 'TokenExpiredError' || e.name === 'JsonWebTokenError') {
            var refreshed = await refreshToken(req.cookies.jwrefresh);
            if (refreshed !== null) {
                req.formality_payload = await jwt.verify(refreshed, secret, { algorithms: 'HS256' });
                res.cookie('jwtoken', refreshed);
                return next();
            } else {
                res.clearCookie('jwtoken');
                return res.status(403).send('unable to refresh tokens');
            }
        } else {
            return res.status(403).send(e.message);
        }
    }
}

async function isAdmin(req, res, next) {
    var userid = req.formality_payload.userid;
    if (events[req.params.col]['admins'].includes(userid)) {
        return next();
    } else {
        return res.status(403).send('not an admin');
    }
}

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.get('/home', function (req, res) {
    var home = {
        'nav-college-name': 'College',
        'content_above': '',
        'content': '<div class="body-padded"> <p class= "lead"> Essential Formal and Ball Signup</p> <p>Choose a college and sign in to get started</p></div>',
        'content_footer': ''
    };
    res.send(home);
});

app.get('/college', function (req, res) {
    var college_dict = {};
    for (var key in events) {
        college_dict[key] = events[key]['college_name'];
    }
    return res.send(college_dict);
});

app.get('/college/:col', isCollege, function (req, res) {
    // returns college name and number of events for client js to build table
    res.send({
        'college_name': events[req.params.col]['college_name'],
        'number_events': Object.keys(events[req.params.col]['array'])
    });
});

app.get('/college/:col/s/:query', isCollege, function (req, res) {
    // returns college name and number of events for client js to build table
    var number_events = [];
    for (var key in events[req.params.col]['array']) {
        if (events[req.params.col]['array'][key]['event'].toUpperCase().indexOf(req.params.query.toUpperCase()) > -1) {
            number_events.push(key);
        }
    }
    res.send({
        'college_name': events[req.params.col]['college_name'],
        'number_events': number_events
    });
});

app.get('/college/:col/:event', [isCollege, isEvent], async function (req, res) {
    var event = events[req.params.col]['array'][req.params.event];
    var button;
    if (req.cookies.jwtoken === undefined) {
        if (event['space'] == 0) {
            button = 'full';
        } else {
            button = 'default';
        }
        return res.json({
            'event': event['event'],
            'date': event['date'],
            'space': event['space'],
            'total_space': event['total_space'],
            'button_status': button
        });
    } else { // jwtoken present
        try {
            var verified_token = await jwt.verify(req.cookies.jwtoken, secret, { algorithms: 'HS256' });
            var userid = verified_token.userid;
        } catch (e) {
            if (e.name === 'TokenExpiredError' || e.name === 'JsonWebTokenError') {
                var refreshed = await refreshToken(req.cookies.jwrefresh);
                if (refreshed !== null) {
                    res.cookie('jwtoken', refreshed);
                    verified_token = await jwt.verify(refreshed, secret, { algorithms: 'HS256' });
                    userid = verified_token.userid;
                } else {
                    res.clearCookie('jwtoken');
                    return res.status(403).send('unable to refresh tokens');
                }
            } else {
                return res.status(403).send(e.message);
            }
        }
        if (userid in event['users']) {
            button = 'signed_up';
        } else if (event['space'] == 0) {
            button = 'full';
        } else {
            button = 'default';
        }
        return res.json({
            'event': event['event'],
            'date': event['date'],
            'space': event['space'],
            'total_space': event['total_space'],
            'button_status': button
        });
    }
});

app.post('/college/:col/:event', [isCollege, tokenHandler, isEvent], async function (req, res) {
    // body contains -> view (true/false), signup (true/false optional)
    // idtoken (string optional (will return 403 if signup true) -> for verification / view permissions)
    var event = events[req.params.col]['array'][req.params.event];
    var payload = req.formality_payload;
    if (payload.userid in event['users']) {
        event['space'] += 1;
        delete event['users'][payload.userid];
    } else if (event['space'] > 0) {
        event['space'] -= 1;
        event['users'][payload.userid] = {
            'username': payload.name, 'email': payload.email
        };
    }
    fs.writeFileSync('./events.json', JSON.stringify(events));
    res.end('ok');
});

app.get('/no_events', async function (req, res) {
    var no_events = '<p>There are currently no events for this college</p>';
    res.send(no_events);
});

app.get('/admin/:col', [isCollege, tokenHandler, isAdmin], async function (req, res) {
    return res.send('ok');
});

function eventAssertions(body) {
    if (typeof body.event !== 'string' || typeof body.date !== 'string' ||
        typeof body.space !== 'number' || typeof body.total_space !== 'number') {
        return false;
    }
    if (body.space < 0 || body.total_space < 1) {
        return false;
    }
    if (body.space > body.total_space) {
        return false;
    }
    return true;
}

app.post('/admin/:col/e/:event', [isCollege, tokenHandler, isAdmin, isEvent], async function (req, res) {
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    }
    var event = events[req.params.col]['array'][req.params.event];
    if (!eventAssertions(req.body)) {
        return res.status(400).send('invalid event details');
    }
    event['event'] = req.body.event;
    event['date'] = req.body.date;
    event['space'] = req.body.space;
    event['total_space'] = req.body.total_space;
    fs.writeFileSync('./events.json', JSON.stringify(events));
    return res.send('ok');
});

app.delete('/admin/:col/d/:event', [isCollege, tokenHandler, isAdmin, isEvent], async function (req, res) {
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    }
    delete events[req.params.col]['array'][req.params.event];
    fs.writeFileSync('./events.json', JSON.stringify(events));
    return res.send('ok');
});

app.post('/admin/:col/c', [isCollege, tokenHandler, isAdmin, isEvent], async function (req, res) {
    if (!eventAssertions(req.body)) {
        return res.status(400).send('invalid event details');
    }
    var newid = 1;
    var event_ids = new Set(Object.keys(events[req.params.col]['array']).map(Number));
    while (event_ids.has(newid)) {
        newid++;
    }
    newid = String(newid);
    events[req.params.col]['array'][newid] = req.body;
    events[req.params.col]['array'][newid]['users'] = {};
    fs.writeFileSync('./events.json', JSON.stringify(events));
    return res.status(201).send('ok');
});

app.get('/admin/:col/u/:event', [isCollege, tokenHandler, isAdmin, isEvent], async function (req, res) {
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    }
    var users = {};
    var userdb = events[req.params.col]['array'][req.params.event]['users'];
    for (var useridkey in userdb) {
        users[userdb[useridkey]['email']] = userdb[useridkey]['username'];
    }
    return res.json(users);
});

var refresh = new Set;
async function refreshToken(jwrefresh) {
    if (jwrefresh !== null && jwrefresh !== undefined && refresh.has(jwrefresh)) {
        var jwtoken = jwt.sign({
            userid: payload.sub,
            name: payload.name,
            email: payload.email
        }, secret, { expiresIn: '10 minutes', algorithm: 'HS256' });
        return jwtoken;
    }
    return null;
}

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('1023133580648-i8rj0um1f2meigi0efb0pmp3ma3f2ksd.apps.googleusercontent.com');
async function verify(gtoken) {
    const ticket = await client.verifyIdToken({
        idToken: gtoken,
        audience: '1023133580648-i8rj0um1f2meigi0efb0pmp3ma3f2ksd.apps.googleusercontent.com',
    });
    return ticket.getPayload();
}

app.post('/gtokenin', async function (req, res) {
    var token = req.body['idtoken'];
    payload = await verify(token).catch(e => { return res.status(403).send(e); });
    var jwtoken = jwt.sign({
        userid: payload.sub,
        name: payload.name,
        email: payload.email
    }, secret, { expiresIn: '10 minutes', algorithm: 'HS256' });
    var jwrefresh = crypto.randomBytes(50).toString('hex');
    refresh.add(jwrefresh);
    res.cookie('jwtoken', jwtoken);
    res.cookie('jwrefresh', jwrefresh);
    res.end('ok');
});

app.post('/gtokenout', async function (req, res) {
    payload = null
    refresh.delete(req.cookies.jwrefresh);
    res.clearCookie('jwtoken');
    res.clearCookie('jwrefresh');
    res.end('ok');
});

app.get('/signedin', tokenHandler, async function (req, res) {
    return res.send(req['formality_payload']['email']);
});

module.exports = app;
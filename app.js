var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var fs = require('fs');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');

var app = express();
app.use(cookieParser()); // for setting and parsing cookies
var secret = 'formality_secret';
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static('public'));

var events = require('./events.json');

// viewed at http://localhost:8080
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

let home = {
    'nav-college-name': 'College',
    'content_above': '',
    'content': '<div class="body-padded"> <p class= "lead"> Essential Formal and Ball Signup</p> <p>Choose a college and sign in to get started</p></div>',
    'content_footer': ''
};

app.get('/home', function (req, res) {
    res.send(home);
});

app.get('/college', function (req, res) {
    var college_dict = {};
    for (var key in events) {
        college_dict[key] = events[key]['college_name'];
    }
    return res.send(college_dict);
});

app.get('/college/:col', function (req, res) {
    // returns college name and number of events for client js to build table
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    res.send({
        'college_name': events[req.params.col]['college_name'],
        'number_events': Object.keys(events[req.params.col]['array'])
    });
});

app.get('/college/:col/s/:query', function (req, res) {
    // returns college name and number of events for client js to build table
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    var number_events = [];
    for (var key in events[req.params.col]['array']) {
        if (events[req.params.col]['array'][key]['event'].toUpperCase().indexOf(req.params.query) > -1) {
            number_events.push(key);
        }
    }
    res.send({
        'college_name': events[req.params.col]['college_name'],
        'number_events': number_events
    });
});

app.get('/college/:col/:event', async function (req, res) {
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    }
    var event = events[req.params.col]['array'][req.params.event];
    var button;
    if (req.cookies.jwtoken === null || req.cookies.jwtoken === undefined) {
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
            return res.status(403).send(e.message);
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

app.post('/college/:col/:event', async function (req, res) {
    // body contains -> view (true/false), signup (true/false optional)
    // idtoken (string optional (will return 403 if signup true) -> for verification / view permissions)
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    }
    var event = events[req.params.col]['array'][req.params.event];
    if (req.cookies.jwtoken === null || req.cookies.jwtoken === undefined) {
        return res.status(403).send('Sign in to perform action');
    } else { // idtoken passed
        try {
            var verified_token = await jwt.verify(req.cookies.jwtoken, secret, { algorithms: 'HS256' });
            var userid = verified_token.userid;
        } catch (e) {
            return res.status(403).send(e.message);
        }
        if (userid in event['users']) {
            event['space'] += 1;
            delete event['users'][userid];
        } else if (event['space'] > 0) {
            event['space'] -= 1;
            event['users'][userid] = {
                'username': verified_token.name, 'email': verified_token.email
            };
        }
        fs.writeFileSync('./events.json', JSON.stringify(events));
    }
    res.end('ok');
});

var no_events = '<p>There are currently no events for this college</p>';

app.get('/no_events', async function (req, res) {
    res.send(no_events);
});

app.get('/admin/:col', async function (req, res) {
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    try {
        var verified_token = await jwt.verify(req.cookies.jwtoken, secret, { algorithms: 'HS256' });
        var userid = verified_token.userid;
    } catch (e) {
        return res.status(403).send(e.message);
    }
    if (events[req.params.col]['admins'].includes(userid)) {
        return res.status(200).send('ok');
    } else {
        return res.status(403).send('not an admin');
    }
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

app.post('/admin/:col/e/:event', async function (req, res) {
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    }
    var event = events[req.params.col]['array'][req.params.event];
    try {
        var verified_token = await jwt.verify(req.cookies.jwtoken, secret, { algorithms: 'HS256' });
        var userid = verified_token.userid;
    } catch (e) {
        return res.status(403).send(e.message);
    }
    if (!(events[req.params.col]['admins'].includes(userid))) {
        return res.status(403).send('not authenticated to modify events');
    }
    if (!eventAssertions(req.body)) {
        return res.status(400).send('invalid event details');
    }
    event['event'] = req.body.event;
    event['date'] = req.body.date;
    event['space'] = req.body.space;
    event['total_space'] = req.body.total_space;
    // fs.writeFileSync('./events.json', JSON.stringify(events));
    return res.send('ok');
});

app.delete('/admin/:col/d/:event', async function (req, res) {
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    }
    try {
        var verified_token = await jwt.verify(req.cookies.jwtoken, secret, { algorithms: 'HS256' });
        var userid = verified_token.userid;
    } catch (e) {
        return res.status(403).send(e.message);
    }
    if (!(events[req.params.col]['admins'].includes(userid))) {
        return res.status(403).send('not authenticated to delete events');
    }
    delete events[req.params.col]['array'][req.params.event];
    // fs.writeFileSync('./events.json', JSON.stringify(events));
    return res.send('ok');
});

app.post('/admin/:col/c', async function (req, res) {
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
    // fs.writeFileSync('./events.json', JSON.stringify(events));
    return res.send('ok');
});

app.get('/admin/:col/u/:event', async function (req, res) {
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    if (!(req.params.event in events[req.params.col]['array'])) {
        return res.status(400).send('invalid event number');
    }
    try {
        var verified_token = await jwt.verify(req.cookies.jwtoken, secret, { algorithms: 'HS256' });
        var userid = verified_token.userid;
    } catch (e) {
        return res.status(403).send(e.message);
    }
    if (!(events[req.params.col]['admins'].includes(userid))) {
        return res.status(403).send('not authenticated to get user list');
    }
    var users = {};
    var userdb = events[req.params.col]['array'][req.params.event]['users'];
    for (var useridkey in userdb) {
        users[userdb[useridkey]['email']] = userdb[useridkey]['username'];
    }
    return res.json(users);
});


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
    var payload = await verify(token).catch(e => { return res.status(403).send(e); });
    var jwtoken = jwt.sign({
        userid: payload.sub,
        name: payload.name,
        email: payload.email
    }, secret, { expiresIn: '2 days', algorithm: 'HS256' });
    res.cookie('jwtoken', jwtoken);
    res.end('ok');
});

app.post('/gtokenout', async function (req, res) {
    res.clearCookie('jwtoken');
    res.end('ok');
});

module.exports = app;
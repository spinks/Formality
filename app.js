var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var fs = require('fs');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

var events = require('./events.json');

app.use(express.static('public'));

// viewed at http://localhost:8080
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

let home = {
    'nav-college-name': 'College',
    'content': '<div class="body-padded"> <p class= "lead"> Essential Formal and Ball Signup</p> <p>Choose a college and sign in to get started</p></div > '
};

app.get('/home', function (req, res) {
    res.send(home);
});

app.get('/college', function (req, res) {
    var college_dict = {}
    for (var key in events) {
        college_dict[key] = events[key]['college_name']
    }
    return res.send(college_dict)
});

app.get('/college/:col', function (req, res) {
    // returns college name and number of events for client js to build table
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    res.send({
        'college_name': events[req.params.col]['college_name'],
        'number_events': events[req.params.col]['array'].length
    });
});

app.post('/college/:col/:event', async function (req, res) {
    // body contains -> view (true/false), signup (true/false optional)
    // idtoken (string optional (will return 403 if signup true) -> for verification / view permissions)
    if (!(req.params.col in events)) {
        return res.status(400).send('invalid college');
    }
    if (req.params.event < 0 || (req.params.event >= events[req.params.col]['array'].length)) {
        return res.status(400).send('invalid event number');
    }
    if (req.body['view'] === undefined || typeof req.body['view'] != 'boolean') {
        return res.status(400).send('invalid request body, view must be defined');
    }
    var event = events[req.params.col]['array'][req.params.event];
    var button;
    if (req.body['idtoken'] === null || req.body['idtoken'] === undefined) {
        if (req.body['view']) {
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
        } else {
            return res.status(403).send('Sign in to perform action');
        }
    } else { // idtoken passed
        try {
            await verify(req.body['idtoken']);
        } catch (e) {
            return res.status(403).send('Authentication failed');
        }
        // var useridcheck = await verify(req.body['idtoken']).catch(function (error) {
        //     console.error(error);
        //     return res.status(403).send('Authentication token verification failed');
        // });
        // if (useridcheck != userid) {
        //     return res.status(403).send('Invalid authentication credentials');
        // }
        if (req.body['view']) {
            if (event['users'].includes(userid)) {
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
        } else {
            if (events[req.params.col]['array'][req.params.event]['users'].includes(userid)) {
                events[req.params.col]['array'][req.params.event]['space'] += 1;
                var index = event['users'].indexOf(userid);
                if (index > -1) {
                    events[req.params.col]['array'][req.params.event]['users'].splice(index, 1);
                }
            } else {
                if (events[req.params.col]['array'][req.params.event]['space'] > 0 && userid !== null) {
                    events[req.params.col]['array'][req.params.event]['space'] -= 1;
                    events[req.params.col]['array'][req.params.event]['users'].push(userid);
                }
            }
        }
    }
    fs.writeFileSync('./events.json', JSON.stringify(events));
    res.end('ok');
});

var no_events = '<p>There are currently no events for this college</p>';

app.get('/no_events', function (req, res) {
    res.send(no_events);
});

app.get('/college/:col/admin', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/static/admin.html'));
});


const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('1023133580648-i8rj0um1f2meigi0efb0pmp3ma3f2ksd.apps.googleusercontent.com');
async function verify(gtoken) {
    const ticket = await client.verifyIdToken({
        idToken: gtoken,
        audience: '1023133580648-i8rj0um1f2meigi0efb0pmp3ma3f2ksd.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    console.log(ticket);
    return payload['sub']; // userid
}

var userid;

app.post('/gtokenin', async function (req, res) {
    var token = req.body['idtoken'];
    userid = await verify(token).catch(e => { return res.status(403).send(e) });
    res.end('ok');
});

app.post('/gtokenout', async function (req, res) {
    userid = '';
    res.end('ok');
});

module.exports = app;
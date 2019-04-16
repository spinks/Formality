'use strict';

// currently using supertest 3.4.2 as 4.0.0 does not have correct behaviour on expect 400
// https://github.com/visionmedia/supertest/issues/556

const request = require('supertest');
const nock = require('nock');
var Cookies = require('expect-cookies');
const app = require('./app');

describe('Test getting list of colleges', () => {
    it('Get /college succeeds', () => {
        return request(app)
            .get('/college')
            .expect(200);
    });

    it('Get /college succeeds and is correct', () => {
        return request(app)
            .get('/college')
            .expect(200)
            .expect('Content-type', /json/)
            .expect(/Hatfield/);
    });
});

function checkHatfield(res) {
    const content = res.body;
    if (typeof content !== 'object') {
        throw new Error('not an object');
    }

    if (content['college_name'] !== 'Hatfield') {
        throw new Error('college name should be Hatfield');
    }

    if (typeof content['number_events'] !== 'object') {
        throw new Error('response should contain event id array');
    }
}

describe('Test college general info (and college id validation middleware)', () => {
    it('GET /college/hatfield succeeds', () => {
        return request(app)
            .get('/college/hatfield')
            .expect(200);
    });

    it('GET /college/hatfield returns JSON', () => {
        return request(app)
            .get('/college/hatfield')
            .expect('Content-type', /json/);
    });

    test('GET /college/university succeeds', () => {
        return request(app)
            .get('/college/university')
            .expect(200);
    });

    it('GET /college/university returns JSON', () => {
        return request(app)
            .get('/college/university')
            .expect('Content-type', /json/);
    });

    it('GET /college/hatfield is in correct format', () => {
        return request(app)
            .get('/college/hatfield')
            .expect(checkHatfield);
    });

    it('GET incorrect college fails', () => {
        return request(app)
            .get('/college/idnotincolleges')
            .expect(400);
    });

    it('GET /college/hatfield/s/formal succeeds', () => {
        return request(app)
            .get('/college/hatfield/s/formal')
            .expect(200);
    });

    it('GET /college/hatfield/s/formal returns JSON', () => {
        return request(app)
            .get('/college/hatfield/s/formal')
            .expect('Content-type', /json/);
    });

    it('GET /college/hatfield/s/formal is in correct format', () => {
        return request(app)
            .get('/college/hatfield/s/formal')
            .expect(checkHatfield);
    });

    it('GET /college/hatfield/s/formal has 2 results', () => {
        return request(app)
            .get('/college/hatfield/s/formal')
            .expect(function (res) { if (res.body['number_events'].length !== 2) { throw new Error('incorrect size') } });
    });

    it('GET /college/hatfield/s/notinevents has no results', () => {
        return request(app)
            .get('/college/hatfield/s/notinevents')
            .expect(function (res) { if (res.body['number_events'].length !== 0) { throw new Error('incorrect size') } });
    });

});

function checkHatfieldEvent(res) {
    const content = res.body;
    if (typeof content !== 'object') {
        throw new Error('not an object');
    }

    if (typeof content['event'] !== 'string') {
        throw new Error('Event name should be string');
    }

    if (typeof content['date'] !== 'string') {
        throw new Error('Date should be string');
    }

    if (typeof content['space'] !== 'number' || typeof content['total_space'] !== 'number') {
        throw new Error('Space and Total Space should be numbers');
    }

    if (typeof content['button_status'] !== 'string') {
        throw new Error('Button status should be string');
    }
}

describe('Test college event info, (and event id validation middleware)', () => {
    it('GET /college/idnotincollege/0 fails (incorrect college)', () => {
        return request(app)
            .get('/college/idnotincollege/0')
            .expect(400)
            .expect(/invalid college/);
    });

    it('GET /college/hatfield/10000 fails (incorrect id)', () => {
        return request(app)
            .get('/college/hatfield/10000')
            .expect(400)
            .expect(/invalid event number/);
    });

    it('GET /college/hatfield/-8 fails (incorrect id)', () => {
        return request(app)
            .get('/college/hatfield/-8')
            .expect(400)
            .expect(/invalid event number/);
    });

    it('GET /college/hatfield/1 succeeds and returns JSON', () => {
        return request(app)
            .get('/college/hatfield/1')
            .expect(200)
            .expect('Content-type', /json/);
    });

    it('GET /college/hatfield/1 response is correct', () => {
        return request(app)
            .get('/college/hatfield/1')
            .expect(checkHatfieldEvent);
    });
});

describe('Test authentication actions', () => {
    var agent = request.agent(app);

    beforeEach(() => {
        nock('https://oauth2.googleapis.com').get('/tokeninfo?id_token=valid')
            .reply(200, JSON.stringify({
                // This is a sample API response for mocking
                "iss": "https://accounts.google.com",
                "sub": "110169484474386276334",
                "azp": "1008719970978-hb24n2dstb40o45d4feuo2ukqmcc6381.apps.googleusercontent.com",
                "aud": "1008719970978-hb24n2dstb40o45d4feuo2ukqmcc6381.apps.googleusercontent.com",
                "iat": "1433978353",
                "exp": "1433981953",
                "email": "testuser@gmail.com",
                "email_verified": "true",
                "name": "Test User",
                "picture": "https://lh4.googleusercontent.com/-kYgzyAWpZzJ/ABCDEFGHI/AAAJKLMNOP/tIXL9Ir44LE/s99-c/photo.jpg",
                "given_name": "Test",
                "family_name": "User",
                "locale": "en"
            }));

        nock('https://oauth2.googleapis.com').get('/tokeninfo?id_token=invalid')
            .reply(403, 'error');
    });

    it('POST /gtokenin succeeds', () => {
        return agent
            .post('/gtokenin')
            .send({ 'idtoken': 'valid', 'api_verify': true })
            .expect(200)
    });

    it('POST /gtokenin with invalid idtoken fails', () => {
        return agent
            .post('/gtokenin')
            .send({ 'idtoken': 'invalid', 'api_verify': true })
            .expect(403)
    });

    it('POST /gtokenin sets jwtoken cookie', () => {
        return agent
            .post('/gtokenin')
            .send({ 'idtoken': 'valid', 'api_verify': true })
            .expect(Cookies.set({ 'name': 'jwtoken' }))
    });

    it('POST /gtokenin sets jwrefresh cookie', () => {
        return agent
            .post('/gtokenin')
            .send({ 'idtoken': 'valid', 'api_verify': true })
            .expect(Cookies.set({ 'name': 'jwrefresh' }))
    });

    it('POST /gtokenout clears cookies', () => {
        return agent
            .post('/gtokenout')
            .expect(Cookies.reset([{ 'name': 'jwrefresh' }, { 'name': 'jwtoken' }]))
    });
});

describe('Test sign up to events', () => {
    var agent = request.agent(app);

    beforeEach(() => {
        nock('https://oauth2.googleapis.com').get('/tokeninfo?id_token=valid')
            .reply(200, JSON.stringify({
                // This is a sample API response for mocking
                "iss": "https://accounts.google.com",
                "sub": "110169484474386276334",
                "azp": "1008719970978-hb24n2dstb40o45d4feuo2ukqmcc6381.apps.googleusercontent.com",
                "aud": "1008719970978-hb24n2dstb40o45d4feuo2ukqmcc6381.apps.googleusercontent.com",
                "iat": "1433978353",
                "exp": "1433981953",
                "email": "testuser@gmail.com",
                "email_verified": "true",
                "name": "Test User",
                "picture": "https://lh4.googleusercontent.com/-kYgzyAWpZzJ/ABCDEFGHI/AAAJKLMNOP/tIXL9Ir44LE/s99-c/photo.jpg",
                "given_name": "Test",
                "family_name": "User",
                "locale": "en"
            }));
    });

    it('POST /college/hatfield/1 fails while agent not logged in', () => {
        return agent
            .post('/college/hatfield/1')
            .expect(403)
    })

    it('Get login tokens', () => {
        return agent
            .post('/gtokenin')
            .send({ 'idtoken': 'valid', 'api_verify': true })
            .expect(200)
    });

    it('POST /college/hatfield/1 succeeds with agent logged in', () => {
        return agent
            .post('/college/hatfield/1')
            .expect(200)
    })

    // it('POST /college/hatfield/1')

})

describe('Test college admin events', () => {
    var agent = request.agent(app);

    beforeEach(() => {
        nock('https://oauth2.googleapis.com').get('/tokeninfo?id_token=valid_admin')
            .reply(200, JSON.stringify({
                // This is a sample API response for mocking
                "iss": "https://accounts.google.com",
                "sub": "test_admin",
                "azp": "1008719970978-hb24n2dstb40o45d4feuo2ukqmcc6381.apps.googleusercontent.com",
                "aud": "1008719970978-hb24n2dstb40o45d4feuo2ukqmcc6381.apps.googleusercontent.com",
                "iat": "1433978353",
                "exp": "1433981953",
                "email": "admin@gmail.com",
                "email_verified": "true",
                "name": "Admin Name",
                "picture": "https://lh4.googleusercontent.com/-kYgzyAWpZzJ/ABCDEFGHI/AAAJKLMNOP/tIXL9Ir44LE/s99-c/photo.jpg",
                "given_name": "Admin",
                "family_name": "Name",
                "locale": "en"
            }));

        nock('https://oauth2.googleapis.com').get('/tokeninfo?id_token=invalid_admin')
            .reply(200, JSON.stringify({
                // This is a sample API response for mocking
                "iss": "https://accounts.google.com",
                "sub": "110169484474386276334",
                "azp": "1008719970978-hb24n2dstb40o45d4feuo2ukqmcc6381.apps.googleusercontent.com",
                "aud": "1008719970978-hb24n2dstb40o45d4feuo2ukqmcc6381.apps.googleusercontent.com",
                "iat": "1433978353",
                "exp": "1433981953",
                "email": "testuser@gmail.com",
                "email_verified": "true",
                "name": "Test User",
                "picture": "https://lh4.googleusercontent.com/-kYgzyAWpZzJ/ABCDEFGHI/AAAJKLMNOP/tIXL9Ir44LE/s99-c/photo.jpg",
                "given_name": "Test",
                "family_name": "User",
                "locale": "en"
            }));
    });

    it('Get invalid_admin login tokens', () => {
        return agent
            .post('/gtokenin')
            .send({ 'idtoken': 'invalid_admin', 'api_verify': true })
            .expect(200)
    });

    it('GET /admin/hatfield has correct response (fails)', () => {
        return agent
            .get('/admin/hatfield')
            .expect(403)
            .expect(/not an admin/);
    });
    it('POST /admin/hatfield/c has correct response (fails)', () => {
        return agent
            .post('/admin/hatfield/c')
            .expect(403)
            .expect(/not an admin/);
    });
    it('POST /admin/hatfield/e/1 has correct response (fails)', () => {
        return agent
            .post('/admin/hatfield/e/1')
            .expect(403)
            .expect(/not an admin/);
    });
    it('DELETE /admin/hatfield/d/1 has correct response (fails)', () => {
        return agent
            .delete('/admin/hatfield/d/1')
            .expect(403)
            .expect(/not an admin/);
    });
    it('GET /admin/hatfield/u/1 has correct response (fails)', () => {
        return agent
            .get('/admin/hatfield/u/1')
            .expect(403)
            .expect(/not an admin/);
    });

    it('Get admin login tokens', () => {
        return agent
            .post('/gtokenin')
            .send({ 'idtoken': 'valid_admin', 'api_verify': true })
            .expect(200)
    });

    it('GET /admin/hatfield has correct response (success)', () => {
        return agent
            .get('/admin/hatfield')
            .expect(200)
    });

    it('POST /admin/hatfield/c with invalid event details fails (0 total spaces)', () => {
        return agent
            .post('/admin/hatfield/c')
            .send({
                'event': 'TestEvent',
                'date': '5/5',
                'space': 0,
                'total_space': 0
            })
            .expect(400)
            .expect(/invalid event details/);
    });

    it('POST /admin/hatfield/c with invalid event details fails (available > total)', () => {
        return agent
            .post('/admin/hatfield/c')
            .send({
                'event': 'TestEvent',
                'date': '5/5',
                'space': 5,
                'total_space': 4
            })
            .expect(400)
            .expect(/invalid event details/);
    });

    it('POST /admin/hatfield/c with invalid event details fails (name incorrect format)', () => {
        return agent
            .post('/admin/hatfield/c')
            .send({
                'event': 5,
                'date': '5/5',
                'space': 5,
                'total_space': 10
            })
            .expect(400)
            .expect(/invalid event details/);
    });

    it('POST /admin/hatfield/c with invalid event details fails (date incorrect format)', () => {
        return agent
            .post('/admin/hatfield/c')
            .send({
                'event': 'TestEvent',
                'date': 5,
                'space': 5,
                'total_space': 10
            })
            .expect(400)
            .expect(/invalid event details/);
    });

    it('POST /admin/hatfield/c with valid event details succeeds', () => {
        return agent
            .post('/admin/hatfield/c')
            .send({
                'event': 'TestEvent',
                'date': '5/5',
                'space': 5,
                'total_space': 10
            })
            .expect(201)
            .expect(/ok/);
    });

    it('Check event created via GET /college/hatfield/s/TestEvent request', () => {
        return request(app)
            .get('/college/hatfield/s/TestEvent')
            .expect(200)
            .expect(function (res) {
                var body = JSON.parse(res.text);
                if (body.number_events.length === 0) { throw new Error('no event') }
            });
    });

    it('Check that catching invalid event details works on POST EDIT (only one needed as uses same function as create)', () => {
        return agent
            .post('/admin/hatfield/e/4')
            .send({
                'event': 'TestEvent',
                'date': '5/5',
                'space': 0,
                'total_space': 0
            })
            .expect(400)
            .expect(/invalid event details/);
    });

    it('POST /admin/hatfield/e/4 succeeds', () => {
        return agent
            .post('/admin/hatfield/e/4')
            .send({
                'event': 'TestEvent',
                'date': '5/5',
                'space': 6,
                'total_space': 12
            })
            .expect(200)
            .expect(/ok/);
    });

    it('GET /admin/hatfield/u/4 succeeds', () => {
        return agent
            .get('/admin/hatfield/u/4')
            .expect(200);
    });

    it('GET /admin/hatfield/u/4 returns JSON', () => {
        return agent
            .get('/admin/hatfield/u/4')
            .expect('Content-type', /json/);
    });

    it('GET /admin/hatfield/u/4 has no users signed up', () => {
        return agent
            .get('/admin/hatfield/u/4')
            .expect(200)
            .expect(function (res) {
                var body = JSON.parse(res.text);
                if (Object.keys(body).length !== 0) { throw new Error('user signed up to new event') }
            });
    });

    it('Sign up to event with POST /college/hatfield/4', () => {
        return agent
            .post('/college/hatfield/4')
            .expect(200)
    })

    it('GET /admin/hatfield/u/4 has a user signed up', () => {
        return agent
            .get('/admin/hatfield/u/4')
            .expect(200)
            .expect(function (res) {
                var body = JSON.parse(res.text);
                if (Object.keys(body).length === 0) { throw new Error('no user signed up to event') }
            });
    });

    it('GET /admin/hatfield/u/4 includes the valid_admin user details', () => {
        return agent
            .get('/admin/hatfield/u/4')
            .expect(200)
            .expect(function (res) {
                var body = JSON.parse(res.text);
                if (Object.keys(body)[0] !== 'admin@gmail.com') { throw new Error('admin email not present as key') };
                if (body['admin@gmail.com'] !== 'Admin Name') { throw new Error('admin name not correct') };
            });
    });

    it('DELETE /admin/hatfield/d/4 succeeds', () => {
        return agent
            .delete('/admin/hatfield/d/4')
            .expect(200)
            .expect(/ok/);
    });

    it('Check event deleted via GET /college/hatfield/s/TestEvent request', () => {
        return request(app)
            .get('/college/hatfield/s/TestEvent')
            .expect(200)
            .expect(function (res) {
                var body = JSON.parse(res.text);
                if (body.number_events.length !== 0) { throw new Error('event present') }
            });
    });

});
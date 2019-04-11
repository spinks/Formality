'use strict';

// currently using supertest 3.4.2 as 4.0.0 does not have correct behaviour on expect 400
// https://github.com/visionmedia/supertest/issues/556

const request = require('supertest');
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

describe('Test college general info', () => {
    it('GET /college/hatfield sucseeds', () => {
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

describe('Test college event info, posts', () => {
    it('POST /college/idnotincollege/0 fails (incorrect college)', () => {
        return request(app)
            .post('/college/idnotincollege/0')
            .send({ 'view': true })
            .expect(400)
            .expect(/invalid college/);
    });

    it('POST /college/hatfield/10000 fails (out of bounds)', () => {
        return request(app)
            .post('/college/hatfield/10000')
            .send({ 'view': true })
            .expect(400)
            .expect(/invalid event number/);
    });

    it('POST /college/hatfield/-8 fails (out of bounds)', () => {
        return request(app)
            .post('/college/hatfield/-8')
            .send({ 'view': true })
            .expect(400)
            .expect(/invalid event number/);
    });

    it('POST with no view body fails', () => {
        return request(app)
            .post('/college/hatfield/0')
            .expect(400)
            .expect(/invalid request body, view must be defined/);
    });

    it('POST /college/hatfield/0 succeeds and returns JSON', () => {
        return request(app)
            .post('/college/hatfield/0')
            .send({ 'view': true })
            .expect(200)
            .expect('Content-type', /json/);
    });

    it('POST /college/hatfield/0 response is correct', () => {
        return request(app)
            .post('/college/hatfield/0')
            .send({ 'view': true })
            .expect(checkHatfieldEvent);
    });

    it('POST view=false requires idtoken', () => {
        return request(app)
            .post('/college/hatfield/0')
            .send({ 'view': false })
            .expect(403);
    });

    // it('POST idtoken must pass test', () => {
    //     return request(app)
    //         .post('/college/hatfield/0')
    //         .send({ 'view': false, 'idtoken': 'fail' })
    //         .expect(403);
    // });
});
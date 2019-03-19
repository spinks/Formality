var clientIDToken = null;
var lastPageRequest = 'home';
var lastPageRequestCollege = null;
var gapi;

document.addEventListener('DOMContentLoaded', function () {
    async function buildDropMenu() {
        try {
            let response = await fetch('/college');
            let body = await response.text();
            if (response.status != 200) {
                throw body;
            }
            body = await JSON.parse(body);
            let dropmenu = '';
            for (let key in body) {
                dropmenu += '<div class="dropdown-item" id="' + key + '">' + body[key] + '</div>'
            }
            document.getElementById('navbarDropdownMenuCollege').innerHTML = dropmenu;
        } catch (e) {
            alert(e);
        }
    }

    buildDropMenu();

    document.getElementById('navbarDropdownMenuCollege').addEventListener('click', async function (event) {
        if (event.target.id !== 'navbarDropdownMenuCollege') {
            await genTable(event.target.id);
        }
    });

    document.getElementById('navbarBrand').addEventListener('click', async function (event) {
        try {
            lastPageRequest = 'home';
            let response = await fetch('/home');
            let body = await response.text();
            body = await JSON.parse(body);
            if (response.status != 200) {
                throw body;
            }
            for (var key in body) {
                document.getElementById(key).innerHTML = body[key];
            }
        } catch (e) {
            alert(e);
        }
    });

    document.getElementById('google-signout').addEventListener('click', async function (event) {
        await signOut();
    });
});

async function signOut() {
    try {
        var auth2 = gapi.auth2.getAuthInstance();
        await fetch('gtokenout', {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: 'follow',
            referrer: 'no-referrer',
            body: '',
        });
        auth2.signOut();
        clientIDToken = null;
        document.getElementById('nav-account').innerHTML = 'Sign In ';

        // refresh page content to reflect sign out
        if (lastPageRequest !== 'home') {
            await genTable(lastPageRequestCollege);
        }
    } catch (e) {
        alert(e);
    }
}

async function genTable(college) {
    try {
        lastPageRequest = 'college';
        lastPageRequestCollege = college;
        let response = await fetch('college/' + college);
        let body = await response.text();
        if (response.status != 200) {
            throw body;
        }
        body = await JSON.parse(body);
        document.getElementById('nav-college-name').innerHTML = body['college_name'];
        if (body['number_events'] == 0) {
            response = await fetch('/no_events');
            body = await response.text();
            document.getElementById('content').innerHTML = body;
        }
        else {
            var table = '<table class="table"><thead><tr>' +
                '<th scope="col">Event</th>' +
                '<th scope="col">Date</th>' +
                '<th scope="col">Available Places</th>' +
                '<th scope="col" style="width: 25%">Sign Up</th>' +
                '</tr></thead> <tbody>';
            for (let i = 0; i < body['number_events']; i++) {
                let response = await fetch('college/' + college + '/' + i, {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    redirect: 'follow',
                    referrer: 'no-referrer',
                    body: JSON.stringify({ 'view': true, 'idtoken': clientIDToken }),
                });
                let event = await response.text();
                if (response.status != 200) {
                    // could force a singn out here for invalid credemtials
                    // await signOut();
                    throw event;
                }
                event = await JSON.parse(event);
                var button;
                if (event['button_status'] == 'default') {
                    button = '<button type="submit" class="btn btn-primary btn-block">sign up</button>';
                } else if (event['button_status'] == 'signed_up') {
                    button = '<button type="submit" class="btn btn-secondary btn-block">cancel</button>';
                } else if (event['button_status'] == 'full') {
                    button = '<button type="submit" class="btn btn-secondary btn-block disabled">fully booked</button>';
                }
                table += '<tr>' +
                    '<th scope="row">' + event['event'] + '</th>' +
                    '<td>' + event['date'] + '</td>' +
                    '<td>' + event['space'] + '/' + event['total_space'] + '</td>' +
                    '<td>' + '<form id="event_' + i + '">' + button + '</td>' +
                    '</form>' + '</tr>';
            }
            table += '</tbody></table>';
            document.getElementById('content').innerHTML = table;
            for (let i = 0; i < body['number_events']; i++) {
                document.getElementById('event_' + i).addEventListener('submit', async function (event) {
                    event.preventDefault();
                    if (document.getElementById('event_' + i).innerText !== 'fully booked') {
                        try {
                            let response = await fetch('college/' + college + '/' + i, {
                                method: 'POST',
                                mode: 'cors',
                                cache: 'no-cache',
                                credentials: 'same-origin',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                redirect: 'follow',
                                referrer: 'no-referrer',
                                body: JSON.stringify({ 'view': false, 'idtoken': clientIDToken }),
                            });
                            if (response['status'] != 200) {
                                let body = await response.text();
                                throw body;
                            }
                            await genTable(college);
                        }
                        catch (e) {
                            alert(e);
                        }
                    }
                });
            }
        }
    }
    catch (e) {
        alert(e);
    }
}

async function onSignIn(googleUser) {
    try {
        var profile = googleUser.getBasicProfile();
        document.getElementById('nav-account').innerHTML = profile.getEmail();
        // console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
        // console.log('Name: ' + profile.getName());
        // console.log('Image URL: ' + profile.getImageUrl());
        // console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.

        // The ID token you need to pass to your backend:
        var id_token = googleUser.getAuthResponse().id_token;
        var response = await fetch('gtokenin', {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: 'follow',
            referrer: 'no-referrer',
            body: 'idtoken=' + id_token,
        });
        let body = await response.text();
        if (response.status != 200) {
            throw body;
        }
        clientIDToken = id_token; // set client file ID token
        // console.log("ID Token: " + id_token);

        // refresh page content to reflect sign in
        if (lastPageRequest !== 'home') {
            await genTable(lastPageRequestCollege);
        }
    } catch (e) {
        alert(e);
    }
}
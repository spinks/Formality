var lastPageRequest = 'home';
var lastPageRequestCollege = null;
var lastPageRequestCollegeEvents = null;

document.addEventListener('DOMContentLoaded', function () {
    async function pollSignedIn() {
        if (document.cookie.jwtoken !== undefined) {
            var email = await fetch('/signedin');
            if (email.status == 200) {
                email = await email.text();
                document.getElementById('nav-account').innerHTML = email;
            }
        }
    }
    pollSignedIn();

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
                dropmenu += '<div class="dropdown-item" id="' + key + '">' + body[key] + '</div>';
            }
            document.getElementById('navbarDropdownMenuCollege').innerHTML = dropmenu;
        } catch (e) {
            alert(e);
        }
    }
    buildDropMenu();

    document.getElementById('navbarDropdownMenuCollege').addEventListener('click', async function (event) {
        if (event.target.id !== 'navbarDropdownMenuCollege') {
            lastPageRequest = 'college';
            lastPageRequestCollege = event.target.id;
            await genFullTable(event.target.id);
        }
    });

    document.getElementById('navbarBrand').addEventListener('click', async function () {
        lastPageRequest = 'home';
        document.getElementById('nav-college-name').innerHTML = 'College';
        document.getElementById('content_above').innerHTML = '';
        document.getElementById('content').innerHTML = '<div class="body-padded"> <p class= "lead"> Essential Formal and Ball Signup</p> <p>Choose a college and sign in to get started</p></div>';
        document.getElementById('content_footer').innerHTML = '';
    });

    document.getElementById('google-signout').addEventListener('click', async function (event) {
        event.preventDefault();
        await signOut();
    });
});

async function signOut() {
    try {
        var auth2 = gapi.auth2.getAuthInstance(); // eslint-disable-line
        var response = await fetch('gtokenout', { method: 'POST' });
        if (response.status != 200) {
            var body = await response.text();
            throw body;
        }
        auth2.signOut();
        document.getElementById('nav-account').innerHTML = 'Sign In ';
        // refresh page content to reflect sign out
        if (lastPageRequest !== 'home') {
            await genTable(lastPageRequestCollege, lastPageRequestCollegeEvents);
        }
    }
    catch (e) {
        alert(e);
    }
}

async function tableFilter() { // eslint-disable-line
    try {
        var search = document.getElementById('tableSearch').value;
        if (search === '') {
            await genFullTable(lastPageRequestCollege);
        } else {
            var filter = search.toUpperCase();
            var response = await fetch('college/' + lastPageRequestCollege + '/s/' + filter);
            var body = await response.text();
            if (response.status != 200) {
                throw body;
            }
            body = await JSON.parse(body);
            await genTable(lastPageRequestCollege, body['number_events']);
        }
    } catch (e) {
        throw (e);
    }
}

async function genFullTable(college) {
    try {
        var response = await fetch('college/' + college);
        var body = await response.text();
        if (response.status !== 200) {
            throw body;
        }
        body = await JSON.parse(body);
        document.getElementById('nav-college-name').innerHTML = body['college_name'];
    }
    catch (e) {
        throw (e);
    }

    document.getElementById('content_above').innerHTML = '<div class="form-group"><input type="text" onkeyup="tableFilter()" class="form-control my-form-search" id="tableSearch" placeholder="search"></div>';
    lastPageRequestCollegeEvents = body.number_events;
    await genTable(college, body.number_events);
}


async function genAdminTable(college) {
    document.getElementById('content_above').innerHTML = '';
    document.getElementById('content_footer').innerHTML = '<form id="admin"><button type="submit" class="btn btn-secondary">exit admin</button></form>';
    document.getElementById('admin').addEventListener('submit', async function (event) {
        event.preventDefault();
        await genFullTable(lastPageRequestCollege);
    });
    var response = await fetch('college/' + college);
    var body = await response.text();
    if (response.status !== 200) {
        throw body;
    }
    body = await JSON.parse(body);
    var number_events = body.number_events;
    try {
        var no_events = false;
        if (number_events.length === 0) {
            no_events = true;
            document.getElementById('content').innerHTML = '<p>There are currently no events for this college</p>';
        }
        if (no_events === false) {
            table = '<table class="table" id="eventTable"><thead><tr>' +
                '<th scope="col">Event</th>' +
                '<th scope="col">Date</th>' +
                '<th scope="col">Available Places</th>' +
                '<th scope="col">Total Places</th>' +
                '<th scope="col">Edit Event</th>' +
                '<th scope="col">Delete Event</th>' +
                '<th scope="col">Get Users Attending</th>' +
                '</tr></thead> <tbody>';
            for (var i = 0; i < number_events.length; i++) {
                let response = await fetch('college/' + college + '/' + number_events[i].toString());
                let event = await response.text();
                if (response.status != 200) {
                    // could force a singn out here for invalid credemtials
                    // await signOut();
                    throw event;
                }
                event = await JSON.parse(event);
                table += '<tr>' +
                    '<td> <input type="text" class="form-control" id="event_' + number_events[i] + '" value="' + event['event'] + '"></td>' +
                    '<td> <input type="text" class="form-control" id="date_' + number_events[i] + '" value="' + event['date'] + '"></td>' +
                    '<td> <input type="text" class="form-control" id="space_' + number_events[i] + '" value="' + event['space'] + '"></td>' +
                    '<td> <input type="text" class="form-control" id="total_space_' + number_events[i] + '" value="' + event['total_space'] + '"></td>' +
                    '<td>' + '<button id="edit_' + number_events[i] + '" type="submit" class="btn btn-primary btn-block">edit</button></td>' +
                    '<td>' + '<button id="delete_' + number_events[i] + '" type="submit" class="btn btn-primary btn-block">delete</button></td>' +
                    '<td>' + '<button class="btn btn-primary btn-block" id="users_' + number_events[i] + '">fetch users</button>' + '</td>' +
                    '</tr>';
            }
            table += '</tbody></table>';
        }
        var create = '<table class="table" id="eventTable"><thead><tr>' +
            '<th scope="col">Create New Event</th></tr></thead><tr>' +
            '<td> <input type="text" class="form-control" id="event_create" placeholder="Name"></td>' +
            '<td> <input type="text" class="form-control" id="date_create" placeholder="Date"></td>' +
            '<td> <input type="number" class="form-control" id="space_create" placeholder="Available Spaces"></td>' +
            '<td> <input type="number" class="form-control" id="total_space_create" placeholder="Total Spaces"></td>' +
            '<td> <button type="submit" id="create_submit" class="btn btn-primary btn-block">create</button></td></tr>' +
            '</table>';
        document.getElementById('content').innerHTML = table + create;
        if (no_events === false) {
            for (let i in number_events) {
                document.getElementById('delete_' + number_events[i]).addEventListener('click', async function (event) {
                    event.preventDefault();
                    var body;
                    try {
                        var r = confirm('Confirm deletion of event?');
                        if (r == true) {
                            var response = await fetch('admin/' + college + '/d/' + number_events[i], { method: 'DELETE' });
                            if (response.status != 200) {
                                body = await response.text();
                                throw body;
                            }
                            await genAdminTable(college);
                            alert('Event Deleted');
                        }
                    } catch (e) {
                        alert(e);
                    }
                });
                document.getElementById('edit_' + number_events[i]).addEventListener('click', async function (event) {
                    event.preventDefault();
                    try {
                        let response = await fetch('admin/' + college + '/e/' + number_events[i], {
                            method: 'POST',
                            body: JSON.stringify({
                                'event': document.getElementById('event_' + number_events[i]).value,
                                'date': document.getElementById('date_' + number_events[i]).value,
                                'space': parseInt(document.getElementById('space_' + number_events[i]).value),
                                'total_space': parseInt(document.getElementById('total_space_' + number_events[i]).value)
                            }),
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        if (response.status != 200) {
                            let body = await response.text();
                            throw body;
                        }
                        await genAdminTable(college);
                        alert('Event Modified');
                    } catch (e) {
                        alert(e);
                    }
                });
                document.getElementById('users_' + number_events[i]).addEventListener('click', async function (event) {
                    event.preventDefault();
                    try {
                        let response = await fetch('admin/' + college + '/u/' + number_events[i]);
                        let body = await response.text();
                        if (response.status != 200) {
                            throw body;
                        }
                        body = await JSON.parse(body);
                        if (Object.keys(body).length === 0 && body.constructor === Object) {
                            document.getElementById('content_above').innerHTML = 'No users signed up for this event';
                        } else {
                            var table = '<table class="table"><thead><tr><th scope="col">Email</td><th scope="col">Name</td></tr></thead>';
                            for (var email in body) {
                                table += '<tr><td>' + String(email) + '</td><td>' + body[email] + '</td></td>';
                            }
                            table += '</table>';
                            document.getElementById('content_above').innerHTML = table;
                        }
                    } catch (e) {
                        alert(e);
                    }
                });
            }
        }
        document.getElementById('create_submit').addEventListener('click', async function (event) {
            event.preventDefault();
            try {
                let response = await fetch('admin/' + college + '/c', {
                    method: 'POST',
                    body: JSON.stringify({
                        'event': document.getElementById('event_create').value,
                        'date': document.getElementById('date_create').value,
                        'space': parseInt(document.getElementById('space_create').value),
                        'total_space': parseInt(document.getElementById('total_space_create').value)
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.status != 200) {
                    let body = await response.text();
                    throw body;
                }
                await genAdminTable(college);
                alert('Event Created');
            } catch (e) {
                alert(e);
            }
        });
    }
    catch (e) {
        alert(e);
    }
}

async function genTable(college, number_events) {
    try {
        var admin = await fetch('/admin/' + lastPageRequestCollege);
        admin = await admin.text();
        if (admin === 'true') {
            document.getElementById('content_footer').innerHTML = '<button type="submit" id="admin" class="btn btn-secondary">admin - modify events</button>';
            document.getElementById('admin').addEventListener('click', async function (event) {
                event.preventDefault();
                await genAdminTable(lastPageRequestCollege);
            });
        } else {
            document.getElementById('content_footer').innerHTML = '';
        }
        if (number_events.length === 0) {
            document.getElementById('content').innerHTML = '<p>There are currently no events for this college</p>';
        }
        else {
            var table = '<table class="table" id="eventTable"><thead><tr>' +
                '<th scope="col">Event</th>' +
                '<th scope="col">Date</th>' +
                '<th scope="col">Available Places</th>' +
                '<th scope="col" style="width: 25%">Sign Up</th>' +
                '</tr></thead> <tbody>';
            for (var i = 0; i < number_events.length; i++) {
                let response = await fetch('college/' + college + '/' + number_events[i].toString());
                let event = await response.text();
                if (response.status != 200) {
                    throw event;
                }
                event = await JSON.parse(event);
                var button;
                if (event['button_status'] == 'default') {
                    button = '<button id="event_' + number_events[i] + '"type="submit" class="btn btn-primary btn-block">sign up</button>';
                } else if (event['button_status'] == 'signed_up') {
                    button = '<button id="event_' + number_events[i] + '"type="submit" class="btn btn-secondary btn-block">cancel</button>';
                } else if (event['button_status'] == 'full') {
                    button = '<button id="event_' + number_events[i] + '"type="submit" class="btn btn-secondary btn-block disabled">fully booked</button>';
                }
                table += '<tr>' +
                    '<th scope="row">' + event['event'] + '</th>' +
                    '<td>' + event['date'] + '</td>' +
                    '<td>' + event['space'] + '/' + event['total_space'] + '</td>' +
                    '<td>' + button + '</td>' + '</tr>';
            }
            table += '</tbody></table>';
            document.getElementById('content').innerHTML = table;
            for (let i in number_events) {
                document.getElementById('event_' + number_events[i]).addEventListener('click', async function (event) {
                    event.preventDefault();
                    if (document.getElementById('event_' + number_events[i]).innerText !== 'fully booked') {
                        try {
                            let response = await fetch('college/' + college + '/' + number_events[i], {
                                method: 'POST',
                            });
                            if (response['status'] != 200) {
                                let body = await response.text();
                                throw body;
                            }
                            await genTable(college, lastPageRequestCollegeEvents);
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

async function onSignIn(googleUser) { // eslint-disable-line
    try {
        var profile = googleUser.getBasicProfile();
        document.getElementById('nav-account').innerHTML = profile.getEmail();
        var id_token = googleUser.getAuthResponse().id_token;
        var response = await fetch('/gtokenin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'idtoken': id_token }),
        });
        let body = await response.text();
        if (response.status != 200) {
            throw body;
        }
        // refresh page content to reflect sign in
        if (lastPageRequest !== 'home') {
            await genTable(lastPageRequestCollege, lastPageRequestCollegeEvents);
        }
    } catch (e) {
        alert(e);
    }
}
# Formality

This website and server are hosted and deployed on the IBM Cloud at [formality](https://formality.eu-gb.cf.appdomain.cloud).

## Running the site locally

Install modules with `npm install`, run with `npm start`. Server will be available at [localhost:8080](http://localhost:8080).

## Usage

The premise is that the website allows signed in users to sign up for, or cancel their attendance at events. After signing in with Google you can then perform those two actions on the events for any college.

If a user is an administrator for a college they are able to access an admin page which allows for editing of existing events, creation of new events, deletion of events, or fetching the list of users who are signed up to one of their events.

For demonstration purposes only, on the local distribution of the server there is a `make admin` button on a colleges' page, this will add your `userid` to the list of admins for that college, you will then be able to access the admin page and test the add, edit and delete interactions; as-well as fetching attending users.

# API
In all api references the resource url root (`https://formality.eu-gb.cf.appdomain.cloud`) can be replaced with `htpp://localhost:8080` for local testing

## Colleges

### `GET college`
Allows the user to get an object with all colleges, keys are the internal ids and the values are the display names.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/college`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | JSON |
| Requires authentication? | No |
| Requires admin privilege? | No |
#### Parameters
None
#### Example Request
`GET https://formality.eu-gb.cf.appdomain.cloud/college`
#### Example Response
`{"hatfield":"Hatfield","university":"University","st_cuthberts":"St Cuthbert's","st_chads":"St Chad's","st_johns":"St John's","st_marys":"St Mary's"}`

### `GET college/:col`
Responds with an object containing the college display name and a list of event ids for the college given in `:col`.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/college/:col`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | JSON |
| Requires authentication? | No |
| Requires admin privilege? | No |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
#### Example Request
`GET https://formality.eu-gb.cf.appdomain.cloud/college/university`
#### Example Response
`{"college_name":"University","number_events":["1"]}`

### `GET college/:col/s/:query`
Responds with an object containing the college display name and a list of event ids for the college given in `:col`, where each event returned name contains a string match to `:query`. Note this is case insensitive.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/college/:col/s/:query`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | JSON |
| Requires authentication? | No |
| Requires admin privilege? | No |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
| query | yes | A query string | none | `formal` |
#### Example Request
`GET https://formality.eu-gb.cf.appdomain.cloud/college/hatfield/s/formal`
#### Example Response
`{"college_name":"Hatfield","number_events":["1","2"]}`

## Events
### `GET college/:col/:event`
Responds with an object containing detailed information about an event. If a jwtoken/jwrefresh token is passed the button status will reflect if the user is signed up for the event.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/college/:col/:event`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | JSON |
| Requires authentication? | No |
| Requires admin privilege? | No |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- | --- | --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
| event | yes | Event id (ids found in `GET college/col` or the query version) | none | `1` |
| jwtoken (cookie) | no | The cookie value of a login token | none | a long alphanumeric key |
| jwrefresh (cookie) | no | The cookie value of a login refresh token | none | a long alphanumeric key |
#### Example Request
`GET https://formality.eu-gb.cf.appdomain.cloud/college/hatfield/1`
#### Example Response
`{"event":"Tuesday Formal","date":"19/6","space":6,"total_space":80,"button_status":"default"}`

### `POST college/:col/:event`
Responds with status 200 if the post request was successful. Either signs a user up to an event if not already or vice-versa.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/college/:col/:event`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | String |
| Requires authentication? | No |
| Requires admin privilege? | No |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- | --- | --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
| event | yes | Event id (ids found in `GET college/col` or the query version) | none | `1` |
| jwtoken (cookie) | yes (not if refresh token passed) | The cookie value of a login token | none | a long alphanumeric key |
| jwrefresh (cookie) | yes | The cookie value of a login refresh token | none | a long alphanumeric key |
#### Example Request
`POST https://formality.eu-gb.cf.appdomain.cloud/college/hatfield/1`
#### Example Response
`ok`

### `GET no_events`
Returns the website display string for the instance where there are no events for a college
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/no_events`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | String |
| Requires authentication? | No |
| Requires admin privilege? | No |
#### Parameters
none
#### Example Request
`GET https://formality.eu-gb.cf.appdomain.cloud/no_events`
#### Example Response
`<p>There are currently no events for this college</p>`

## Admin Event Actions

### `GET admin/:col`
Responds with status 200 if the authenticated user is an administrator for the given college, else 403
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/admin/:col`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | String |
| Requires authentication? | Yes |
| Requires admin privilege? | Yes |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- | --- | --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
| jwtoken (cookie) | yes (not if refresh token passed) | The cookie value of a login token | none | a long alphanumeric key |
| jwrefresh (cookie) | yes | The cookie value of a login refresh token | none | a long alphanumeric key |
#### Example Request
`GET https://formality.eu-gb.cf.appdomain.cloud/admin/hatfield`
#### Example Response
If passed tokens signify user is an admin,
`ok`
else,
`not an admin`

### `POST admin/:col/e/:event`
Responds with status 200 if the post request was successful. Allows for editing of event details, which are passed in the post request body. Edits the event id in the url.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/admin/:col/e/:event`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | String |
| Requires authentication? | Yes |
| Requires admin privilege? | Yes |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- | --- | --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
| event | yes | Event id (ids found in `GET college/col` or the query version) | none | `1` |
| event (body) | yes | New event name, string | none | `Formal` |
| date (body) | yes | New event date, string | none | `5/8` |
| space (body) | yes | New event available spaces, int | none | `20` |
| total_space (body) | yes | New event total spaces, int | none | `80` |
| jwtoken (cookie) | yes (not if refresh token passed) | The cookie value of a login token | none | a long alphanumeric key |
| jwrefresh (cookie) | yes | The cookie value of a login refresh token | none | a long alphanumeric key |
#### Example Request
`POST https://formality.eu-gb.cf.appdomain.cloud/admin/hatfield/e/1 --body={'event': 'Formal", 'date': '5/8 'space': 20, 'total_space': 80}`
#### Example Response
`ok`

### `DELETE admin/:col/d/:event`
Responds with status 200 if the post request was successful. Allows for deleting of events. Deletes the event with id passed in the url.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/admin/:col/d/:event`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | String |
| Requires authentication? | Yes |
| Requires admin privilege? | Yes |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- | --- | --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
| event | yes | Event id (ids found in `GET college/col` or the query version) | none | `1` |
| jwtoken (cookie) | yes (not if refresh token passed) | The cookie value of a login token | none | a long alphanumeric key |
| jwrefresh (cookie) | yes | The cookie value of a login refresh token | none | a long alphanumeric key |
#### Example Request
`DELETE https://formality.eu-gb.cf.appdomain.cloud/admin/hatfield/d/1`
#### Example Response
`ok`

### `POST admin/:col/c`
Responds with status 201 if the post request was successful. Allows for creating of new events.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/admin/:col/c`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | String |
| Requires authentication? | Yes |
| Requires admin privilege? | Yes |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- | --- | --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
| event (body) | yes | New event name, string | none | `Formal` |
| date (body) | yes | New event date, string | none | `5/8` |
| space (body) | yes | New event available spaces, int | none | `20` |
| total_space (body) | yes | New event total spaces, int | none | `80` |
| jwtoken (cookie) | yes (not if refresh token passed) | The cookie value of a login token | none | a long alphanumeric key |
| jwrefresh (cookie) | yes | The cookie value of a login refresh token | none | a long alphanumeric key |
#### Example Request
`POST https://formality.eu-gb.cf.appdomain.cloud/admin/hatfield/c --body={'event': 'Formal", 'date': '5/8 'space': 20, 'total_space': 80}`
#### Example Response
`ok`

### `POST admin/:col/u/:event`
Responds with an object containing the user emails as keys and user names as values for all users signed up to the event.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/admin/:col/u/:event`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | JSON |
| Requires authentication? | Yes |
| Requires admin privilege? | Yes |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- | --- | --- | --- |
| col | yes | The internal id string of a college (as per keys in `GET college`) | none | `university` |
| event | yes | Event id (ids found in `GET college/col` or the query version) | none | `1` |
| jwtoken (cookie) | yes (not if refresh token passed) | The cookie value of a login token | none | a long alphanumeric key |
| jwrefresh (cookie) | yes | The cookie value of a login refresh token | none | a long alphanumeric key |
#### Example Request
`POST https://formality.eu-gb.cf.appdomain.cloud/admin/hatfield/u/1`
#### Example Response
`{"example@gmail.com":"User One", "user@hotmail.com":"User Two"}`

## Authentication
### `POST gtokenin`
Responds with status 200 if the passed idtoken was able to be verified with the Google API. Also in response the jwtoken and jwrefresh token are returned in the Set-Cookie header. The jwtoken expires in 10 minutes, however on other routes if the jwrefresh token is passed it will generate and cookie a new jwtoken, and continue with the original request. 
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/gtokenin`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | String |
| Requires authentication? | Yes |
| Requires admin privilege? | No |
#### Parameters
| Name | Required | Description | Default | Example |
| --- | --- | --- | --- | --- |
| idtoken | yes | An id token given to the client from the Google sign-in API | none | an alphanumeric key |
| api_verify | no | A boolean, if true the backend will verify with Google API rather than with their library | `false` | `true`
#### Example Request
`POST https://formality.eu-gb.cf.appdomain.cloud/gtokenin --body={'idtoken':'123...'}`
#### Example Response
`ok` and the jwtoken and jwrefresh which are set as cookies by the response.

### `POST gtokenout`
Logout protocol. Removes the jwrefresh token from the database and clears the browser cookies in the response.
#### Resource URL
`https://formality.eu-gb.cf.appdomain.cloud/gtokenout`
#### Resource Information
| Detail | Info |
| --- | --- |
| Response format | String |
| Requires authentication? | No |
| Requires admin privilege? | No |
#### Parameters
none
#### Example Request
`POST https://formality.eu-gb.cf.appdomain.cloud/gtokenout`
#### Example Response
`ok` and the jwtoken and jwrefresh cookies are cleared by the response.
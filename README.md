# aRESTocats

> Run declarative integration tests against your REST services

## Features

With _aRESTocats_ you can

 - tests REST APIs
 - observe the result stream while tests are still running
 - export results as interactive HTML, in JUnit format, and/or to a human-friendly standard out format
 - declare tests using simple, composable JSON blocks
 - use builtin plugins:
   HTTP request, delay, expectation checks, OAuth2/JWT login, HAL-request, debugging output
 - add custom plugins by implementing a simple JavaScript interface
 - launch tests from the command line, even remotely (through a REST interface)
 - …or interactively through the web interface
 - experiment with test parameters without touching the test files
 - share links to test results, even to individual items, including modified parameters


## Setup

```console
> npm install
```


## Usage

Add `arestocats` as a dev-dependency to your project:

```console
> npm install --save-dev arestocats
```

Then you may run the _arestocats_ command:

```console
> ./node_modules/.bin/arestocats [scenario1 … scenarioN] [OPTIONS]
```

You can also install the _arestocats_ command globally (`npm install -g arestocats`), to be able to omit the `./node_modules/.bin/` part.
This also allows you to use arestocats without creating a `package.json` first.

Each scenario is specified by passing the name of a folder, containing an `index.js` or an `index.json`.
The aRESTocats runner will look for scenarios in the `./scenarios` folder by default.
You may change this using the `--src` option.
If no scenarios (1…N) are given, every item in the scenarios folder will be loaded.

For example, to run the smoke-tests included with aRESTocats, run:

```console
> ./node_modules/.bin/arestocats --src=./node_modules/arestocats/test/scenarios --context.baseUrl=https://jsonplaceholder.typicode.com
```

*Note* that this reports `ERROR` as a result, because the third sub-item is meant to demo an error case.
The first item should yield `SUCCESS`, and the second item should be a `FAILURE`.



### Web Interface

Instead of just running the tests right away, you can start a web interface.
This will allow users to trigger individual items manually, to tweak configuration, and to share result links.

```console
./node_modules/.bin/arestocats --service
```

Now, visit [http://localhost:3000](http://localhost:3000) for interactive testing.


### Options

 - `--src=...` to specify a scenarios-root other than `./scenarios`,

 - `--service` to run the REST service (see below),

 - `--service.port=...` to use a non-default port for the web-UI (default: `3000`),

 - `--service.systemUnderTestVersionUrl=...` to specify where the frontend will look for the version resource of the system under test,

 - `--service.developmentProxy` _for development only,_ to forward `/dev` to the webpack-dev-server

 - `--service.developmentProxyTargetPort=1234` _for development only,_ if the webpack-dev-server is not listening on 8080

 - `--cli` to enable command-line output (automatically enabled if REST service is not used),

 - `--cli.reporters=...` comma-separated list of reporters. Available: `stdout`, `junit`, `html` (default: `stdout`),

 - `--cli.wait=<seconds>` how long to wait for launching the initial tests,

 - `--context.myOption=foo` to set the *context option* (see below) named "foo" for all scenarios unless overridden locally.


## Test Definitions Format

Each scenario and each sub-item ill be loaded using Node `require`.
Each test item should be an object with a `type` property, on which the other properties depend.

Here is a list of all general-purpose properties:

- `type` (String) - determines what the test item does (which implementation is used).
  Predefined types: _debug, delay, expect, include, mqtt-publish, output, request, spawn, suite_

- `name` (String) - a name to identify the suite, in the test output, or in order to reference test results from expressions

- `description` (String) - an optional short description

- `defaults` (Object) - allows to specify default values for the _context_ of this item, and of nested items (if applicable, see below)

- `overrides` (Object) - like `defaults`, but taking precedence over any inherited context (see below)

The remaining properties that may be used for an item depend on its type (see below).
These may be specified as _constants_ or as _expressions_:

* An item property is specified as a _constant_ by simply setting it on the item definition (side-by-side with `type`).
The applicable values depend on the property, as long as they can be encoded/decoded to/from JSON.

* An item property is specified as an _expression_ by prefixing the property name with a colon (e.g. `:key` instead of `key`).
The right side of such properties will be expanded by evaluating them as JavaScript, immediately before running an item.
For the evaluation, properties of the _context_ are available, including the special `$results` object.

Often, items types also have a default that is used for properties that are not defined by an item.


### Phases

The API tester runs in multiple phases:


#### Pre Phase

The `pre` phase _preprocesses_ the test items into one big JSON-serializable JS object.
Items loaded from external files (using `include`) are inlined into their parent item, and the context for each item is expanded.
The resulting structure may be used to inspect and/or reproduce individual test runs.


#### Run Phase

The `run` phase executes test items recursively.

Items may produce _results_ that can be referenced from expressions of subsequent items using the `$results.name`, where `name` is the name of the respective producing item.
For example, this allows you to `expect` properties of a `request` item response.
When items have the same name, only the result of the *most-recently run* can be referenced.


#### Report Phase

The `report` phase processes and outputs test results.


### Context

During preprocessing, test items receive a _context_ from _above_, i.e. from their parent tests or from command line options.
Some types of test items (`suite`, `include`) may contain or reference _nested items_: they pass down _context_ to these items.
If you think of a test item as a small program, the context properties correspond to environment variables, while the regular configuration options correspond to command line arguments.

Test items may specify `defaults` for context properties (as a JS object), which are overwritten by context inherited from above.
Additionally, test items may specify `overrides` (also as an object), changing the context inherited from above for themselves and for their nested items.
All other properties will only be available to the items themselves when run, and are not part of the inheritance context.

Also, test items may (sometimes must) have a `name` for reference purposes.
This name is not required to be globally unique, but should be unique within specific contexts (e.g. for members of a `suite`).


#### Context Properties: `role`

The `role` is an optional string property that can be used to indicate the purpose of an item:

- `"prepare"` - this item is required as setup or precondition for a subsequent test item
- `"test"` *(default - do not manually specify)* - this item is itself a test
- `"cleanup"` - this item is needed for cleanup.

This distinction is helpful to create UI representation of test items trees.
Because the role is part of the context, it is automatically inherited by nested items.

*Note:* cleanup items are not run if a preceeding item *errors*.
This may be changed in the future, so that cleanup items could serve the purpose of a `finally` clause.


### Results

Each test item produces a _result_ (wrapped in a promise) when run.
A result is an object with an `outcome` and (optionally) additional properties.

*Result* Outcome

The `outcome` (a string) is one of the following:

- `SUCCESS` - item passed, everything good
- `SKIPPED` - item was skipped, e.g. because it came after an ERROR item
- `FAILURE` - item failed, e.g. an expectation was not met, or a server did not respond
- `ERROR` - an unexpected error happened, e.g. a programming error

The difference between `ERROR` and `FAILURE`:

- _Errors_ indicate programming problems that need to be fixed in the test definition or in the test runner itself.
  Examples include missing context configuration or syntactically invalid expressions.

- _Failures_ indicate that some expectation of the test was not met.
  Either the expectation is mistaken, or the system under test is in violation.

The runner will automatically set the outcome `ERROR` for items that throw an exception or that reject their result promise.


#### Result Message

Results may contain a `message` string with additional human-audience information.


#### Result Failures and Error

If the outcome is `FAILURE`, there should be a `failures` array of strings, explaining each violated expectation.
If the outcome is `ERROR`, there should be an `error` object, preferably an exception instance.


### Result Duration

The test runner adds a field `durationMs` (Number) to each result, containing the duration of an item execution in milliseconds.
This can be used in subsequent expectations, for example to check performance requirements.


## Test Item Types

The following item types are available.
For each item type, the applicable configuration properties and context variables are listed.
Properties marked as *(pre)* are evaluated during the preprocessing phase.
This means that they cannot refer to any `$results` if set using expressions.


---
### `assign` - add properties to results

Use this to assign an expression value to the item result value, or to copy properties to the result.

#### assign: Configuration Properties

- `value` (*)

   *this value will be stored in the result under the key `value`*

- `properties` (Object)

   *properties of this object will be copied over to the result*

#### assign: Result Properties

- `value` (*)

   *the (evaluated) `value`*

- `*` (*)

   *the properties of the (evaluated) `properties`*


---
### `delay` - wait for some time

Use this to allow for an external process to complete.

#### assign: Configuration Properties

- `milliseconds` (Number) - wait duration


---
### `expect` - check expectations

After making one or several requests, usually there are expections on the results.
For this, the `expect` type is used.

#### expect: Configuration Properties

- `value` (any)

  *what to check, usually given as an expression (e.g. `$results.myRequest.durationMs < 100`)*

- `expected` (any)

   *the value that is expected. If omitted, the value is checked for "truthiness"*

- `matches` (any)

   *a regular expression whose value should match the actual value. If given, `expected` is ignored*

- `strict` (Boolean, default `false`)

  *determine if comparison is using `==` (relaxed) or `===` (strict)*

#### expect: Result Properties

- `actual` (any) - the actual evaluation result


---
### `include` - embed externally defined items

During the `pre` phase, this item is replaced with the (preprocessed) test item obtained by using `require` on the given path.
If `options` are specified, they are inherited by the included item.
This means that the same suite may be used multiple times, each time with different options.

#### include: Configuration Properties

- `src` (String) - path to a test item module.
  If relative, the path is resolved based on the including file *(pre)*


---
### `load` - perform load-testing on a service

Make a lot of requests to a given URL, and track how quickly each response arrives.
Load-tests are based on the NPM library [loadtest](https://www.npmjs.com/package/loadtest).

#### load: Configuration Properties

 - `url` (String)

   *the URL to make the request to*

 - `agentKeepAlive` (Boolean, default=true)

   *instruct the `laodtest` library to use keep-alive connections. Use `false` to open a new TCP connection for each request*

 - `body` (String, default=null)

   *a request entity to be sent to the server, usually as part of POST or PUT requests*

 - `cookies` (String, default={})

   *named cookies to send to the server using an additional header. Note that a name/value object is expected just like for the `request` item and not a list of key/value-pairs as used internally with the `loadtest` library*

 - `concurrency` (Number, default=10)

    *target number of concurrently open requests*

 - `expectedStatus` (String, default='xxx')

    *status code pattern to expect (use 'xxx' to ignore)*

 - `expectedType` (String, default=null)

    *expected content type. If set, it is used for the Accept-header and to check the responses*

 - `expectedRps` (Number, default=null)

    *the average number of requests per seconds that must at least be processed. Measurement starts at first request and ends when `maxRequests` responses have been received, or `maxSeconds` has elapsed `headers` (Object, default={}) named request headers to send, use `;` to specify multi-valued headers*

 - `jsonBody` (Object, default=null)

    *an object to be converted to a JSON request entity, usually as part of POST or PUT requests. If given, this takes precedence over the body. If `null`, no entity is sent*. Automatically causes a JSON content type if used

 - `maxRequests` (Number, default=10000)

    *the target number of requests that must be completed for the test to SUCCEED*

 - `maxErrorPortion` (Number, default=0)

   *allows to set a tolerance for errors*

 - `maxSeconds` (Number, default=10)

   *the test will always be canceled after this period, and will *FAIL* if fewer than `maxRequests` have been completed*

 - `method` (String, default='GET')

   *the HTTP verb to use*

 - `pollForMS` (Number, default=0)

    *if this is not null, repeatedly poll the resource until `expectedStatus` is returned. The result will be set to the last response*

 - `pollDelayMS` (Number, default=100)

    *how often to poll if `pollForMs` is specified*


#### load: Result Properties

 - `details.errorCodes` (Number)

   *for each encountered error codes, the number of responses (if any)

 - `details.maxLatencyMs` (Number)

   *slowest response time

 - `details.minLatencyMs` (Number)

   *fastest response time

 - `details.percentiles` (Object)

   *a upper latency bounds for the fastest X (X="50"/"90"/"95"/"99") percent of requests

 - `details.rps` (Number)

   *average requests per second during the run

 - `details.totalRequests` (Number)

   *number of requests completed

 - `details.totalTimeSeconds` (Number)

   *duration of the load test in seconds


---
### `mqtt-publish` - publish a message over MQTT

Connects to an MQTT broker and tries to publish a message.

#### mqtt-publish: Configuration Properties

- `topic` (String)
- `message` (String)
- `connectTimeout` (Number, default `500`)


---
### `output` - generate diagnostic result

Generates a message based on the value expression. Never fails.

#### output: Configuration Properties

- `value` (any) - what to output
- `label` (String, default `"output"`) - an informative prefix


---
### `request` - make an HTTP request, store the response

Make a request to a given URL, and store response information in the result (under the `response` key).

#### request: Configuration Properties:

- `url` (String)

   *the URL to make the request to*

- `body` (String, default: null)

   *a request entity to be sent to the server, usually as part of POST or PUT requests*

- `checkLength` (Boolean, default: `true`)

   *if true, verify that any advertised Content-Length matches the actual response length*

- `cookies` (Object, default: `{}`)

   *named cookies to send to the server using an additional header*

- `expectedStatus` (String, default: `"2xx"`)

   *status code pattern to expect (use 'xxx' to ignore)*

- `expectedType` (String, default: `application/json`)

   *expected content type. Used to check the response. If this is `application/json` or any `application/...+json` type, the response body is parsed as JSON and stored as field `json` within the results. This is also used for the `Accept` header if none is specified.*

- `headers` (Object, default: `{}`)

   *named request headers to send. If no `Accept` header is given, one is automatically added based on the `expectedType` parameter (if set)*

- `limit` (Number, default: `255`)

   *maximum prefix of text responses to keep in the result, null for "no limit"*

- `method` (String, default: `"GET"`)

   *the HTTP verb to use*


#### request: Result Properties:

- `response.cookies` (Object)

  *values from the 'set-cookie' headers, grouped by name*

- `response.headers` (Object)

  *response headers, with names lowercased*

- `response.json` (Object)

   *for responses of JSON content-type, the parsed representation, else `null`*

- `response.length` (Number)

   *the number of characters of the decoded response body*

- `response.status` (String)

   *the HTTP response status code*

- `response.text` (String)

   *response contents, up to the specified limit in length*


---
### `suite` - define a suite of tests

Can be used to create sequences and hierarchies of test items.
Any context applied to a suite will be applied to all children.

#### suite: Configuration Properties

- `items` (Array)

  *an array of nested test items (which may in turn also be suites)* (pre)

#### suite: Context Properties

- `skipAfter` (String, default: `"ERROR"`) if the given outcome or worse is encountered during suite processing, any remaining items are skipped

Items in a suite are run in sequence, but should be considered separate tests, not affecting each other.

#### suite: Result Properties

Suites generate a compound result, using the `nested` field for their children results.
The suite _outcome_ is always the worst outcome produced by any child.


## Development

First, `git clone` this repository, and `cd` into it.

Then run:

```console
npm install
```

to obtain the dependencies, and to bundle the web frontend.

### Development: Web Frontend Setup

The folder `frontend` contains a [LaxarJS](https://laxarjs.org) web frontend for running tests and for inspecting results.

It is automatically installed when you `npm install` aRESTocats.

To develop the frontend itself, you will want to run the Webpack development server:

```console
> # start webpack in the background
> ( cd frontend ; npm start ) &
> # then, run the REST API and a proxy for the frontend:
> npm start -- \
   --service \
   --service.developmentProxy
```



You may also specify individual scenarios, or the `context` options, just like you would for command-line execution.



# API Tester
A simple TDD unit testing framework for APIs.

<img width="700" alt="image" src="https://github.com/user-attachments/assets/aae3a86e-8cd4-4842-8690-e1e6be8b2072" />

🚀 Test the beta version live here: https://tdd.upstr.dev.

## Getting started
API Tester lets you create API tests in a simple YAML file with detailed test assertions for APIs. Here is an example test:

```yaml
name: apigee httpbin test
tests:
  - name: test httpbin get
    url: https://httpbin.org
    path: /get
    method: GET
    headers:
      Test-Header: test123
    assertions:
      - $.headers.Host==httpbin.org
      - $.headers["Test-Header"]==test123
  - name: test apigee proxy httpbin get
    url: https://35-190-86-107.nip.io/v1/httpbin
    path: /get
    method: GET
    headers:
      Test-Header: test123
    variables:
      testVar: test456
    assertions:
      - $.headers.Host==httpbin.org
      - $.headers["Test-Header"]==test123
      - testVar===test456
```

The above test suite shows two tests in a test suite. 
1.  **test httpbin get** does a direct test to `https://httpbin.org/get`, first setting the header `Test-Header` and then testing the payload (in JPATH format) properties in the response. This first type of test can be run on any API just using request / response data.
2. **test apigee proxy httpbin get** tests an apigee proxy to `https://httpbin.org/get`, and has the additional unit testing capability of setting and testing `variables`. In this test we set the variable `testVar` to test456, and then assert that value in the assertions.

## Running tests
After defining some tests, you can run them either in the web client by pressing the "Run" button

## Apigee proxy unit tests
You can do detailed unit tests on Apigee proxies by deploying the **Shared Flow** form this repository into your Apigee org, and then setting the **Pre-proxy** and **Post-proxy** Flow hooks in your environment. This will check if the **x-upstream-id** header is set, and if so run the configured unit tests in the proxy. If no header is set, then nothing is done.

Deploy the shared flow using the [apigeecli](https://github.com/apigee/apigeecli).
```sh
# clone this repo and import the shared flow
PROJECT_ID=YOUR_APIGEE_ORG
ENV=YOUR_APIGEE_ENV
# create and deploy the shared flow
apigeecli sharedflows create bundle -n SF-Tester-v1 -f ./apigee/sharedflowbundle -o $PROJECT_ID -e $ENV --ovr -t $(gcloud auth print-access-token)

# attach pre-proxy and post-proxy flowhooks for the environment
apigeecli flowhooks attach -n PreProxyFlowHook -s SF-Tester-v1 -o $PROJECT_ID -e $ENV -t $(gcloud auth print-access-token)
apigeecli flowhooks attach -n PostProxyFlowHook -s SF-Tester-v1 -o $PROJECT_ID -e $ENV -t $(gcloud auth print-access-token)
```
In case you already have shared flows in the Pre-proxy and Post-proxy hooks, then you will have to add a new shared flow that calls both flows.

After you have added the shared flow and the flow-hooks, you can run tests

## Configuration guide
### Headers
You can both set and assert header values in tests. This test defnition both sets a header and asserts the `content-length` header as well as the mirrored request headers in the response.
```yaml
name: httpbin.org test
tests:
  - name: test httpbin get
    url: https://httpbin.org
    path: /get
    method: GET
    headers:
      Test-Header: test123
    assertions:
      - $.headers.Host==httpbin.org
      - $.headers["Test-Header"]==test123
```
### Method and Body
You can both set and assert payload values, as well as set the method. Assertions only work for JSON response payloads using JSONPath. This example POSTS a payload and validates response JSON properties.
```yaml
name: httpbin.org test
tests:
  - name: test httpbin post
    url: https://httpbin.org
    path: /post
    method: POST
    headers:
      Content-Type: application/json
    body: '{"test1": "test2"}'
    assertions:
      - $.headers.Host==httpbin.org
      - $.json.test1==test2
```
### Variables
Variables can only be set and tested if using the Apigee shared flow above, since only then do we have access to the runtime processing information. 

In this example we both set a variable in the **variables** collection and test variable values in the **assertions**.

```yaml
name: LLM Feature Proxy Tests
tests:
  - name: test openai prompt input simple
    runner: external
    body: '{"messages": [{"role": "user", "content": "why is the sky blue?"}]}'
    variables:
      llm.promptInput: why is the sky blue?
    assertions:
      - llm.promptInput===why is the sky blue?
      - llm.promptEstimatedTokenCount===6.666666666666667
```

### Assertion operations
These operations are available for assertions.
- "==" = loosely equals, not accounting for data type or string case.
- "===" = strictly equals, so data type and string case must be identical.
- "!=" = loosely not equals
- "!==" = strictly not equals
- ":" = string includes

## REST API
documentation coming soon!

## Apigee proxy deployment
To deploy the policies to do proxy assertion checks in an Apigee proxy, just include the policies from the example proxy in the `/apigee` directory. A simpler way of adding these policies to an existing proxy temporarilly for testing purposes is coming soon!

## Credits
- The frontend code was initially generated by [Gemini 2.5 Flash](https://deepmind.google/models/gemini/flash/), and then adapted and polished based on the requirements.
- The amazing [CodeMirror](https://codemirror.net/) project is used for test YAML editing in the web client.

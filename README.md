# Upstream TDD
A simple testing framework for HTTP services, as well as for any other platform that posts test results via a REST Api.

## Getting started
1. You can use the public deployment at [https://tdd.upstr.dev](https://tdd.upstr.dev), or deploy or run your own version.
2. First start a test with a curl command. You will get an `id` back that you can use to update and monitor results.
```sh
# init test
curl -X POST https://tdd.upstr.dev/tests -H "Content-Type: application/yaml" \
  --data-binary @- << EOF

tests:
  - name: test response headers.Host prop
   	url: https://httpbin.org
    path: /get
    verb: get
    assertions:
      - $.headers.Host===httpbin.org
EOF
```
3. The `tests` and `assertions` collections can contain as many tests as needed.
4. To use with Apigee proxies, deploy a proxy with the test policies enabled like in the example in the `apigee` directory.
5. Monitor the test results at [https://upstr.dev/dash?id=YOUR_ID](https://tdd.upstr.dev/dash?id=YOUR_ID).

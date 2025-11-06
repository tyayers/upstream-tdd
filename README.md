# Upstream Test
A simple testing framework, also usable from within API platforms such as Apigee proxies.

## Getting started
1. You can use the public deployment at [https://upstr.dev](https://upstr.dev), or deploy or run your own version.
2. First start a test with a curl command. You will get an `id` back that you can use to update and monitor results.
```sh
# init test
curl -X POST https://upstr.dev/tests \
    -H "Content-Type: application/yaml" \
    --data-binary @- << EOF
tests:
  - name: test json get
    path: /json
    verb: get
    assertions:
      - $.headers.Host===httpbin.org
EOF
```
3. The `tests` and `assertions` collections can contain as many tests as needed.
4. Deploy a proxy with the test policies enabled.
5. Monitor the test results at [https://upstr.dev/view?id=YOUR_ID](https://upstr.dev/view?id=YOUR_ID).

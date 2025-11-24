var upstreamId = context.getVariable("upstream.testId");
var testCaseId = context.getVariable("upstream.testCaseId");
var testContent = context.getVariable("upstreamResponse.content");
var testContentCode = context.getVariable("upstreamResponse.status.code");
var proxyUrl = context.getVariable("proxy.url");
var pathSuffix = context.getVariable("proxy.pathsuffix");
var requestVerb = context.getVariable("request.verb");

if (upstreamId && testContent && testContentCode == 200) {
  var testCases = JSON.parse(testContent);
  if (testCases) {
    var testCase = findTest(
      testCaseId,
      testCases,
      proxyUrl,
      pathSuffix,
      requestVerb,
      request.content,
    );
    if (testCase) {
      context.setVariable("upstream.testCase", JSON.stringify(testCase));
      // request
      if (testCase.body) context.setVariable("request.content", testCase.body);

      // variables
      if (testCase.variables) {
        // set variables
        var varNames = Object.keys(testCase.variables);
        for (var i = 0; i < varNames.length; i++) {
          var varName = varNames[i];
          context.setVariable(varName, testCase.variables[varName]);
        }
      }

      // headers
      if (testCase.headers) {
        var headerNames = Object.keys(testCase.headers);
        for (var i = 0; i < headerNames.length; i++) {
          var headerName = headerNames[i];
          context.setVariable(
            "request.header." + headerName,
            testCase.headers[headerName],
          );
        }
      }
    }
  }
}

function findTest(
  testId,
  testCases,
  proxyUrl,
  requestPath,
  requestVerb,
  requestContent,
) {
  print(
    "Finding test with requestPath: " +
      requestPath +
      " and requestVerb " +
      requestVerb,
  );
  var result = undefined;

  if (testCases && testCases.tests && testCases.tests.length > 0) {
    var filteredArray = testCases.tests.filter((x) => x.name == testId);
    if (filteredArray.length > 0) {
      print("Found test case using name: " + testId);
      result = filteredArray[0];
    } else {
      filteredArray = testCases.tests.filter(
        (x) => proxyUrl.startsWith(x.url) && x.method == requestVerb,
      );
      if (filteredArray.length > 0) {
        print("Found test case using url: " + proxyUrl);
        result = filteredArray[0];
      } else {
        filteredArray = testCases.tests.filter(
          (x) => x.method == requestVerb && x.path == requestPath,
        );
        if (filteredArray.length > 0) {
          print(
            "Found test case using path and verb: " +
              requestVerb +
              " - " +
              requestPath,
          );
          result = filteredArray[0];
        } else if (testCases.tests.length > 0) {
          print("Did not find test case, taking first one.");
          result = testCases.tests[0];
        }
      }
    }
  }

  return result;
}

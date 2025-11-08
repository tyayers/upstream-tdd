import express from "express";
import fs from "fs";
import * as YAML from "yaml";
import crypto from "crypto";

const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use(
  express.json({
    type: "application/json",
    limit: "2mb",
  }),
);
app.use(
  express.text({
    type: "application/yaml",
    limit: "2mb",
  }),
);

const basePath = process.env.BASE_PATH ?? "./data";
const index = loadIndex();
const eventClients = {};

app.get("/tests/:id", function (req, res) {
  let responseType = req.header("Accept");
  if (fs.existsSync(`${basePath}/${req.params.id}/tests.yaml`)) {
    let fileContents = fs.readFileSync(
      `${basePath}/${req.params.id}/tests.yaml`,
      "utf8",
    );
    let tests = YAML.parse(fileContents);
    if (responseType == "application/yaml") {
      res.setHeader("Content-Type", "application/yaml");
      res.send(
        YAML.stringify(tests, {
          aliasDuplicateObjects: false,
          blockQuote: "literal",
        }),
      );
    } else res.send(JSON.stringify(tests, null, 2));
  } else {
    res.status(404).send("Not found.");
  }
});

app.put("/tests/:id", function (req, res) {
  let requestType = req.header("Content-Type") ?? "";
  let responseType = req.header("Accept");

  if (!req.body) {
    return res.status(400).send("No data received.");
  }

  let tests: any = req.body;
  if (tests && requestType == "application/yaml") tests = YAML.parse(tests);
  else if (!tests) tests = {};
  tests.id = req.params.id;

  let saveResult = saveTests(tests, requestType);

  if (!saveResult) {
    res.status(404).send("Test not found.");
  } else res.send("OK.");
});

app.post("/tests", function (req, res) {
  let requestType = req.header("Content-Type") ?? "";
  let responseType = req.header("Accept");

  let uuid = crypto.randomUUID();
  console.log(`Creating test ${uuid}.`);

  let tests: any = req.body;
  if (tests && requestType == "application/yaml") tests = YAML.parse(tests);
  else if (!tests) tests = {};
  tests.id = uuid;

  // create directory
  fs.mkdirSync(`${basePath}/${uuid}`, { recursive: true });

  // save tests.yaml and results.yaml
  saveTests(tests, requestType);

  if (responseType == "application/yaml") {
    res.setHeader("Content-Type", "application/yaml");
    res.status(201).send(
      YAML.stringify(
        {
          id: tests.id,
        },
        {
          aliasDuplicateObjects: false,
          blockQuote: "literal",
        },
      ),
    );
  } else
    res.status(201).send(
      JSON.stringify(
        {
          id: tests.id,
        },
        null,
        2,
      ),
    );
});

app.post("/tests/:id/results", function (req, res) {
  let requestType = req.header("Content-Type") ?? "";
  let responseType = req.header("Accept");

  if (!req.body) {
    return res.status(400).send("No data received.");
  }

  let testCaseResults: any = req.body;
  if (testCaseResults && requestType == "application/yaml")
    testCaseResults = YAML.parse(testCaseResults);
  let testCaseId = "";
  if (
    testCaseResults &&
    testCaseResults.extra &&
    testCaseResults.extra.testCase
  )
    testCaseId = testCaseResults.extra.testCase;

  // update results overview
  updateResults(req.params.id, testCaseResults);
  updateTestCaseResults(req.params.id, testCaseId, testCaseResults);
  if (responseType == "application/yaml") {
    res.setHeader("Content-Type", "application/yaml");
    res.status(200).send("OK.");
  } else res.send("OK.");
});

app.get("/tests/:id/results", function (req, res) {
  let responseType = req.header("Accept");
  if (fs.existsSync(`${basePath}/${req.params.id}/results.yaml`)) {
    let fileContents = fs.readFileSync(
      `${basePath}/${req.params.id}/results.yaml`,
      "utf8",
    );
    let results = YAML.parse(fileContents);
    if (responseType == "application/yaml") {
      res.setHeader("Content-Type", "application/yaml");
      res.send(
        YAML.stringify(results, {
          aliasDuplicateObjects: false,
          blockQuote: "literal",
        }),
      );
    } else res.send(JSON.stringify(results, null, 2));
  } else {
    res.status(404).send("Not found.");
  }
});

app.get("/tests/:id/results/:caseId", function (req, res) {
  let responseType = req.header("Accept");
  if (fs.existsSync(`${basePath}/${req.params.id}/${req.params.caseId}.yaml`)) {
    let fileContents = fs.readFileSync(
      `${basePath}/${req.params.id}/${req.params.caseId}.yaml`,
      "utf8",
    );
    let results = YAML.parse(fileContents);
    if (responseType == "application/yaml") {
      res.setHeader("Content-Type", "application/yaml");
      res.send(
        YAML.stringify(results, {
          aliasDuplicateObjects: false,
          blockQuote: "literal",
        }),
      );
    } else res.send(JSON.stringify(results, null, 2));
  } else {
    res.status(404).send("Not found.");
  }
});

app.get("/events", (req, res) => {
  // Set headers to keep the connection alive and tell the client we're sending event-stream data
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  let eventId = req.query.id?.toString() ?? "";
  if (eventId && eventClients[eventId]) {
    eventClients[eventId].push(res);
  } else if (eventId) {
    eventClients[eventId] = [res];
  }

  // When client closes connection, stop sending events
  req.on("close", () => {
    // clearInterval(intervalId);
    res.end();
  });
});

function sendTestsUpdateEvent(eventId: string, data: any) {
  if (eventClients[eventId]) {
    for (let res of eventClients[eventId]) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }
}

function saveTests(tests: any, requestType: string): boolean {
  let result = true;
  if (!fs.existsSync(`${basePath}/${tests.id}`)) {
    result = false;
    return result;
  }
  switch (requestType) {
    case "application/yaml":
      // yaml
      fs.writeFileSync(
        `${basePath}/${tests.id}/tests.yaml`,
        YAML.stringify(tests, {
          aliasDuplicateObjects: false,
          blockQuote: "literal",
        }),
      );
      break;
    default:
      // json
      fs.writeFileSync(
        `${basePath}/${tests.id}/tests.yaml`,
        YAML.stringify(tests, {
          aliasDuplicateObjects: false,
          blockQuote: "literal",
        }),
      );
      break;
  }

  // create results files, if not exist
  if (!fs.existsSync(`${basePath}/${tests.id}/results.yaml`)) {
    fs.writeFileSync(
      `${basePath}/${tests.id}/results.yaml`,
      YAML.stringify(
        {
          results: {},
          updated: Date.now(),
        },
        {
          aliasDuplicateObjects: false,
          blockQuote: "literal",
        },
      ),
    );
  }

  return result;
}

function updateResults(testId: string, testCaseResults: any): boolean {
  let result = true;

  let resultsContent = fs.readFileSync(
    `${basePath}/${testId}/results.yaml`,
    "utf8",
  );
  let results: any = undefined;
  if (resultsContent) results = YAML.parse(resultsContent);
  else {
    result = false;
    console.error(`Could not find results file for test ${testId}`);
    return result;
  }
  if (
    results &&
    results.results &&
    testCaseResults &&
    testCaseResults.extra &&
    testCaseResults.extra.testCase &&
    testCaseResults.results &&
    testCaseResults.results.summary
  ) {
    results.results[testCaseResults.extra.testCase] =
      testCaseResults.results.summary;
  } else {
    result = false;
    console.error("Could not save test results!");
    console.error(testCaseResults);
    console.error(results);
    return result;
  }
  results.updated = Date.now();
  sendTestsUpdateEvent(testId, results);

  if (index.tests[testId]) index.tests[testId].updated = results.updated;
  else
    index.tests[testId] = {
      testCases: {},
      updated: results.updated,
    };

  fs.writeFileSync(
    `${basePath}/${testId}/results.yaml`,
    YAML.stringify(results, {
      aliasDuplicateObjects: false,
      blockQuote: "literal",
    }),
  );
  return result;
}

function updateTestCaseResults(
  testId: string,
  testCaseId: string,
  testCaseResults: any,
): boolean {
  let result = true;
  let results: any = undefined;
  if (fs.existsSync(`${basePath}/${testId}/${testCaseId}.yaml`)) {
    let resultsContent = fs.readFileSync(
      `${basePath}/${testId}/${testCaseId}.yaml`,
      "utf8",
    );
    results = YAML.parse(resultsContent);
  } else {
    results = {
      testCaseId: testCaseId,
      results: [],
    };
  }

  results.updated = Date.now();
  index.tests[testId].testCases[testCaseId] = {
    updated: results.updated,
  };

  if (results && results.results && testCaseResults) {
    results.results.push(testCaseResults);
    sendTestsUpdateEvent(testId + "." + testCaseId, results);

    fs.writeFileSync(
      `${basePath}/${testId}/${testCaseId}.yaml`,
      YAML.stringify(results, {
        aliasDuplicateObjects: false,
        blockQuote: "literal",
      }),
    );
  } else {
    result = false;
    console.error("Could not save test results!");
    console.error(testCaseResults);
    console.error(results);
  }

  return result;
}

function loadIndex(): any {
  let result = {
    tests: {},
  };

  if (fs.existsSync(`${basePath}/index.yaml`)) {
    let fileContents = fs.readFileSync(`${basePath}/index.yaml`, "utf8");
    if (fileContents) result = YAML.parse(fileContents);
  } else {
    // write first index
    fs.writeFileSync(
      `${basePath}/index.yaml`,
      YAML.stringify(result, {
        aliasDuplicateObjects: false,
        blockQuote: "literal",
      }),
    );
  }

  return result;
}

function saveIndex() {
  // write first index
  fs.writeFileSync(
    `${basePath}/index.yaml`,
    YAML.stringify(index, {
      aliasDuplicateObjects: false,
      blockQuote: "literal",
    }),
  );
}

app.listen("8080", () => {
  console.log(`app listening on port 8080`);
});

process.on("beforeExit", (code) => {
  console.log("Process beforeExit event with code: ", code);
  saveIndex();
});

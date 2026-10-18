/* Reproducible V52 Node unit tests; run: node test/cam-nc-preflight-v52.test.js */
"use strict";
const assert=require("node:assert/strict");
require("../runtime/cam-nc-preflight-v52.js");
const a=globalThis.AigCamNcV52;
const base={
  "source": "MANUAL",
  "params": {
    "routeMode": "MANUAL",
    "safeZ": 5,
    "stockTop": 0,
    "stockThickness": 10,
    "feed": 150,
    "rpm": 2300,
    "toolDia": 10
  },
  "stock": {
    "top": 0,
    "bottom": -10,
    "thickness": 10
  },
  "manualNodes": [
    {
      "g": "G0",
      "x": 0,
      "y": 0,
      "z": 5,
      "f": 150
    },
    {
      "g": "G1",
      "x": 0,
      "y": 0,
      "z": -2,
      "f": 150
    },
    {
      "g": "G1",
      "x": 30,
      "y": 0,
      "z": -2,
      "f": 150
    },
    {
      "g": "G0",
      "x": 30,
      "y": 0,
      "z": 5,
      "f": 150
    }
  ],
  "paths": [
    {
      "kind": "manual",
      "nodes": [
        {
          "x": 0,
          "y": 0,
          "z": 5
        },
        {
          "x": 0,
          "y": 0,
          "z": -2
        }
      ],
      "depth": -2,
      "feed": 150
    },
    {
      "kind": "manual",
      "nodes": [
        {
          "x": 0,
          "y": 0,
          "z": -2
        },
        {
          "x": 30,
          "y": 0,
          "z": -2
        }
      ],
      "depth": -2,
      "feed": 150
    }
  ]
};
const cases=[
  {
    "name": "valid",
    "code": null
  },
  {
    "name": "missing",
    "code": "NO_CAM"
  },
  {
    "name": "auto",
    "code": "NOT_MANUAL"
  },
  {
    "name": "empty",
    "code": "INCOMPLETE"
  },
  {
    "name": "badFeed",
    "code": "PARAM"
  },
  {
    "name": "rpm",
    "code": "RPM"
  },
  {
    "name": "safe",
    "code": "STOCK"
  },
  {
    "name": "stock",
    "code": "STOCK"
  },
  {
    "name": "precision",
    "code": "PRECISION"
  },
  {
    "name": "rapid",
    "code": "RAPID"
  },
  {
    "name": "retract",
    "code": "RETRACT"
  },
  {
    "name": "unpaired",
    "code": "PATH_MISMATCH"
  },
  {
    "name": "endpoint",
    "code": "PATH_MISMATCH"
  },
  {
    "name": "pathFeed",
    "code": "PATH_MISMATCH"
  },
  {
    "name": "overcut",
    "code": "OVER_CUT"
  },
  {
    "name": "rotary",
    "code": "ROTARY"
  },
  {
    "name": "arc",
    "code": "MOTION"
  },
  {
    "name": "noMove",
    "code": "SWEEP"
  },
  {
    "name": "xyzRamp",
    "code": "SWEEP"
  },
  {
    "name": "start",
    "code": "START"
  },
  {
    "name": "tooLarge",
    "code": "TOO_LARGE"
  },
  {
    "name": "missingStock",
    "code": "INCOMPLETE"
  },
  {
    "name": "invalidX",
    "code": "NONFINITE"
  },
  {
    "name": "noG1",
    "code": "PATH_MISMATCH"
  }
];
const clone=()=>JSON.parse(JSON.stringify(base));
assert.equal(a.inspect(clone()).status,"NC_CANDIDATE_ONLY");
assert.match(a.inspect(clone()).candidateCode,/G90 G54 G17/);
assert.equal(a.inspect(clone()).machineEnabled,false);
assert.equal(a.snapshot({getItem:()=>JSON.stringify(base)}).ok,true);
assert.equal(a.snapshot({getItem:()=>null}).code,"NO_CAM");
console.log("V52 CAM→SIM/NC baseline 5/5 PASS; negative cases tracked in runtime/cam-nc-preflight-v52-verification.json",cases.length);

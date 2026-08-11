import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReleaseGate } from "../src/policy.js";

function safeRequest(overrides = {}) {
  return {
    target: "preview",
    event: "pull_request",
    ref: "refs/heads/feature",
    workflow: {
      trigger: "pull_request",
      permissions: { contents: "read", packages: "write", "id-token": "none" },
      testsPassed: true,
      matrixComplete: true,
      failFast: false,
      actions: [
        { owner: "actions", name: "checkout", ref: "v4" },
        { owner: "vendor", name: "scan", ref: "0123456789abcdef0123456789abcdef01234567" },
      ],
    },
    image: {
      multiStage: true,
      runsAsRoot: false,
      secretMode: "buildkit",
      criticalVulnerabilities: 0,
      digestPinned: true,
    },
    ...overrides,
  };
}

test("promotes a safe preview", () => {
  assert.deepEqual(evaluateReleaseGate(safeRequest()), { decision: "promote", violations: [] });
});

test("promotes an approved production push from main", () => {
  const request = safeRequest({ target: "production", event: "push", ref: "refs/heads/main" });
  request.workflow.environmentApproval = true;
  assert.deepEqual(evaluateReleaseGate(request), { decision: "promote", violations: [] });
});

test("returns every applicable violation exactly once", () => {
  const request = safeRequest({ target: "production", event: "pull_request", ref: "refs/heads/dev" });
  request.workflow = {
    trigger: "pull_request_target",
    permissions: { contents: "write", packages: "write", "id-token": "none", issues: "read" },
    testsPassed: false,
    matrixComplete: false,
    failFast: true,
    actions: [
      { owner: "third-party", name: "tool", ref: "v1" },
      { owner: "other", name: "tool", ref: "ABCDEF0123456789ABCDEF0123456789ABCDEF01" },
    ],
  };
  request.image = {
    multiStage: false,
    runsAsRoot: true,
    secretMode: "copy",
    criticalVulnerabilities: 2,
    digestPinned: false,
  };
  assert.deepEqual(evaluateReleaseGate(request), {
    decision: "block",
    violations: [
      "EXCESS_PERMISSION", "UNSAFE_PR_TRIGGER", "TESTS_INCOMPLETE", "MUTABLE_ACTION",
      "SINGLE_STAGE_IMAGE", "ROOT_RUNTIME", "SECRET_IN_LAYER", "CRITICAL_CVE",
      "UNPINNED_IMAGE", "INVALID_PRODUCTION_REF", "APPROVAL_REQUIRED",
    ],
  });
});

test("rejects missing values instead of failing open", () => {
  assert.deepEqual(evaluateReleaseGate({}), {
    decision: "block",
    violations: [
      "EXCESS_PERMISSION", "TESTS_INCOMPLETE", "SINGLE_STAGE_IMAGE", "ROOT_RUNTIME",
      "SECRET_IN_LAYER", "CRITICAL_CVE", "UNPINNED_IMAGE",
    ],
  });
});

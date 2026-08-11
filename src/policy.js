const REQUIRED_PERMISSIONS = {
  contents: "read",
  packages: "write",
  "id-token": "none",
};

const FULL_SHA = /^[0-9a-f]{40}$/;

export function evaluateReleaseGate(input) {
  const violations = [];
  const workflow = input?.workflow ?? {};
  const image = input?.image ?? {};
  const permissions = workflow.permissions;

  const permissionsAreExact =
    permissions !== null &&
    typeof permissions === "object" &&
    !Array.isArray(permissions) &&
    Object.keys(permissions).length === Object.keys(REQUIRED_PERMISSIONS).length &&
    Object.entries(REQUIRED_PERMISSIONS).every(([scope, access]) => permissions[scope] === access);
  if (!permissionsAreExact) violations.push("EXCESS_PERMISSION");

  if (input?.event === "pull_request" && workflow.trigger !== "pull_request") {
    violations.push("UNSAFE_PR_TRIGGER");
  }

  if (workflow.testsPassed !== true || workflow.matrixComplete !== true || workflow.failFast !== false) {
    violations.push("TESTS_INCOMPLETE");
  }

  const actions = Array.isArray(workflow.actions) ? workflow.actions : [];
  if (actions.some((action) => action?.owner !== "actions" && !FULL_SHA.test(action?.ref ?? ""))) {
    violations.push("MUTABLE_ACTION");
  }

  if (image.multiStage !== true) violations.push("SINGLE_STAGE_IMAGE");
  if (image.runsAsRoot !== false) violations.push("ROOT_RUNTIME");
  if (image.secretMode !== "none" && image.secretMode !== "buildkit") violations.push("SECRET_IN_LAYER");
  if (image.criticalVulnerabilities !== 0) violations.push("CRITICAL_CVE");
  if (image.digestPinned !== true) violations.push("UNPINNED_IMAGE");

  if (input?.target === "production") {
    if (input.event !== "push" || input.ref !== "refs/heads/main") {
      violations.push("INVALID_PRODUCTION_REF");
    }
    if (workflow.environmentApproval !== true) violations.push("APPROVAL_REQUIRED");
  }

  return {
    decision: violations.length === 0 ? "promote" : "block",
    violations,
  };
}

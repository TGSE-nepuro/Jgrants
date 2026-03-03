import process from 'node:process';

function isTagRef(ref) {
  return typeof ref === 'string' && ref.startsWith('refs/tags/');
}

function isSemverTag(tagName) {
  return /^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(tagName);
}

export function validateReleaseContext(env) {
  const errors = [];
  const warnings = [];

  const githubRef = env.GITHUB_REF || '';
  const signingRequired = env.RELEASE_SIGNING_REQUIRED === 'true';

  if (isTagRef(githubRef)) {
    const tagName = githubRef.replace('refs/tags/', '');
    if (!isSemverTag(tagName)) {
      errors.push(`Tag format is invalid: ${tagName}. Expected vX.Y.Z`);
    }
  }

  const signingKeys = [
    'CSC_LINK',
    'CSC_KEY_PASSWORD',
    'APPLE_ID',
    'APPLE_APP_SPECIFIC_PASSWORD',
    'APPLE_TEAM_ID'
  ];

  const missingSigning = signingKeys.filter((key) => !env[key]);

  if (signingRequired && missingSigning.length > 0) {
    errors.push(`Signing is required but missing secrets: ${missingSigning.join(', ')}`);
  }

  if (!signingRequired && missingSigning.length > 0) {
    warnings.push(`Signing secrets are incomplete. Build may be unsigned: ${missingSigning.join(', ')}`);
  }

  return { errors, warnings };
}

function main() {
  const { errors, warnings } = validateReleaseContext(process.env);

  for (const warning of warnings) {
    console.warn(`[preflight:warn] ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[preflight:error] ${error}`);
    }
    process.exit(1);
  }

  console.log('[preflight] release context validation passed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

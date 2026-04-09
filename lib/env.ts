const isMockMode = process.env.USE_MOCK_DATA === "true";

type EnvOptions = {
  allowInMock?: boolean;
  minLength?: number;
};

export function requireEnv(name: string, options: EnvOptions = {}): string {
  const value = process.env[name];

  if (!value) {
    if (options.allowInMock && isMockMode) {
      return "";
    }
    throw new Error(`${name} is not set. Add it to your environment configuration.`);
  }

  if (options.minLength && value.length < options.minLength) {
    throw new Error(`${name} must be at least ${options.minLength} characters long.`);
  }

  return value;
}

export function isMockDataEnabled() {
  return isMockMode;
}

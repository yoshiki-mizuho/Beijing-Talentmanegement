export type DemoRole = "ADMIN" | "MANAGER" | "MEMBER";

export type DemoCredential = {
  email: string;
  password: string;
};

export type DemoCredentials = Record<DemoRole, DemoCredential>;

export function readDemoCredentials(): DemoCredentials {
  const passwords = {
    ADMIN: process.env.DEMO_ADMIN_PASSWORD,
    MANAGER: process.env.DEMO_MANAGER_PASSWORD,
    MEMBER: process.env.DEMO_MEMBER_PASSWORD
  };
  const missingVariables = Object.entries(passwords)
    .filter(([, password]) => !password)
    .map(([role]) => `DEMO_${role}_PASSWORD`);

  if (missingVariables.length > 0) {
    throw new Error(
      `E2Eテストの実行に必要な環境変数が未設定です: ${missingVariables.join(", ")}`
    );
  }

  return {
    ADMIN: {
      email: "admin@example.com",
      password: passwords.ADMIN as string
    },
    MANAGER: {
      email: "manager@example.com",
      password: passwords.MANAGER as string
    },
    MEMBER: {
      email: "member@example.com",
      password: passwords.MEMBER as string
    }
  };
}

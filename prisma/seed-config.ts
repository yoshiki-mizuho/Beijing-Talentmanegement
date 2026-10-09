export type DemoSeedPasswords = {
  admin: string;
  manager: string;
  member: string;
};

const MINIMUM_PASSWORD_LENGTH = 12;

export function readDemoSeedPasswords(
  env: Readonly<Record<string, string | undefined>> = process.env
): DemoSeedPasswords {
  const passwords = {
    admin: env.DEMO_ADMIN_PASSWORD,
    manager: env.DEMO_MANAGER_PASSWORD,
    member: env.DEMO_MEMBER_PASSWORD
  };

  for (const [role, password] of Object.entries(passwords)) {
    if (
      !password ||
      password.length < MINIMUM_PASSWORD_LENGTH ||
      password.startsWith("replace-with-")
    ) {
      throw new Error(
        `DEMO_${role.toUpperCase()}_PASSWORD must be at least ${MINIMUM_PASSWORD_LENGTH} characters and must not use an example placeholder.`
      );
    }
  }

  const distinctPasswords = new Set(Object.values(passwords));
  if (distinctPasswords.size !== Object.keys(passwords).length) {
    throw new Error("Demo seed passwords must be different for every role.");
  }

  return passwords as DemoSeedPasswords;
}

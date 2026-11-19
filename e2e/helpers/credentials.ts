export type DemoRole = "ADMIN" | "MANAGER" | "MEMBER";

export type DemoCredential = {
  platformUserId: string;
  platformRole: "ADMIN" | "MEMBER";
};

export type DemoCredentials = Record<DemoRole, DemoCredential>;

export function readDemoCredentials(): DemoCredentials {
  return {
    ADMIN: {
      platformUserId: "22222222-2222-4222-8222-222222222222",
      platformRole: "ADMIN"
    },
    MANAGER: {
      platformUserId: "22222222-2222-4222-8222-000000000004",
      platformRole: "MEMBER"
    },
    MEMBER: {
      platformUserId: "22222222-2222-4222-8222-000000000005",
      platformRole: "MEMBER"
    }
  };
}

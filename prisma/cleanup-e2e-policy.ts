import { demoMembers, existingDemoMemberEmployeeNos } from "./seed-demo-data";

const localDatabaseHosts = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",
]);

export const seedMemberEmployeeNos = new Set<string>([
  ...existingDemoMemberEmployeeNos,
  ...demoMembers.map((member) => member.employeeNo),
]);

export const seedMemberEmails = new Set<string>([
  "admin@example.com",
  "manager@example.com",
  "member@example.com",
  ...demoMembers.map((member) => member.email),
]);

export function isLocalDatabaseUrl(databaseUrl: string) {
  try {
    const hostname = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, "");
    return localDatabaseHosts.has(hostname);
  } catch {
    return false;
  }
}

export type CleanupMemberCandidate = {
  employeeNo: string;
  name: string;
  email: string;
};

export function isE2eMember(candidate: CleanupMemberCandidate) {
  if (
    seedMemberEmployeeNos.has(candidate.employeeNo) ||
    seedMemberEmails.has(candidate.email)
  ) {
    return false;
  }

  return (
    /^(E2E|FIRST-|初回画面-|撮影|LK\d|LF\d)/i.test(candidate.employeeNo) ||
    /^(E2E|FIRST-|初回画面-|撮影|LK\d|LF\d)/i.test(candidate.name) ||
    /^(e2e-|first-|look-)/i.test(candidate.email)
  );
}

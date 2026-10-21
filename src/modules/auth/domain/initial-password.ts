import { randomInt } from "node:crypto";

const PASSWORD_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const GROUP_LENGTH = 4;
const GROUP_COUNT = 3;

export function generateInitialPassword() {
  return Array.from({ length: GROUP_COUNT }, () =>
    Array.from(
      { length: GROUP_LENGTH },
      () => PASSWORD_CHARACTERS[randomInt(PASSWORD_CHARACTERS.length)]
    ).join("")
  ).join("-");
}

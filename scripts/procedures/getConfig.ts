import { compat } from "../deps.ts";

export const getConfig = compat.getConfig({
  "password": {
    "type": "string",
    "name": "Password",
    "nullable": false,
    "copyable": true,
    "masked": true,
    "default": {
      "len": 22,
      "charset": "a-z,A-Z,0-9"
    }
  }
})

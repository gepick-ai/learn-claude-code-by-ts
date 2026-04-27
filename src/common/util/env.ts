import { config as dotenvConfig } from "dotenv";

export function loadDotEnv() {
    dotenvConfig({ path: ".env", override: true,  quiet: true });
}

// Test environment setup — loads .env.local for tsx runner
// This file must be imported first in every test suite

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env.local") });
config({ path: resolve(__dirname, "../../.env") });

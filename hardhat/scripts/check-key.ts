import 'dotenv/config'; // this loads .env automatically
import { privateKeyToAccount } from 'viem/accounts';

const pk = process.env.MANTLE_SEPOLIA_PRIVATE_KEY as `0x${string}`;
if (!pk) throw new Error("MANTLE_SEPOLIA_PRIVATE_KEY not set!");

const account = privateKeyToAccount(pk);
console.log("Derived address:", account.address);

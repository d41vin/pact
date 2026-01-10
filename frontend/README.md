This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Messaging Support & Limitations

This project integrates **XMTP (v5)** for secure, end-to-end encrypted messaging. Due to technical limitations in the XMTP SDK's current signature verification core (LibXMTP), messaging availability depends on your wallet type:

### ✅ Supported Users (EOA)
- Standard **Externally Owned Accounts (EOA)**: MetaMask, Rabby, Rainbow, etc.
- Works by signing a message using standard ECDSA.

### ❌ Unsupported Users (SCW / Social Login)
- **AppKit Social Login**: Email, Google, X, etc.
- **Smart Contract Wallets (SCW)**: Safe, Coinbase Smart Wallet, etc.
- **Why?** XMTP v5 requires an on-chain verifier for SCW (ERC-1271) signatures. Currently, **Mantle Sepolia (Chain ID 5003)** is not on the list of supported networks for SCW verification in the XMTP WASM core. 
- *Note: Using these wallets will result in a "Signature validation failed (NoVerifier)" error.*

### ⛓️ SCW Network Support Matrix
| Support Level | Networks |
| :--- | :--- |
| **Fully Supported** | Ethereum Mainnet, Base, Optimism, Arbitrum, Polygon, Avalanche |
| **Testnets** | Sepolia (ETH), Base Sepolia, Optimism Sepolia |
| **Currently Unsupported** | **Mantle**, Mantle Sepolia, Linea, Scroll |

> [!NOTE]
> This list reflects the current known networks supported by XMTP v5’s SCW (ERC-1271) verifier based on SDK behavior and libxmtp source, and may change as XMTP adds new verifiers.

### XMTP WASM Requirement (Browser)

XMTP v5 uses a WebAssembly (WASM) core in the browser. For this reason, the compiled WASM file must be present in the `public/` directory at runtime.

This project includes:
- A `postinstall` script in `package.json`
- A utility script `copy-xmtp-wasm.js`

These ensure the XMTP WASM binary is always available after installations and during CI/CD. **This is required for all XMTP browser usage, including EOA wallets.**

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

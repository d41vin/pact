# Developer Notes

## XMTP WASM Requirement

The `@xmtp/browser-sdk` relies on a WebAssembly module (`bindings_wasm_bg.wasm`) for cryptographic operations. By default, the SDK attempts to load this file from within `node_modules`. However, in a Next.js environment (specifically with the App Router and webpack), importing assets from deeply nested `node_modules` inside a Web Worker can fail due to path resolution issues (e.g., `Failed to parse URL`).

### The Solution
We use a `postinstall` script (`copy-xmtp-wasm.js`) to copy the WASM file from `node_modules` to the `public/` directory. This makes the WASM file available as a static asset at `/bindings_wasm_bg.wasm`.

### Why this script exists
1.  **Next.js Compatibility**: Next.js App Router's handling of WASM imports in Workers is fragile.
2.  **Reliability**: Serving the WASM file from `public/` ensures it is always accessible via a stable URL relative to the site root, bypassing bundler resolution logic in the worker.

### Setup
The script runs automatically after `npm install` / `pnpm install`. If you see errors related to `fetch` failing for a `.wasm` file, ensure:
1.  Run `node copy-xmtp-wasm.js` manually.
2.  Check that `public/bindings_wasm_bg.wasm` exists.

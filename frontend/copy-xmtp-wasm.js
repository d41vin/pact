/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
const fs = require('fs');
const path = require('path');


console.log('Copying XMTP WASM file...');

function findFile(startPath, filter) {
    if (!fs.existsSync(startPath)) {
        return null;
    }
    const files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
        const filename = path.join(startPath, files[i]);
        let stat;
        try {
            stat = fs.lstatSync(filename);
        } catch (e) {
            continue;
        }

        if (stat.isDirectory()) {
            // Optimization: Only search in @xmtp related directories or .pnpm (where flattened deps live)
            if (filename.includes('.pnpm') || filename.includes('@xmtp')) {
                const result = findFile(filename, filter);
                if (result) return result;
            }
        } else if (filename.endsWith(filter)) {
            return filename;
        }
    }
    return null;
}
try {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    let actualSourcePath = null;

    if (fs.existsSync(sourcePath)) {
        actualSourcePath = sourcePath;
    } else {
        console.warn(`Could not find ${wasmFile} at primary location: ${sourcePath}`);
        // Check alternative location (sometimes structure differs between versions or packages)
        const altSourceDir = path.join(__dirname, 'node_modules', '@xmtp', 'user-preferences-bindings-wasm', 'dist');
        const altSourcePath = path.join(altSourceDir, wasmFile);

        if (fs.existsSync(altSourcePath)) {
            console.log(`Found WASM at alternative location: ${altSourcePath}`);
            actualSourcePath = altSourcePath;
        } else {
            console.warn('Failed to locate bindings_wasm_bg.wasm in node_modules at expected paths.');
            // Try a more generic search if specific paths fail
            const findFile = (startPath, filter) => {
                if (!fs.existsSync(startPath)) {
                    return null;
                }
                const files = fs.readdirSync(startPath);
                for (const file of files) {
                    const filename = path.join(startPath, file);
                    let stat;
                    try {
                        stat = fs.lstatSync(filename);
                    } catch (e) {
                        continue;
                    }

                    if (stat.isDirectory()) {
                        // Optimization: Only search in @xmtp related directories or .pnpm (where flattened deps live)
                        if (filename.includes('.pnpm') || filename.includes('@xmtp')) {
                            const result = findFile(filename, filter);
                            if (result) return result;
                        }
                    } else if (filename.endsWith(filter)) {
                        return filename;
                    }
                }
                return null;
            };
            console.log('Attempting generic search for bindings_wasm_bg.wasm...');
            actualSourcePath = findFile(path.join(__dirname, 'node_modules'), wasmFile);
        }
    }

    if (actualSourcePath) {
        fs.copyFileSync(actualSourcePath, destPath);
        console.log(`✅ Successfully copied ${wasmFile} to ${destPath}`);

        // PATCH: bindings_wasm.js
        // We need to modify the JS file that loads the WASM to point to our copied file
        // instead of trying to resolve it relative to the worker script (which fails in Next.js).

        // bindings_wasm_bg.wasm -> bindings_wasm.js
        let jsSource = actualSourcePath.replace('_bg.wasm', '.js');
        if (!fs.existsSync(jsSource)) {
            // Fallback: simple replacement
            jsSource = actualSourcePath.replace('.wasm', '.js');
        }

        if (fs.existsSync(jsSource)) {
            let jsContent = fs.readFileSync(jsSource, 'utf8');

            // Pattern matches: input = new URL('bindings_wasm_bg.wasm', import.meta.url);
            // We look for the creation of the URL with 'bindings_wasm_bg.wasm'
            const regex = /new\s+URL\(['"]bindings_wasm_bg\.wasm['"]\s*,\s*import\.meta\.url\)/;

            if (regex.test(jsContent)) {
                console.log(`Patching ${jsSource} to use absolute WASM path with origin...`);
                // Use self.location.origin to verify absolute path
                const patchedContent = jsContent.replace(regex, `self.location.origin + "/bindings_wasm_bg.wasm"`);
                fs.writeFileSync(jsSource, patchedContent);
                console.log('✅ Successfully patched bindings_wasm.js');
            } else {
                // Check if patched with partial string
                if (jsContent.includes('"/bindings_wasm_bg.wasm"')) {
                    console.log('ℹ️ bindings_wasm.js patch requires upgrade to use origin.');
                    const patchedContent = jsContent.replace('"/bindings_wasm_bg.wasm"', 'self.location.origin + "/bindings_wasm_bg.wasm"');
                    fs.writeFileSync(jsSource, patchedContent);
                    console.log('✅ Upgraded patch to use self.location.origin');
                } else if (jsContent.includes('self.location.origin')) {
                    console.log('ℹ️ bindings_wasm.js already patched with origin.');
                } else {
                    console.warn('⚠️ Could not find WASM URL pattern in bindings_wasm.js. Skipping patch.');
                }
            }
        } else {
            console.warn(`⚠️ Could not find companion JS file at ${jsSource}`);
        }
    } else {
        console.error('❌ Failed to locate bindings_wasm_bg.wasm in node_modules.');
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        } else {
            console.warn('Skipping WASM copy in development (file missing)');
            process.exit(0);
        }
    }

    fs.copyFileSync(wasmPath, destPath);
    console.log('✅ XMTP WASM file copied to:', destPath);

    // PATCH: bindings_wasm.js
    // We need to modify the JS file that loads the WASM to point to our copied file
    // instead of trying to resolve it relative to the worker script (which fails in Next.js).

    // bindings_wasm_bg.wasm -> bindings_wasm.js
    let jsSource = wasmPath.replace('_bg.wasm', '.js');
    if (!fs.existsSync(jsSource)) {
        // Fallback: simple replacement
        jsSource = wasmPath.replace('.wasm', '.js');
    }

    if (fs.existsSync(jsSource)) {
        let jsContent = fs.readFileSync(jsSource, 'utf8');

        // Pattern matches: input = new URL('bindings_wasm_bg.wasm', import.meta.url);
        // We look for the creation of the URL with 'bindings_wasm_bg.wasm'
        const regex = /new\s+URL\(['"]bindings_wasm_bg\.wasm['"]\s*,\s*import\.meta\.url\)/;

        if (regex.test(jsContent)) {
            console.log(`Patching ${jsSource} to use absolute WASM path with origin...`);
            // Use self.location.origin to verify absolute path
            const patchedContent = jsContent.replace(regex, `self.location.origin + "/bindings_wasm_bg.wasm"`);
            fs.writeFileSync(jsSource, patchedContent);
            console.log('✅ Successfully patched bindings_wasm.js');
        } else {
            // Check if patched with partial string
            if (jsContent.includes('"/bindings_wasm_bg.wasm"')) {
                console.log('ℹ️ bindings_wasm.js patch requires upgrade to use origin.');
                const patchedContent = jsContent.replace('"/bindings_wasm_bg.wasm"', 'self.location.origin + "/bindings_wasm_bg.wasm"');
                fs.writeFileSync(jsSource, patchedContent);
                console.log('✅ Upgraded patch to use self.location.origin');
            } else if (jsContent.includes('self.location.origin')) {
                console.log('ℹ️ bindings_wasm.js already patched with origin.');
            } else {
                console.warn('⚠️ Could not find WASM URL pattern in bindings_wasm.js. Skipping patch.');
            }
        }
    } else {
        console.warn(`⚠️ Could not find companion JS file at ${jsSource}`);
    }
} catch (error) {
    console.error('❌ Failed to copy XMTP WASM file:', error);
    process.exit(1);
}

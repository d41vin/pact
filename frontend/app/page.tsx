import { useAppKitAccount } from "@reown/appkit/react";

export default function Home() {
  return (
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 bg-zinc-100 p-8 pb-20 font-sans sm:p-20">
      <main className="row-start-2 flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold">Pact</h1>
        <p className="text-lg text-zinc-600 dark:text-gray-300">
          Your all-in-one finance app on Hedera.
        </p>
        <appkit-button />
      </main>
    </div>
  );
}

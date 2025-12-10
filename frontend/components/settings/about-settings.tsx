"use client";

export default function AboutSettings() {
  return (
    <div className="p-8">
      <h2 className="mb-6 text-2xl font-bold text-zinc-900">About</h2>

      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-zinc-900">Pact</h3>
          <p className="text-zinc-600">
            An all-in-one finance app for personal, group, and merchant
            transactions on Hedera.
          </p>
        </div>

        <div className="border-t border-zinc-200 pt-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">Version</h3>
          <p className="text-zinc-600">1.0.0 (Beta)</p>
        </div>

        <div className="border-t border-zinc-200 pt-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">
            Resources
          </h3>
          <div className="space-y-2">
            <a href="#" className="block text-blue-600 hover:text-blue-700">
              Terms of Service
            </a>
            <a href="#" className="block text-blue-600 hover:text-blue-700">
              Privacy Policy
            </a>
            <a href="#" className="block text-blue-600 hover:text-blue-700">
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

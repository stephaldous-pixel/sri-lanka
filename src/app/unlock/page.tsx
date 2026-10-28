import { Suspense } from "react";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { isPasswordConfigured } from "@/lib/site-access";
import { UnlockForm } from "./unlock-form";

export const metadata: Metadata = {
  title: `Private preview · ${SITE_NAME}`,
};

export default function UnlockPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">{SITE_NAME}</p>
        <h1 className="mt-2 text-2xl font-semibold">Private preview</h1>
        <p className="mt-2 mb-6 text-muted">
          This site isn&apos;t public yet. Enter the password you were given to continue.
        </p>
        {isPasswordConfigured() ? (
          <Suspense fallback={null}>
            <UnlockForm />
          </Suspense>
        ) : (
          <p role="alert" className="text-sm text-danger">
            The site password hasn&apos;t been set up yet.
          </p>
        )}
      </div>
    </main>
  );
}

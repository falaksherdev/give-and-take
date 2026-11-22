import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import App from "@/components/App";
import { signInWithGoogle, signOutAction } from "./actions";

async function Content() {
  await connection(); // this page is different for every visitor, so build it per request
  const session = await auth();

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6f9] p-4 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-800 text-xl font-bold text-white">G</span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Give and Take</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your private record of gifts and money given and received.</p>
          <form action={signInWithGoogle}>
            <button className="mt-8 w-full rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-600">
              Continue with Google
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <App email={session.user?.email ?? ""} name={session.user?.name ?? ""} signOutAction={signOutAction} />;
}

export default function Home() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading...</main>}>
      <Content />
    </Suspense>
  );
}

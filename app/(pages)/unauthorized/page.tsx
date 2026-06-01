import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <ShieldX className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-3 text-sm text-slate-500">
          You do not have permission to view this page. Contact your administrator if you
          believe this is a mistake.
        </p>
        <Link
          href="/secured/dashboard"
          className="mt-6 inline-flex items-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

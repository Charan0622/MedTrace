"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

export default function PatientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Patient detail error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#F0FDF4] mb-1">Failed to load patient</h2>
            <p className="text-sm text-[#6B7280]">
              Could not load patient details. The patient may not exist or there was a server error.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/patients">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" /> Back to Patients
              </Button>
            </Link>
            <Button onClick={reset} variant="secondary" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

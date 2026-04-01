"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Unhandled error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#F0FDF4] mb-1">Something went wrong</h2>
            <p className="text-sm text-[#6B7280]">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          <Button onClick={reset} variant="secondary">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-full bg-white/[0.04] p-4">
            <FileQuestion className="h-8 w-8 text-[#6B7280]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#F0FDF4] mb-1">Page Not Found</h2>
            <p className="text-sm text-[#6B7280]">
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
          <Link href="/">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

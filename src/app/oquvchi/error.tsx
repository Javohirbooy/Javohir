"use client";

import { SegmentErrorUi } from "@/components/errors/segment-error-ui";

export default function StudentSegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentErrorUi error={error} reset={reset} variant="student" />;
}

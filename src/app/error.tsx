"use client";

import { SegmentErrorUi } from "@/components/errors/segment-error-ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentErrorUi error={error} reset={reset} variant="root" />;
}

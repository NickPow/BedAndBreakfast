import { BookingForm } from "./booking-form";
import { getActiveDateBlocks } from "@/lib/date-blocks";

export default async function BookingPage() {
  const blockedDateRanges = await getActiveDateBlocks();

  return (
    <div className="site-shell section-pad">
      <BookingForm blockedDateRanges={blockedDateRanges} />
    </div>
  );
}
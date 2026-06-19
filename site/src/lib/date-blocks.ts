import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function hasActiveDateBlockOverlap(
  startDate: string,
  endDate: string,
  excludeBookingRequestId?: string,
): Promise<boolean> {
  const supabase = getSupabaseServiceClient();

  let query = supabase
    .from("date_blocks")
    .select("id")
    .eq("is_active", true)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);

  if (excludeBookingRequestId) {
    query = query.or(`booking_request_id.is.null,booking_request_id.neq.${excludeBookingRequestId}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to check date availability: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}

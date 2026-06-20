import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/service";

export type ActiveDateBlock = {
  id: string;
  startDate: string;
  endDate: string;
  sourceType: "pending_hold" | "booking_confirmed" | "manual_block";
  note: string;
};

export async function getActiveDateBlocks(): Promise<ActiveDateBlock[]> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("date_blocks")
    .select("id,start_date,end_date,source_type,note")
    .eq("is_active", true)
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(`Unable to load blocked dates: ${error.message}`);
  }

  return ((data ?? []) as Array<{
    id: string;
    start_date: string;
    end_date: string;
    source_type: "pending_hold" | "booking_confirmed" | "manual_block";
    note: string | null;
  }>).map((block) => ({
    id: block.id,
    startDate: block.start_date,
    endDate: block.end_date,
    sourceType: block.source_type,
    note: block.note ?? "",
  }));
}

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

import { analyzeAddressWithRentcast } from "@/services/rentcast";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string };
    const address = body.address?.trim();

    if (!address) {
      return NextResponse.json({ error: "Address is required." }, { status: 400 });
    }

    const analysis = await analyzeAddressWithRentcast(address);
    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze property.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

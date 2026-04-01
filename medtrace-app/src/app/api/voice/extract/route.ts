import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const startTime = Date.now();

  const body = await request.json();
  const { text } = body as { text: string };

  if (!text) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "INVALID_INPUT", message: "text is required" },
        meta: { query_time_ms: Date.now() - startTime },
      },
      { status: 400 }
    );
  }

  // Rule-based entity extraction (no AI needed)
  const knownDrugs = [
    "warfarin", "aspirin", "fluoxetine", "metoprolol", "omeprazole",
    "simvastatin", "lisinopril", "metformin", "amlodipine", "ibuprofen",
    "acetaminophen", "clopidogrel", "gabapentin", "levothyroxine",
    "valsartan", "losartan", "diclofenac",
  ];
  const knownConditions = [
    "atrial fibrillation", "hypertension", "diabetes", "depression",
    "gerd", "osteoarthritis", "hyperlipidemia", "hypothyroidism",
  ];

  const lowerText = text.toLowerCase();

  const drugs = knownDrugs.filter((d) => lowerText.includes(d));
  const conditions = knownConditions.filter((c) => lowerText.includes(c));

  // Extract dosages (patterns like "5mg", "500 mg", "75mcg")
  const dosagePattern = /\d+\s*(?:mg|mcg|ml|g)\b/gi;
  const dosages = lowerText.match(dosagePattern) ?? [];

  return NextResponse.json({
    success: true,
    data: {
      raw_text: text,
      entities: {
        drugs,
        conditions,
        dosages,
      },
      confidence: drugs.length > 0 || conditions.length > 0 ? 0.8 : 0.3,
    },
    error: null,
    meta: { ai_powered: false, query_time_ms: Date.now() - startTime },
  });
}

import { handleBullBoardRequest } from "@/libs/nextBullBoardAdapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  return handleBullBoardRequest(request, context);
}

export async function POST(request, context) {
  return handleBullBoardRequest(request, context);
}

export async function PUT(request, context) {
  return handleBullBoardRequest(request, context);
}

export async function DELETE(request, context) {
  return handleBullBoardRequest(request, context);
}

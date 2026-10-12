import { subscribeAfternoonTeaEvents } from "@/libs/afternoonTeaRealtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const message = (event) => encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

export async function GET(request) {
  let unsubscribe = () => {};
  let heartbeat;
  let close = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      close = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Stream đã đóng.
        }
      };
      const send = (event) => {
        if (!closed) controller.enqueue(message(event));
      };
      unsubscribe = subscribeAfternoonTeaEvents(send);
      heartbeat = setInterval(() => send({ type: "ping" }), 20_000);
      send({ type: "connected" });
      request.signal.addEventListener("abort", close);
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

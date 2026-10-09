// OT routes only use standard JSON responses, so native Response exercises
// their HTTP contract without Next's CommonJS barrel initialization in Node.
export const NextResponse = Response;

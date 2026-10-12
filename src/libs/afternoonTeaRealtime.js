import { EventEmitter } from "events";

const REALTIME_BUS_KEY = "__afternoonTeaRealtimeBus";

const getBus = () => {
  if (!globalThis[REALTIME_BUS_KEY]) {
    const bus = new EventEmitter();
    bus.setMaxListeners(200);
    globalThis[REALTIME_BUS_KEY] = bus;
  }
  return globalThis[REALTIME_BUS_KEY];
};

export const publishAfternoonTeaEvent = (event) => {
  getBus().emit("event", { ...event, at: Date.now() });
};

export const subscribeAfternoonTeaEvents = (listener) => {
  const bus = getBus();
  bus.on("event", listener);
  return () => bus.off("event", listener);
};

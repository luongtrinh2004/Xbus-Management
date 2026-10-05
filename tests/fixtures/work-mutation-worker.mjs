import { mutateWorkManagementJson } from "../../src/libs/workManagementJsonStorage.js";

const id = `task-${process.argv[2]}`;
await mutateWorkManagementJson(async (state) => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  return {
    state: { ...state, tasks: [...(state.tasks || []), { id }] },
    result: id,
  };
});

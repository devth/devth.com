import counter from "../counter/worker.js";
export { PageCounter } from "../counter/worker.js";

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === "/counter.svg") {
      return counter.fetch(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

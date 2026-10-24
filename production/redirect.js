export default {
  fetch(request) {
    const destination = new URL(request.url);
    destination.protocol = "https:";
    destination.hostname = "devth.com";
    destination.port = "";
    return Response.redirect(destination, 308);
  },
};

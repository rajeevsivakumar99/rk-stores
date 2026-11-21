// Prints a fresh pair of Web Push (VAPID) keys as JSON. Used by setup.bat.
const webpush = require("web-push");
process.stdout.write(JSON.stringify(webpush.generateVAPIDKeys()));

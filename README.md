## FOLDER STRUCTURE

├─ index.html
├─ app.js
├─ sw.js
├─ manifest.webmanifest
└─ icons/
        ├─ icon-192.png
        └─ icon-512.png

### IMPORTANT Trick

Chrome will complain that it does not want content from insecure (http) sources.

You can force him to accept it from a specific IP

In chrome insert (on the address bar)

chrome://flags/#unsafely-treat-insecure-origin-as-secure

enable and add the following
http://xxx.yyy.zzz.ttt:8080

**To be used only for testing purposes....**
It allows the securityes requirements of the 
indicated site (even if http instead of https)
to be ignored.
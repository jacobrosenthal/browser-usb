# browser-usb

[![Travis Build Status](https://img.shields.io/travis/jacobrosenthal/browser-usb/master.svg?label=travis&style=flat-square)](https://travis-ci.org/jacobrosenthal/browser-usb)

[node-usb](https://github.com/nonolith/node-usb) in your browser (via chrome application). 

Notes:
* See [Chrome's API docs](https://developer.chrome.com/apps/app_usb) for how to set up your app manifest permissions.
* Currently requires my [async fork](https://github.com/jacobrosenthal/node-usb/tree/async)
* By no means a complete port, so far just 'findByIds', 'controlTransfer', 'open', and 'close'.
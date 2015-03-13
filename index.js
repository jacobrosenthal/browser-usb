'use strict';

// Check that libusb was initialized.
if (!chrome.usb) {
  throw new Error('Could not initialize libusb. Check your app manifest permissions.');
}

function toBuffer(ab) {
  var buffer = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
      buffer[i] = view[i];
  }
  return buffer;
}

function toArrayBuffer(buffer) {
  var ab = new ArrayBuffer(buffer.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
  }
  return ab;
}

// convenience method for finding a device by vendor and product id
exports.findByIds = function(vid, pid, cb) {
  chrome.usb.getDevices({'vendorId': vid, 'productId': pid}, function(devices){
    if(typeof devices === undefined){
      return cb(new Error('Permission denied.'));
    }

    if (devices.length === 0){
      return cb();
    }

    cb(null, new Device(devices[0]));

  });

  var Device = function(device) {
    this.device = device;
    this.handle = null;
  };

  Device.prototype.controlTransfer = function(bmRequestType, bRequest, wValue, wIndex, data_or_length, cb){

    var transferInfo = {
      request: bRequest,
      value: wValue,
      index: wIndex
    };

    // in libusb requesttype is (USB_ENDPOINT_IN | USB_TYPE_VENDOR | USB_RECIP_DEVICE)
    // in chrome they're split out to direction requestType and recipient 
    // so take bmRequestType and mask off the bits we want for vendor

    var requestType = (bmRequestType & 0x60) >> 5;
     switch (requestType) {
      case 0:
        transferInfo.requestType = 'standard';
        break;
      case 1:
        transferInfo.requestType = 'class';
        break;
      case 2:
        transferInfo.requestType = 'vendor';
        break;
      case 3:
        transferInfo.requestType = 'reserved';
        break;
    }

    var recipient = (bmRequestType & 0x1F);
     switch (recipient) {
      case 0:
        transferInfo.recipient = 'device';
        break;
      case 1:
        transferInfo.recipient = 'interface';
        break;
      case 2:
        transferInfo.recipient = 'endpoint';
        break;
      case 3:
        transferInfo.recipient = 'other';
        break;
    }

    if(typeof data_or_length === 'number'){
      transferInfo.direction = 'in';
      transferInfo.length = data_or_length;
    }

    if(Buffer.isBuffer(data_or_length)){
      transferInfo.direction = 'out';
      transferInfo.data = toArrayBuffer(data_or_length);
    }

    chrome.usb.controlTransfer( this.handle, transferInfo, function(info){

      //info.data undefined for output transfers, maybe also if there is no data?
      cb(chrome.runtime.lastError, toBuffer(info.data));
    });

  };

  Device.prototype.open = function(cb){
    var self = this;
    chrome.usb.openDevice(this.device, function (handle) {
        self.handle = handle;
        return cb();
    });

  };

  Device.prototype.close = function(){
    chrome.usb.closeDevice(this.handle);
  };


};

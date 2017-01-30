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

var Interface = function(number, device) {
  this.number = number;
  this.handle = device;
};

Interface.prototype.claim = function(cb) {
  chrome.usb.claimInterface(this.handle, this.number, function() {
    cb(chrome.runtime.lastError);
  });
};

Interface.prototype.setAltSetting = function(altSetting, cb) {
  chrome.usb.setInterfaceAlternateSetting(this.handle, this.number, altSetting, function() {
    cb(chrome.runtime.lastError);
  });
};

Interface.prototype.release = function(cb) {
  chrome.usb.releaseInterface(this.handle, this.number, function() {
    cb(chrome.runtime.lastError);
  });
};

var Device = function(device) {
  this.device = device;
  this.handle = null;
  this.timeout = 1000;

  this.deviceDescriptor = {
    idVendor: this.device.vendorId,
    idProduct: this.device.productId,

    iManufacturer: -1,
    iProduct: -2,
    iSerialNumber: -3,

    manufacturerName: this.device.manufacturerName,
    productName: this.device.productName,
    serialNumber: this.device.serialNumber
  };

  this.interfaces = {};
};

Device.prototype.controlTransfer = function(bmRequestType, bRequest, wValue, wIndex, data_or_length, cb){

  var transferInfo = {
    request: bRequest,
    value: wValue,
    index: wIndex,
    timeout: this.timeout
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

  chrome.usb.openDevice(self.device, function (handle) {
    if (chrome.runtime.lastError) {
      return cb(chrome.runtime.lastError);
    }

    self.handle = handle;

    chrome.usb.getConfigurations(self.device, function(configs) {
      var interfaces = [];

      configs = configs || [];

      configs.forEach(function(config) {
        var interface_ = [];

        config.interfaces.forEach(function(i) {
          interface_.push({
            bInterfaceNumber: i.interfaceNumber,
            bAlternateSetting: i.alternateSetting,
            bInterfaceClass: i.interfaceClass,
            bInterfaceSubClass: i.interfaceSubclass,
            bInterfaceProtocol: i.interfaceProtocol,
            extra: toBuffer(i.extra_data),
            endpoints: []
          });
        });

        if (config.active) {
          self.configDescriptor = {
            bConfigurationValue: config.configurationValue,
            bMaxPower: config.maxPower,
            extra: toBuffer(config.extra_data),
            interfaces: interfaces
          };
        }

        interfaces.push(interface_);
      });

      return cb();
    });
  });
};

Device.prototype.close = function(cb){
  chrome.usb.closeDevice(this.handle, function() {
    cb(chrome.runtime.lastError);
  });
};

Device.prototype.getStringDescriptor = function(index, cb){
  if (index === this.deviceDescriptor.iManufacturer) {
    return cb(null, this.deviceDescriptor.manufacturerName);
  } else if (index === this.deviceDescriptor.iProduct) {
    return cb(null, this.deviceDescriptor.productName);
  } else if (index === this.deviceDescriptor.iSerialNumber) {
    return cb(null, this.deviceDescriptor.serialNumber);
  } else {
    return cb(new Error("getStringDescriptor not supported for index: " + index));
  }
};

Device.prototype.interface = function(number) {
  if (!this.interfaces[number]) {
    this.interfaces[number] = new Interface(number, this.handle);
  }

  return this.interfaces[number];
};

Device.prototype.reset = function(cb) {
  chrome.usb.resetDevice(this.handle, function() {
    cb(chrome.runtime.lastError);
  });
};

// convenience method for finding a device by vendor and product id
exports.findByIds = function(vid, pid, cb) {
  chrome.usb.getDevices({'vendorId': vid, 'productId': pid}, function(devices){
    if(chrome.runtime.lastError){
      return cb(chrome.runtime.lastError);
    }

    if (devices.length === 0){
      return cb();
    }

    cb(null, new Device(devices[0]));

  });
};

exports.getDeviceList = function(cb) {
  chrome.usb.getDevices({}, function(devices){
    if(chrome.runtime.lastError){
      return cb(chrome.runtime.lastError);
    }

    var convertedDevices = Array.from(devices, function(device) {
      return new Device(device);
    });

    cb(null, convertedDevices);
  });
};

exports.LIBUSB_ENDPOINT_IN           = 0x80;
exports.LIBUSB_ENDPOINT_OUT          = 0x00;

exports.LIBUSB_REQUEST_TYPE_STANDARD = (0x00 << 5);
exports.LIBUSB_REQUEST_TYPE_CLASS    = (0x01 << 5);
exports.LIBUSB_REQUEST_TYPE_VENDOR   = (0x02 << 5);
exports.LIBUSB_REQUEST_TYPE_RESERVED = (0x03 << 5);

exports.LIBUSB_RECIPIENT_DEVICE      = 0x00;
exports.LIBUSB_RECIPIENT_INTERFACE   = 0x01;
exports.LIBUSB_RECIPIENT_ENDPOINT    = 0x02;
exports.LIBUSB_RECIPIENT_OTHER       = 0x03;

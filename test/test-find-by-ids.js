var assert = require('assert');
var sinon = require('sinon');

chrome = require('./util/mock-chrome');

var usb = require('../index');

describe('usb#findByIds', function () {
  var mockCallback;
  var callback;

  beforeEach(function() {
    chrome.resetSpys();

    mockCallback = sinon.spy();

    usb.findByIds(0x8087, 0x0aba, mockCallback);

    callback = chrome.usb.getDevices.lastCall.args[1];
  });

  it('should call chrome.usb.getDevices with vendor and product id options', function() {
    assert(chrome.usb.getDevices.calledWith({vendorId: 0x8087, productId: 0x0aba}, sinon.match.any));
  });

  it('should callback with error on error', function() {
    chrome.runtime.lastError = new Error('blah');

    callback();

    assert(mockCallback.calledWith(chrome.runtime.lastError));
  });

  it('should callback with undefined devices when there are no devices', function() {
    callback([]);

    assert(mockCallback.calledWith());
  });

  it('should callback with device when there is a device', function() {
    var mockUsbDevice = {
      vendorId: 0x8087,
      productId: 0x0aba,

      manufacturerName: 'Intel',
      productName: 'Arduino 101',
      serialNumber: 'AE6642SQ541000F'
    };

    callback([mockUsbDevice]);

    assert(mockCallback.calledWith(null, sinon.match.any));
  });

  it('should callback with one devices when there are two devices', function() {
    var mockUsbDevice1 = {
      vendorId: 0x8087,
      productId: 0x0aba,

      manufacturerName: 'Intel',
      productName: 'Arduino 101',
      serialNumber: 'AE6642SQ541000F'
    };

    var mockUsbDevice2 = {
      vendorId: 0x8087,
      productId: 0x0aba,

      manufacturerName: 'Intel',
      productName: 'Arduino 101',
      serialNumber: 'AE6642SQ541000E'
    };

    callback([mockUsbDevice1, mockUsbDevice2]);

    assert(mockCallback.calledWith(null, sinon.match.any));
  });
});

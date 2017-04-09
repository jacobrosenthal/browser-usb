var assert = require('assert');
var sinon = require('sinon');

chrome = require('./util/mock-chrome');

var usb = require('../index');

describe('Device', function () {
  var mockUsbDevice;
  var device;
  var handle = 1;

  beforeEach(function() {
    chrome.resetSpys();

    var mockFindByIdsCallback = sinon.spy();

    usb.findByIds(0x8087, 0x0aba, mockFindByIdsCallback);

    var callback = chrome.usb.getDevices.lastCall.args[1];

    mockUsbDevice = {
      vendorId: 0x8087,
      productId: 0x0aba,

      manufacturerName: 'Intel',
      productName: 'Arduino 101',
      serialNumber: 'AE6642SQ541000F'
    };

    callback([mockUsbDevice]);

    device = mockFindByIdsCallback.lastCall.args[1];
  });

  it('should have timeout of 1000', function() {
    assert.equal(device.timeout, 1000);
  });

  it('should have device descriptor', function() {
    var expectedDeviceDescriptor = {
      idVendor: 0x8087,
      idProduct: 0x0aba,
      iManufacturer: -1,
      iProduct: -2,
      iSerialNumber: -3,
      manufacturerName: 'Intel',
      productName: 'Arduino 101',
      serialNumber: 'AE6642SQ541000F'
    };

    assert.deepEqual(device.deviceDescriptor, expectedDeviceDescriptor);
  });

  it('should have empty interfaces', function() {
    assert.deepEqual(device.interfaces, {});
  });

  describe('#open', function() {
    var mockCallback;
    var openCallback;

    beforeEach(function() {
      mockCallback = sinon.spy();

      device.open(mockCallback);

      openCallback = chrome.usb.openDevice.lastCall.args[1];
    });

    it('should call chrome.usb.openDevice', function() {
      assert(chrome.usb.openDevice.calledWith(mockUsbDevice, sinon.match.any));
    });

    it('should callback with error on open device error', function() {
      chrome.runtime.lastError = new Error('blah');

      openCallback();

      assert(mockCallback.calledWith(chrome.runtime.lastError));
    });

    it('should call chrome.usb.getConfigurations on open success', function() {
      openCallback(handle);

      assert(chrome.usb.getConfigurations.calledWith(mockUsbDevice, sinon.match.any));
    });

    it('should call callback on success', function() {
      openCallback(handle);

      var getConfigurationsCallback = chrome.usb.getConfigurations.lastCall.args[1];

      getConfigurationsCallback();

      assert(mockCallback.calledWith());
    });
  });

  describe('#reset', function() {
    var mockCallback;
    var callback;

    beforeEach(function() {
      mockCallback = sinon.spy();

      device.handle = handle;

      device.reset(mockCallback);

      callback = chrome.usb.resetDevice.lastCall.args[1];
    });

    it('should call chrome.usb.resetDevice', function() {
      assert(chrome.usb.resetDevice.calledWith(handle, sinon.match.any));
    });

    it('should callback with error on reset device error', function() {
      chrome.runtime.lastError = new Error('blah');

      callback();

      assert(mockCallback.calledWith(chrome.runtime.lastError));
    });

    it('should callback on reset device success', function() {
      callback();

      assert(mockCallback.calledWith());
    });
  });

  describe('#getStringDescriptor', function() {
    var mockCallback;

    beforeEach(function() {
      mockCallback = sinon.spy();

      device.deviceDescriptor = {
        idVendor: 0x8087,
        idProduct: 0x0aba,
        iManufacturer: -1,
        iProduct: -2,
        iSerialNumber: -3,
        manufacturerName: 'Intel',
        productName: 'Arduino 101',
        serialNumber: 'AE6642SQ541000F'
      };
    });

    it('should callback with manufacturerName for iManufacturer index', function() {
      device.getStringDescriptor(device.deviceDescriptor.iManufacturer, mockCallback);

      assert(mockCallback.calledWith(null, 'Intel'));
    });

    it('should callback with productName for iProduct index', function() {
      device.getStringDescriptor(device.deviceDescriptor.iProduct, mockCallback);

      assert(mockCallback.calledWith(null, 'Arduino 101'));
    });

    it('should callback with serialNumber for iSerialNumber index', function() {
      device.getStringDescriptor(device.deviceDescriptor.iSerialNumber, mockCallback);

      assert(mockCallback.calledWith(null, 'AE6642SQ541000F'));
    });

    it('should callback with error for other indexes', function() {
      device.getStringDescriptor(5, mockCallback);

      assert(mockCallback.calledWith(new Error('getStringDescriptor not supported for index: 6')));
    });
  });

  describe('#controlTransfer', function() {
    var mockCallback;
    var callback;

    beforeEach(function() {
      mockCallback = sinon.spy();

      device.handle = handle;
    });

    it('should set request', function() {
      device.controlTransfer(0, 6, 0, 0, 0, mockCallback);

      assert.equal(chrome.usb.controlTransfer.lastCall.args[1].request, 6);
    });

    it('should set value', function() {
      device.controlTransfer(0, 0, 7, 0, 0, mockCallback);

      assert.equal(chrome.usb.controlTransfer.lastCall.args[1].value, 7);
    });

    it('should set index', function() {
      device.controlTransfer(0, 0, 0, 8, 0, mockCallback);

      assert.equal(chrome.usb.controlTransfer.lastCall.args[1].index, 8);
    });

    it('should set timeout', function() {
      device.controlTransfer(0, 0, 0, 0, 0, mockCallback);

      assert.equal(chrome.usb.controlTransfer.lastCall.args[1].timeout, 1000);
    });

    describe('requestType', function() {
      it('should be "standard" for LIBUSB_REQUEST_TYPE_STANDARD', function() {
        device.controlTransfer(usb.LIBUSB_REQUEST_TYPE_STANDARD, 0, 0, 0, 0, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].requestType, 'standard');
      });

      it('should be "class" for LIBUSB_REQUEST_TYPE_CLASS', function() {
        device.controlTransfer(usb.LIBUSB_REQUEST_TYPE_CLASS, 0, 0, 0, 0, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].requestType, 'class');
      });

      it('should be "vendor" for LIBUSB_REQUEST_TYPE_VENDOR', function() {
        device.controlTransfer(usb.LIBUSB_REQUEST_TYPE_VENDOR, 0, 0, 0, 0, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].requestType, 'vendor');
      });

      it('should be "class" for LIBUSB_REQUEST_TYPE_RESERVED', function() {
        device.controlTransfer(usb.LIBUSB_REQUEST_TYPE_RESERVED, 0, 0, 0, 0, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].requestType, 'reserved');
      });
    });

    describe('recipient', function() {
      it('should be "device" for LIBUSB_RECIPIENT_DEVICE', function() {
        device.controlTransfer(usb.LIBUSB_RECIPIENT_DEVICE, 0, 0, 0, 0, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].recipient, 'device');
      });

      it('should be "interface" for LIBUSB_RECIPIENT_INTERFACE', function() {
        device.controlTransfer(usb.LIBUSB_RECIPIENT_INTERFACE, 0, 0, 0, 0, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].recipient, 'interface');
      });

      it('should be "endpoint" for LIBUSB_RECIPIENT_ENDPOINT', function() {
        device.controlTransfer(usb.LIBUSB_RECIPIENT_ENDPOINT, 0, 0, 0, 0, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].recipient, 'endpoint');
      });

      it('should be "other" for LIBUSB_RECIPIENT_OTHER', function() {
        device.controlTransfer(usb.LIBUSB_RECIPIENT_OTHER, 0, 0, 0, 0, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].recipient, 'other');
      });
    });

    describe('direction', function() {
      it('should be "in" if data_or_length is number', function() {
        device.controlTransfer(usb.LIBUSB_ENDPOINT_IN, 0, 0, 0, 5, mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].direction, 'in');
      });

      it('should be "out" if data_or_length is Buffer', function() {
        device.controlTransfer(usb.LIBUSB_ENDPOINT_OUT, 0, 0, 0, new Buffer(5), mockCallback);

        assert.equal(chrome.usb.controlTransfer.lastCall.args[1].direction, 'out');
      });
    });

    describe('data', function() {
      it ('should be set for out', function() {
        device.controlTransfer(usb.LIBUSB_ENDPOINT_OUT, 0, 0, 0, new Buffer([1, 2, 3, 4, 5]), mockCallback);

        var view = new Uint8Array(chrome.usb.controlTransfer.lastCall.args[1].data);
        var expectedData = new ArrayBuffer(5);
        var expectedView = new Uint8Array(expectedData);

        expectedView[0] = 1;
        expectedView[1] = 2;
        expectedView[2] = 3;
        expectedView[3] = 4;
        expectedView[4] = 5;

        assert.deepEqual(view, expectedView);
      });
    });

    it('should callback with error on error', function() {
      chrome.runtime.lastError = new Error('blah');

      device.controlTransfer(usb.LIBUSB_ENDPOINT_IN, 0, 0, 0, 5, mockCallback);

      callback = chrome.usb.controlTransfer.lastCall.args[2];

      callback();

      assert(mockCallback.calledWith(chrome.runtime.lastError));
    });

    it('should callback with data on success', function() {
      var data = new ArrayBuffer(5);
      var view = new Uint8Array(data);

      view[0] = 1;
      view[1] = 2;
      view[2] = 3;
      view[3] = 4;
      view[4] = 5;

      device.controlTransfer(usb.LIBUSB_ENDPOINT_IN, 0, 0, 0, 5, mockCallback);

      callback = chrome.usb.controlTransfer.lastCall.args[2];

      callback({data: data});

      assert(mockCallback.calledWith(null, new Buffer([1, 2, 3, 4, 5])));
    });
  });

  describe('#interface', function() {
    var i;

    beforeEach(function() {
      device.handle = handle;

      i = device.interface(0);
    });

    it('should return interface', function() {
      assert.equal(i.number, 0);
      assert.equal(i.handle, handle);
    });

    describe('Interface', function() {
      describe('#claim', function() {
        var mockCallback;
        var callback;

        beforeEach(function() {
          mockCallback = sinon.spy();

          i.claim(mockCallback);

          callback = chrome.usb.claimInterface.lastCall.args[2];
        });

        it('should call chrome.usb.claimInterface', function() {
          assert(chrome.usb.claimInterface.calledWith(handle, 0, sinon.match.any));
        });

        it('should callback with error on claim error', function() {
          chrome.runtime.lastError = new Error('blah');

          callback();

          assert(mockCallback.calledWith(chrome.runtime.lastError));
        });

        it('should callback on claim success', function() {
          callback();

          assert(mockCallback.calledWith());
        });
      });

      describe('#setAltSetting', function() {
        var mockCallback;
        var callback;

        beforeEach(function() {
          mockCallback = sinon.spy();

          i.setAltSetting(7, mockCallback);

          callback = chrome.usb.setInterfaceAlternateSetting.lastCall.args[3];
        });

        it('should call chrome.usb.setInterfaceAlternateSetting', function() {
          assert(chrome.usb.setInterfaceAlternateSetting.calledWith(handle, 0, 7, sinon.match.any));
        });

        it('should callback with error on set alt error', function() {
          chrome.runtime.lastError = new Error('blah');

          callback();

          assert(mockCallback.calledWith(chrome.runtime.lastError));
        });

        it('should callback on set alt success', function() {
          callback();

          assert(mockCallback.calledWith());
        });
      });

      describe('#release', function() {
        var mockCallback;
        var callback;

        beforeEach(function() {
          mockCallback = sinon.spy();

          i.release(mockCallback);

          callback = chrome.usb.releaseInterface.lastCall.args[2];
        });

        it('should call chrome.usb.releaseInterface', function() {
          assert(chrome.usb.releaseInterface.calledWith(handle, 0, sinon.match.any));
        });

        it('should callback with error on release error', function() {
          chrome.runtime.lastError = new Error('blah');

          callback();

          assert(mockCallback.calledWith(chrome.runtime.lastError));
        });

        it('should callback on release success', function() {
          callback();

          assert(mockCallback.calledWith());
        });
      });
    });
  });

  describe('#close', function() {
    var mockCallback;
    var callback;

    beforeEach(function() {
      mockCallback = sinon.spy();

      device.handle = handle;

      device.close(mockCallback);

      callback = chrome.usb.closeDevice.lastCall.args[1];
    });

    it('should call chrome.usb.closeDevice', function() {
      assert(chrome.usb.closeDevice.calledWith(handle, sinon.match.any));
    });

    it('should callback with error on close device error', function() {
      chrome.runtime.lastError = new Error('blah');

      callback();

      assert(mockCallback.calledWith(chrome.runtime.lastError));
    });

    it('should callback on close device success', function() {
      callback();

      assert(mockCallback.calledWith());
    });
  });
});

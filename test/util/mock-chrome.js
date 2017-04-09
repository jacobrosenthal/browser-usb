var sinon = require('sinon');

module.exports = {
  usb: {
    getDevices: sinon.spy(),

    openDevice: sinon.spy(),
    getConfigurations: sinon.spy(),
    controlTransfer: sinon.spy(),
    resetDevice: sinon.spy(),
    closeDevice: sinon.spy(),

    claimInterface: sinon.spy(),
    setInterfaceAlternateSetting: sinon.spy(),
    releaseInterface: sinon.spy()
  },
  runtime: {
    lastError: null
  },
  resetSpys: function() {
    this.usb.getDevices.reset();

    this.usb.openDevice.reset();
    this.usb.getConfigurations.reset();
    this.usb.controlTransfer.reset();
    this.usb.resetDevice.reset();
    this.usb.closeDevice.reset();

    this.usb.claimInterface.reset();
    this.usb.setInterfaceAlternateSetting.reset();
    this.usb.releaseInterface.reset();

    this.runtime.lastError = null;
  }
};
